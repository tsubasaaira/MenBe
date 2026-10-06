# Deploy Misi Pulau SKUAD ke Cloudflare Pages

Project ini telah ditukar daripada Netlify Function kepada Cloudflare Pages Function.

## 1. Push project ke GitHub
Push semua fail project ini ke repo GitHub anda.

## 2. Cipta Cloudflare Pages project
Cloudflare Dashboard > Workers & Pages > Create > Pages > Import an existing Git repository.

Tetapan build:
- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

`wrangler.toml` sudah mengaktifkan `nodejs_compat` untuk backend Firebase Admin.

## 3. Environment variables untuk frontend
Masukkan nilai Firebase Web App yang sama seperti project asal:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET (jika digunakan)
- VITE_FIREBASE_MESSAGING_SENDER_ID (jika digunakan)
- VITE_FIREBASE_APP_ID

## 4. Secrets/backend variables
Tambahkan sebagai secret/variable di Cloudflare Pages project:
- FIREBASE_SERVICE_ACCOUNT_JSON
- OPENAI_API_KEY (pilihan, diperlukan untuk Penjana AI)
- OPENAI_MODEL (pilihan; default `gpt-4.1-mini`)

JANGAN commit service account atau OpenAI API key ke GitHub.

## 5. Firebase Authorized Domains
Selepas Cloudflare memberi URL seperti `nama-project.pages.dev`, tambah domain itu dalam:
Firebase Console > Authentication > Settings > Authorized domains.

Jika guna custom domain, tambah custom domain itu juga.

## 6. API
Frontend kini menggunakan:
`/api/skuad`

Cloudflare Pages Function berada di:
`functions/api/skuad.ts`

## 7. Uji selepas deploy
- Halaman utama
- Login guru
- Cipta/simpan aktiviti
- Cipta kod sesi
- Murid masuk kod
- Stesen 1
- Stesen 2 (perkataan bergerak + klik/touch + kamera jika disokong)
- Stesen 3
- Respons muncul dalam dashboard guru

Jika Penjana AI tidak digunakan, `OPENAI_API_KEY` boleh dibiarkan kosong dan fungsi lain masih boleh digunakan.
