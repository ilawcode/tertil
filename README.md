# Tertil - Kuran Okuma Programları Platformu

Tertil, Kuran-ı Kerim okuma programlarını paylaşabileceğiniz ve toplu okuma organizasyonları düzenleyebileceğiniz modern bir web platformudur.

## 🌟 Özellikler

### Kullanıcı Özellikleri
- ✅ Kullanıcı kayıt ve giriş sistemi (ad, soyad, e-posta, şifre)
- ✅ Kuran okuma programları oluşturma (Hatim, Yasin, İhlas, Fetih, vb.)
- ✅ Programa katılma ve cüz/hizb/adet seçimi
- ✅ Okunan kısımları tamamlandı olarak işaretleme
- ✅ Kişisel dashboard (başlattığım/dahil olduğum programlar)
- ✅ Profil sayfası
- ✅ Türkçe ve İngilizce dil desteği

### Program Özellikleri
- 📖 **Hatim**: 30 cüz veya 60 hizb olarak organize edilebilir
- 📿 **41 Yasin**: Özel günler için Yasin-i Şerif okuma programları
- 📿 **1000 İhlas**: Toplu İhlas-ı Şerif okuma programları
- 📿 **Fetih Suresi**: Fetih Suresi okuma programları
- 🎯 **Özel Programlar**: İstediğiniz sure veya okuma için özel programlar

### Admin Özellikleri
- 🛡️ Program onaylama sistemi
- 📊 İstatistik dashboard
- 👥 Kullanıcı yönetimi
- 📋 Tüm programların liste görünümü

### Gizlilik
- 🔒 Katılımcı bilgileri maskeli olarak gösterilir
- 👤 Detaylı kullanıcı bilgileri gizli tutulur

## 🛠️ Teknolojiler

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Custom CSS (Glassmorphism, Animasyonlar)
- **Backend**: Next.js API Routes
- **Database**: MongoDB (Mongoose)
- **Authentication**: NextAuth.js
- **Email**: Nodemailer (Gmail SMTP)
- **Deployment**: Vercel

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- MongoDB veritabanı
- Gmail hesabı (e-posta bildirimleri için)

### Adımlar

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Ortam değişkenlerini ayarlayın:**
`.env.local` dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tertil?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here

# Gmail SMTP
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Admin Emails
ADMIN_EMAILS=ugurerdem@yaani.com,iwasdev@outlook.com,iwasadev@gmail.com
```

3. **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
```

4. **Tarayıcıda açın:**
```
http://localhost:3000
```

## 📦 Vercel Deployment

1. Vercel hesabınıza giriş yapın
2. GitHub reposunu bağlayın
3. Ortam değişkenlerini Vercel'de ayarlayın
4. Deploy edin

### Gerekli Ortam Değişkenleri (Vercel)
- `MONGODB_URI`
- `NEXTAUTH_URL` (production URL'niz)
- `NEXTAUTH_SECRET`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `ADMIN_EMAILS`

## 📁 Proje Yapısı

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Authentication API
│   │   ├── programs/       # Program CRUD API
│   │   ├── admin/          # Admin API
│   │   └── user/           # User API
│   ├── auth/               # Auth pages
│   ├── programs/           # Program pages
│   ├── dashboard/          # Dashboard page
│   ├── admin/              # Admin page
│   ├── profile/            # Profile page
│   └── page.tsx            # Home page
├── components/             # React components
├── context/                # React contexts
├── lib/                    # Utility functions
├── locales/                # Translations
├── models/                 # MongoDB models
└── types/                  # TypeScript types
```

## 🔐 Admin Hesapları

Aşağıdaki e-posta adresleriyle kayıt olan kullanıcılar otomatik olarak admin olarak tanımlanır:
- ugurerdem@yaani.com
- iwasdev@outlook.com
- iwasadev@gmail.com

## 📧 E-posta Bildirimleri

Sistem aşağıdaki durumlarda e-posta gönderir:
- Program onaylandığında (program oluşturana)
- Program tamamlandığında (program oluşturana)
- Program bitiş tarihine yaklaştığında (katılımcılara)

## 🌐 Dil Desteği

- 🇹🇷 Türkçe
- 🇬🇧 İngilizce

Dil değiştirmek için header'daki dil butonunu kullanabilirsiniz.

## 📱 Responsive Tasarım

Platform tüm cihazlarda (masaüstü, tablet, mobil) uyumlu çalışır.

## 📄 Lisans

MIT License

---

**Tertil** - Kuran-ı Kerim okuma programlarını paylaşın ve birlikte okuyun. 📖
