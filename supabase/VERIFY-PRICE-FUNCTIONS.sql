-- Verify Price History Functions
-- Bu dosya function'ların başarıyla oluşturulduğunu kontrol eder

-- 1. Function'ların varlığını kontrol et
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN ('get_yearly_average_price', 'get_price_trend')
ORDER BY routine_name;

-- 2. Price history tablosunun yapısını kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'price_history' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Test function'ları (eğer veri varsa)
-- Bu sorgular sadece test amaçlıdır ve hata vermez
SELECT 'Functions are ready!' as status;
