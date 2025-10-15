-- Excel Import/Export Hata Yönetimi Sistemi
-- Detaylı hata raporları ve çözüm önerileri

-- 1. Excel hata logları tablosu
CREATE TABLE IF NOT EXISTS excel_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('import', 'export')),
    operation_type TEXT NOT NULL CHECK (operation_type IN ('stock', 'orders', 'production', 'bom', 'users')),
    error_type TEXT NOT NULL CHECK (error_type IN ('format', 'validation', 'data', 'system', 'permission')),
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB,
    row_number INTEGER,
    column_name TEXT,
    cell_value TEXT,
    expected_format TEXT,
    solution_suggestion TEXT,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'resolved', 'ignored')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_excel_errors_user ON excel_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_excel_errors_type ON excel_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_excel_errors_severity ON excel_error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_excel_errors_status ON excel_error_logs(status);
CREATE INDEX IF NOT EXISTS idx_excel_errors_created ON excel_error_logs(created_at);

-- 2. Excel hata kategorileri ve çözüm önerileri
CREATE TABLE IF NOT EXISTS excel_error_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_code TEXT UNIQUE NOT NULL,
    error_type TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    common_causes TEXT[],
    solution_steps TEXT[],
    prevention_tips TEXT[],
    severity TEXT NOT NULL DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Hata şablonlarını ekle
INSERT INTO excel_error_templates (error_code, error_type, operation_type, title, description, common_causes, solution_steps, prevention_tips, severity) VALUES
-- Format Hataları
('FORMAT_INVALID_FILE', 'format', 'stock', 'Geçersiz Dosya Formatı', 'Yüklenen dosya Excel formatında değil veya bozuk', 
 ARRAY['Dosya .xlsx uzantısında değil', 'Dosya bozuk veya şifreli', 'Dosya çok büyük'],
 ARRAY['Dosyanın .xlsx formatında olduğundan emin olun', 'Dosyayı yeniden kaydedin', 'Dosya boyutunu kontrol edin'],
 ARRAY['Excel dosyalarını doğru formatta kaydedin', 'Dosya boyutunu 10MB altında tutun'],
 'high'),

('FORMAT_MISSING_HEADERS', 'format', 'stock', 'Eksik Sütun Başlıkları', 'Gerekli sütun başlıkları bulunamadı',
 ARRAY['Sütun başlıkları yanlış yazılmış', 'Sütun başlıkları eksik', 'Sütun sırası yanlış'],
 ARRAY['Sütun başlıklarını kontrol edin', 'Örnek dosyayı indirip kullanın', 'Sütun sırasını doğrulayın'],
 ARRAY['Örnek dosyayı şablon olarak kullanın', 'Sütun başlıklarını kopyala-yapıştır yapın'],
 'high'),

-- Validasyon Hataları
('VALIDATION_REQUIRED_FIELD', 'validation', 'stock', 'Zorunlu Alan Boş', 'Zorunlu alanlar boş bırakılmış',
 ARRAY['Kod alanı boş', 'Ad alanı boş', 'Miktar alanı boş'],
 ARRAY['Boş alanları doldurun', 'Zorunlu alanları kontrol edin', 'Veri girişini tamamlayın'],
 ARRAY['Veri girişi yaparken zorunlu alanları işaretleyin', 'Form validasyonu kullanın'],
 'medium'),

('VALIDATION_INVALID_NUMBER', 'validation', 'stock', 'Geçersiz Sayı Formatı', 'Sayısal alanlarda geçersiz değer',
 ARRAY['Negatif sayı girişi', 'Ondalık ayırıcı yanlış', 'Metin değeri sayı alanında'],
 ARRAY['Sayısal değerleri kontrol edin', 'Ondalık ayırıcıyı nokta (.) kullanın', 'Negatif değerleri düzeltin'],
 ARRAY['Sayısal alanları doğru formatta girin', 'Veri tiplerini kontrol edin'],
 'medium'),

