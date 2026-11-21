/**
 * @jest-environment node
 *
 * SheetJS 0.20.x (CDN) yükseltmesi sonrası import/export akışının (stok, BOM, rapor)
 * kullandığı API'lerin çalıştığını doğrular.
 */
import { describe, it, expect } from '@jest/globals';
import * as XLSX from 'xlsx';

describe('xlsx (SheetJS) roundtrip', () => {
  it('writes and reads back a workbook with Turkish characters and numbers', () => {
    const rows = [
      { kod: 'HM-001', ad: 'Çelik Şasi', miktar: 12.5, birim: 'kg' },
      { kod: 'HM-002', ad: 'Işık Ünitesi', miktar: 3, birim: 'adet' },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Hammaddeler');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a', 'b'], [1, 2]]), 'AOA');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    expect(buf.length).toBeGreaterThan(0);

    const back = XLSX.read(buf, { type: 'buffer' });
    expect(back.SheetNames).toEqual(['Hammaddeler', 'AOA']);
    expect(XLSX.utils.sheet_to_json(back.Sheets['Hammaddeler'])).toEqual(rows);
  });

  it('does not pollute Object.prototype when parsing a crafted sheet', () => {
    const ws = XLSX.utils.aoa_to_sheet([['__proto__', 'constructor'], ['{"polluted":1}', 'x']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'S');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    XLSX.utils.sheet_to_json(XLSX.read(buf, { type: 'buffer' }).Sheets['S']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
