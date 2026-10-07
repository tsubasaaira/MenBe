# Fix Firestore Cloudflare REST

- Firestore Admin dipaksa menggunakan `preferRest: true`.
- Operasi save/lulus aktiviti tidak lagi menggunakan transaction.
- Error backend kini memaparkan kod Firestore ringkas untuk diagnosis.
