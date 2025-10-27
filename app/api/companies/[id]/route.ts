import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { z } from 'zod';

import { logger } from '@/lib/utils/logger';
const companyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  logo_url: z.string().url().optional(),
  website: z.string().url().optional(),
  tax_number: z.string().optional(),
  is_active: z.boolean().optional(),
  settings: z.object({
    timezone: z.string().optional(),
    currency: z.string().optional(),
    language: z.string().optional(),
    date_format: z.string().optional(),
    number_format: z.string().optional(),
    features: z.object({
      advanced_reporting: z.boolean().optional(),
      api_access: z.boolean().optional(),
      custom_branding: z.boolean().optional(),
      priority_support: z.boolean().optional(),
    }).optional(),
    limits: z.object({
      max_users: z.number().optional(),
      max_products: z.number().optional(),
      max_orders_per_month: z.number().optional(),
      storage_limit_gb: z.number().optional(),
    }).optional(),
  }).optional(),
  subscription_status: z.enum(['trial', 'active', 'suspended', 'cancelled']).optional(),
  subscription_expires_at: z.string().optional(),
});

// GET - Get company details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id: companyId } = await params;

    const supabase = await createClient();

    // Check permissions
    if (payload.role === 'super_admin') {
      // Super admin can access any company
    } else if (payload.role === 'yonetici' && payload.companyId === companyId) {
      // Company admin can access their own company
    } else {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get company details with user count
    const { data: company, error } = await supabase
      .from('companies')
      .select(`
        *,
        users!companies_id_fkey(count)
      `)
      .eq('id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      throw error;
    }

    // Transform data
    const transformedCompany = {
      ...company,
      user_count: company.users?.[0]?.count || 0,
    };

    return NextResponse.json({
      data: transformedCompany,
    });

  } catch (error: unknown) {
    logger.error('Company fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch company';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// PUT - Update company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id: companyId } = await params;

    const body = await request.json();
    const updateData = companyUpdateSchema.parse(body);

    const supabase = await createClient();

    // Check permissions
    if (payload.role !== 'super_admin' && payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if user belongs to this company (for non-super-admin)
    if (payload.role === 'yonetici' && payload.companyId !== companyId) {
      return NextResponse.json({ error: 'Can only update your own company' }, { status: 403 });
    }

    // Update company
    const { data: updatedCompany, error } = await supabase
      .from('companies')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Company updated successfully',
      data: updatedCompany,
    });

  } catch (error: unknown) {
    logger.error('Company update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to update company';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete company (Super Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id: companyId } = await params;

    // Only super admin can delete companies
    if (payload.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = await createClient();

    // Check if company exists and get user count
    const { data: company, error: fetchError } = await supabase
      .from('companies')
      .select(`
        *,
        users!companies_id_fkey(count)
      `)
      .eq('id', companyId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      throw fetchError;
    }

    const userCount = company.users?.[0]?.count || 0;

    if (userCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete company with active users',
        details: { userCount }
      }, { status: 400 });
    }

    // Delete company
    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: 'Company deleted successfully',
    });

  } catch (error: unknown) {
    logger.error('Company deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete company';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
