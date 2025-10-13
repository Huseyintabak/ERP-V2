# Thunder ERP v2 - TypeScript Type Definitions

## Core Types

### types/index.ts

```typescript
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
  created_at: string;
}

export interface MaterialAvailability {
  id: string;
  code: string;
  name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  critical_level: number;
  status: 'normal' | 'low' | 'critical';
}

// ============================================
// BOM (Bill of Materials) Types
// ============================================

export interface BOMEntry {
  id: string;
  finished_product_id: string;
  material_type: 'raw' | 'semi';
  material_id: string;
  quantity_needed: number;
  created_at: string;
}

export interface BOMWithDetails {
  id: string;
  material_type: 'raw' | 'semi';
  material: {
    id: string;
    code: string;
    name: string;
  };
  quantity_needed: number;
}

export interface ProductBOM {
  product: {
    id: string;
    code: string;
    name: string;
  };
  materials: BOMWithDetails[];
}

export interface BOMSnapshot {
  id: string;
  plan_id: string;
  material_type: 'raw' | 'semi';
  material_id: string;
  material_code: string;
  material_name: string;
  quantity_needed: number;
  created_at: string;
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
  product_id: string;
  quantity: number;
  delivery_date: string;
  priority: Priority;
  status: OrderStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrderWithDetails extends Order {
  product: {
    id: string;
    code: string;
    name: string;
  };
  created_by_user: {
    id: string;
    name: string;
  };
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
}

export interface ProductionPlanWithDetails extends ProductionPlan {
  order: {
    order_number: string;
    customer_name: string;
    delivery_date: string;
    priority: Priority;
  };
  product: {
    code: string;
    name: string;
    barcode?: string;
  };
  assigned_operator?: {
    id: string;
    name: string;
    series: string;
  };
}

export interface ProductionLog {
  id: string;
  plan_id: string;
  operator_id: string;
  barcode_scanned: string;
  quantity_produced: number;
  timestamp: string;
}

// ============================================
// Operator Types
// ============================================

export type OperatorSeries = 'thunder' | 'thunder_pro';

export interface Operator {
  id: string;
  series: OperatorSeries;
  experience_years: number;
  daily_capacity: number;
  location: string;
  hourly_rate: number;
  active_productions_count: number;
}

export interface OperatorWithUser extends Operator {
  name: string;
  email: string;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 'critical_stock' | 'production_delay' | 'order_update';
export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  material_type?: MaterialType;
  material_id?: string;
  severity: NotificationSeverity;
  is_read: boolean;
  user_id?: string;
  created_at: string;
}

export interface NotificationCount {
  unread_count: number;
  critical_count: number;
}

// ============================================
// Audit Log Types
// ============================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogWithUser extends AuditLog {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// ============================================
// Reservation Types
// ============================================

export interface MaterialReservation {
  id: string;
  order_id: string;
  material_type: MaterialType;
  material_id: string;
  reserved_quantity: number;
  created_at: string;
}

export interface ReservationWithDetails extends MaterialReservation {
  order: {
    order_number: string;
    customer_name: string;
  };
  material: {
    code: string;
    name: string;
  };
}

// ============================================
// System Settings Types
// ============================================

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

// ============================================
// Form Types (Zod Schemas)
// ============================================

import { z } from 'zod';

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

export const orderSchema = z.object({
  customer_name: z.string().min(1, 'Müşteri adı gerekli'),
  product_id: z.string().uuid('Geçerli bir ürün seçin'),
  quantity: z.number().min(1, 'Miktar en az 1 olmalı'),
  delivery_date: z.string().min(1, 'Teslim tarihi gerekli'),
  priority: z.enum(['dusuk', 'orta', 'yuksek']),
  assigned_operator_id: z.string().uuid().optional(),
});

export const bomEntrySchema = z.object({
  finished_product_id: z.string().uuid(),
  material_type: z.enum(['raw', 'semi']),
  material_id: z.string().uuid(),
  quantity_needed: z.number().min(0.01, 'Miktar 0\'dan büyük olmalı'),
});

export const userSchema = z.object({
  email: z.string().email('Geçerli bir email girin'),
  name: z.string().min(1, 'Ad gerekli'),
  role: z.enum(['yonetici', 'planlama', 'depo', 'operator']),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

export const operatorSchema = z.object({
  name: z.string().min(1, 'Ad gerekli'),
  email: z.string().email('Geçerli bir email girin'),
  series: z.enum(['thunder', 'thunder_pro']),
  experience_years: z.number().min(0).default(0),
  daily_capacity: z.number().min(1, 'Kapasite en az 1 olmalı'),
  location: z.string().min(1, 'Konum gerekli'),
  hourly_rate: z.number().min(0, 'Ücret 0 veya üzeri olmalı'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RawMaterialFormData = z.infer<typeof rawMaterialSchema>;
export type SemiFinishedProductFormData = z.infer<typeof semiFinishedProductSchema>;
export type FinishedProductFormData = z.infer<typeof finishedProductSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type BOMEntryFormData = z.infer<typeof bomEntrySchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type OperatorFormData = z.infer<typeof operatorSchema>;

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: any;
}

// Stock Import Response
export interface ImportResponse {
  imported: number;
  failed: number;
  skipped?: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
  warnings?: Array<{
    row: number;
    warning: string;
  }>;
}

// Order Approval Response
export interface OrderApprovalResponse {
  success: boolean;
  message: string;
  production_plan?: ProductionPlan;
  bom_snapshot_created?: boolean;
  reservations?: MaterialReservation[];
  missing_materials?: MissingMaterial[];
}

export interface MissingMaterial {
  material_type: MaterialType;
  material_code: string;
  material_name: string;
  needed: number;
  available: number;
  total: number;
  reserved: number;
  missing: number;
}

// ============================================
// KPI & Dashboard Types
// ============================================

export interface KPICardData {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  description?: string;
}

export interface QuickAccessCard {
  title: string;
  description: string;
  icon: string;
  buttons: Array<{
    label: string;
    href: string;
    variant?: 'default' | 'outline';
  }>;
}

export interface StockValue {
  material_type: MaterialType;
  total_value: number;
}

export interface ActiveProductionStats {
  total_active_productions: number;
  active_operators: number;
  remaining_quantity: number;
}

// ============================================
// Chart Data Types
// ============================================

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ProductionTrendData {
  date: string;
  uretim: number;
  hedef: number;
}

export interface OperatorPerformanceData {
  operator_name: string;
  completed: number;
  active: number;
  efficiency: number;
}

// ============================================
// Excel Import/Export Types
// ============================================

export interface ExcelRawMaterialRow {
  code: string;
  name: string;
  barcode?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  critical_level?: number;
  description?: string;
}

export interface ExcelBOMRow {
  finished_product_code: string;
  material_type: 'raw' | 'semi';
  material_code: string;
  quantity_needed: number;
}

// ============================================
// Utility Types
// ============================================

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>;
};

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ============================================
// Component Props Types
// ============================================

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface FormDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: T) => Promise<void>;
  defaultValues?: Partial<T>;
  title: string;
  description?: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}
```

