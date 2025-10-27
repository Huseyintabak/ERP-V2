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

    const supabase = await createClient();

    // Kullanıcıyı bul
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, password_hash, is_active')
      .eq('email', email)
      .single();

    if (error || !user) {
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
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Geçersiz email veya şifre' },
        { status: 401 }
      );
    }

    // JWT oluştur
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

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
      secure: false, // HTTP deployment için false
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Login error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}


