import { NextResponse } from 'next/server';

import { logger } from '@/lib/utils/logger';
// GET - Public operatör listesi (login sayfası için)
export async function GET() {
  try {
    logger.log('🔧 Public operators endpoint called');
    
    // Basit mock data döndür
    const operators = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Thunder Operatör',
        email: 'operator1@thunder.com',
        series: 'thunder',
        location: 'Üretim Salonu A',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'ThunderPro Operatör',
        email: 'operator2@thunder.com',
        series: 'thunder_pro',
        location: 'Üretim Salonu B',
      }
    ];

    logger.log('✅ Returning mock operators:', operators);
    return NextResponse.json(operators);
  } catch (error) {
    logger.error('❌ Public operators error:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}