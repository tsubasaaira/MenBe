# Firebase Auth Cloudflare Fix

Perubahan:
- Tukar `verifyIdToken(token, true)` kepada `verifyIdToken(token)`
- Kekalkan pengesahan Firebase ID token
- Buang revocation check tambahan yang boleh gagal dalam runtime Cloudflare
- Tambah log backend untuk ralat token verification
