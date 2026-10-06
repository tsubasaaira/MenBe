# Misi Pulau SKUAD — panduan Netlify

## Baca dahulu
ZIP ini ialah **versi Netlify + Firebase**, bukan arkib Cloudflare/Sites yang asal.

- Reka bentuk, pulau, tiga stesen, avatar dan mod contoh dikekalkan.
- Log masuk guru: Google atau e-mel/kata laluan melalui Firebase Authentication. Akaun e-mel perlu disahkan.
- Murid: Firebase Authentication Anonymous, kod sesi dan nama panggilan sahaja.
- Aktiviti, sesi, jawapan dan semakan guru: Firebase Firestore melalui Netlify Functions.
- AI: OpenAI API di pelayan sahaja; pilihan manual tersedia tanpa kunci AI.
- Tiada projek Firebase, kunci akaun atau kunci AI dimasukkan dalam ZIP.
- Data kelas dari versi hosting terdahulu **tidak dipindahkan** secara automatik.

**Untuk semua fungsi, gunakan kaedah A.** Muat naik `dist` sahaja hanya menyediakan demo.

## A. Deploy aplikasi penuh — Git + Netlify

### 1. Sediakan Firebase
1. Buka https://console.firebase.google.com/ dan cipta / pilih projek milik anda.
2. Daftar sebuah **Web App** dalam Project settings → General.
3. Salin nilai `apiKey`, `authDomain`, `projectId`, dan `appId` daripada konfigurasi aplikasi web.
4. Dalam **Authentication → Sign-in method**, aktifkan **Google**, **Email/Password** dan **Anonymous**. Lengkapkan support email untuk Google.
5. Cipta **Cloud Firestore database**, gunakan database `(default)` dan pilih lokasi yang sesuai.
6. Dalam tab **Rules**, gantikan dengan kandungan `firestore.rules` dalam ZIP dan tekan Publish. Jangan gunakan test mode terbuka.
7. Dalam **Project settings → Service accounts**, jana private key untuk Firebase Admin SDK. JSON ini ialah rahsia pelayan. Jangan masukkannya ke GitHub, folder `public`, `dist`, atau medan `VITE_`.

Aplikasi tidak mengakses Firestore terus dari pelayar. Rules menolak semua akses klien; Netlify Functions menggunakan Admin SDK dan menyemak identiti serta pemilikan guru. Backend menyimpan aktiviti yang diluluskan sebagai salinan tetap bagi setiap sesi.

### 2. Masukkan kod ke repositori
1. Ekstrak ZIP ini.
2. Muat naik **kandungan di dalam folder projek** ke repositori GitHub anda. `package.json` dan `netlify.toml` mesti berada pada root repositori.
3. Fail `.env.example` ialah contoh sahaja. Jangan masukkan `.env` atau service-account JSON sebenar.
4. `package-lock.json` disertakan. Gunakan `npm ci` untuk pemasangan yang sepadan dengan binaan yang diuji.

### 3. Sambungkan ke Netlify
1. Dalam Netlify pilih **Add new project / Import an existing project**, kemudian pilih repositori tadi.
2. Root / base directory: kosong jika fail berada pada root.
3. Build command: `npm run build`.
4. Publish directory: `dist`.
5. Functions directory: `netlify/functions` (ditetapkan dalam `netlify.toml`).
6. Node.js: 22 (ditetapkan dalam `netlify.toml`).

### 4. Tambah environment variables

Dalam tetapan environment variables projek Netlify, masukkan nilai berikut. Pilih skop Build untuk `VITE_...` dan Functions untuk rahsia pelayan jika UI anda menyediakan pemilihan skop. Jangan hadkan rahsia kepada Build sahaja.

| Nama | Nilai | Diperlukan |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase web config `apiKey` | Ya |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase web config `authDomain` | Ya |
| `VITE_FIREBASE_PROJECT_ID` | Firebase web config `projectId` | Ya |
| `VITE_FIREBASE_APP_ID` | Firebase web config `appId` | Ya |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Seluruh kandungan service-account JSON, termasuk kurungan `{}` | Ya, digunakan di server sahaja |
| `OPENAI_API_KEY` | Kunci API OpenAI Platform | Untuk AI sahaja, digunakan di server |
| `OPENAI_MODEL` | Model OpenAI; lalai `gpt-4.1-mini` | Pilihan |

