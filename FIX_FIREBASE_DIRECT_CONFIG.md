# Firebase direct config fix

- Firebase Web config dimasukkan terus ke `lib/firebase-client.ts`.
- Frontend tidak lagi bergantung pada `VITE_FIREBASE_*` semasa build Cloudflare.
- `FIREBASE_SERVICE_ACCOUNT_JSON` masih WAJIB disimpan sebagai secret/runtime variable Cloudflare.
- Backend kini memaparkan kod ralat Firebase token supaya diagnosis lebih tepat jika masih gagal.
