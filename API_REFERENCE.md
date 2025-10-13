# Thunder ERP v2 - API Referansı

## Genel Bilgiler

- **Base URL:** `http://localhost:3000/api`
- **Authentication:** JWT Token (httpOnly cookie)
- **Content-Type:** `application/json`
- **Error Format:** `{ error: string, details?: any }`

---

## Authentication Endpoints

### POST /api/auth/login

**Açıklama:** Kullanıcı girişi (Yönetici, Planlama, Depo, Operatör)

**Request:**
```json
{
  "email": "admin@thunder.com",
  "password": "Admin123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@thunder.com",
    "name": "Admin User",
    "role": "yonetici"
  },
  "token": "jwt-token-here"
}
```

**Errors:**
- 401: Invalid credentials
- 400: Missing email or password

**Sets Cookie:** `thunder_token` (httpOnly, secure, sameSite)

---

### POST /api/auth/logout

**Açıklama:** Çıkış yap (cookie temizle)

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me

**Açıklama:** Mevcut kullanıcı bilgilerini getir

**Headers:** `Cookie: thunder_token=...`

**Response (200):**
```json
{
  "id": "uuid",
  "email": "admin@thunder.com",
  "name": "Admin User",
  "role": "yonetici"
}
```

**Errors:**
- 401: Unauthorized (token yok veya geçersiz)

---

## Stock Management Endpoints

### GET /api/stock

**Açıklama:** Tüm stok verilerini getir (sayfalama + filtreleme)

**Query Params:**
- `type`: 'raw' | 'semi' | 'finished' (opsiyonel)
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başı kayıt (default: 50, max: 200)
- `search`: Kod, ad veya barkodda arama
- `sort`: Sıralama alanı (code, name, quantity, created_at)
- `order`: 'asc' | 'desc' (default: asc)

**Response (200):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 523,
    "totalPages": 11,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Örnek:**
```
GET /api/stock?type=raw&page=2&limit=20&search=Çelik&sort=name&order=asc
```

---

### POST /api/stock/raw

**Açıklama:** Hammadde ekle

**Request:**
```json
{
  "code": "HM-001",
  "name": "Çelik Sac",
  "barcode": "1234567890123",
  "quantity": 100,
  "unit": "kg",
  "unit_price": 50.00,
  "critical_level": 10,
  "description": "Galvaniz çelik sac 2mm"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "code": "HM-001",
  "name": "Çelik Sac",
  ...
}
```

**Errors:**
- 409: Code or barcode already exists
- 400: Validation error

---

### PUT /api/stock/raw/:id

**Açıklama:** Hammadde güncelle

**Request:** (Güncellenecek alanlar)
```json
{
  "quantity": 150,
  "unit_price": 55.00,
  "critical_level": 15
}
```

**Response (200):** (Güncellenmiş kayıt)

---

### DELETE /api/stock/raw/:id

**Açıklama:** Hammadde sil

**Response (200):**
```json
{
  "message": "Deleted successfully"
}
```

**Errors:**
- 409: Cannot delete (used in BOM)

---

### POST /api/stock/semi

**Açıklama:** Yarı mamul ekle

**Request:**
```json
{
  "code": "YM-001",
  "name": "Plaka A",
  "barcode": "2234567890001",
  "quantity": 50,
  "unit": "adet",
  "unit_cost": 120.00,
  "critical_level": 10,
  "description": "İşlenmiş çelik plaka"
}
```

**Response (201):** (Oluşturulan yarı mamul)

**Errors:**
- 409: Code or barcode already exists
- 400: Validation error

---

### PUT /api/stock/semi/:id

**Açıklama:** Yarı mamul güncelle

**Request:** (Güncellenecek alanlar)
```json
{
  "quantity": 75,
  "unit_cost": 125.00
}
```

**Response (200):** (Güncellenmiş kayıt)

---

### DELETE /api/stock/semi/:id

**Açıklama:** Yarı mamul sil

