# Firebase Auth Cloudflare JWT Fix

- Replaced Firebase Admin `verifyIdToken()` with standards-based RS256 JWT verification using Cloudflare Web Crypto.
- Fetches Google Secure Token public JWKs and caches them for one hour.
- Verifies signature, project audience, issuer, expiry, issued-at, auth time and UID.
- Firestore Admin access and service-account configuration remain unchanged.
- No private key is exposed to the frontend.
