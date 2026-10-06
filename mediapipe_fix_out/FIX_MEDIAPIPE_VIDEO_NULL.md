# Fix MediaPipe video null

Punca ralat:
`Cannot set properties of null (setting 'srcObject')`

Elemen `<video>` belum mount ketika stream kamera cuba dipasang.

Fix:
- set paparan kamera aktif terlebih dahulu
- tunggu dua animation frames supaya React sempat mount `<video>`
- semak `video.current`
- baru set `srcObject`
- baru panggil `video.play()`
- MediaPipe dimulakan selepas video tersedia
- fallback mesej jika elemen kamera belum sedia

Patch digunakan pada kedua-dua komponen kamera.