---

## Usage Examples

### Import Types

```typescript
import type { 
  User, 
  RawMaterial, 
  Order, 
  PaginatedResponse 
} from '@/types';

// Component
interface StockTableProps {
  materials: RawMaterial[];
  onEdit: (material: RawMaterial) => void;
  onDelete: (id: string) => void;
}

// API Response
const response: PaginatedResponse<Order> = await fetch('/api/orders').then(r => r.json());

// Form
import { rawMaterialSchema, type RawMaterialFormData } from '@/types';
const form = useForm<RawMaterialFormData>({
  resolver: zodResolver(rawMaterialSchema),
});
```

### Type Guards

```typescript
// types/guards.ts
import type { MaterialType, User } from '@/types';

export function isMaterialType(value: string): value is MaterialType {
  return ['raw', 'semi', 'finished'].includes(value);
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'yonetici';
}

export function canAccessStock(user: User | null): boolean {
  return user?.role === 'yonetici' || user?.role === 'depo';
}

export function canAccessProduction(user: User | null): boolean {
  return user?.role === 'yonetici' || user?.role === 'planlama';
}
```

---

## Supabase Generated Types

### types/database.ts (Auto-generated)

**Not:** Bu dosya Supabase CLI ile otomatik oluşturulur:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

**Örnek kullanım:**
```typescript
import type { Database } from '@/types/database';

type RawMaterialRow = Database['public']['Tables']['raw_materials']['Row'];
type RawMaterialInsert = Database['public']['Tables']['raw_materials']['Insert'];
type RawMaterialUpdate = Database['public']['Tables']['raw_materials']['Update'];
```

---

## Constants

### types/constants.ts

```typescript
export const USER_ROLES = {
  YONETICI: 'yonetici',
  PLANLAMA: 'planlama',
  DEPO: 'depo',
  OPERATOR: 'operator',
} as const;

export const ORDER_PRIORITIES = {
  DUSUK: 'dusuk',
  ORTA: 'orta',
  YUKSEK: 'yuksek',
} as const;

export const PRODUCTION_STATUSES = {
  PLANLANDI: 'planlandi',
  DEVAM_EDIYOR: 'devam_ediyor',
  DURAKLATILDI: 'duraklatildi',
  TAMAMLANDI: 'tamamlandi',
  IPTAL_EDILDI: 'iptal_edildi',
} as const;

export const MATERIAL_TYPES = {
  RAW: 'raw',
  SEMI: 'semi',
  FINISHED: 'finished',
} as const;

export const MOVEMENT_TYPES = {
  GIRIS: 'giris',
  CIKIS: 'cikis',
  URETIM: 'uretim',
  SAYIM: 'sayim',
} as const;

// Default values
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 200,
} as const;

export const DEFAULT_CRITICAL_LEVELS = {
  RAW: 10,
  SEMI: 5,
  FINISHED: 5,
} as const;

export const OPERATOR_DEFAULT_PASSWORD = '123456';
export const JWT_EXPIRY_DAYS = 7;
export const PRODUCTION_LOG_EDIT_WINDOW_MINUTES = 5;
```

