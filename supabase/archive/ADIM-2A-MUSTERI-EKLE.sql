-- =====================================================
-- ADIM 2A: Musteri Ekle
-- =====================================================

-- Test musterisi olustur
INSERT INTO customers (
    name,
    company,
    email,
    phone,
    address,
    tax_number,
    is_active
) VALUES (
    'LTSAUTO',
    'LTS Automotive Inc.',
    'info@ltsauto.com',
    '+90 212 555 1234',
    'Istanbul, Turkiye',
    '1234567890',
    true
)
ON CONFLICT (name) DO UPDATE SET is_active = true
RETURNING 
    id,
    name,
    'ADIM 2A BASARILI - Musteri eklendi' as result;

-- Tum musterileri goster
SELECT 
    id,
    name,
    company,
    email
FROM customers
ORDER BY name;

