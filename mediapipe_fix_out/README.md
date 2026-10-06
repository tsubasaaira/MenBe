# Misi Pulau SKUAD — Netlify + Firebase

Mula dengan **PANDUAN_NETLIFY.md**.

Deploy penuh: import source repository ke Netlify; build `npm run build`, publish `dist`, functions `netlify/functions`. Isi Firebase web config dan server-only service-account JSON. Guru boleh daftar dengan Google atau e-mel/kata laluan yang disahkan; setiap guru hanya boleh mengakses aktiviti dan sesi miliknya. OPENAI_API_KEY adalah pilihan untuk penjana AI dan digunakan di server sahaja.

Deploy cepat: muat naik folder `dist` yang telah dibina ke Netlify Drop untuk **demo sahaja**. Folder itu dibina tanpa Firebase config; fungsi guru/sesi/database memerlukan deploy penuh.

Tiada rahsia atau data murid dimasukkan. Database versi asal tidak dipindahkan. Pakej ini tidak lagi bergantung pada Cloudflare D1, Sites, Vinext atau ChatGPT sign-in.
