import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    message: 'Logged out successfully',
    redirectUrl: '/login',
  });

  // Cookie'yi temizle
  response.cookies.set('thunder_token', '', {
    httpOnly: true,
    secure: false, // HTTP deployment için false
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));

  // Cookie'yi temizle
  response.cookies.set('thunder_token', '', {
    httpOnly: true,
    secure: false, // HTTP deployment için false
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}