Pendaftaran guru terbuka kepada sesiapa yang mempunyai akaun Google atau mendaftar dengan e-mel/kata laluan. Akaun e-mel perlu mengesahkan alamatnya sebelum log masuk. Oleh sebab pendaftaran terbuka, sesiapa yang mempunyai akaun sah boleh menggunakan ruang guru. Setiap guru hanya boleh melihat aktiviti dan sesi miliknya; murid tanpa nama tidak boleh masuk sebagai guru.

Untuk `FIREBASE_SERVICE_ACCOUNT_JSON`, salin objek JSON lengkap, tanpa membungkus keseluruhan nilai dalam tanda petikan tambahan. Nilai `private_key` hendaklah kekal dengan escape `\n` yang sah dalam JSON. Jika Netlify Free tidak membenarkan tanda **Contains secret values**, anda boleh simpan sebagai pemboleh ubah biasa. Nilai itu tidak dihantar kepada pelayar kerana tiada awalan `VITE_`, tetapi pemilik dan kolaborator yang boleh mengurus tetapan projek Netlify mungkin dapat melihatnya. Hadkan akses projek kepada orang yang dipercayai dan jangan letak kunci itu di GitHub.

Nilai `VITE_` Firebase ialah konfigurasi awam, bukan kunci Admin SDK. Kunci Admin SDK dan OpenAI mesti kekal pada pelayan. Penggunaan Firebase, Netlify Functions dan OpenAI API tertakluk pada kuota/caj akaun anda. Langganan ChatGPT dan penggunaan API OpenAI mempunyai billing berasingan.

### 5. Benarkan domain Netlify dalam Firebase
1. Selepas Netlify memberikan domain seperti `nama-projek.netlify.app`, buka **Firebase Authentication → Settings → Authorized domains**.
2. Tambah domain Netlify anda sahaja, tanpa `https://` atau path.
3. Jika menggunakan custom domain, tambah domain itu juga.
4. Deploy / redeploy aplikasi selepas mengisi atau menukar environment variables. Nilai `VITE_` dibenamkan semasa build.

### 6. Uji aliran kelas
1. Buka laman → **Saya Guru** → **Log masuk dengan Google** menggunakan e-mel yang dibenarkan.
2. **Cipta Aktiviti** → sunting contoh → semak semua tiga stesen → **Luluskan Aktiviti**.
3. **Cipta Sesi** dengan status Aktif → salin kod enam aksara.
4. Pada pelayar/peranti lain, buka laman → **Saya Murid** → masukkan kod dan nama panggilan → pilih avatar.
5. Hantar jawapan di semua stesen. Dalam paparan guru pilih **Respons murid**. Data disegarkan setiap 10 saat.
6. Semak dan sahkan markah, muat turun CSV, kemudian tamatkan sesi.
7. Pastikan kod sesi tamat tidak boleh disertai dan jawapan baharu tidak diterima.

Murid tidak perlu akaun Google. Gunakan pelayar lain / mod peribadi bagi ujian murid pada komputer guru. Satu profil pelayar menyimpan satu identiti murid; untuk bertukar murid gunakan profil/peranti berasingan. Nama panggilan sahaja tidak memulihkan identiti murid pada peranti baharu. Guru boleh log masuk semula pada peranti lain untuk melihat data kelas yang sama.

## B. Cuba cepat dengan Netlify Drop — demo sahaja

Folder `dist` disertakan sebagai binaan **tanpa konfigurasi Firebase**.

1. Ekstrak ZIP.
2. Muat naik **folder `dist`** ke Netlify Drop. Pastikan `index.html` berada terus dalam folder yang dimuat naik.
3. Buka laman dan tekan **Cuba pengembaraan contoh**.

