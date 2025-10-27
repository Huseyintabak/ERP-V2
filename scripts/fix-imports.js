#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import satırını kaldır ve dosyanın başına ekle
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Yanlış yerdeki import'u bul ve sil
  const wrongImportPattern = /import \{ logger \} from '@\/lib\/utils\/logger';\n/g;
  
  if (wrongImportPattern.test(content)) {
    content = content.replace(wrongImportPattern, '');
    
    // Dosyanın başında logger import var mı kontrol et
    if (!content.includes("from '@/lib/utils/logger'")) {
      // Import'ların sonunu bul
      const lastImportMatch = content.match(/import\s+.*?['"];?\s*$/gm);
      
      if (lastImportMatch && lastImportMatch.length > 0) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const lastImportPos = content.indexOf(lastImport) + lastImport.length;
        content = content.slice(0, lastImportPos) + "\nimport { logger } from '@/lib/utils/logger';" + content.slice(lastImportPos);
      }
    }
    
    // Değişiklik varsa kaydet
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
  }
  
  return false;
}

// Tüm app/api dosyalarını bul ve düzelt
function findAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fileList = findAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Ana fonksiyon
function main() {
  const files = findAllFiles('app/api');
  let fixedCount = 0;
  
  for (const file of files) {
    try {
      if (fixFile(file)) {
        console.log(`✅ Düzeltildi: ${file}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Hata (${file}):`, error.message);
    }
  }
  
  console.log(`\n🎉 ${fixedCount} dosya düzeltildi!`);
}

main();