**Response (200):**
```json
{
  "message": "Deleted successfully"
}
```

**Errors:**
- 409: Cannot delete (used in BOM)

---

### POST /api/stock/finished

**Açıklama:** Nihai ürün ekle

**Request:**
```json
{
  "code": "NU-001",
  "name": "Ürün X Model A",
  "barcode": "3234567890001",
  "quantity": 0,
  "unit": "adet",
  "sale_price": 500.00,
  "critical_level": 5,
  "description": "Thunder ERP Ürün X"
}
```

**Response (201):** (Oluşturulan nihai ürün)

**Errors:**
- 409: Code or barcode already exists
- 400: Validation error

---

### PUT /api/stock/finished/:id

**Açıklama:** Nihai ürün güncelle

**Request:** (Güncellenecek alanlar)
```json
{
  "sale_price": 550.00,
  "critical_level": 3
}
```

**Response (200):** (Güncellenmiş kayıt)

---

### DELETE /api/stock/finished/:id

**Açıklama:** Nihai ürün sil

**Response (200):**
```json
{
  "message": "Deleted successfully"
}
```

**Errors:**
- 409: Cannot delete (has active orders or BOM entries)

---

### POST /api/stock/movement

**Açıklama:** Manuel stok hareketi (giriş/çıkış)

**Request:**
```json
{
  "material_type": "raw",
  "material_id": "uuid",
  "movement_type": "giris",
  "quantity": 50,
  "description": "Tedarikçiden gelen mal"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "material_type": "raw",
  ...
}
```

**Side Effect:** İlgili malzemenin quantity değeri güncellenir

---

### POST /api/stock/import

**Açıklama:** Excel'den stok import (hatalı satırlar atlanır, geçerliler eklenir)

**Request:** `multipart/form-data`
- `file`: Excel file (.xlsx)
- `type`: 'raw' | 'semi' | 'finished'

**Response (200):**
```json
{
  "imported": 45,
  "failed": 2,
  "skipped": 3,
  "errors": [
    { "row": 12, "error": "Duplicate code HM-005" },
    { "row": 24, "error": "Invalid barcode format" }
  ],
  "warnings": [
    { "row": 8, "warning": "Empty description" }
  ]
}
```

