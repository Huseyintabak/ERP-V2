/**
 * Sample Barcode Data Generator
 * For testing and demonstration purposes
 */

import type { LabelProduct } from './barcode-label';

export const sampleProducts: LabelProduct[] = [
  // Finished Products
  {
    id: 'fp-001',
    code: 'TRX-1-BLACK-102',
    name: 'Thunder X Pro Siyah',
    barcode: '8691234567890',
    type: 'finished',
    unit: 'Adet',
    category: 'Elektronik',
    price: 2499.99,
  },
  {
    id: 'fp-002',
    code: 'TRX-2-WHITE-103',
    name: 'Thunder X Pro Beyaz',
    barcode: '8691234567891',
    type: 'finished',
    unit: 'Adet',
    category: 'Elektronik',
    price: 2499.99,
  },
  {
    id: 'fp-003',
    code: 'TRY-1-BLUE-201',
    name: 'Thunder Y Plus Mavi',
    barcode: '8691234567892',
    type: 'finished',
    unit: 'Adet',
    category: 'Elektronik',
    price: 1899.99,
  },
  {
    id: 'fp-004',
    code: 'TRZ-1-RED-301',
    name: 'Thunder Z Lite Kırmızı',
    barcode: '8691234567893',
    type: 'finished',
    unit: 'Adet',
    category: 'Elektronik',
    price: 1299.99,
  },
  {
    id: 'fp-005',
    code: 'ACC-CASE-001',
    name: 'Premium Koruyucu Kılıf',
    barcode: '8691234567894',
    type: 'finished',
    unit: 'Adet',
    category: 'Aksesuar',
    price: 149.99,
  },

  // Semi-Finished Products
  {
    id: 'sf-001',
    code: 'PCB-MAIN-V2',
    name: 'Ana Devre Kartı V2',
    barcode: 'PCB001234567',
    type: 'semi_finished',
    unit: 'Adet',
    category: 'Elektronik Komponent',
  },
  {
    id: 'sf-002',
    code: 'DISPLAY-7INCH',
    name: '7 İnç LCD Ekran',
    barcode: 'LCD001234567',
    type: 'semi_finished',
    unit: 'Adet',
    category: 'Elektronik Komponent',
  },
  {
    id: 'sf-003',
    code: 'BATTERY-5000',
    name: '5000mAh Lityum Batarya',
    barcode: 'BAT001234567',
    type: 'semi_finished',
    unit: 'Adet',
    category: 'Enerji',
  },
  {
    id: 'sf-004',
    code: 'HOUSING-BLACK',
    name: 'Siyah Plastik Kasa',
    barcode: 'HSG001234567',
    type: 'semi_finished',
    unit: 'Adet',
    category: 'Plastik Parça',
  },
  {
    id: 'sf-005',
    code: 'CAMERA-12MP',
    name: '12MP Kamera Modülü',
    barcode: 'CAM001234567',
    type: 'semi_finished',
    unit: 'Adet',
    category: 'Optik',
  },

  // Raw Materials
  {
    id: 'rm-001',
    code: 'CHIP-CPU-001',
    name: 'ARM Cortex İşlemci',
    barcode: 'CPU001234567',
    type: 'raw_material',
    unit: 'Adet',
    category: 'Yarı İletken',
  },
  {
    id: 'rm-002',
    code: 'RAM-4GB-DDR4',
    name: '4GB DDR4 RAM',
    barcode: 'RAM001234567',
    type: 'raw_material',
    unit: 'Adet',
    category: 'Bellek',
  },
  {
    id: 'rm-003',
    code: 'PLASTIC-ABS-BLK',
    name: 'ABS Plastik Granül (Siyah)',
    barcode: 'PLA001234567',
    type: 'raw_material',
    unit: 'kg',
    category: 'Hammadde',
  },
  {
    id: 'rm-004',
    code: 'SCREW-M3-10MM',
    name: 'M3x10mm Vida',
    barcode: 'SCR001234567',
    type: 'raw_material',
    unit: 'Paket',
    category: 'Bağlantı',
  },
  {
    id: 'rm-005',
    code: 'CABLE-USB-C',
    name: 'USB-C Kablo',
    barcode: 'CBL001234567',
    type: 'raw_material',
    unit: 'Metre',
    category: 'Kablolama',
  },
];

