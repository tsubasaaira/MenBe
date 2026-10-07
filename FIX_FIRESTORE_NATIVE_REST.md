# Cloudflare Native Firestore REST Fix

Backend Cloudflare tidak lagi menggunakan `firebase-admin/firestore` untuk operasi database.

Perubahan:
- OAuth2 service-account token dijana dengan Web Crypto.
- Semua operasi Firestore menggunakan Google Firestore REST API melalui `fetch()`.
- Firebase ID token masih disahkan menggunakan public key Google.
- Flow guru/murid, aktiviti, sesi, jawapan dan semakan dikekalkan.
- Mesej lama "Backend Netlify Functions" ditukar kepada Cloudflare Pages Functions.

Cloudflare secret yang masih diperlukan:
`FIREBASE_SERVICE_ACCOUNT_JSON`