**İşlem Akışı:**
- Tüm satırlar validation'dan geçirilir
- Hatalı satırlar atlanır (errors array'ine eklenir)
- Geçerli satırlar transaction içinde import edilir
- Transaction başarılı olursa commit, hata varsa rollback

---

### GET /api/stock/export

**Açıklama:** Stok verilerini Excel olarak indir

**Query Params:**
- `type`: 'raw' | 'semi' | 'finished' (opsiyonel, yoksa tümü)

**Response:** Excel file (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

---

## Production & Orders Endpoints

### GET /api/orders

**Açıklama:** Siparişleri listele (sayfalama + filtreleme)

**Query Params:**
- `status`: 'beklemede' | 'uretimde' | 'tamamlandi' (opsiyonel)
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başı kayıt (default: 50)
- `search`: Sipariş no veya müşteri adında arama
- `sort`: Sıralama (order_number, delivery_date, priority, created_at)
- `order`: 'asc' | 'desc'

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "order_number": "ORD-2025-001",
      "customer_name": "ABC Ltd.",
      "product": { "id": "uuid", "name": "Ürün A", "code": "NM-001" },
      "quantity": 100,
      "delivery_date": "2025-10-15",
      "priority": "yuksek",
      "status": "beklemede",
      "created_by": { "id": "uuid", "name": "Planlama User" },
      "created_at": "2025-10-06T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### POST /api/orders

**Açıklama:** Yeni sipariş ekle (sipariş numarası otomatik üretilir)

**Request:**
```json
{
  "customer_name": "ABC Ltd.",
  "product_id": "uuid",
  "quantity": 100,
  "delivery_date": "2025-10-15",
  "priority": "yuksek",
  "assigned_operator_id": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "order_number": "ORD-2025-001",
  "status": "beklemede",
  ...
}
```

**Not:** `order_number` otomatik generate edilir: `generate_order_number()` function

---

### PUT /api/orders/:id

**Açıklama:** Siparişi düzenle (Durum bazlı yetkilendirme)

**Request:**
```json
{
  "customer_name": "XYZ Ltd.",
  "quantity": 150,
  "delivery_date": "2025-10-20",
  "priority": "orta"
}
```

**Response (200) - Başarılı:**
```json
{
  "message": "Order updated",
  "order": {...},
  "plan_recreated": true
}
```

**Errors:**
- 403: Forbidden (tamamlanan sipariş veya aktif üretim + non-admin)
- 400: Cannot edit, production in progress (Admin dışında)

---

### DELETE /api/orders/:id

**Açıklama:** Siparişi iptal et

**Response (200):**
```json
{
  "message": "Order cancelled",
  "reservations_released": true,
  "plan_status": "iptal_edildi"
}
```

**Errors:**
- 403: Forbidden
- 400: Cannot cancel completed order

---

### POST /api/orders/:id/approve

**Açıklama:** Siparişi onayla → Stok kontrolü + Üretim planı oluştur

**Response (200) - Başarılı:**
```json
{
  "message": "Order approved",
  "production_plan": {
    "id": "uuid",
    "order_id": "uuid",
    "status": "planlandi",
    ...
  },
  "bom_snapshot_created": true,
  "reservations": [
    {
      "material_type": "raw",
      "material_id": "uuid",
      "reserved_quantity": 100
    }
  ]
}
```

**Response (400) - Stok Yetersiz:**
```json
{
  "error": "Insufficient stock",
  "missing_materials": [
    {
      "material_type": "raw",
      "material_name": "Çelik Sac",
      "material_code": "HM-001",
      "needed": 150,
      "available": 100,
      "reserved": 50,
      "missing": 100
    }
  ]
}
```

**Side Effects:**
- BOM snapshot oluşturulur
- Malzemeler rezerve edilir (reserved_quantity artırılır)
- material_reservations tablosuna kayıtlar eklenir
- Production plan oluşturulur
- Sipariş status'ü "uretimde" olur

---

### GET /api/production/plans

**Açıklama:** Üretim planlarını listele (sayfalama + filtreleme)

**Query Params:**
- `status`: 'planlandi' | 'devam_ediyor' | 'duraklatildi' | 'tamamlandi' | 'iptal_edildi'
- `operator_id`: uuid (opsiyonel)
- `unassigned`: 'true' (atanmamış planlar)
- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başı kayıt (default: 50)
- `search`: Sipariş no veya ürün kodunda arama
- `sort`: Sıralama (created_at, started_at, priority)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "order": { "order_number": "ORD-2025-001", "customer_name": "ABC Ltd." },
      "product": { "name": "Ürün A", "code": "NM-001" },
      "planned_quantity": 100,
      "produced_quantity": 45,
      "status": "devam_ediyor",
      "assigned_operator": { "id": "uuid", "name": "Thunder Operatör" },
      "started_at": "2025-10-06T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 89,
    "totalPages": 2
  }
}
```

---

### PATCH /api/production/plans/:id/assign

**Açıklama:** Plana operatör ata

**Request:**
```json
{
  "operator_id": "uuid"
}
```

**Response (200):** (Güncellenmiş plan)

---

### POST /api/production/logs

**Açıklama:** Barkod okutma kaydı (operatör panelinden)

**Request:**
```json
{
  "plan_id": "uuid",
  "barcode_scanned": "1234567890123",
  "quantity_produced": 5
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "plan_id": "uuid",
  "barcode_scanned": "1234567890123",
  "quantity_produced": 5,
  "timestamp": "2025-10-06T14:30:00Z"
}
```

**Side Effects:**
- finished_products stok artırılır
- production_plans.produced_quantity artırılır
- stock_movements kaydı oluşturulur

**Errors:**
- 400: Invalid barcode (ürüne ait değil)
- 400: Exceeds planned quantity

---

### PATCH /api/production/plans/:id/status

**Açıklama:** Plan durumunu güncelle (tamamla/duraklat)

**Request:**
```json
{
  "status": "tamamlandi" | "duraklatildi"
}
```

**Response (200):** (Güncellenmiş plan)

---

### DELETE /api/production/plans/:id

**Açıklama:** Üretim planını iptal et (Admin/Planlama yetkisi)

**Response (200) - Plan 'planlandi' durumunda:**
```json
{
  "message": "Plan cancelled",
  "reservations_released": true
}
```

**Response (200) - Plan 'devam_ediyor' veya 'duraklatildi':**
```json
{
  "message": "Plan cancelled with partial production",
  "produced_quantity": 45,
  "planned_quantity": 100,
  "remaining": 55,
  "note": "Üretilen ürünler stokta kaldı, tüketilen hammaddeler geri alınmadı"
}
```

**Errors:**
- 403: Unauthorized (sadece Admin)
- 400: Cannot cancel completed plan

---

### DELETE /api/production/logs/:id

**Açıklama:** Hatalı üretim kaydını geri al

**Query Params:**
- `force`: 'true' (Admin/Planlama için tüm kayıtlar, Operatör için son 5dk)

**Response (200):**
```json
{
  "message": "Production log reversed",
  "log_id": "uuid",
  "quantity_reversed": 5,
  "stocks_updated": true
}
```

**Side Effects:**
- finished_products stok azaltılır
- Hammadde/yarı mamul stokları geri eklenir
- production_plans.produced_quantity azaltılır
- Tersine stock_movements kaydı oluşturulur

**Errors:**
- 403: Forbidden (Operatör için >5dk geçmiş kayıtlar)
- 404: Log not found

---

## BOM (Product Tree) Endpoints

### GET /api/bom/:finished_product_id

**Açıklama:** Bir ürünün BOM'unu getir

**Response (200):**
```json
{
  "product": { "id": "uuid", "name": "Ürün A", "code": "NM-001" },
  "materials": [
    {
      "id": "uuid",
      "material_type": "raw",
      "material": { "id": "uuid", "name": "Çelik Sac", "code": "HM-001" },
      "quantity_needed": 10
    },
    {
      "id": "uuid",
      "material_type": "semi",
      "material": { "id": "uuid", "name": "Yarı A", "code": "YM-001" },
      "quantity_needed": 5
    }
  ]
}
```

---

### POST /api/bom

**Açıklama:** BOM kaydı ekle

**Request:**
```json
{
  "finished_product_id": "uuid",
  "material_type": "raw",
  "material_id": "uuid",
  "quantity_needed": 10
}
```

**Response (201):** (Oluşturulan BOM kaydı)

---

### DELETE /api/bom/:id

**Açıklama:** BOM kaydı sil

**Response (200):**
```json
{
  "message": "BOM entry deleted"
}
```

---

### POST /api/bom/import

**Açıklama:** Excel'den BOM import

**Request:** `multipart/form-data`
- `file`: Excel file (.xlsx)
  - Columns: finished_product_code | material_type | material_code | quantity_needed

**Response (200):**
```json
{
  "imported": 120,
  "failed": 3,
  "errors": [...]
}
```

---

## Operators Endpoints

### GET /api/operators

**Açıklama:** Operatör listesi

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Thunder Operatör",
    "series": "thunder",
    "experience_years": 5,
    "daily_capacity": 46,
    "location": "Üretim Salonu A",
    "hourly_rate": 25,
    "active_productions_count": 2
  }
]
```

