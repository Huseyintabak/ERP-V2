/**
 * Production API Integration Test
 * Production API endpoint testleri
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/production/log/route';
import { createMockSupabaseClient } from '../utils/test-helpers';
// jest.mock çağrıları hoist edilir; bu import'lar mock'lanmış modülleri verir
import { verifyJWT } from '@/lib/auth/jwt';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
  createAdminClient: jest.fn(() => createMockSupabaseClient()),
}));

// Mock JWT
// Route operatör kimliğinin UUID formatında olmasını şart koşuyor
const OPERATOR_ID = '11111111-2222-3333-4444-555555555555';
jest.mock('@/lib/auth/jwt', () => ({
  verifyJWT: jest.fn(() => ({
    userId: '11111111-2222-3333-4444-555555555555',
    role: 'operator',
  })),
}));

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Production API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/production/log', () => {
    test('should reject request without token', async () => {
      const request = new NextRequest('http://localhost:3000/api/production/log', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: 'test-plan-uuid',
          barcode_scanned: '1234567890001',
          quantity_produced: 10,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    test('should reject request with invalid role', async () => {
      (verifyJWT as jest.Mock).mockResolvedValueOnce({
        userId: 'test-user-uuid',
        role: 'planlama', // Operator değil
      });

      const request = new NextRequest('http://localhost:3000/api/production/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'thunder_token=test-token',
        },
        body: JSON.stringify({
          plan_id: 'test-plan-uuid',
          barcode_scanned: '1234567890001',
          quantity_produced: 10,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');
    });

    test('should reject request without required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/production/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'thunder_token=test-token',
        },
        body: JSON.stringify({
          // plan_id eksik
          barcode_scanned: '1234567890001',
          quantity_produced: 10,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('gerekli');
    });

    test('should validate plan exists and is assigned to operator', async () => {
      const mockSupabase = createMockSupabaseClient();
      
      // Mock plan query - plan bulunamadı
      (mockSupabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Plan not found' },
        }),
      });

      (createClient as jest.Mock).mockReturnValueOnce(mockSupabase);

      // Admin client: operatör users tablosunda mevcut (route plan kontrolünden önce bakıyor)
      const mockAdmin = createMockSupabaseClient();
      (mockAdmin.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: OPERATOR_ID, role: 'operator' }, error: null }),
      });
      (createAdminClient as jest.Mock).mockReturnValueOnce(mockAdmin);

      const request = new NextRequest('http://localhost:3000/api/production/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'thunder_token=test-token',
        },
        body: JSON.stringify({
          plan_id: 'test-plan-uuid',
          barcode_scanned: '1234567890001',
          quantity_produced: 10,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Plan bulunamadı');
    });
  });
});

