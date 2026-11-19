# Kana・書

Website minimalis untuk belajar menulis **142 huruf Jepang** — mencakup **46 huruf dasar (Gojūon)** serta **25 huruf Dakuten & Handakuten** untuk **Hiragana** dan **Katakana**.

🌐 **Live Demo:** https://furansugg.github.io/wjy/

## Fitur Utama

- **142 Karakter Lengkap**: Hiragana (71) & Katakana (71) termasuk Dakuten (`゛`) dan Handakuten (`゜`).
- **Animasi Urutan Goresan Kaligrafi**: Menggunakan data vektor AnimCJK dengan animasi *clip-path* mulus, titik awal, nomor urutan, dan panah arah.
- **Evaluasi Goresan Otomatis**: Mendeteksi ketepatan bentuk, panjang, titik awal, arah terbalik, serta mendukung penulisan lingkaran *handakuten* (`゜`) dari berbagai arah.
- **Mode Kuis Hafalan**: Latihan menulis langsung dari romaji tanpa contekan dengan kompensasi pergeseran posisi (*adaptive anchor*) dan fitur *Intip Goresan*.
- **Zen Washi & Sumi Dark Mode**: Estetika kertas Jepang hangat dengan toggle mode gelap *Sumi Night*.
- **Progres Lokal Offline**: Progres huruf dikuasai dan skor terbaik tersimpan otomatis di `localStorage`.

## Pengembangan Lokal (Bun)

```bash
bun install
bun run dev
```

Pengujian dan build produksi:

```bash
bun test
bun run build
```

## Kredit Data

Data vektor dan urutan goresan karakter berasal dari **AnimCJK** melalui paket `kana-svg-data` (lisensi LGPL-3.0+).
