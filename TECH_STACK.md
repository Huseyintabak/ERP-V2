# Thunder ERP v2 - Teknoloji Detayları

## Runtime & Framework

### Next.js 14.2+
- **App Router** (app directory)
- **React Server Components** (varsayılan)
- **Server Actions** (form submissions için)
- **Middleware** (JWT auth & RBAC)

**Kurulum:**
```bash
npx create-next-app@latest thunder-v2 --typescript --tailwind --app --no-src-dir
cd thunder-v2
```

---

## Styling & UI

### Tailwind CSS v4.1

**tailwind.config.ts:**
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}
export default config
```

### Shadcn/ui

**Kurulum:**
```bash
npx shadcn@latest init
```

**Config seçenekleri:**
- Style: Default
- Base color: Blue
- CSS variables: Yes

**Gerekli Component'ler:**
```bash
npx shadcn@latest add button card input label table form dialog alert-dialog dropdown-menu tabs badge sonner skeleton select textarea
```

**Ek:** Recharts için chart component'leri
```bash
npx shadcn@latest add chart
```

---

## Database & Backend

### Supabase Cloud

**Kurulum:**
1. https://supabase.com → Yeni proje oluştur
2. Project URL ve Anon Key al
3. `.env.local` dosyası:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

**Client Library:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Type Generation:**
```bash
npx supabase gen types typescript --project-id your-project-id > types/database.ts
```

**Supabase Client Setup:**

**lib/supabase/client.ts (Client Component için):**
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**lib/supabase/server.ts (Server Component/API için):**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server Component'te set çağrısı ignore edilebilir
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Server Component'te remove çağrısı ignore edilebilir
          }
        },
      },
    }
  );
}

// Service role için (admin işlemleri)
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() { return ''; },
        set() {},
        remove() {},
      },
    }
  );
}
```

---

## Authentication

### Custom JWT

**Libraries:**
```bash
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

**JWT Payload:**
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: 'yonetici' | 'planlama' | 'depo' | 'operator';
  exp: number; // 7 days
}
```

**Cookie Options:**
```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
}
```

**JWT Utils (lib/auth/jwt.ts):**
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

interface JWTPayload {
  userId: string;
  email: string;
  role: 'yonetici' | 'planlama' | 'depo' | 'operator';
}

