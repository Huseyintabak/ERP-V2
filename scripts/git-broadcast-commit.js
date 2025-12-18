#!/usr/bin/env node

/**
 * Git Commit Broadcast Script
 * Commit yapıldığında otomatik olarak broadcast gönderir
 */

const { execSync } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// .env.local dosyasını yükle (eğer varsa)
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value.trim();
          }
        }
      }
    });
  }
}

// Environment variable'ları yükle
loadEnvFile();

// Environment variables
const BROADCAST_API_URL = process.env.BROADCAST_API_URL || 'http://localhost:3000/api/settings/broadcast';
const BROADCAST_ENABLED = process.env.GIT_BROADCAST_ENABLED !== 'false'; // Default: true
const BROADCAST_SERVICE_TOKEN = process.env.BROADCAST_SERVICE_TOKEN || ''; // Service token for authentication

// Git bilgilerini al
function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
    const authorName = execSync('git log -1 --pretty=%an', { encoding: 'utf-8' }).trim();
    const authorEmail = execSync('git log -1 --pretty=%ae', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);

    return {
      commitHash,
      commitMessage,
      authorName,
      authorEmail,
      branch,
      changedFiles
    };
  } catch (error) {
    console.error('❌ Git bilgileri alınamadı:', error.message);
    process.exit(0); // Hata olsa bile commit'i durdurma
    return null;
  }
}

// Broadcast API'sini çağır
function sendBroadcast(gitInfo) {
  return new Promise((resolve, reject) => {
    const url = new URL(BROADCAST_API_URL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;

    const settingKey = `git_commit_${gitInfo.commitHash.substring(0, 8)}`;
    const settingValue = {
      commit_hash: gitInfo.commitHash,
      commit_message: gitInfo.commitMessage,
      author: {
        name: gitInfo.authorName,
        email: gitInfo.authorEmail
      },
      branch: gitInfo.branch,
      changed_files: gitInfo.changedFiles,
      timestamp: new Date().toISOString()
    };

    const postData = JSON.stringify({
      setting_key: settingKey,
      setting_value: settingValue,
      change_type: 'created',
      broadcast_to: 'all',
      message: `Yeni commit: ${gitInfo.commitMessage.substring(0, 100)}${gitInfo.commitMessage.length > 100 ? '...' : ''}\n\nBranch: ${gitInfo.branch}\nDeğişen dosyalar: ${gitInfo.changedFiles.length} dosya`,
      expires_at: null
    });

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    
    // Service token ekle (eğer varsa)
    if (BROADCAST_SERVICE_TOKEN) {
      headers['x-service-token'] = BROADCAST_SERVICE_TOKEN;
      console.log('🔑 Service token kullanılıyor (uzunluk: ' + BROADCAST_SERVICE_TOKEN.length + ')');
    } else {
      console.log('⚠️  BROADCAST_SERVICE_TOKEN tanımlı değil, authentication olmadan denenecek');
    }
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers
    };

    const req = httpModule.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(data);
            if (response.success) {
              console.log('✅ Broadcast başarıyla gönderildi');
              resolve(response);
            } else {
              console.warn('⚠️  Broadcast gönderildi ama başarısız:', response.error);
              resolve(null); // Hata olsa bile commit'i durdurma
            }
          } catch (error) {
            console.warn('⚠️  Broadcast response parse edilemedi:', error.message);
            resolve(null); // Hata olsa bile commit'i durdurma
          }
        } else {
          console.warn(`⚠️  Broadcast API hatası: ${res.statusCode} - ${data}`);
          resolve(null); // Hata olsa bile commit'i durdurma
        }
      });
    });

    req.on('error', (error) => {
      console.warn('⚠️  Broadcast gönderilemedi (API erişilemiyor):', error.message);
      resolve(null); // Hata olsa bile commit'i durdurma
    });

    req.write(postData);
    req.end();
  });
}

// Ana fonksiyon
async function main() {
  if (!BROADCAST_ENABLED) {
    console.log('ℹ️  Git broadcast devre dışı (GIT_BROADCAST_ENABLED=false)');
    process.exit(0);
  }

  console.log('📡 Git commit broadcast gönderiliyor...');

  const gitInfo = getGitInfo();
  if (!gitInfo) {
    process.exit(0); // Hata olsa bile commit'i durdurma
    return;
  }

  // Sadece main/master branch'lerde broadcast gönder (opsiyonel)
  const IMPORTANT_BRANCHES = ['main', 'master', 'production'];
  if (process.env.GIT_BROADCAST_ONLY_MAIN === 'true' && !IMPORTANT_BRANCHES.includes(gitInfo.branch)) {
    console.log(`ℹ️  Broadcast sadece main branch'lerde aktif (şu anki branch: ${gitInfo.branch})`);
    process.exit(0);
    return;
  }

  try {
    await sendBroadcast(gitInfo);
  } catch (error) {
    console.warn('⚠️  Broadcast gönderilirken hata:', error.message);
    // Hata olsa bile commit'i durdurma
  }

  process.exit(0);
}

// Script'i çalıştır
main();