Kaedah ini tidak menerbitkan Netlify Functions dan tidak mengaktifkan akaun guru, sesi sebenar, penyimpanan Firestore atau AI. Menambah environment variables selepas muat naik `dist` tidak mengubah binaan statik tersebut. Untuk fungsi penuh, gunakan kaedah A dan bina semula.

## Pembangunan pada komputer sendiri

Pasang Node.js 22. Dalam folder projek:

```bash
npm ci
npm test
npm run build
npm run dev
```

`npm run dev` ialah pelayan frontend Vite; mod contoh boleh diuji. Untuk API dan Firebase bersama, gunakan Netlify CLI (`netlify dev`) selepas menyambungkan projek Netlify dan menyediakan environment variables. CLI ialah pilihan, bukan syarat untuk deployment melalui Git.

## Pengendalian kamera, suara dan pentaksiran

- Kamera memerlukan HTTPS dan persetujuan murid. Pustaka MediaPipe serta model dimuat turun apabila diaktifkan.
- Bingkai kamera diproses pada peranti dan tidak dihantar ke backend aplikasi atau disimpan.
- Buka tapak tangan, halakan pilihan, kemudian genggam. Selepas pilihan terpilih, tekan Hantar Jawapan.
- Pengecaman suara ditetapkan kepada `ms-MY`. Sokongan bergantung pada pelayar; penyedia pelayar mungkin memproses suara pada pelayannya. Murid boleh memilih teks atau kad idea.
- Hanya transkrip yang disahkan/dihantar disimpan. Tiada fail rakaman suara disimpan oleh aplikasi.
- Audio bacaan menggunakan suara peranti. Jika suara Melayu tidak tersedia, transkrip kekal boleh dibaca.
- Markah soalan pilihan ialah semakan objektif. Jawapan terbuka tidak dinilai secara automatik; guru menetapkan markah akhir.
- Mod contoh tidak menyimpan jawapan kepada guru. Respons sebenar dihantar hanya apabila murid menekan Hantar Jawapan; penghantaran semula menggantikan rekod soalan yang sama.

## Jika ada masalah

| Mesej / gejala | Tindakan |
| --- | --- |
| Firebase belum dikonfigurasi | Isi empat `VITE_FIREBASE_*`, kemudian redeploy |
| Backend Netlify Functions belum tersedia | Gunakan kaedah A; pastikan `netlify/functions/skuad.ts` disertakan |
| Akaun e-mel belum dapat masuk | Klik pautan pengesahan Firebase, kemudian log masuk semula |
| `auth/unauthorized-domain` | Tambah domain Netlify di Authorized domains Firebase |
| Popup disekat | Benarkan popup dan cuba log masuk semula |
| Firebase pelayan belum dikonfigurasi | Isi `FIREBASE_SERVICE_ACCOUNT_JSON` dengan skop Functions |
| Operasi tidak berjaya | Semak Netlify Functions logs, Firestore `(default)`, dan kelayakan akaun perkhidmatan |
| AI belum disambungkan | Isi `OPENAI_API_KEY`, redeploy, atau sunting aktiviti secara manual |
| Kamera / mikrofon gagal | Benarkan akses, gunakan pelayar yang menyokongnya, atau pilih butang / teks |

## Apa yang telah diuji

Semakan TypeScript, binaan Vite, pembungkusan fungsi pelayan serta ujian peraturan pemarkahan, payload murid dan senarai guru. Sambungan sebenar Firebase / Google / OpenAI, deployment dalam akaun Netlify anda, serta kamera/mikrofon pada peranti sekolah **belum dapat diuji tanpa konfigurasi akaun anda**.

## Dokumentasi rasmi

- Netlify Functions: https://docs.netlify.com/build/functions/get-started/
- Netlify file configuration: https://docs.netlify.com/build/configure-builds/file-based-configuration/
- Firebase Admin token verification: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- Firebase Anonymous Auth: https://firebase.google.com/docs/auth/web/anonymous-auth
- Firebase Google sign-in: https://firebase.google.com/docs/auth/web/google-signin
