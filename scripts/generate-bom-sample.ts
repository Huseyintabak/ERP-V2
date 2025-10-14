/**
 * BOM Sample Excel Oluşturma Script'i
 * 
 * Kullanım:
 * npx ts-node scripts/generate-bom-sample.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Sample BOM data
const sampleData = [
  {
    'Ürün Kodu': 'NUP001',
    'Ürün Adı': 'Örnek Nihai Ürün',
    'Ürün Tipi': 'Nihai Ürün',
    'Malzeme Tipi': 'Hammadde',
    'Malzeme Kodu': 'HM001',
    'Malzeme Adı': 'Örnek Hammadde',
    'Miktar': 5
  },
  {
    'Ürün Kodu': 'NUP001',
    'Ürün Adı': 'Örnek Nihai Ürün',
    'Ürün Tipi': 'Nihai Ürün',
    'Malzeme Tipi': 'Yarı Mamul',
    'Malzeme Kodu': 'YM001',
    'Malzeme Adı': 'Örnek Yarı Mamul',
    'Miktar': 2
  },
  {
    'Ürün Kodu': 'YM001',
    'Ürün Adı': 'Örnek Yarı Mamul',
    'Ürün Tipi': 'Yarı Mamul',
    'Malzeme Tipi': 'Hammadde',
    'Malzeme Kodu': 'HM002',
    'Malzeme Adı': 'Başka Hammadde',
    'Miktar': 3
  },
  {
    'Ürün Kodu': 'YM001',
    'Ürün Adı': 'Örnek Yarı Mamul',
    'Ürün Tipi': 'Yarı Mamul',
    'Malzeme Tipi': 'Hammadde',
    'Malzeme Kodu': 'HM003',
    'Malzeme Adı': 'Üçüncü Hammadde',
    'Miktar': 1.5
  }
];

// Create workbook
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Set column widths
const columnWidths = [
  { wch: 15 }, // Ürün Kodu
  { wch: 30 }, // Ürün Adı
  { wch: 15 }, // Ürün Tipi
  { wch: 15 }, // Malzeme Tipi
  { wch: 15 }, // Malzeme Kodu
  { wch: 30 }, // Malzeme Adı
  { wch: 10 }, // Miktar
];
worksheet['!cols'] = columnWidths;

XLSX.utils.book_append_sheet(workbook, worksheet, 'BOM Listesi');

// Save to public and root directory
const publicPath = path.join(process.cwd(), 'public', 'bom-sample-data.xlsx');
const rootPath = path.join(process.cwd(), 'bom-sample-data.xlsx');

XLSX.writeFile(workbook, publicPath);
XLSX.writeFile(workbook, rootPath);

console.log('✅ BOM sample Excel dosyası oluşturuldu:');
console.log('  - public/bom-sample-data.xlsx');
console.log('  - bom-sample-data.xlsx');
console.log('\n📋 Kolonlar (7 adet):');
console.log('  - Ürün Kodu, Ürün Adı, Ürün Tipi');
console.log('  - Malzeme Tipi, Malzeme Kodu, Malzeme Adı');
console.log('  - Miktar');
console.log('\n🔧 Örnek satırlar:', sampleData.length);

