import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { comparePassword } from '@/lib/auth/password';
import { signJWT } from '@/lib/auth/jwt';
import { logger } from '@/lib/utils/logger';
import { reserveLoginAttempt, clearLoginFailures, getClientIp } from '@/lib/auth/rate-limit';

const MAX_EMAIL_LEN = 254;
const MAX_PASSWORD_LEN = 128; // bcrypt zaten 72 byte'tan sonrasını kullanmaz

export async function POST(request: NextRequest) {
  try {
    logger.log('🔐 Login attempt started');
    const { email, password } = await request.json();
    logger.log('📧 Email:', email);

    // Girdi doğrulaması deneme hakkı ayrılmadan ÖNCE: hatalı tipler 500'e düşüp
    // limiti etkilemesin
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email ||
      !password ||
      email.length > MAX_EMAIL_LEN ||
      password.length > MAX_PASSWORD_LEN
    ) {
      logger.log('❌ Missing or invalid email/password');
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400 }
      );
    }

    // Brute-force koruması: deneme hakkı herhangi bir await'ten ÖNCE senkron düşülür
    // (paralel isteklerle limit aşılmasın). Başarılı login'de sıfırlanır.
    const clientIp = getClientIp(request.headers);
    const reservation = reserveLoginAttempt(clientIp, email);
    const blockedFor = reservation.blockedSeconds;
    if (blockedFor > 0) {
      return NextResponse.json(
        { error: `Çok fazla başarısız deneme. ${Math.ceil(blockedFor / 60)} dakika sonra tekrar deneyin.` },
        { status: 429, headers: { 'Retry-After': String(blockedFor) } }
      );
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error('NEXT_PUBLIC_SUPABASE_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error: Supabase URL not configured' },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      logger.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
      return NextResponse.json(
        { error: 'Server configuration error: Supabase anon key not configured' },
        { status: 500 }
      );
    }

    // Create Supabase admin client (service role)
    let supabase;
    try {
      logger.log('🔄 Creating Supabase admin client...');
      supabase = createAdminClient();
      logger.log('✅ Supabase admin client created successfully');
    } catch (clientError: any) {
      logger.error('❌ Error creating Supabase admin client:', clientError);
      reservation.release(); // altyapı hatası — kullanıcının hakkını yakma
      return NextResponse.json(
        {
          error: 'Failed to initialize database connection',
          details: process.env.NODE_ENV === 'development' ? clientError.message : undefined
        },
        { status: 500 }
      );
    }

    // Kullanıcıyı bul
    logger.log('🔍 Querying user from database...');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, password_hash, is_active')
      .eq('email', email)
      .single();

    if (error) {
      logger.error('❌ Database error fetching user:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { error: 'Geçersiz email veya şifre' },
        { status: 401 }
      );
    }

    logger.log('✅ User found in database');

    if (!user) {
      logger.log('❌ User not found (null)');
      return NextResponse.json(
        { error: 'Geçersiz email veya şifre' },
        { status: 401 }
      );
    }

    // Aktif mi kontrol
    logger.log('🔍 Checking if user is active:', user.is_active);
    if (!user.is_active) {
      logger.log('❌ User is not active');
      return NextResponse.json(
        { error: 'Hesabınız pasif durumda' },
        { status: 403 }
      );
    }

    // Şifre kontrolü
    logger.log('🔑 Comparing password...');
    let isPasswordValid = false;
    try {
      isPasswordValid = await comparePassword(password, user.password_hash);
      logger.log('🔑 Password comparison result:', isPasswordValid);
    } catch (passwordError: any) {
      logger.error('❌ Password comparison error:', passwordError);
      return NextResponse.json(
        { error: 'Şifre doğrulama hatası' },
        { status: 500 }
      );
    }

    if (!isPasswordValid) {
      logger.log('❌ Invalid password');
      return NextResponse.json(
        { error: 'Geçersiz email veya şifre' },
        { status: 401 }
      );
    }

    logger.log('✅ Password is valid');
    clearLoginFailures(clientIp, email);

    // JWT oluştur
    let token: string;
    try {
      token = await signJWT({
        userId: user.id,
        email: user.email,
        role: user.role,
      });
    } catch (jwtError: any) {
      logger.error('JWT signing error:', jwtError);
      reservation.release(); // altyapı hatası — kullanıcının hakkını yakma
      return NextResponse.json(
        { error: 'Token oluşturma hatası' },
        { status: 500 }
      );
    }

    // Redirect URL belirle
    let redirectUrl = '/dashboard';

    if (user.role === 'operator') {
      redirectUrl = '/operator-dashboard';
    } else if (user.role === 'warehouse' || user.role === 'depo') {
      // Email'e göre yönlendirme yap
      if (user.email === 'mobil@thunder.com') {
        // Mobil kullanıcı her zaman mobil dashboard'a gitsin
        redirectUrl = '/depo/mobile-dashboard';
      } else if (user.email === 'depo@thunder.com') {
        // Web depo kullanıcısı web dashboard'a gitsin
        redirectUrl = '/depo-dashboard';
      } else {
        // Diğer depo kullanıcıları için varsayılan
        redirectUrl = '/depo-dashboard';
      }
    }

    // Cookie set et ve redirect yap
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      redirectUrl,
    });

    // Set cookie with proper settings
    // NOT: HTTPS olmayan ortamlarda (internal network) secure: false olmalı
    // Production'da HTTPS varsa secure: true yapın
    const isHttps = process.env.FORCE_HTTPS === 'true' || 
                    (process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true');
    
    response.cookies.set('thunder_token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    logger.log(`✅ Login successful: ${user.email} (${user.role})`);
    logger.log(`🔑 Cookie set: thunder_token (path: /, httpOnly: true)`);
    logger.log(`🔄 Redirect URL: ${redirectUrl}`);

    return response;
  } catch (error: any) {
    logger.error('Login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      {
        error: 'Sunucu hatası',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
