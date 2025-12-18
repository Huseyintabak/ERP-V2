-- Yarı mamul ürünler için BOM tablosu oluştur
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

-- İndeksleri oluştur
CREATE INDEX IF NOT EXISTS idx_semi_bom_product_id ON semi_bom(product_id);
CREATE INDEX IF NOT EXISTS idx_semi_bom_material_id ON semi_bom(material_id);
CREATE INDEX IF NOT EXISTS idx_semi_bom_material_type ON semi_bom(material_type);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_semi_bom_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER semi_bom_updated_at_trigger
    BEFORE UPDATE ON semi_bom
    FOR EACH ROW
    EXECUTE FUNCTION update_semi_bom_updated_at();

SELECT '✅ SEMI_BOM TABLE CREATED!' as result;
