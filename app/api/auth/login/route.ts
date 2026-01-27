import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { comparePassword } from '@/lib/auth/password';
import { signJWT } from '@/lib/auth/jwt';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    logger.log('🔐 Login attempt started');
    const { email, password } = await request.json();
    logger.log('📧 Email:', email);

    if (!email || !password) {
      logger.log('❌ Missing email or password');
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400 }
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
      token,
    });

    // Set cookie with proper settings
    response.cookies.set('thunder_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