---

### POST /api/operators

**Açıklama:** Yeni operatör ekle

**Request:**
```json
{
  "name": "Yeni Operatör",
  "email": "operator3@thunder.com",
  "series": "thunder",
  "experience_years": 3,
  "daily_capacity": 40,
  "location": "Üretim Salonu C",
  "hourly_rate": 22
}
```

**Response (201):** (Oluşturulan user + operator kaydı)

**Side Effect:** users tablosuna role='operator', password='123456' ile kayıt oluşturulur

---

## User Management Endpoints

### GET /api/users

**Açıklama:** Kullanıcı listesi (Admin yetkisi)

**Query Params:**
- `role`: 'yonetici' | 'planlama' | 'depo' | 'operator' (opsiyonel)
- `page`: Sayfa numarası
- `limit`: Sayfa başı kayıt
- `search`: Ad veya email'de arama
- `active_only`: 'true' (sadece aktif kullanıcılar)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "admin@thunder.com",
      "name": "Admin User",
      "role": "yonetici",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### POST /api/users

**Açıklama:** Yeni kullanıcı ekle (Admin yetkisi)

**Request:**
```json
{
  "email": "newuser@thunder.com",
  "name": "Yeni Kullanıcı",
  "role": "depo",
  "password": "TempPass123!"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "email": "newuser@thunder.com",
  "name": "Yeni Kullanıcı",
  "role": "depo",
  "is_active": true
}
```

