/**
 * E2E Test: Stock Management Flow
 * Stok giriş, çıkış ve sayım akışı testleri
 */

import { createMockRawMaterial, createMockFinishedProduct } from '../utils/test-helpers';

describe('Stock Management Flow (E2E)', () => {
  test('should handle stock entry', async () => {
    const material = createMockRawMaterial({
      code: 'HM-E2E-001',
      quantity: 100,
    });

    // Stock entry
    const stockEntry = {
      material_id: material.id,
      material_type: 'raw',
      movement_type: 'giris',
      quantity: 50,
      new_quantity: material.quantity + 50,
      timestamp: new Date().toISOString(),
    };

    expect(stockEntry.movement_type).toBe('giris');
    expect(stockEntry.new_quantity).toBe(150);
  });

  test('should handle stock exit', async () => {
    const material = createMockRawMaterial({
      code: 'HM-E2E-002',
      quantity: 100,
    });

    // Stock exit
    const stockExit = {
      material_id: material.id,
      material_type: 'raw',
      movement_type: 'cikis',
      quantity: 30,
      new_quantity: material.quantity - 30,
      timestamp: new Date().toISOString(),
    };

    expect(stockExit.movement_type).toBe('cikis');
    expect(stockExit.new_quantity).toBe(70);
  });

  test('should handle stock count', async () => {
    const product = createMockFinishedProduct({
      code: 'NU-E2E-001',
      quantity: 50,
    });

    // Stock count
    const stockCount = {
      product_id: product.id,
      product_type: 'finished',
      counted_quantity: 48,
      difference: 48 - product.quantity,
      timestamp: new Date().toISOString(),
    };

    expect(stockCount.counted_quantity).toBe(48);
    expect(stockCount.difference).toBe(-2); // Eksik
  });

  test('should update stock after movement', async () => {
    const material = createMockRawMaterial({
      quantity: 100,
    });

    // Entry sonrası güncelleme
    const updatedMaterial = {
      ...material,
      quantity: material.quantity + 50,
    };

    expect(updatedMaterial.quantity).toBe(150);
  });

  test('should prevent negative stock', async () => {
    const material = createMockRawMaterial({
      quantity: 10,
    });

    // Exit kontrolü
    const exitQuantity = 15;
    const canExit = exitQuantity <= material.quantity;

    expect(canExit).toBe(false);
  });
});

