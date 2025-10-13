import { z } from 'zod';

// ============================================
// User & Authentication Types
// ============================================

export type UserRole = 'yonetici' | 'planlama' | 'depo' | 'operator';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================
// Stock Management Types
// ============================================

export type MaterialType = 'raw' | 'semi' | 'finished';
export type MovementType = 'giris' | 'cikis' | 'uretim' | 'sayim';

export interface MaterialBase {
  id: string;
  code: string;
  name: string;
  barcode?: string;
  quantity: number;
  reserved_quantity: number;
  critical_level: number;
  unit: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface RawMaterial extends MaterialBase {
  unit_price: number;
}

export interface SemiFinishedProduct extends MaterialBase {
  unit_cost: number;
}

export interface FinishedProduct extends MaterialBase {
  sale_price: number;
}

export interface StockMovement {
  id: string;
  material_type: MaterialType;
  material_id: string;
  movement_type: MovementType;
  quantity: number;
  user_id: string;
  description?: string;
  production_log_id?: string; // Yeni alan
  created_at: string;
}

// ============================================
// Customer Types
// ============================================

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  tax_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Orders & Production Types
// ============================================

export type OrderStatus = 'beklemede' | 'uretimde' | 'tamamlandi';
export type Priority = 'dusuk' | 'orta' | 'yuksek';
export type ProductionStatus = 'planlandi' | 'devam_ediyor' | 'duraklatildi' | 'tamamlandi' | 'iptal_edildi';

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_id?: string;
  customer?: Customer;
  product_id: string;
  quantity: number;
  delivery_date: string;
  priority: Priority;
  status: OrderStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionPlan {
  id: string;
  order_id: string;
  product_id: string;
  planned_quantity: number;
  produced_quantity: number;
  status: ProductionStatus;
  assigned_operator_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  order?: Order;
  product?: FinishedProduct;
}

export interface ProductionLog {
  id: string;
  plan_id: string;
  operator_id: string;
  barcode_scanned: string;
  quantity_produced: number;
  log_time: string;
  created_at: string;
}

export interface BomSnapshot {
  id: string;
  plan_id: string;
  material_type: 'raw' | 'semi';
  material_id: string;
  material_code: string;
  material_name: string;
  quantity_needed: number;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  material_type?: MaterialType;
  related_id?: string;
  severity: 'low' | 'medium' | 'high';
  target_roles?: UserRole[]; // Yeni alan
  user_id?: string;
  is_read: boolean;
  created_at: string;
}

// ============================================
// Zod Validation Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir email girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

export const rawMaterialSchema = z.object({
  code: z.string().min(1, 'Kod gerekli').max(50),
  name: z.string().min(1, 'Ad gerekli'),
  barcode: z.string().optional(),
  quantity: z.number().min(0, 'Miktar 0 veya üzeri olmalı'),
  unit: z.string().min(1, 'Birim gerekli'),
  unit_price: z.number().min(0, 'Fiyat 0 veya üzeri olmalı'),
  critical_level: z.number().min(0).default(10),
  description: z.string().optional(),
});

export const semiFinishedProductSchema = z.object({
  code: z.string().min(1, 'Kod gerekli').max(50),
  name: z.string().min(1, 'Ad gerekli'),
  barcode: z.string().optional(),
  quantity: z.number().min(0, 'Miktar 0 veya üzeri olmalı'),
  unit: z.string().min(1, 'Birim gerekli'),
  unit_cost: z.number().min(0, 'Maliyet 0 veya üzeri olmalı'),
  critical_level: z.number().min(0).default(5),
  description: z.string().optional(),
});

export const finishedProductSchema = z.object({
  code: z.string().min(1, 'Kod gerekli').max(50),
  name: z.string().min(1, 'Ad gerekli'),
  barcode: z.string().optional(),
  quantity: z.number().min(0, 'Miktar 0 veya üzeri olmalı').default(0),
  unit: z.string().min(1, 'Birim gerekli'),
  sale_price: z.number().min(0, 'Fiyat 0 veya üzeri olmalı'),
  critical_level: z.number().min(0).default(5),
  description: z.string().optional(),
});

// Order item schema for multiple products
export const orderItemSchema = z.object({
  product_id: z.string().uuid('Geçerli bir ürün seçin'),
  quantity: z.number().min(1, 'Miktar en az 1 olmalı'),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Müşteri adı gerekli'),
  email: z.string().email('Geçerli email adresi gerekli').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  tax_number: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const orderSchema = z.object({
  customer_name: z.string().min(1, 'Müşteri adı gerekli'),
  customer_id: z.string().uuid().optional(),
  items: z.array(orderItemSchema).min(1, 'En az bir ürün seçmelisiniz'),
  delivery_date: z.string().min(1, 'Teslim tarihi gerekli'),
  priority: z.enum(['dusuk', 'orta', 'yuksek']),
  assigned_operator_id: z.string().uuid().optional(),
});

// ============================================
// Operator Schema
// ============================================

export const operatorSchema = z.object({
  name: z.string().min(1, 'Operatör adı gerekli'),
  email: z.string().email('Geçerli bir email adresi girin'),
  series: z.enum(['thunder', 'thunder_pro']),
  experience_years: z.number().min(0, 'Deneyim yılı 0 veya üzeri olmalı'),
  daily_capacity: z.number().min(1, 'Günlük kapasite en az 1 olmalı'),
  location: z.string().min(1, 'Lokasyon gerekli'),
  hourly_rate: z.number().min(0, 'Saatlik ücret 0 veya üzeri olmalı'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RawMaterialFormData = z.infer<typeof rawMaterialSchema>;
export type SemiFinishedProductFormData = z.infer<typeof semiFinishedProductSchema>;
export type FinishedProductFormData = z.infer<typeof finishedProductSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type OrderItemFormData = z.infer<typeof orderItemSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type OperatorFormData = z.infer<typeof operatorSchema>;

// ============================================
// Production Log API Types
// ============================================

export interface ProductionLogRequest {
  plan_id: string;
  barcode_scanned: string;
  quantity_produced: number;
}

export interface ProductionLogResponse {
  success: boolean;
  log: ProductionLog;
  planProgress: {
    produced: number;
    planned: number;
    remaining: number;
    percentage: number;
  };
  stockUpdates: {
    finishedProduct: {
      before: number;
      after: number;
    };
    consumedMaterials: Array<{
      type: 'raw' | 'semi';
      code: string;
      name: string;
      consumed: number;
      before: number;
      after: number;
    }>;
  };
  criticalWarnings: string[];
}

export interface PlanStatusRequest {
  plan_id: string;
  action: 'accept' | 'pause' | 'resume' | 'complete';
}

export interface PlanStatusResponse {
  success: boolean;
  message: string;
  plan: ProductionPlan;
  action: string;
  oldStatus: string;
  newStatus: string;
}

// ============================================
// Production Log Validation Schemas
// ============================================

export const productionLogSchema = z.object({
  plan_id: z.string().uuid('Geçerli bir plan ID gerekli'),
  barcode_scanned: z.string().min(1, 'Barkod veya ürün kodu gerekli'),
  quantity_produced: z.number().min(1, 'Üretilen miktar en az 1 olmalı'),
});

export const planStatusSchema = z.object({
  plan_id: z.string().uuid('Geçerli bir plan ID gerekli'),
  action: z.enum(['accept', 'pause', 'resume', 'complete'], {
    errorMap: () => ({ message: 'Geçerli bir action seçin: accept, pause, resume, complete' })
  }),
});

export type ProductionLogFormData = z.infer<typeof productionLogSchema>;
export type PlanStatusFormData = z.infer<typeof planStatusSchema>;

