import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const customerPricingSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  specialPrice: z.number().positive(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional()
});

/**
 * POST /api/pricing/customer-special
 * Müşteri özel fiyat oluşturur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = customerPricingSchema.parse(body);

    const supabase = await createClient();

    // Müşteri ve ürünü kontrol et
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', validated.customerId)
      .single();

    const { data: product } = await supabase
      .from('finished_products')
      .select('id, code, name, sale_price')
      .eq('id', validated.productId)
      .single();

    if (!customer || !product) {
      return NextResponse.json(
        { error: 'Müşteri veya ürün bulunamadı' },
        { status: 404 }
      );
    }

    // Özel fiyat oluştur
    const { data: pricing, error: pricingError } = await supabase
      .from('customer_pricing')
      .insert([{
        customer_id: validated.customerId,
        product_id: validated.productId,
        special_price: validated.specialPrice,
        valid_from: validated.validFrom || new Date().toISOString().split('T')[0],
        valid_until: validated.validUntil || null,
        notes: validated.notes,
        is_active: true
      }])
      .select()
      .single();

    if (pricingError) {
      // Unique constraint hatası kontrolü
      if (pricingError.code === '23505') {
        return NextResponse.json(
          { error: 'Bu müşteri için bu ürüne zaten özel fiyat tanımlı' },
          { status: 409 }
        );
      }
      throw pricingError;
    }

    // İndirim yüzdesi hesapla
    const discount = ((parseFloat(product.sale_price) - validated.specialPrice) / parseFloat(product.sale_price)) * 100;

    return NextResponse.json({
      success: true,
      data: pricing,
      details: {
        customer: customer.name,
        product: `${product.code} - ${product.name}`,
        standard_price: parseFloat(product.sale_price),
        special_price: validated.specialPrice,
        discount_percentage: Math.round(discount * 100) / 100,
        savings: parseFloat(product.sale_price) - validated.specialPrice
      }
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Geçersiz veri', details: error.errors },
        { status: 400 }
      );
    }

    console.error('❌ Customer pricing error:', error);
    return NextResponse.json(
      { error: error.message || 'Özel fiyat oluşturulamadı' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pricing/customer-special
 * Aktif müşteri özel fiyatlarını listeler
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');

    const supabase = await createClient();

    let query = supabase
      .from('v_active_customer_pricing')
      .select('*')
      .order('valid_from', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error: any) {
    console.error('❌ Customer pricing list error:', error);
    return NextResponse.json(
      { error: error.message || 'Özel fiyatlar listelenemedi' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pricing/customer-special
 * Müşteri özel fiyatı pasif yapar
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pricingId = searchParams.get('id');

    if (!pricingId) {
      return NextResponse.json(
        { error: 'Pricing ID gerekli' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('customer_pricing')
      .update({ is_active: false })
      .eq('id', pricingId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Özel fiyat pasif yapıldı'
    });

  } catch (error: any) {
    console.error('❌ Customer pricing delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Özel fiyat silinemedi' },
      { status: 500 }
    );
  }
}

