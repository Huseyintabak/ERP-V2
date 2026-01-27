/**
 * useBarcode Hook Test
 * Barcode scanning hook testleri
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBarcode } from '../use-barcode';

// Mock window events
const createKeyboardEvent = (key: string) => {
  return new KeyboardEvent('keypress', { key, bubbles: true });
};

describe('useBarcode', () => {
  let onScan: jest.Mock;

  beforeEach(() => {
    onScan = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('useBarcode should initialize with empty buffer', () => {
    const { result } = renderHook(() => useBarcode(onScan));
    
    expect(result.current).toBe('');
    expect(onScan).not.toHaveBeenCalled();
  });

  test('useBarcode should accumulate characters in buffer', () => {
    const { result } = renderHook(() => useBarcode(onScan));
    
    act(() => {
      window.dispatchEvent(createKeyboardEvent('1'));
      window.dispatchEvent(createKeyboardEvent('2'));
      window.dispatchEvent(createKeyboardEvent('3'));
    });
    
    expect(result.current).toBe('123');
    expect(onScan).not.toHaveBeenCalled();
  });

  test('useBarcode should call onScan when Enter is pressed', () => {
    const { result } = renderHook(() => useBarcode(onScan));
    
    act(() => {
      window.dispatchEvent(createKeyboardEvent('1'));
      window.dispatchEvent(createKeyboardEvent('2'));
      window.dispatchEvent(createKeyboardEvent('3'));
      window.dispatchEvent(createKeyboardEvent('Enter'));
    });
    
    expect(onScan).toHaveBeenCalledWith('123');
    expect(result.current).toBe('');
  });

  test('useBarcode should clear buffer after Enter', () => {
    const { result } = renderHook(() => useBarcode(onScan));
    
    act(() => {
      window.dispatchEvent(createKeyboardEvent('1'));
      window.dispatchEvent(createKeyboardEvent('2'));
      window.dispatchEvent(createKeyboardEvent('Enter'));
      window.dispatchEvent(createKeyboardEvent('4'));
      window.dispatchEvent(createKeyboardEvent('5'));
    });
    
    expect(result.current).toBe('45');
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledWith('12');
  });

  test('useBarcode should clear buffer after timeout', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useBarcode(onScan));
    
    act(() => {
      window.dispatchEvent(createKeyboardEvent('1'));
      window.dispatchEvent(createKeyboardEvent('2'));
    });
    
    expect(result.current).toBe('12');
    
    // Timeout'u tetikle
    act(() => {
      jest.advanceTimersByTime(101); // 100ms timeout + 1ms
    });
    
    // Buffer temizlenmiş olmalı
    expect(result.current).toBe('');
    
    jest.useRealTimers();
  });

  test('useBarcode should not call onScan with empty buffer', () => {
    const { result } = renderHook(() => useBarcode(onScan));
    
    act(() => {
      window.dispatchEvent(createKeyboardEvent('Enter'));
    });
    
    expect(onScan).not.toHaveBeenCalled();
    expect(result.current).toBe('');
  });

  test('useBarcode should reset timeout on new character', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useBarcode(onScan));
    
    act(() => {
      window.dispatchEvent(createKeyboardEvent('1'));
    });
    
    expect(result.current).toBe('1');
    
    // 50ms sonra yeni karakter (timeout reset olmalı)
    act(() => {
      jest.advanceTimersByTime(50);
      window.dispatchEvent(createKeyboardEvent('2'));
    });
    
    expect(result.current).toBe('12');
    
    // 50ms daha bekle (toplam 100ms değil, 50ms - timeout reset oldu)
    act(() => {
      jest.advanceTimersByTime(50);
    });
    
    // Buffer hala dolu olmalı (timeout reset oldu, henüz 100ms geçmedi)
    expect(result.current).toBe('12');
    
    // 100ms daha bekle (son karakterden sonra 100ms geçti)
    act(() => {
      jest.advanceTimersByTime(100);
    });
    
    // Buffer temizlenmiş olmalı
    expect(result.current).toBe('');
    
    jest.useRealTimers();
  });

  test('useBarcode should handle multiple scans', async () => {
    const { result } = renderHook(() => useBarcode(onScan));
    
    // İlk barkod
    act(() => {
      window.dispatchEvent(createKeyboardEvent('1'));
      window.dispatchEvent(createKeyboardEvent('2'));
      window.dispatchEvent(createKeyboardEvent('3'));
      window.dispatchEvent(createKeyboardEvent('Enter'));
    });
    
    await waitFor(() => {
      expect(onScan).toHaveBeenCalledWith('123');
    });
    
    // İkinci barkod
    act(() => {
      window.dispatchEvent(createKeyboardEvent('4'));
      window.dispatchEvent(createKeyboardEvent('5'));
      window.dispatchEvent(createKeyboardEvent('6'));
      window.dispatchEvent(createKeyboardEvent('Enter'));
    });
    
    expect(onScan).toHaveBeenCalledWith('456');
    expect(onScan).toHaveBeenCalledTimes(2);
  });
});

