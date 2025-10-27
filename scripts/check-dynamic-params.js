#!/usr/bin/env node

/**
 * Next.js 15 Dynamic Params Checker
 * 
 * Bu script, tüm dynamic route handler dosyalarında
 * params'ın await ile doğru kullanılıp kullanılmadığını kontrol eder.
 */

const fs = require('fs');
const path = require('path');

// Recursive dosya bulma
function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fileList = findRouteFiles(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const ROUTE_HANDLER_PATTERN = /\[.*?\]/; // [id], [productId] gibi pattern'lar

async function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Dynamic param içeren dosya mı kontrol et
  const parentDir = path.dirname(filePath);
  const hasDynamicParam = ROUTE_HANDLER_PATTERN.test(parentDir);
  
  if (!hasDynamicParam) {
    return issues;
  }
  
  // Tüm async function tanımlarını bul
  const functionRegex = /export\s+async\s+function\s+(GET|PUT|POST|PATCH|DELETE)\s*\([^)]+{ params \}:\s*{ params:\s*Promise<[^>]+>\s*}\)[^}]+\{/g;
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    const funcStart = match.index;
    const handlerName = match[1];
    
    // Fonksiyonun gövdesini bul (basit yaklaşım - } ile bitene kadar)
    const funcBodyStart = match.index + match[0].length;
    const remainingContent = content.substring(funcBodyStart);
    
    // İlk 500 karakterlik bloğu al (params kullanımı genellikle başta olur)
    const funcBody = remainingContent.substring(0, Math.min(500, remainingContent.length));
    
    // 'await params' var mı kontrol et
    if (!funcBody.includes('await params')) {
      // Satır numarasını bul
      const linesBeforeFunc = content.substring(0, funcStart).split('\n');
      const lineNumber = linesBeforeFunc.length;
      
      issues.push({
        handler: handlerName,
        line: lineNumber,
        message: `Handler '${handlerName}' içinde 'await params' kullanılmamış. Next.js 15'te params bir Promise'dir ve await edilmelidir.`
      });
    }
  }
  
  return issues;
}

async function main() {
  console.log('🔍 Next.js 15 Dynamic Params Kontrolü başlatılıyor...\n');
  
  const apiDir = path.join(process.cwd(), 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.log('❌ app/api klasörü bulunamadı.');
    return;
  }
  
  const files = findRouteFiles(apiDir);
  
  if (files.length === 0) {
    console.log('✅ Dynamic route handler dosyası bulunamadı.');
    return;
  }
  
  console.log(`📁 ${files.length} dosya bulundu.\n`);
  
  let totalIssues = 0;
  const fileIssues = [];
  
  for (const file of files) {
    const issues = await checkFile(file);
    
    if (issues.length > 0) {
      fileIssues.push({ file, issues });
      totalIssues += issues.length;
    }
  }
  
  if (totalIssues === 0) {
    console.log('✅ Tüm dosyalar Next.js 15 uyumlu!\n');
    return;
  }
  
  console.log(`⚠️  ${totalIssues} sorun bulundu:\n`);
  
  for (const { file, issues } of fileIssues) {
    console.log(`📄 ${file}`);
    for (const issue of issues) {
      console.log(`   ${issue.handler}:${issue.line} - ${issue.message}`);
    }
    console.log();
  }
  
  console.log('\n💡 Düzeltme örneği:');
  console.log('   ❌ const { id } = params;');
  console.log('   ✅ const { id } = await params;');
  console.log();
  
  process.exit(1);
}

main().catch(console.error);

