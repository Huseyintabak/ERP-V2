#!/usr/bin/env node

/**
 * Console Log Temizleme Script'i
 * Tüm console.log, console.error, console.warn çağrılarını
 * lib/utils/logger kullanacak şekilde değiştirir.
 */

const fs = require('fs');
const path = require('path');

// Temizlenecek dosya pattern'leri
const targetPatterns = [
  /app\/api\/(.+\.ts)/,
  /components\/(.+\.tsx)/,
  /lib\/(.+\.ts)/,
];

// Değiştirilecek console metodları
const consoleMethods = ['log', 'error', 'warn', 'info'];

// Dosya bulma fonksiyonu
function findFiles(dir, pattern, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fileList = findFiles(filePath, pattern, fileList);
    } else if (pattern.test(filePath)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Dosyayı temizle
function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Import kontrolü
  const hasLoggerImport = content.includes("import { logger }");
  const hasLoggerImportPath = content.includes("from '@/lib/utils/logger'");
  
  // Import ekle (eğer yoksa)
  if (content.includes('console.') && !hasLoggerImport) {
    // Import satırını bul
    const importRegex = /(import\s+.*?;)/g;
    const lastImport = [...content.matchAll(importRegex)].pop();
    
    if (lastImport) {
      const lastImportPos = lastImport.index + lastImport[0].length;
      const importStatement = lastImportPos > 0 
        ? `\nimport { logger } from '@/lib/utils/logger';` 
        : `import { logger } from '@/lib/utils/logger';\n`;
      
      content = content.slice(0, lastImportPos) + importStatement + content.slice(lastImportPos);
    } else {
      // Hiç import yoksa, başta ekle
      content = `import { logger } from '@/lib/utils/logger';\n\n${content}`;
    }
  }
  
  // console.log, console.error, console.warn değiştir
  for (const method of consoleMethods) {
    const regex = new RegExp(`console\\.${method}`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `logger.${method}`);
    }
  }
  
  // Değişiklik varsa dosyayı yaz
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

// Ana fonksiyon
function main() {
  console.log('🔧 Console Log Temizleme Başlıyor...\n');
  
  const appApiFiles = findFiles('app/api', /\.ts$/);
  const componentFiles = findFiles('components', /\.tsx?$/);
  const libFiles = findFiles('lib', /\.ts$/);
  
  const allFiles = [...appApiFiles, ...componentFiles, ...libFiles];
  
  console.log(`📁 Toplam ${allFiles.length} dosya bulundu\n`);
  
  let cleanedCount = 0;
  
  for (const file of allFiles) {
    try {
      if (cleanFile(file)) {
        console.log(`✅ Temizlendi: ${file}`);
        cleanedCount++;
      }
    } catch (error) {
      console.error(`❌ Hata (${file}):`, error.message);
    }
  }
  
  console.log(`\n🎉 Tamamlandı! ${cleanedCount} dosya temizlendi.`);
}

main();

