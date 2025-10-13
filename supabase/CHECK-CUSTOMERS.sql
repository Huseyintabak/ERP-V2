-- =====================================================
-- Customers Tablosunu Kontrol Et
-- =====================================================

-- Tum musterileri goster
SELECT 
    id,
    name,
    company,
    email,
    phone,
    is_active,
    created_at
FROM customers
ORDER BY created_at DESC;

-- Musteri sayisi
SELECT 
    COUNT(*) as total_customers,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_customers
FROM customers;

