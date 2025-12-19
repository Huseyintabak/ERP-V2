import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { comparePassword } from '@/lib/auth/password';
import { signJWT } from '@/lib/auth/jwt';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
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

    // Create Supabase client
    let supabase;
    try {
      supabase = await createClient();
    } catch (clientError: any) {
      logger.error('Error creating Supabase client:', clientError);
      return NextResponse.json(
        { 
          error: 'Failed to initialize database connection',
          details: process.env.NODE_ENV === 'development' ? clientError.message : undefined
        },
        { status: 500 }
      );
    }

    // Kullanıcıyı bul
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, password_hash, is_active')
      .eq('email', email)
      .single();

    if (error) {
      logger.error('Database error fetching user:', {
        error: error.message,
        code: error.code,
        details: error.details
      });
      
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { error: 'Geçersiz email veya şifre' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz email veya şifre' },
        { status: 401 }
      );
    }

    // Aktif mi kontrol
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Hesabınız pasif durumda' },
        { status: 403 }
      );
    }

    // Şifre kontrolü
    let isPasswordValid = false;
    try {
      isPasswordValid = await comparePassword(password, user.password_hash);
    } catch (passwordError: any) {
      logger.error('Password comparison error:', passwordError);
      return NextResponse.json(
        { error: 'Şifre doğrulama hatası' },
        { status: 500 }
      );
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Geçersiz email veya şifre' },
        { status: 401 }
      );
    }

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
    const redirectUrl = user.role === 'operator' ? '/operator-dashboard' : '/dashboard';

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

    response.cookies.set('thunder_token', token, {
      httpOnly: true,
      secure: false, // Set to false for HTTP connections (change to true when using HTTPS)
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    logger.log(`✅ Login successful: ${user.email} (${user.role})`);
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


