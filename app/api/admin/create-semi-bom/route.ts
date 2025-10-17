import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = await createClient();

    // semi_bom tablosunu oluştur
    const { error: createTableError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS semi_bom (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL REFERENCES semi_finished_products(id) ON DELETE CASCADE,
            material_id UUID NOT NULL,
            material_type VARCHAR(20) NOT NULL CHECK (material_type IN ('raw', 'semi')),
            quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_id, material_id)
        );
      `
    });

    if (createTableError) {
      console.error('Table creation error:', createTableError);
      return NextResponse.json({ error: createTableError.message }, { status: 500 });
    }

    // İndeksleri oluştur
    const { error: indexError } = await supabase.rpc('exec', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_semi_bom_product_id ON semi_bom(product_id);
        CREATE INDEX IF NOT EXISTS idx_semi_bom_material_id ON semi_bom(material_id);
        CREATE INDEX IF NOT EXISTS idx_semi_bom_material_type ON semi_bom(material_type);
      `
    });

    if (indexError) {
      console.error('Index creation error:', indexError);
      // Index hatası kritik değil, devam et
    }

    // Trigger fonksiyonunu oluştur
    const { error: triggerError } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION update_semi_bom_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (triggerError) {
      console.error('Trigger function creation error:', triggerError);
    }

    // Trigger'ı oluştur
    const { error: triggerCreateError } = await supabase.rpc('exec', {
      sql: `
        DROP TRIGGER IF EXISTS semi_bom_updated_at_trigger ON semi_bom;
        CREATE TRIGGER semi_bom_updated_at_trigger
            BEFORE UPDATE ON semi_bom
            FOR EACH ROW
            EXECUTE FUNCTION update_semi_bom_updated_at();
      `
    });

    if (triggerCreateError) {
      console.error('Trigger creation error:', triggerCreateError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'semi_bom table created successfully' 
    });

  } catch (error) {
    console.error('Create semi_bom table error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
