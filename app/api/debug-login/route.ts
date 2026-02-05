import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { comparePassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  const debugInfo: any = {
    step: 'start',
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    },
  };

  try {
    const { email, password } = await request.json();
    debugInfo.step = 'parsed_body';
    debugInfo.receivedEmail = email;
    debugInfo.receivedPasswordLength = password?.length;

    // Create Supabase client
    debugInfo.step = 'creating_supabase_client';
    const supabase = createAdminClient();
    debugInfo.step = 'supabase_client_created';

    // Query user
    debugInfo.step = 'querying_user';
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, password_hash, is_active')
      .eq('email', email)
      .single();

    if (error) {
      debugInfo.step = 'user_query_error';
      debugInfo.dbError = {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      };
      return NextResponse.json({ success: false, debug: debugInfo }, { status: 500 });
    }

    debugInfo.step = 'user_found';
    debugInfo.userFound = !!user;
    debugInfo.userEmail = user?.email;
    debugInfo.userRole = user?.role;
    debugInfo.userIsActive = user?.is_active;
    debugInfo.passwordHashPrefix = user?.password_hash?.substring(0, 20) + '...';
    debugInfo.expectedHashPrefix = '$2a$10$4ZCXIk.OUfI2/1...';

    if (!user) {
      return NextResponse.json({ success: false, reason: 'user_not_found', debug: debugInfo }, { status: 401 });
    }

    if (!user.is_active) {
      debugInfo.step = 'user_not_active';
      return NextResponse.json({ success: false, reason: 'user_not_active', debug: debugInfo }, { status: 403 });
    }

    // Compare password
    debugInfo.step = 'comparing_password';
    const isPasswordValid = await comparePassword(password, user.password_hash);
    debugInfo.step = 'password_compared';
    debugInfo.passwordValid = isPasswordValid;

    if (!isPasswordValid) {
      debugInfo.step = 'password_invalid';
      return NextResponse.json({ success: false, reason: 'password_invalid', debug: debugInfo }, { status: 401 });
    }

    debugInfo.step = 'login_success';
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      debug: debugInfo,
    });
  } catch (error: any) {
    debugInfo.step = 'exception';
    debugInfo.error = {
      name: error.name,
      message: error.message,
    };
    return NextResponse.json({ success: false, debug: debugInfo }, { status: 500 });
  }
}