**Errors:**
- 409: Email already exists
- 403: Forbidden (Admin only)

---

### PUT /api/users/:id

**Açıklama:** Kullanıcı bilgilerini güncelle (Admin yetkisi)

**Request:**
```json
{
  "name": "Güncellenmiş Ad",
  "email": "updated@thunder.com",
  "role": "planlama"
}
```

**Response (200):** (Güncellenmiş kullanıcı)

---

### POST /api/users/:id/reset-password

**Açıklama:** Kullanıcı şifresini sıfırla (Admin yetkisi)

**Request:**
```json
{
  "new_password": "NewPass123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

---

### PATCH /api/users/:id/deactivate

**Açıklama:** Kullanıcıyı pasifleştir (Admin yetkisi)

**Response (200):**
```json
{
  "message": "User deactivated",
  "user": {
    "id": "uuid",
    "is_active": false
  }
}
```

---

### PATCH /api/users/:id/activate

**Açıklama:** Kullanıcıyı aktifleştir (Admin yetkisi)

**Response (200):**
```json
{
  "message": "User activated",
  "user": {
    "id": "uuid",
    "is_active": true
  }
}
```

---

## System Settings Endpoints

### GET /api/settings

**Açıklama:** Sistem ayarlarını getir (Admin yetkisi)

**Response (200):**
```json
[
  {
    "key": "default_operator_password",
    "value": "123456",
    "description": "Yeni operatörler için varsayılan şifre",
    "updated_at": "2025-10-06T10:00:00Z"
  }
]
```

---

### PUT /api/settings/:key

**Açıklama:** Sistem ayarını güncelle (Admin yetkisi)

**Request:**
```json
{
  "value": "NewValue123"
}
```

**Response (200):**
```json
{
  "key": "default_operator_password",
  "value": "NewValue123",
  "updated_at": "2025-10-06T15:30:00Z"
}
```

---

## Audit Logs Endpoints

### GET /api/audit-logs

**Açıklama:** İşlem geçmişi (Admin/Yönetici yetkisi)

**Query Params:**
- `user_id`: uuid (belirli kullanıcının işlemleri)
- `table_name`: Tablo adı
- `action`: 'CREATE' | 'UPDATE' | 'DELETE'
- `date_from`: Başlangıç tarihi (YYYY-MM-DD)
- `date_to`: Bitiş tarihi
- `page`: Sayfa numarası
- `limit`: Sayfa başı kayıt (default: 100)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "name": "Admin User", "email": "admin@thunder.com" },
      "action": "UPDATE",
      "table_name": "raw_materials",
      "record_id": "uuid",
      "old_values": { "unit_price": 50 },
      "new_values": { "unit_price": 55 },
      "created_at": "2025-10-06T14:25:30Z"
    }
  ],
  "pagination": {...}
}
```

