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

