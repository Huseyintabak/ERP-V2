import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { z } from 'zod';

// Company schema for multi-tenant support
const companySchema = z.object({
  name: z.string().min(1, 'Şirket adı gerekli'),
  code: z.string().min(1, 'Şirket kodu gerekli').regex(/^[A-Z0-9-_]+$/, 'Kod sadece büyük harf, rakam, tire ve alt çizgi içerebilir'),
  email: z.string().email('Geçerli email adresi gerekli'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('Turkey'),
  logo_url: z.string().url().optional(),
  website: z.string().url().optional(),
  tax_number: z.string().optional(),
  is_active: z.boolean().default(true),
  settings: z.object({
    timezone: z.string().default('Europe/Istanbul'),
    currency: z.string().default('TRY'),
    language: z.string().default('tr'),
    date_format: z.string().default('DD/MM/YYYY'),
    number_format: z.string().default('tr-TR'),
    features: z.object({
      advanced_reporting: z.boolean().default(false),
      api_access: z.boolean().default(false),
      custom_branding: z.boolean().default(false),
      priority_support: z.boolean().default(false),
    }).default({}),
    limits: z.object({
      max_users: z.number().default(10),
      max_products: z.number().default(1000),
      max_orders_per_month: z.number().default(500),
      storage_limit_gb: z.number().default(5),
    }).default({}),
  }).default({}),
});

const companyUpdateSchema = companySchema.partial();

interface Company {
  id: string;
  name: string;
  code: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  logo_url?: string;
  website?: string;
  tax_number?: string;
  is_active: boolean;
  settings: any;
  created_at: string;
  updated_at: string;
  user_count: number;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_expires_at?: string;
}

// GET - List companies (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only super admin can access company management
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('companies')
      .select(`
        *,
        users!companies_id_fkey(count)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      } else if (status === 'trial') {
        query = query.eq('subscription_status', 'trial');
      }
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: companies, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data
    const transformedCompanies = companies?.map((company: any) => ({
      ...company,
      user_count: company.users?.[0]?.count || 0,
    })) || [];

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      data: transformedCompanies,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: totalPages,
      },
    });

  } catch (error: unknown) {
    console.error('Companies list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch companies';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Create new company
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only super admin can create companies
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const companyData = companySchema.parse(body);

    const supabase = await createClient();

    // Check if company code already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('code', companyData.code)
      .single();

    if (existingCompany) {
      return NextResponse.json({ 
        error: 'Bu şirket kodu zaten kullanılıyor' 
      }, { status: 400 });
    }

    // Create company
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert([{
        ...companyData,
        subscription_status: 'trial',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Create default admin user for the company
    const defaultPassword = 'Admin123!';
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .insert([{
        email: companyData.email,
        name: `${companyData.name} Admin`,
        password_hash: hashedPassword,
        role: 'yonetici',
        company_id: newCompany.id,
        is_active: true,
      }])
      .select()
      .single();

    if (userError) {
      // If user creation fails, clean up the company
      await supabase.from('companies').delete().eq('id', newCompany.id);
      throw userError;
    }

    return NextResponse.json({
      message: 'Şirket başarıyla oluşturuldu',
      company: newCompany,
      adminUser: {
        email: adminUser.email,
        name: adminUser.name,
        defaultPassword,
      },
    });

  } catch (error: unknown) {
    console.error('Company creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to create company';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
