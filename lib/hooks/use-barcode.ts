import { useEffect, useState } from 'react';

export const useBarcode = (onScan: (barcode: string) => void) => {
  const [buffer, setBuffer] = useState('');

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Enter tuşu basıldığında barkod tamamlanmış sayılır
      if (e.key === 'Enter') {
        if (buffer.trim()) {
          onScan(buffer.trim());
          setBuffer('');
        }
      } else if (e.key.length === 1) {
        // Sadece karakter tuşlarını al
        setBuffer(prev => prev + e.key);
        
        // Timeout'u temizle ve yeniden başlat
        clearTimeout(timeout);
        timeout = setTimeout(() => setBuffer(''), 100); // 100ms sonra buffer'ı temizle
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [buffer, onScan]);

  return buffer;
};