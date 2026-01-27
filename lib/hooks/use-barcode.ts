import { useEffect, useState, useRef } from 'react';

export const useBarcode = (onScan: (barcode: string) => void) => {
  const [buffer, setBuffer] = useState('');
  const bufferRef = useRef('');

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Enter tuşu basıldığında barkod tamamlanmış sayılır
      if (e.key === 'Enter') {
        if (bufferRef.current.trim()) {
          onScan(bufferRef.current.trim());
          bufferRef.current = '';
          setBuffer('');
        }
      } else if (e.key.length === 1) {
        // Sadece karakter tuşlarını al
        bufferRef.current += e.key;
        setBuffer(bufferRef.current);
        
        // Timeout'u temizle ve yeniden başlat
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          bufferRef.current = '';
          setBuffer('');
        }, 100); // 100ms sonra buffer'ı temizle
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [onScan]);

  return buffer;
};