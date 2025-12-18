-- ============================================
-- RESET: Stokları UI Testi İçin Normale Çevir
-- ============================================

-- Çelik Levha'yı normale çevir (UI'de stok kontrolü geçebilsin)
UPDATE raw_materials
SET quantity = 10000
WHERE code = 'HM-CELIK-001';

-- Tüm hammaddeleri kontrol et
SELECT 
    name,
    code,
    quantity as current_stock,
    critical_level,
    CASE 
        WHEN quantity < critical_level THEN '⚠️ KRİTİK'
        ELSE '✅ Normal'
    END as status
FROM raw_materials
WHERE code IN ('HM-CELIK-001', 'HM-BOYA-001')
ORDER BY name;



