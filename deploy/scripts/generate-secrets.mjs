#!/usr/bin/env node
/**
 * VPS için tüm secret'ları üretir ve iki env dosyası yazar:
 *   1) deploy/supabase/.env      → Supabase Docker stack
 *   2) .env.production.local     → Next.js uygulaması (PM2)
 *
 * Kullanım (repo kökünden):
 *   node deploy/scripts/generate-secrets.mjs --public-url http://<VPS_IP>
 *
 * Var olan dosyaların üzerine YAZMAZ (--force verilmedikçe) — yanlışlıkla secret
 * değiştirmek DB'ye erişimi bozar.
 */
import { randomBytes, createHmac } from 'node:crypto';
import { existsSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const force = args.includes('--force');
const urlIdx = args.indexOf('--public-url');
const publicUrl = urlIdx >= 0 ? args[urlIdx + 1] : undefined;

if (!publicUrl || !/^https?:\/\/[^/]+$/.test(publicUrl)) {
  console.error('Kullanım: node deploy/scripts/generate-secrets.mjs --public-url http://<VPS_IP>  (sonda / olmadan)');
  process.exit(1);
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const secret = (bytes) => randomBytes(bytes).toString('base64url');
const hex = (bytes) => randomBytes(bytes).toString('hex');

function signJwt(payload, key) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', key).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const now = Math.floor(Date.now() / 1000);
const tenYears = now + 10 * 365 * 24 * 3600;

const POSTGRES_PASSWORD = hex(24); // URL'de escape gerektirmesin diye hex
const SUPABASE_JWT_SECRET = secret(48);
const SUPABASE_ANON_KEY = signJwt({ role: 'anon', iss: 'supabase', iat: now, exp: tenYears }, SUPABASE_JWT_SECRET);
const SUPABASE_SERVICE_ROLE_KEY = signJwt(
  { role: 'service_role', iss: 'supabase', iat: now, exp: tenYears },
  SUPABASE_JWT_SECRET
);
const REALTIME_SECRET_KEY_BASE = secret(64);
const APP_JWT_SECRET = secret(48); // uygulamanın kendi thunder_token imzası — Supabase JWT'sinden AYRI
const CRON_SECRET = secret(32);

const supabaseEnv = `# Üretildi: ${new Date().toISOString()} — generate-secrets.mjs
# BU DOSYAYI GIT'E EKLEME. Yedeğini güvenli bir yerde (şifre yöneticisi) sakla.

POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
REALTIME_SECRET_KEY_BASE=${REALTIME_SECRET_KEY_BASE}
JWT_EXPIRY=3600

POSTGRES_PORT=5432
KONG_HTTP_PORT=8000

# Image tag'leri (gerekirse güncelle)
POSTGRES_IMAGE_TAG=15.8.1.060
POSTGREST_IMAGE_TAG=v12.2.12
REALTIME_IMAGE_TAG=v2.34.47
KONG_IMAGE_TAG=2.8.1
`;

const appEnv = `# Üretildi: ${new Date().toISOString()} — generate-secrets.mjs
# Next.js production env (next build + next start bu dosyayı okur). GIT'E EKLEME.

NODE_ENV=production

# Tarayıcının gördüğü adres (sadece realtime websocket için kullanılır; Nginx /realtime/v1/ açar)
NEXT_PUBLIC_SUPABASE_URL=${publicUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000

# Sunucu tarafı: Kong'a iç ağdan
SUPABASE_INTERNAL_URL=http://127.0.0.1:8000
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Uygulama auth (thunder_token imzası)
JWT_SECRET=${APP_JWT_SECRET}

# Cron (dolar kuru)
CRON_SECRET=${CRON_SECRET}

# HTTPS yokken false kalmalı; domain + Let's Encrypt sonrası true yap
USE_HTTPS=false

# AI/n8n modülü kapalı
AI_ENABLED=false
NEXT_PUBLIC_AI_ENABLED=false
AGENT_ENABLED=false
`;

function write(path, content) {
  if (existsSync(path) && !force) {
    console.error(`⛔ ${path} zaten var — üzerine yazılmadı (--force ile zorlayabilirsin, DİKKAT: DB şifresi değişir).`);
    return false;
  }
  writeFileSync(path, content, { mode: 0o600 });
  chmodSync(path, 0o600);
  console.log(`✅ ${path} yazıldı (chmod 600)`);
  return true;
}

write(resolve(root, 'deploy/supabase/.env'), supabaseEnv);
write(resolve(root, '.env.production.local'), appEnv);
