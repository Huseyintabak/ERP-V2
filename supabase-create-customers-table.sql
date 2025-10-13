-- Müşteri tablosu oluştur
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  company VARCHAR(255),
  address TEXT,
  tax_number VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Orders tablosuna customer_id foreign key ekle
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- Örnek müşteri verileri
INSERT INTO customers (name, email, phone, company, address, tax_number) VALUES
('Ahmet Yılmaz', 'ahmet@example.com', '+90 555 123 4567', 'Yılmaz Ltd.', 'İstanbul, Türkiye', '1234567890'),
('Fatma Demir', 'fatma@example.com', '+90 555 234 5678', 'Demir A.Ş.', 'Ankara, Türkiye', '2345678901'),
('Mehmet Kaya', 'mehmet@example.com', '+90 555 345 6789', 'Kaya Ticaret', 'İzmir, Türkiye', '3456789012'),
('Ayşe Özkan', 'ayse@example.com', '+90 555 456 7890', 'Özkan Sanayi', 'Bursa, Türkiye', '4567890123'),
('Ali Çelik', 'ali@example.com', '+90 555 567 8901', 'Çelik Metal', 'Antalya, Türkiye', '5678901234');

