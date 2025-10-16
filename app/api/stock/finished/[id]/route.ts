import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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
    const { id } = await params;
    const supabase = await createClient();

    const { data: product, error } = await supabase
      .from('finished_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching finished product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { id } = await params;
    const supabase = await createClient();

    // Only managers and planlama can update products
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData = await request.json();

    const { data: product, error } = await supabase
      .from('finished_products')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update product' }, { status: 400 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating finished product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { id } = await params;
    const supabase = await createClient();

    // Only managers and planlama can delete products
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if product is referenced in other tables
    const { data: bomReferences } = await supabase
      .from('bom')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (bomReferences && bomReferences.length > 0) {
      return NextResponse.json({ 
        error: 'Bu ürün BOM\'da kullanılıyor. Önce BOM\'dan kaldırın.' 
      }, { status: 400 });
    }

    const { data: orderReferences } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', id)
      .limit(1);

    if (orderReferences && orderReferences.length > 0) {
      return NextResponse.json({ 
        error: 'Bu ürün siparişlerde kullanılıyor. Önce siparişlerden kaldırın.' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('finished_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete product', 
        details: error.message 
      }, { status: 400 });
    }

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting finished product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}