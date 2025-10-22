# Fix: Production Plan Status Mismatch

## Problem
After canceling a production plan, the success message appeared but the canceled plan was not being filtered out from the UI. The plan remained visible in the production plans list.

## Root Cause
There was a mismatch between the frontend and backend status values:
- **Backend (Database)**: Uses `'iptal'` status
- **Frontend**: Was expecting `'iptal_edildi'` status

This caused the frontend filtering to not recognize canceled plans properly.

## Files Fixed

### 1. Production Plans Page
- **File**: `app/(dashboard)/uretim/planlar/page.tsx`
- **Changes**:
  - Updated interface: `'iptal_edildi'` → `'iptal'`
  - Updated status badge variants and labels
  - Updated filter dropdown option

### 2. Order Store
- **File**: `stores/order-store.ts`
- **Changes**:
  - Updated Order interface status type
  - Updated ProductionPlan interface status type
  - Updated cancelOrder function to use `'iptal'`

### 3. Type Definitions
- **File**: `types/index.ts`
- **Changes**:
  - Updated ProductionStatus type definition

### 4. Constants
- **File**: `types/constants.ts`
- **Changes**:
  - Updated PRODUCTION_STATUSES constant

### 5. Orders Page
- **File**: `app/(dashboard)/uretim/siparisler/page.tsx`
- **Changes**:
  - Updated status badge variants and labels

### 6. Operator Dashboard
- **File**: `components/operator/operator-dashboard-client.tsx`
- **Changes**:
  - Updated interface status type

## Status Mapping

| Frontend Display | Database Value | Description |
|------------------|----------------|-------------|
| İptal Edildi     | `iptal`        | Canceled production plan |

## Verification Steps

1. **Login as Admin**
2. **Navigate to Production Plans** (`/uretim/planlar`)
3. **Cancel a Production Plan**:
   - Select a plan
   - Click "İşlemler" → "İptal" → "Üretim Planı İptal Et"
   - Enter cancel reason
   - Click "Planı İptal Et"
4. **Verify the plan disappears** from the list or shows as "İptal Edildi" status
5. **Test filtering** by selecting "İptal Edildi" in the status filter

## Expected Behavior

- ✅ Canceled plans should show "İptal Edildi" status badge
- ✅ Canceled plans should be filterable by status
- ✅ Cancel action button should be hidden for canceled plans
- ✅ Success message should appear after cancellation
- ✅ Plan should be removed from active plans list or clearly marked as canceled

## Technical Details

The issue was in the status value consistency across the application. The database was correctly setting the status to `'iptal'`, but the frontend components were looking for `'iptal_edildi'`. This caused:

1. **Filtering Issues**: Status filter couldn't match canceled plans
2. **UI Inconsistency**: Plans appeared as active even after cancellation
3. **Badge Display**: Status badges showed incorrect values

All status references have been updated to use the consistent `'iptal'` value throughout the application.
