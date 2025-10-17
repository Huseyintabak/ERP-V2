import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { operatorSchema } from '@/types';
import { hashPassword } from '@/lib/auth/password';

// GET - List Operators
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('operators')
      .select(`
        *,
        user:users(id, name, email, is_active)
      `)
      .eq('user.is_active', true)
      .order('series');

    if (error) {
      console.error('❌ Operators GET error:', error);
      throw error;
    }

    console.log('✅ Operators data:', data);
    console.log('✅ Operators count:', data?.length || 0);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Operators API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create New Operator
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = operatorSchema.parse(body);
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

    const supabase = await createClient();

    // User context set et
    await supabase.rpc('set_user_context', { user_id: userId });

    // Varsayılan şifreyi al
    const { data: defaultPassword } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'default_operator_password')
      .single();

    const password = defaultPassword?.value || '123456';
    const hashedPassword = await hashPassword(password);

    // Transaction başlat (user + operator insert)
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        email: validated.email,
        name: validated.name,
        role: 'operator',
        password_hash: hashedPassword,
        is_active: true,
      }])
      .select('id')
      .single();

    if (userError) {
      if (userError.code === '23505') {
        return NextResponse.json({ error: 'Bu email zaten kullanımda' }, { status: 409 });
      }
      throw userError;
    }

    // Operator bilgilerini ekle
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .insert([{
        id: user.id,
        series: validated.series,
        experience_years: validated.experience_years,
        daily_capacity: validated.daily_capacity,
        location: validated.location,
        hourly_rate: validated.hourly_rate,
      }])
      .select(`
        *,
        user:users(id, name, email, is_active)
      `)
      .single();

    if (operatorError) throw operatorError;

    return NextResponse.json(operator, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
