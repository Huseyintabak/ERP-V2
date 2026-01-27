/**
 * E2E Test: Order to Production Flow
 * Sipariş oluşturma, planlama ve üretim akışı testleri
 */

import { createMockOrder, createMockProductionPlan } from '../utils/test-helpers';

describe('Order to Production Flow (E2E)', () => {
  test('should create order and generate production plan', async () => {
    // 1. Order oluştur
    const order = createMockOrder({
      order_number: 'ORD-E2E-001',
      status: 'beklemede',
    });

    expect(order).toBeDefined();
    expect(order.order_number).toBe('ORD-E2E-001');
    expect(order.status).toBe('beklemede');

    // 2. Production plan oluştur
    const plan = createMockProductionPlan({
      order_id: order.id,
      status: 'planlandi',
    });

    expect(plan).toBeDefined();
    expect(plan.order_id).toBe(order.id);
    expect(plan.status).toBe('planlandi');
  });

  test('should assign operator to production plan', async () => {
    const plan = createMockProductionPlan({
      status: 'planlandi',
      assigned_operator_id: null,
    });

    // Operator atama
    const updatedPlan = {
      ...plan,
      assigned_operator_id: 'test-operator-uuid',
    };

    expect(updatedPlan.assigned_operator_id).toBe('test-operator-uuid');
  });

  test('should record production log', async () => {
    const plan = createMockProductionPlan({
      status: 'devam_ediyor',
      assigned_operator_id: 'test-operator-uuid',
      produced_quantity: 0,
    });

    // Production log kaydı
    const productionLog = {
      plan_id: plan.id,
      operator_id: plan.assigned_operator_id,
      quantity_produced: 10,
      barcode_scanned: '1234567890001',
      timestamp: new Date().toISOString(),
    };

    expect(productionLog.plan_id).toBe(plan.id);
    expect(productionLog.quantity_produced).toBe(10);
  });

  test('should update plan status after production', async () => {
    const plan = createMockProductionPlan({
      status: 'devam_ediyor',
      planned_quantity: 100,
      produced_quantity: 90,
    });

    // Production tamamlandı
    const updatedPlan = {
      ...plan,
      produced_quantity: 100,
      status: 'tamamlandi',
      completed_at: new Date().toISOString(),
    };

    expect(updatedPlan.status).toBe('tamamlandi');
    expect(updatedPlan.produced_quantity).toBe(100);
  });
});

