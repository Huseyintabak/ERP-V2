# 🔒 Lokal HTTPS Kurulumu (Mobil Test için)

## ⚠️ Problem

Mobil cihazlardan kamera erişimi için **HTTPS gerekli**!

```
❌ http://192.168.1.121:3001  → Kamera çalışmaz
✅ https://192.168.1.121:3001 → Kamera çalışır
```

---

## 🚀 Çözüm 1: mkcert ile Lokal SSL (Önerilen)

### Adım 1: mkcert Kurulumu

#### Mac:
```bash
brew install mkcert
brew install nss # Firefox için
```

#### Windows:
```bash
choco install mkcert
```

#### Linux:
```bash
# Ubuntu/Debian
sudo apt install libnss3-tools
wget -O mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
chmod +x mkcert
sudo mv mkcert /usr/local/bin/
```

### Adım 2: Lokal CA Oluştur

```bash
mkcert -install
```

Bu komut lokal bir Certificate Authority (CA) oluşturur ve sisteminize güvenilir olarak ekler.

### Adım 3: SSL Sertifikası Oluştur

```bash
cd ThunderV2

# Lokal IP adresinizi bulun
# Mac/Linux:
ifconfig | grep "inet "

# Windows:
ipconfig

# Sertifika oluştur (IP adresinizi yazın)
mkcert localhost 127.0.0.1 192.168.1.121
```

Bu komut 3 dosya oluşturur:
- `localhost+2.pem` (Sertifika)
- `localhost+2-key.pem` (Private Key)

### Adım 4: SSL Dosyalarını Taşı

```bash
mkdir -p certs
mv localhost+2.pem certs/cert.pem
mv localhost+2-key.pem certs/key.pem
```

### Adım 5: Next.js HTTPS Server

`package.json` dosyasına ekleyin:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:https": "node server-https.js"
  }
}
```

`server-https.js` dosyası oluşturun:

```javascript
const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3001;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/cert.pem'),
};

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`