---

## Notifications Endpoints

### GET /api/notifications

**Açıklama:** Kullanıcının bildirimlerini getir (sayfalama)

**Query Params:**
- `unread_only`: 'true' (sadece okunmamışlar)
- `type`: 'critical_stock' | 'production_delay' | 'order_update'
- `page`: Sayfa numarası
- `limit`: Sayfa başı kayıt

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "critical_stock",
      "title": "Kritik Stok Seviyesi",
      "message": "Malzeme: Çelik Sac (HM-001) - Mevcut: 8 - Kritik Seviye: 10",
      "material_type": "raw",
      "material_id": "uuid",
      "severity": "high",
      "is_read": false,
      "created_at": "2025-10-06T15:30:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### PATCH /api/notifications/:id/read

**Açıklama:** Bildirimi okundu olarak işaretle

**Response (200):**
```json
{
  "message": "Notification marked as read"
}
```

---

### GET /api/notifications/count

**Açıklama:** Okunmamış bildirim sayısı (header badge için)

**Response (200):**
```json
{
  "unread_count": 5,
  "critical_count": 2
}
```

---

## Material Reservations Endpoints

### GET /api/reservations

**Açıklama:** Aktif rezervasyonları listele

**Query Params:**
- `material_type`: 'raw' | 'semi' | 'finished'
- `material_id`: uuid

**Response (200):**
```json
[
  {
    "id": "uuid",
    "order": { "order_number": "ORD-2025-001", "customer_name": "ABC Ltd." },
    "material": { "code": "HM-001", "name": "Çelik Sac" },
    "material_type": "raw",
    "reserved_quantity": 100,
    "created_at": "2025-10-06T10:00:00Z"
  }
]
```

---

### GET /api/stock/availability

**Açıklama:** Malzeme gerçek müsaitlik durumu (quantity - reserved_quantity)

**Query Params:**
- `type`: 'raw' | 'semi' | 'finished' (zorunlu)
- `id`: uuid (opsiyonel, belirli malzeme için)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "code": "HM-001",
    "name": "Çelik Sac",
    "quantity": 200,
    "reserved_quantity": 100,
    "available_quantity": 100,
    "critical_level": 10,
    "status": "normal" | "low" | "critical"
  }
]
```

---

## Reports Endpoints (Gelecek)

### GET /api/reports/production

**Placeholder:** "Coming Soon"

### GET /api/reports/stock

**Placeholder:** "Coming Soon"

---

## Real-time Subscriptions (Supabase)

**Not:** Bu REST API değil, Supabase Realtime Channels kullanılır.

**Dinlenecek Tablolar:**
- `production_plans` → Status değişiklikleri
- `production_logs` → Yeni üretim kayıtları
- `stock_movements` → Stok hareketleri
- `orders` → Sipariş güncellemeleri
- `notifications` → Yeni bildirimler
- `material_reservations` → Rezervasyon değişiklikleri
- `raw_materials` → Hammadde stok değişiklikleri
- `semi_finished_products` → Yarı mamul stok değişiklikleri
- `finished_products` → Nihai ürün stok değişiklikleri

**Client Implementation:**
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Üretim değişikliklerini dinle
supabase
  .channel('production-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'production_plans'
  }, (payload) => {
    console.log('Production plan changed:', payload);
  })
  .subscribe();

// Bildirimler için
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications'
  }, (payload) => {
    // Yeni bildirim geldi, toast göster
    toast.info(payload.new.title);
  })
  .subscribe();

// Stok değişiklikleri için (tüm 3 tip)
supabase
  .channel('stock-changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'raw_materials'
  }, (payload) => {
    // KPI kartlarını güncelle
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'semi_finished_products'
  }, (payload) => {
    // KPI kartlarını güncelle
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'finished_products'
  }, (payload) => {
    // KPI kartlarını güncelle
  })
  .subscribe();
```

