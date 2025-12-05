/**
 * OpenAI Quota Management API
 * Quota durumunu kontrol et, reset et veya cache'i temizle
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQuotaManager } from '@/lib/ai/utils/quota-manager';

export async function GET(request: NextRequest) {
  try {
    const quotaManager = getQuotaManager();
    const quotaStatus = quotaManager.getQuotaStatus();
    
    return NextResponse.json({
      success: true,
      quotaExceeded: quotaManager.isQuotaExceeded(),
      status: quotaStatus ? {
        isQuotaExceeded: quotaStatus.isQuotaExceeded,
        lastCheck: quotaStatus.lastCheck,
        expiryTime: quotaStatus.expiryTime,
        reason: quotaStatus.reason,
        statusCode: quotaStatus.statusCode
      } : null,
      message: quotaManager.isQuotaExceeded() 
        ? `Quota exceeded. Will retry after ${quotaStatus?.expiryTime?.toISOString() || '1 hour'}`
        : 'Quota available'
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Quota durumunu reset et (manuel)
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'reset') {
      const quotaManager = getQuotaManager();
      quotaManager.resetQuotaStatus();
      
      return NextResponse.json({
        success: true,
        message: 'Quota status reset successfully. AI validation will retry on next request.'
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use { "action": "reset" }'
      },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

