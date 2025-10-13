-- ==========================================
-- Thunder ERP v2 - Check Existing Sequences
-- ==========================================
-- Mevcut sequence'leri kontrol et

SELECT 
  sequence_name,
  data_type,
  start_value,
  minimum_value,
  maximum_value,
  increment,
  cycle_option
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

