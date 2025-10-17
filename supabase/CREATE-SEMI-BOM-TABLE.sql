-- Yarı mamul ürünler için BOM tablosu oluştur
CREATE TABLE IF NOT EXISTS semi_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semi_product_id UUID NOT NULL REFERENCES semi_finished_products(id) ON DELETE CASCADE,
    material_id UUID NOT NULL,
    material_type VARCHAR(20) NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
    quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(20) DEFAULT 'adet',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: aynı yarı mamul ürün için aynı malzeme sadece bir kez olabilir
    UNIQUE(semi_product_id, material_id, material_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_semi_bom_semi_product_id ON semi_bom(semi_product_id);
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

-- RLS (Row Level Security) politikaları
ALTER TABLE semi_bom ENABLE ROW LEVEL SECURITY;

-- Yöneticiler ve planlama tüm BOM kayıtlarını görebilir
CREATE POLICY "Yonetici ve planlama tüm yarı mamul BOM'ları görebilir" ON semi_bom
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('yonetici', 'planlama')
        )
    );

-- Yöneticiler ve planlama BOM oluşturabilir
CREATE POLICY "Yonetici ve planlama yarı mamul BOM oluşturabilir" ON semi_bom
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('yonetici', 'planlama')
        )
    );

-- Yöneticiler ve planlama BOM güncelleyebilir
CREATE POLICY "Yonetici ve planlama yarı mamul BOM güncelleyebilir" ON semi_bom
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('yonetici', 'planlama')
        )
    );

-- Sadece yöneticiler BOM silebilir
CREATE POLICY "Sadece yöneticiler yarı mamul BOM silebilir" ON semi_bom
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'yonetici'
        )
    );

SELECT '✅ SEMI BOM TABLE CREATED!' as result;
