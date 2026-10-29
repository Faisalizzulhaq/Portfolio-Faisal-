# Klikweb · Video Iklan Meta (lagu + SFX)

4 angle video iklan Klikweb, masing-masing dalam 3 ukuran (9x16, 1x1, 16x9). Videonya dari folder GDrive owner; yang ditambahkan di sini hanya audio: lagu latar dan SFX yang jatuh di tiap animasi. Satu angle memakai lagu dan SFX yang sama persis di ketiga ukuran.

| Angle | Durasi | Lagu | Drop |
|---|---|---|---|
| v1-dicari-muncul | 13,5 dtk | MMG (DJ Elart remix) | 6,2 dtk, pindah ke oranye "Biar kamu yang muncul" |
| v2-cepat-jelas | 14,5 dtk | Tabola Bale (party) | 8,3 dtk, pindah ke oranye daftar harga |
| v3-mudah-terpercaya | 14,5 dtk | Bintang 5 (DJ Elart remix) | 7,4 dtk, pindah ke "Dikelola perusahaan" |
| v4-narasi | 14,9 dtk | Astaga Bercanda (versi Thailand) | 3,5 dtk, pindah ke oranye "Era digital" |

SFX per angle:

- Semua angle: whoosh + pop saat pembuka, whoosh + hit + riser di setiap transisi besar, notif WhatsApp di tombol "Chat WhatsApp".
- v1: ketikan keyboard saat mengetik di Google, pop tiap hasil pencarian, "vine boom" di "Usahamu belum ada di sini".
- v2: klik tombol, jepretan kamera di foto, hit di stempel TAYANG, pop tiap kartu harga, cha-ching.
- v3: gelembung chat tiap pesan WhatsApp, ding tiap centang checklist.
- v4: "vine boom" di "Sayang banget." (halaman 404), jepretan kamera, cha-ching di "Rp 370 ribu", hit di "Konsultasi gratis".

Loudness -14 LUFS (standar Reels/Feed), true peak di bawah -1 dBFS. Video tidak di-encode ulang, hanya audionya yang ditambah.

Buat ulang (lagu dan SFX diambil dari library `motion-graphics/puretray-horeca-ads/footage/` di repo kerja PureTray, tidak ikut di sini):

```
python3 tools/mix.py <folder_video_asli> <folder_output>
```
