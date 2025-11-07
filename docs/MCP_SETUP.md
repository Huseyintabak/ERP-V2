# 🔧 MCP (Model Context Protocol) Yapılandırması

## 📋 Genel Bakış

Bu proje, Cursor IDE'de **proje bazlı MCP yapılandırması** kullanıyor. Bu sayede her proje açıldığında MCP sunucuları otomatik olarak yüklenir ve manuel ayar değişikliği yapmanıza gerek kalmaz.

## 🚀 Kurulum

### 1. MCP Yapılandırma Dosyası Oluşturma

Proje kök dizininde `mcp.json` dosyası oluşturun:

```bash
cp .mcp.example.json mcp.json
```

### 2. API Anahtarlarını Yapılandırma

`mcp.json` dosyasını düzenleyin ve gerekli API anahtarlarını ekleyin:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF"
    }
  }
}
```

### 3. Project Reference ID'yi Bulma

Supabase Project Reference ID'nizi bulmak için:

1. Supabase Dashboard'a giriş yapın
2. Projenizi seçin
3. Settings → General → Reference ID bölümünden `project_ref` değerini kopyalayın
4. `mcp.json` dosyasındaki `YOUR_PROJECT_REF` yerine yapıştırın

## 📦 Desteklenen MCP Sunucuları

### Supabase MCP
- **Kullanım:** Supabase veritabanı sorguları, tablo yönetimi ve veri işlemleri
- **Gereksinimler:**
  - Supabase Project Reference ID
  - URL formatı: `https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF`
- **Özellikler:**
  - SQL sorguları çalıştırma
  - Tablo yapısını inceleme
  - Veri ekleme, güncelleme, silme
  - Migration yönetimi

## 🔄 Cursor'ı Yeniden Başlatma

MCP yapılandırması değişikliklerinin etkili olması için:

1. Cursor IDE'yi kapatın
2. Cursor'ı yeniden açın
3. Projeyi açın

Cursor otomatik olarak `mcp.json` dosyasını algılayacak ve MCP sunucularını yükleyecektir.

## ✅ Doğrulama

MCP sunucularının düzgün çalıştığını kontrol etmek için:

1. Cursor'da Command Palette'i açın (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. "MCP" yazın ve ilgili komutları görün
3. AI asistanına MCP ile ilgili bir soru sorun (örn: "Supabase'deki users tablosunu listele" veya "orders tablosundaki son 10 kaydı getir")

## 🛡️ Güvenlik Notları

- ⚠️ **`mcp.json` dosyası `.gitignore`'da!** API anahtarlarınızı asla commit etmeyin
- ✅ **`.mcp.example.json`** dosyasını commit edebilirsiniz (template olarak)
- 🔐 Environment variables kullanımı önerilir
- 🔒 Production'da API anahtarlarını güvenli bir şekilde saklayın

## 🎯 Proje Bazlı Yapılandırma Avantajları

✅ **Otomatik Yükleme:** Her proje açıldığında MCP sunucuları otomatik yüklenir  
✅ **Proje İzolasyonu:** Her proje kendi MCP yapılandırmasına sahip  
✅ **Takım Çalışması:** `.mcp.example.json` ile takım üyeleri kolayca yapılandırabilir  
✅ **Versiyon Kontrolü:** Template dosyası git'te, gerçek anahtarlar güvende  

## 📚 Daha Fazla Bilgi

- [Cursor MCP Dokümantasyonu](https://docs.cursor.com/context/mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Supabase MCP Server](https://supabase.com/docs/guides/ai/mcp)

