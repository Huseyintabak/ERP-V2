-- ============================================
-- ADIM 5: CRITICAL STOCK NOTIFICATION TEST
-- ============================================

-- 1. Endüstriyel Kapı'nın BOM'unu kontrol et
SELECT 
    'BOM Materials' as info,
    CASE 
        WHEN b.material_type = 'raw' THEN rm.name
        WHEN b.material_type = 'semi' THEN sfp.name
    END as material_name,
    CASE 
        WHEN b.material_type = 'raw' THEN rm.code
        WHEN b.material_type = 'semi' THEN sfp.code
    END as material_code,
    b.quantity_needed,
    CASE 
        WHEN b.material_type = 'raw' THEN rm.quantity
        WHEN b.material_type = 'semi' THEN sfp.quantity
    END as current_stock,
    CASE 
        WHEN b.material_type = 'raw' THEN rm.critical_level
        WHEN b.material_type = 'semi' THEN sfp.critical_level
    END as critical_level
FROM bom b
LEFT JOIN raw_materials rm ON b.material_type = 'raw' AND b.material_id = rm.id
LEFT JOIN semi_finished_products sfp ON b.material_type = 'semi' AND b.material_id = sfp.id
WHERE b.finished_product_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ORDER BY material_name;

-- 2. Bir hammaddenin stokunu kritik seviyenin ALTINA düşür (test için)
-- Alüminyum Profil'i kritik seviyeye getir

-- Önce mevcut stoğu kaydet
DO $$
DECLARE
    v_material_id UUID;
    v_current_stock DECIMAL;
    v_critical_level DECIMAL;
BEGIN
    -- İlk hammaddeyi bul (BOM'dan)
    SELECT material_id INTO v_material_id
    FROM bom
    WHERE finished_product_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      AND material_type = 'raw'
    LIMIT 1;
    
    -- Mevcut stok ve kritik seviyeyi al
    SELECT quantity, critical_level
    INTO v_current_stock, v_critical_level
    FROM raw_materials
    WHERE id = v_material_id;
    
    RAISE NOTICE 'Hammadde ID: %', v_material_id;
    RAISE NOTICE 'Mevcut Stok: %', v_current_stock;
    RAISE NOTICE 'Kritik Seviye: %', v_critical_level;
    
    -- Stoğu kritik seviyenin 10 birim ALTINA düşür
    UPDATE raw_materials
    SET quantity = v_critical_level - 10
    WHERE id = v_material_id;
    
    RAISE NOTICE '✅ Stok kritik seviyenin altına düşürüldü: %', v_critical_level - 10;
    
END $$;

-- 3. Güncellenmiş stok durumunu göster
SELECT 
    'Updated Stock' as info,
    rm.name,
    rm.code,
    rm.quantity as current_stock,
    rm.critical_level,
    rm.quantity - rm.critical_level as diff,
    CASE 
        WHEN rm.quantity < rm.critical_level THEN '⚠️ KRİTİK!'
        ELSE '✅ Normal'
    END as stock_status
FROM raw_materials rm
WHERE rm.id IN (
    SELECT material_id 
    FROM bom 
    WHERE finished_product_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      AND material_type = 'raw'
)
ORDER BY rm.name;