('VALIDATION_DUPLICATE_CODE', 'validation', 'stock', 'Tekrarlanan Kod', 'Aynı kod birden fazla kez kullanılmış',
 ARRAY['Ürün kodu tekrarı', 'Barkod tekrarı', 'Kod formatı yanlış'],
 ARRAY['Tekrarlanan kodları bulun', 'Benzersiz kodlar kullanın', 'Kod formatını kontrol edin'],
 ARRAY['Kod oluşturma kurallarını belirleyin', 'Otomatik kod üretimi kullanın'],
 'high'),

-- Veri Hataları
('DATA_NOT_FOUND', 'data', 'stock', 'Veri Bulunamadı', 'Referans verisi bulunamadı',
 ARRAY['Ürün kodu mevcut değil', 'Kategori bulunamadı', 'Birim bulunamadı'],
 ARRAY['Veri tabanındaki kayıtları kontrol edin', 'Referans verilerini güncelleyin', 'Veri eşleştirmesini yapın'],
 ARRAY['Referans verilerini önceden hazırlayın', 'Veri eşleştirme tablosu kullanın'],
 'medium'),

('DATA_CONSTRAINT_VIOLATION', 'data', 'stock', 'Veri Kısıt İhlali', 'Veri tabanı kısıtları ihlal edilmiş',
 ARRAY['Foreign key hatası', 'Unique constraint hatası', 'Check constraint hatası'],
 ARRAY['Veri ilişkilerini kontrol edin', 'Kısıtları gözden geçirin', 'Veri yapısını düzeltin'],
 ARRAY['Veri modelini anlayın', 'İlişkileri doğru kurun'],
 'high'),

-- Sistem Hataları
('SYSTEM_TIMEOUT', 'system', 'stock', 'Sistem Zaman Aşımı', 'İşlem zaman aşımına uğradı',
 ARRAY['Dosya çok büyük', 'Sistem yavaş', 'Ağ bağlantısı sorunu'],
 ARRAY['Dosya boyutunu küçültün', 'İşlemi tekrar deneyin', 'Sistem durumunu kontrol edin'],
 ARRAY['Büyük dosyaları parçalara bölün', 'Sistem performansını izleyin'],
 'medium'),

('SYSTEM_MEMORY_ERROR', 'system', 'stock', 'Bellek Hatası', 'Sistem belleği yetersiz',
 ARRAY['Dosya çok büyük', 'Sistem kaynakları yetersiz', 'Eşzamanlı işlem çok'],
 ARRAY['Dosya boyutunu küçültün', 'Sistem kaynaklarını serbest bırakın', 'İşlemi tekrar deneyin'],
 ARRAY['Dosya boyutunu sınırlayın', 'Sistem kaynaklarını izleyin'],
 'high'),

-- İzin Hataları
('PERMISSION_DENIED', 'permission', 'stock', 'İzin Hatası', 'İşlem için gerekli izin yok',
 ARRAY['Kullanıcı rolü yetersiz', 'Dosya erişim izni yok', 'Veri değiştirme izni yok'],
 ARRAY['Kullanıcı izinlerini kontrol edin', 'Yönetici ile iletişime geçin', 'Rol atamasını kontrol edin'],
 ARRAY['Kullanıcı rollerini düzenli kontrol edin', 'İzin matrisini güncelleyin'],
 'critical');

