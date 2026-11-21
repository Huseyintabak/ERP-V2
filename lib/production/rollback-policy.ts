/**
 * Üretim kaydı geri alma kuralları (sunucu ve UI ortak kullanır).
 *
 * production_logs tablosunda kayıt zamanı `timestamp` kolonundadır; `created_at` YOKTUR.
 * Önceden kod `created_at` okuyordu → NaN → "5 dakika" kuralı hiç uygulanmıyordu ve
 * operatörler her yaştaki kaydı geri alabiliyordu.
 */

export const OPERATOR_ROLLBACK_WINDOW_MINUTES = 5;

export interface LogTimeFields {
  timestamp?: string | null;
  created_at?: string | null;
}

/** Kaydın zamanı; geçerli bir tarih yoksa null */
export function getLogTime(log: LogTimeFields): Date | null {
  const raw = log.timestamp ?? log.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Kayıttan bu yana geçen dakika; zaman bilinmiyorsa null */
export function minutesSinceLog(log: LogTimeFields, now: Date = new Date()): number | null {
  const time = getLogTime(log);
  if (!time) return null;
  return (now.getTime() - time.getTime()) / (1000 * 60);
}

/**
 * Operatör bu kaydı geri alabilir mi (zaman açısından)?
 * Zaman bilinmiyorsa izin VERİLMEZ (fail closed).
 */
export function isWithinOperatorRollbackWindow(log: LogTimeFields, now: Date = new Date()): boolean {
  const minutes = minutesSinceLog(log, now);
  return minutes !== null && minutes <= OPERATOR_ROLLBACK_WINDOW_MINUTES;
}
