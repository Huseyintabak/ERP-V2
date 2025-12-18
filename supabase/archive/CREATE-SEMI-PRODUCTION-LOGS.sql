-- Yarı mamul üretim logs tablosu oluştur
CREATE TABLE IF NOT EXISTS semi_production_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES semi_production_orders(id) ON DELETE CASCADE,
    operator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barcode_scanned VARCHAR(100) NOT NULL,
    quantity_produced INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksleri oluştur
CREATE INDEX IF NOT EXISTS idx_semi_production_logs_order_id ON semi_production_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_semi_production_logs_operator_id ON semi_production_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_semi_production_logs_created_at ON semi_production_logs(created_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_semi_production_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER semi_production_logs_updated_at_trigger
    BEFORE UPDATE ON semi_production_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_semi_production_logs_updated_at();

-- RLS politikaları
ALTER TABLE semi_production_logs ENABLE ROW LEVEL SECURITY;

-- Operatörler sadece kendi logs'larını görebilir
CREATE POLICY "Operatörler kendi logs'larını görebilir" ON semi_production_logs
    FOR SELECT USING (operator_id = auth.uid());

-- Operatörler kendi logs'larını oluşturabilir
CREATE POLICY "Operatörler kendi logs'larını oluşturabilir" ON semi_production_logs
    FOR INSERT WITH CHECK (operator_id = auth.uid());

-- Yöneticiler ve planlama tüm logs'ları görebilir
CREATE POLICY "Yöneticiler ve planlama tüm logs'ları görebilir" ON semi_production_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('yonetici', 'planlama')
        )
    );

SELECT '✅ SEMI PRODUCTION LOGS TABLE CREATED!' as result;