-- 4. Hata loglama fonksiyonu
CREATE OR REPLACE FUNCTION log_excel_error(
    p_user_id UUID,
    p_file_name TEXT,
    p_file_type TEXT,
    p_operation_type TEXT,
    p_error_code TEXT,
    p_error_message TEXT,
    p_error_details JSONB DEFAULT NULL,
    p_row_number INTEGER DEFAULT NULL,
    p_column_name TEXT DEFAULT NULL,
    p_cell_value TEXT DEFAULT NULL,
    p_expected_format TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    error_id UUID;
    template_record RECORD;
    solution_suggestion TEXT;
    severity_level TEXT;
BEGIN
    -- Hata şablonunu bul
    SELECT * INTO template_record 
    FROM excel_error_templates 
    WHERE error_code = p_error_code AND is_active = true;
    
    -- Çözüm önerisi ve şiddet seviyesi belirle
    IF template_record.id IS NOT NULL THEN
        solution_suggestion := array_to_string(template_record.solution_steps, '; ');
        severity_level := template_record.severity;
    ELSE
        solution_suggestion := 'Genel hata - sistem yöneticisi ile iletişime geçin';
        severity_level := 'medium';
    END IF;
    
    -- Hata logunu kaydet
    INSERT INTO excel_error_logs (
        user_id, file_name, file_type, operation_type, error_type,
        error_code, error_message, error_details, row_number, column_name,
        cell_value, expected_format, solution_suggestion, severity
    ) VALUES (
        p_user_id, p_file_name, p_file_type, p_operation_type, 
        COALESCE(template_record.error_type, 'system'),
        p_error_code, p_error_message, p_error_details, p_row_number, p_column_name,
        p_cell_value, p_expected_format, solution_suggestion, severity_level
    ) RETURNING id INTO error_id;
    
    RETURN error_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Hata istatistikleri fonksiyonu
CREATE OR REPLACE FUNCTION get_excel_error_stats(
    p_user_id UUID DEFAULT NULL,
    p_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_errors INTEGER;
    errors_by_type JSONB;
    errors_by_severity JSONB;
    recent_errors INTEGER;
BEGIN
    -- Toplam hata sayısı
    SELECT COUNT(*) INTO total_errors
    FROM excel_error_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND created_at > NOW() - INTERVAL '1 day' * p_days;
    
    -- Hata türüne göre dağılım
    SELECT jsonb_object_agg(error_type, count) INTO errors_by_type
    FROM (
        SELECT error_type, COUNT(*) as count
        FROM excel_error_logs
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND created_at > NOW() - INTERVAL '1 day' * p_days
        GROUP BY error_type
    ) t;
    
    -- Şiddet seviyesine göre dağılım
    SELECT jsonb_object_agg(severity, count) INTO errors_by_severity
    FROM (
        SELECT severity, COUNT(*) as count
        FROM excel_error_logs
        WHERE (p_user_id IS NULL OR user_id = p_user_id)
        AND created_at > NOW() - INTERVAL '1 day' * p_days
        GROUP BY severity
    ) t;
    
    -- Son 7 gündeki hata sayısı
    SELECT COUNT(*) INTO recent_errors
    FROM excel_error_logs
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
    AND created_at > NOW() - INTERVAL '7 days';
    
    result := jsonb_build_object(
        'success', true,
        'stats', jsonb_build_object(
            'total_errors', total_errors,
            'recent_errors', recent_errors,
            'errors_by_type', COALESCE(errors_by_type, '{}'::jsonb),
            'errors_by_severity', COALESCE(errors_by_severity, '{}'::jsonb),
            'period_days', p_days,
            'timestamp', NOW()
        )
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Hata istatistikleri alınamadı'
        );
END;
$$ LANGUAGE plpgsql;

-- 6. Hata çözüm fonksiyonu
CREATE OR REPLACE FUNCTION resolve_excel_error(
    p_error_id UUID,
    p_resolved_by UUID,
    p_resolution_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Hatayı çözüldü olarak işaretle
    UPDATE excel_error_logs 
    SET status = 'resolved',
        resolved_by = p_resolved_by,
        resolved_at = NOW(),
        resolution_notes = p_resolution_notes
    WHERE id = p_error_id;
    
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'Hata başarıyla çözüldü olarak işaretlendi'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Hata bulunamadı'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Hata çözüm işlemi başarısız'
        );
END;
$$ LANGUAGE plpgsql;
