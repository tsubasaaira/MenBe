# Patch Sniglet + Audio Bahasa Indonesia

- Sniglet dimuat terus melalui `<link>` Google Fonts dalam `index.html`.
- Semua elemen UI dipaksa menggunakan Sniglet dengan `!important`.
- Audio TTS mengutamakan `id-ID`, kemudian `ms-MY`.
- Jika tiada voice Indonesia/Melayu, audio TIDAK fallback ke English; mesej amaran dipaparkan.
- Label audio menunjukkan nama voice dan locale sebenar yang digunakan.
- Build marker: `sniglet-id-tts-2026-10-07`.
