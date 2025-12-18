-- =====================================================
-- ADIM 1: BOM Kontrolu
-- =====================================================

-- Finished product ve BOM bilgilerini goster
SELECT 
    fp.code as product_code,
    fp.name as product_name,
    fp.barcode,
    fp.quantity as current_stock,
    bom.material_type,
    CASE 
        WHEN bom.material_type = 'raw' THEN rm.code
        ELSE sfp.code
    END as material_code,
    CASE 
        WHEN bom.material_type = 'raw' THEN rm.name
        ELSE sfp.name
    END as material_name,
    bom.quantity_needed
FROM finished_products fp
LEFT JOIN bom ON bom.finished_product_id = fp.id
LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
LEFT JOIN semi_finished_products sfp ON bom.material_type = 'semi' AND bom.material_id = sfp.id
WHERE fp.code LIKE 'NM%'
ORDER BY fp.code, bom.material_type;

-- Ozet
SELECT 
    COUNT(DISTINCT fp.id) as total_products,
    COUNT(bom.id) as total_bom_entries,
    CASE 
        WHEN COUNT(bom.id) > 0 
        THEN 'ADIM 1 BASARILI - BOM tanimli'
        ELSE 'UYARI - BOM eksik, BOM tanimlanmali'
    END as result
FROM finished_products fp
LEFT JOIN bom ON bom.finished_product_id = fp.id
WHERE fp.code LIKE 'NM%';

