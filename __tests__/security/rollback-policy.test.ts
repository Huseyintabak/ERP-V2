/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import {
  getLogTime,
  minutesSinceLog,
  isWithinOperatorRollbackWindow,
} from '@/lib/production/rollback-policy';

const NOW = new Date('2026-11-21T12:00:00Z');
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();

describe('production log rollback policy', () => {
  it('reads the real `timestamp` column (production_logs has no created_at)', () => {
    expect(getLogTime({ timestamp: ago(3) })?.toISOString()).toBe(ago(3));
    expect(minutesSinceLog({ timestamp: ago(3) }, NOW)).toBeCloseTo(3);
  });

  it('allows operators within 5 minutes', () => {
    expect(isWithinOperatorRollbackWindow({ timestamp: ago(4) }, NOW)).toBe(true);
    expect(isWithinOperatorRollbackWindow({ timestamp: ago(5) }, NOW)).toBe(true);
  });

  it('denies operators after 5 minutes', () => {
    expect(isWithinOperatorRollbackWindow({ timestamp: ago(6) }, NOW)).toBe(false);
    expect(isWithinOperatorRollbackWindow({ timestamp: ago(60 * 24) }, NOW)).toBe(false);
  });

  it('fails closed when the time is missing or invalid (old bug: NaN > 5 === false → allowed)', () => {
    expect(isWithinOperatorRollbackWindow({}, NOW)).toBe(false);
    expect(isWithinOperatorRollbackWindow({ created_at: undefined }, NOW)).toBe(false);
    expect(isWithinOperatorRollbackWindow({ timestamp: 'not-a-date' }, NOW)).toBe(false);
  });

  it('falls back to created_at when timestamp is absent', () => {
    expect(isWithinOperatorRollbackWindow({ created_at: ago(2) }, NOW)).toBe(true);
  });
});
