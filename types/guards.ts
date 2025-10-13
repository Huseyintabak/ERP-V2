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

export function canEditOrder(user: User | null, orderStatus: string, planStatus?: string): boolean {
  if (!user) return false;
  
  // Beklemede siparişler - Planlama düzenleyebilir
  if (orderStatus === 'beklemede') {
    return user.role === 'yonetici' || user.role === 'planlama';
  }
  
  // Üretimdeki siparişler
  if (orderStatus === 'uretimde') {
    // Planlama aşamasında - Planlama düzenleyebilir
    if (planStatus === 'planlandi') {
      return user.role === 'yonetici' || user.role === 'planlama';
    }
    // Aktif üretim - Sadece admin
    if (planStatus === 'devam_ediyor' || planStatus === 'duraklatildi') {
      return user.role === 'yonetici';
    }
  }
  
  // Tamamlanan siparişler - Kimse düzenleyemez
  return false;
}

