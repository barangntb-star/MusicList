# AuraLirik Music Player 🎵

Aplikasi pemutar musik rich-media dan pencari lirik lagu pinter bertenaga **React, TypeScript, Express, dan Gemini API**.

---

## 🚀 Panduan Deploy ke GitHub & Vercel

Aplikasi ini sudah dikonfigurasi sepenuhnya agar kompatibel untuk **dideploy di Vercel dalam hitungan detik** dengan folder `/api` serverless express backend dan `/dist` static frontend.

### Langkah 1: Hubungkan ke GitHub
1. Buat sebuah repositori baru di akun **GitHub** Anda.
2. Push seluruh folder proyek ini ke repositori tersebut:
   ```bash
   git init
   git add .
   git commit -m "Initial commit to GitHub"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPOSITORI.git
   git push -u origin main
   ```

### Langkah 2: Hubungkan & Deploy ke Vercel
1. Buka dashboard **[Vercel](https://vercel.com/)** Anda.
2. Klik tombol **"Add New"** -> **"Project"**.
3. Cari dan **Import** repositori GitHub yang baru saja Anda buat.
4. Di bagian **Build & Development Settings**, Vercel akan otomatis mengenali setup Vite + Express:
   - *Framework Preset*: Pilih **Vite** atau biarkan default/Other.
   - *Build Command*: `npm run build`
   - *Output Directory*: `dist`
5. Di bagian **Environment Variables**, tambahkan rahasia kunci API berikut agar fitur cerdas AI Anda berfungsi di cloud:
   - `GEMINI_API_KEY` = *Masukkan kunci API Gemini Anda*
6. Klik **"Deploy"**! 🎉

---

## 🛠️ Mengapa Hubungan Ini Sekarang Berfungsi Sempurna?
Kami telah menyempurnakan struktur kode proyek agar mendukung kedua model komputasi:
- **Lokal / Container Run**: Menggunakan Express internal dinamis pada `http://localhost:3000` dengan import Vite bertranspilasi on-the-fly.
- **Serverless / Vercel Edge**: Menggunakan router modular tanpa-blok (`vercel.json`) yang meredireksi semua pemicu `/api/*` langsung ke serverless function `api/index.ts`. Ini menekan penggunaan memori dan biaya hosting Anda secara maksimal!