export function signJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function verifyJWT(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { exp: number };
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

**Password Utils (lib/auth/password.ts):**
```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

---

## State Management

### Zustand

**Kurulum:**
```bash
npm install zustand
```

**Stores:**

**auth-store.ts:**
```typescript
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

**production-store.ts:**
```typescript
import { create } from 'zustand';

interface ProductionStore {
  activePlans: any[];
  addPlan: (plan: any) => void;
  updatePlan: (id: string, updates: any) => void;
}

export const useProductionStore = create<ProductionStore>((set) => ({
  activePlans: [],
  addPlan: (plan) => set((state) => ({ 
    activePlans: [...state.activePlans, plan] 
  })),
  updatePlan: (id, updates) => set((state) => ({
    activePlans: state.activePlans.map(p => 
      p.id === id ? { ...p, ...updates } : p
    )
  })),
}));
```

---

## Forms & Validation

### React Hook Form + Zod

**Kurulum:**
```bash
npm install react-hook-form zod @hookform/resolvers
```

**Örnek Form Schema:**
```typescript
import { z } from 'zod';

export const rawMaterialSchema = z.object({
  code: z.string().min(1, 'Kod gerekli').max(50),
  name: z.string().min(1, 'Ad gerekli'),
  barcode: z.string().optional(),
  quantity: z.number().min(0, 'Miktar 0 veya üzeri olmalı'),
  unit: z.string().min(1, 'Birim gerekli'),
  unit_price: z.number().min(0, 'Fiyat 0 veya üzeri olmalı'),
  description: z.string().optional(),
});

export type RawMaterialFormData = z.infer<typeof rawMaterialSchema>;
```

---

## Charts & Data Visualization

### Recharts

**Kurulum:**
```bash
npm install recharts
```

**Shadcn Chart Component** (zaten kuruldu):
- Line Chart
- Bar Chart
- Pie Chart
- Area Chart

**Örnek Kullanım:**
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const data = [
  { date: '01/10', uretim: 45 },
  { date: '02/10', uretim: 52 },
  // ...
];

<LineChart width={600} height={300} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="uretim" stroke="#3b82f6" />
</LineChart>
```

---

## Excel Import/Export

### SheetJS (xlsx)

**Kurulum:**
```bash
npm install xlsx
```

**Export Örneği:**
```typescript
import * as XLSX from 'xlsx';

const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
```

**Import Örneği:**
```typescript
const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const wb = XLSX.read(event.target?.result, { type: 'binary' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    // data = [{ code: 'HM-001', name: 'Ürün', ... }, ...]
  };
  reader.readAsBinaryString(file);
};
```

---

## Error Handling

### React Error Boundary

```typescript
'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center bg-red-50">
          <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-red-600">Bir Hata Oluştu</h2>
            <p className="mb-4 text-gray-700">
              {this.state.error?.message || 'Beklenmeyen bir hata oluştu.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Kullanım (app/layout.tsx):**
```typescript
import { ErrorBoundary } from '@/components/error-boundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

## Transaction Management (Supabase)

### Örnek: Sipariş Onaylama Transaction

```typescript
import { createClient } from '@/lib/supabase/server';

export async function approveOrder(orderId: string, userId: string) {
  const supabase = createClient();
  
  try {
    // Transaction başlat
    const { data, error } = await supabase.rpc('approve_order_transaction', {
      p_order_id: orderId,
      p_user_id: userId
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Order approval failed:', error);
    return { success: false, error };
  }
}
```

**Database Function (PostgreSQL):**
```sql
CREATE OR REPLACE FUNCTION approve_order_transaction(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_product_id UUID;
  v_quantity NUMERIC;
  v_plan_id UUID;
  v_missing_materials JSON;
BEGIN
  -- User context set et (audit log için)
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  -- Sipariş bilgilerini al
  SELECT product_id, quantity INTO v_product_id, v_quantity
  FROM orders WHERE id = p_order_id;
  
  -- BOM kontrolü ve stok kontrolü
  SELECT check_stock_availability(v_product_id, v_quantity) INTO v_missing_materials;
  
  IF v_missing_materials IS NOT NULL THEN
    RETURN json_build_object('success', FALSE, 'missing_materials', v_missing_materials);
  END IF;
  
  -- Production plan oluştur (BOM snapshot otomatik oluşturulacak)
  INSERT INTO production_plans (order_id, product_id, planned_quantity)
  VALUES (p_order_id, v_product_id, v_quantity)
  RETURNING id INTO v_plan_id;
  
  -- Rezervasyonları oluştur
  PERFORM create_material_reservations(p_order_id, v_product_id, v_quantity);
  
  -- Sipariş status güncelle
  UPDATE orders SET status = 'uretimde' WHERE id = p_order_id;
  
  RETURN json_build_object('success', TRUE, 'plan_id', v_plan_id);
END;
$$ LANGUAGE plpgsql;
```

### Örnek: Excel Import Transaction

```typescript
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';

export async function importRawMaterialsFromExcel(file: File, userId: string) {
  const supabase = createClient();
  
  // Excel'i parse et
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);
  
  const results = {
    imported: 0,
    failed: 0,
    errors: [] as any[]
  };
  
  // Her satırı validate et
  const validRows: any[] = [];
  data.forEach((row: any, index: number) => {
    try {
      // Validation logic
      if (!row.code || !row.name) {
        throw new Error('Code and name are required');
      }
      validRows.push(row);
    } catch (error: any) {
      results.failed++;
      results.errors.push({ row: index + 2, error: error.message });
    }
  });
  
  // Geçerli satırları transaction içinde import et
  if (validRows.length > 0) {
    const { data: imported, error } = await supabase.rpc('bulk_import_raw_materials', {
      p_materials: validRows,
      p_user_id: userId
    });
    
    if (error) {
      console.error('Import failed:', error);
      results.failed += validRows.length;
    } else {
      results.imported = imported || validRows.length;
    }
  }
  
  return results;
}
```

---

## Custom Hooks

### useBarcode (USB Barkod Okuyucu)

```typescript
import { useEffect, useState } from 'react';

export const useBarcode = (onScan: (barcode: string) => void) => {
  const [buffer, setBuffer] = useState('');

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (buffer) {
          onScan(buffer);
          setBuffer('');
        }
      } else if (e.key.length === 1) {
        setBuffer(prev => prev + e.key);
        clearTimeout(timeout);
        timeout = setTimeout(() => setBuffer(''), 100); // Reset after 100ms inactivity
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [buffer, onScan]);

  return buffer;
};
```

### useRealtime (Supabase Realtime)

```typescript
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export const useRealtime = (
  table: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
) => {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: table
      }, (payload) => {
        onInsert?.(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: table
      }, (payload) => {
        onUpdate?.(payload.new);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: table
      }, (payload) => {
        onDelete?.(payload.old);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onInsert, onUpdate, onDelete]);
};
```

---

## Development Tools

### ESLint & Prettier

```bash
npm install -D eslint prettier eslint-config-prettier
```

### TypeScript Config

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

---

## Deployment (Localhost)

**Development:**
```bash
npm run dev
```

**Port:** http://localhost:3000

**Build (Test Amaçlı):**
```bash
npm run build
npm start
```

**Not:** Production build gerekmez, localhost'ta `npm run dev` yeterli.

---

## Package.json Bağımlılıkları

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "zustand": "^4.5.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "xlsx": "^0.18.5",
    "recharts": "^2.12.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5",
    "tailwindcss": "^4.1.0",
    "postcss": "^8",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.2.0",
    "prettier": "^3.3.0"
  }
}
```

---

## Folder Structure Reminder

```
src/
├── app/              # Next.js App Router
├── components/       # React components
├── lib/              # Utilities, Supabase, Auth
├── stores/           # Zustand stores
├── types/            # TypeScript types
└── middleware.ts     # JWT middleware
```

**Naming Conventions:**
- Components: PascalCase (KpiCard.tsx)
- Files: kebab-case (use-barcode.ts)
- API Routes: lowercase (route.ts)
- Types: PascalCase interfaces/types

---

## Middleware Implementation

### Complete middleware.ts

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';

// Public paths (login sayfaları)
const publicPaths = ['/login', '/operator-login', '/api/auth/login'];

// Role-based access control mapping
const roleAccess: Record<string, string[]> = {
  '/dashboard': ['yonetici', 'planlama', 'depo'],
  '/dashboard/stok': ['yonetici', 'depo'],
  '/dashboard/uretim': ['yonetici', 'planlama'],
  '/dashboard/yonetici': ['yonetici'],
  '/operator-dashboard': ['operator'],
  '/api/users': ['yonetici'],
  '/api/settings': ['yonetici'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public path kontrolü
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Static dosyalar ve API auth endpoint'leri için bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/login')
  ) {
    return NextResponse.next();
  }

  // JWT token kontrolü
  const token = request.cookies.get('thunder_token')?.value;

  if (!token) {
    // Token yoksa login'e yönlendir
    const loginUrl = pathname.startsWith('/operator') 
      ? '/operator-login' 
      : '/login';
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  try {
    // JWT'yi doğrula
    const payload = await verifyJWT(token);

    // Role-based access control
    let hasAccess = true;
    for (const [path, allowedRoles] of Object.entries(roleAccess)) {
      if (pathname.startsWith(path)) {
        if (!allowedRoles.includes(payload.role)) {
          hasAccess = false;
          break;
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.redirect(new URL('/403', request.url));
    }

    // User context'i header olarak ekle (audit log için)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-user-email', payload.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Invalid veya expired token
    const loginUrl = pathname.startsWith('/operator') 
      ? '/operator-login' 
      : '/login';
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## Important Notes

### Audit Log Context

**Middleware'de user context set etme:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('thunder_token')?.value;
  
  if (token) {
    try {
      const payload = await verifyJWT(token);
      
      // Supabase isteklerinde user_id'yi header olarak ekle
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      // Invalid token
    }
  }
  
  return NextResponse.next();
}
```

**API Route'ta context set etme:**
```typescript
// app/api/stock/raw/route.ts
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const userId = request.headers.get('x-user-id');
  
  // User context'i database'e set et (audit log için)
  if (userId) {
    await supabase.rpc('set_user_context', { user_id: userId });
  }
  
  // İşlemler...
}
```

### Pagination Helper

```typescript
// lib/utils/pagination.ts
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function calculatePagination(
  page: number = 1,
  limit: number = 50,
  total: number
) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function getPaginationOffset(page: number = 1, limit: number = 50) {
  return (page - 1) * limit;
}
```

### CN Utility (Tailwind Merge)

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date helper
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function formatDate(date: string | Date, formatStr: string = 'dd MMMM yyyy'): string {
  return format(new Date(date), formatStr, { locale: tr });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: tr });
}

// Number formatting
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
```