/**
 * Generate random barcode
 */
export function generateRandomBarcode(type: 'EAN13' | 'CODE128' = 'CODE128'): string {
  if (type === 'EAN13') {
    // Generate 12 random digits + 1 check digit
    let digits = '';
    for (let i = 0; i < 12; i++) {
      digits += Math.floor(Math.random() * 10);
    }
    // Calculate EAN13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return digits + checkDigit;
  } else {
    // CODE128: Random alphanumeric
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

/**
 * Generate sample product
 */
export function generateSampleProduct(
  index: number,
  type: LabelProduct['type'] = 'finished'
): LabelProduct {
  const typeLabels = {
    finished: 'Mamul',
    semi_finished: 'Yarı Mamul',
    raw_material: 'Hammadde',
  };

  return {
    id: `sample-${type}-${index}`,
    code: `${type.toUpperCase().substring(0, 3)}-${index.toString().padStart(3, '0')}`,
    name: `${typeLabels[type]} Ürün ${index}`,
    barcode: generateRandomBarcode(),
    type,
    unit: 'Adet',
    category: 'Test Kategori',
    price: type === 'finished' ? Math.random() * 1000 + 100 : undefined,
  };
}

/**
 * Generate multiple sample products
 */
export function generateSampleProducts(
  count: number,
  type?: LabelProduct['type']
): LabelProduct[] {
  const products: LabelProduct[] = [];
  const types: LabelProduct['type'][] = ['finished', 'semi_finished', 'raw_material'];

  for (let i = 0; i < count; i++) {
    const productType = type || types[i % types.length];
    products.push(generateSampleProduct(i + 1, productType));
  }

  return products;
}

/**
 * Get sample products by type
 */
export function getSampleProductsByType(type: LabelProduct['type']): LabelProduct[] {
  return sampleProducts.filter((p) => p.type === type);
}

/**
 * Search sample products
 */
export function searchSampleProducts(query: string): LabelProduct[] {
  const lowerQuery = query.toLowerCase();
  return sampleProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.code.toLowerCase().includes(lowerQuery) ||
      p.barcode.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get random sample products
 */
export function getRandomSampleProducts(count: number = 5): LabelProduct[] {
  const shuffled = [...sampleProducts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Example usage data
 */
export const exampleUsageScenarios = [
  {
    title: 'Yeni Ürün Etiketi',
    description: 'Tek bir yeni ürün için standart etiket',
    products: [sampleProducts[0]],
    options: {
      format: 'pdf' as const,
      labelSize: 'medium' as const,
      includeQR: false,
      includePrice: true,
      copies: 3,
      barcodeType: 'CODE128' as const,
    },
  },
  {
    title: 'Toplu Stok Etiketi',
    description: 'Depo için birden fazla ürün etiketi',
    products: sampleProducts.slice(0, 5),
    options: {
      format: 'pdf' as const,
      labelSize: 'medium' as const,
      includeQR: false,
      includePrice: false,
      copies: 2,
      barcodeType: 'CODE128' as const,
    },
  },
  {
    title: 'QR Kodlu Detaylı Etiket',
    description: 'QR kod ve fiyat bilgisi içeren etiket',
    products: [sampleProducts[2]],
    options: {
      format: 'pdf' as const,
      labelSize: 'large' as const,
      includeQR: true,
      includePrice: true,
      copies: 1,
      barcodeType: 'CODE128' as const,
    },
  },
  {
    title: 'Zebra Termal Yazdırma',
    description: 'Zebra yazıcı için ZPL formatında etiketler',
    products: sampleProducts.slice(5, 10),
    options: {
      format: 'zpl' as const,
      labelSize: 'small' as const,
      includeQR: false,
      includePrice: false,
      copies: 1,
      barcodeType: 'CODE128' as const,
    },
  },
];
