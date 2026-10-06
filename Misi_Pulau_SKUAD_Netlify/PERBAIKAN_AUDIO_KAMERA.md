# Perbaikan Audio & Kamera

Versi ini membaiki dua isu selepas deployment Cloudflare Pages.

## Audio / Speech
- Mengutamakan suara Bahasa Melayu (`ms-MY` / `ms`).
- Jika suara Melayu tiada, menggunakan Bahasa Indonesia (`id-ID` / `id`).
- Menunggu event `voiceschanged` supaya senarai suara browser sempat dimuatkan.
- Tidak sengaja memilih voice English jika voice Melayu/Indonesia tersedia.

Nota: Web Speech API menggunakan voice yang dipasang/disediakan oleh browser/peranti. Jika peranti langsung tidak mempunyai voice Melayu atau Indonesia, aplikasi akan memaparkan mesej supaya pengguna menggunakan Chrome/Edge atau memasang voice bahasa yang sesuai.

## Kamera / MediaPipe
- Meminta permission kamera terlebih dahulu.
- Menggunakan MediaPipe Tasks Vision CDN rasmi/terkini.
- Menjalankan HandLandmarker dengan delegate CPU untuk compatibility lebih luas.
- Menambah mesej ralat khusus untuk permission ditolak, kamera tiada, HTTP/tidak secure dan kegagalan MediaPipe.
- Mouse/touch kekal sebagai fallback.

## Selepas push ke GitHub
Cloudflare Pages akan auto deploy commit terbaru. Pastikan deployment log berakhir dengan `Success: Your site was deployed!`.
