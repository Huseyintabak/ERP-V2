-- Price History Tablosunu Düzelt
-- Eğer tablo varsa ve material_type kolonu yoksa ekle

-- Önce mevcut tabloyu kontrol et ve gerekirse material_type kolonunu ekle
DO $$
BEGIN
    -- Eğer price_history tablosu varsa ama material_type kolonu yoksa
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_history') THEN
        -- material_type kolonu yoksa ekle
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'price_history' AND column_name = 'material_type'
        ) THEN
            ALTER TABLE price_history ADD COLUMN material_type TEXT;
            ALTER TABLE price_history ADD CONSTRAINT price_history_material_type_check 
            CHECK (material_type IN ('raw', 'semi', 'finished'));
        END IF;
        
        -- old_price kolonu yoksa ekle
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'price_history' AND column_name = 'old_price'
        ) THEN
            ALTER TABLE price_history ADD COLUMN old_price NUMERIC(12, 2) DEFAULT 0;
        END IF;
        
        -- new_price kolonu yoksa ekle
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'price_history' AND column_name = 'new_price'
        ) THEN
            ALTER TABLE price_history ADD COLUMN new_price NUMERIC(12, 2) NOT NULL DEFAULT 0;
        END IF;
        
        -- effective_date kolonu yoksa ekle
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'price_history' AND column_name = 'effective_date'
        ) THEN
            ALTER TABLE price_history ADD COLUMN effective_date TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        -- changed_by kolonu yoksa ekle
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'price_history' AND column_name = 'changed_by'
        ) THEN
            ALTER TABLE price_history ADD COLUMN changed_by UUID REFERENCES users(id) ON DELETE SET NULL;
        END IF;
        
        -- change_reason kolonu yoksa ekle
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'price_history' AND column_name = 'change_reason'
        ) THEN
            ALTER TABLE price_history ADD COLUMN change_reason TEXT;
        END IF;
    ELSE
        -- Tablo yoksa oluştur
        CREATE TABLE price_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
            material_id UUID NOT NULL,
            old_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
            new_price NUMERIC(12, 2) NOT NULL,
            effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
            change_reason TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Index'leri oluştur
CREATE INDEX IF NOT EXISTS idx_price_history_material ON price_history(material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_by ON price_history(changed_by);

-- Mevcut verileri temizle (eğer varsa)
DELETE FROM price_history;

-- Raw materials için mevcut fiyatları price_history'ye aktar
INSERT INTO price_history (material_type, material_id, old_price, new_price, effective_date, change_reason)
SELECT 
    'raw',
    id,
    0,
    unit_price,
    created_at,
    'Initial price import'
FROM raw_materials
WHERE unit_price > 0;

-- Semi-finished products için mevcut fiyatları price_history'ye aktar
INSERT INTO price_history (material_type, material_id, old_price, new_price, effective_date, change_reason)
SELECT 
    'semi',
    id,
    0,
    unit_cost,
    created_at,
    'Initial price import'
FROM semi_finished_products
WHERE unit_cost > 0;

-- Finished products için mevcut fiyatları price_history'ye aktar
INSERT INTO price_history (material_type, material_id, old_price, new_price, effective_date, change_reason)
SELECT 
    'finished',
    id,
    0,
    sale_price,
    created_at,
    'Initial price import'
FROM finished_products
WHERE sale_price > 0;
