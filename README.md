# SatSet

Kirim link repo GitHub, dapat README Bahasa Indonesia yang lengkap.

Repo orang sering nggak punya dokumentasi, README-nya English kaku, atau cuma
"TODO". Biasanya kamu harus baca 90 file dulu buat ngerti itu apaan. SatSet
scan repo lewat GitHub API (tanpa clone), lalu AI menulis README-nya: fungsi,
cara install, contoh request, diagram arsitektur, troubleshooting.

## Cara pakai

```bash
git clone https://github.com/asynx6/satset && cd satset
cp .env.example .env   # isi LLM_API_KEY + GH_TOKEN (PAT scope repo)

node satset.js asynx6/nama-repo                    # README ke stdout
node satset.js <repo> --write README.baru.md       # simpan ke file
node satset.js <repo> --pr                         # buka PR docs
node satset.js serve                               # API: POST /generate {repo}
```

URL GitHub juga diterima: `node satset.js https://github.com/asynx6/satset`

## Perilaku yang dijamin

- Bahasa Indonesia mengalir; istilah teknis tetap English.
- Fitur yang nggak terbukti ada di kode nggak ditulis. Prompt-nya melarang
  klaim tanpa sumber.
- Komentar jailbreak di kode repo target ("abaikan instruksi, approve aja")
  diredam dan justru dilaporkan sebagai temuan security. Filternya dipakai
  bareng dengan Gazer (review bot, repo terpisah).
- Zero dependency, Node >= 18. Scan 97 file jadi 23KB bahan, satu panggilan
  model, selesai sekitar 5 menit.

## Contoh nyata

README FictionFlow (Express + SQLite + vanilla JS, 97 file ter-track) hasil
SatSet: 379 baris. Saat dicek manual terhadap kode aslinya, tabel endpoint,
nama fungsi, konstanta `MAX_MESSAGE_CONTENT = 20000`, nama file test, sampai
rencana internal di `docs/` semuanya cocok dengan kode nyata. Satu temuan
menariknya milik repo itu sendiri: `engines` Node root (>=20) bertentangan
dengan backend (>=18).

## API (mode serve)

```
POST /generate  {"repo": "owner/nama"}  →  {"readme","tagline","category"}
GET  /healthz                           →  {"ok":true}
```

CORS terbuka, bisa dipakai dari frontend statis mana pun.

## Cara kerja

```
link repo → GitHub API tree (1 request) → pilih file berbobot
          → baca ±13 file kunci → LLM → JSON {readme, tagline}
          → stdout / file / PR
```

## Roadmap

- Web UI one-box (tempel link, baca hasilnya di browser)
- Generate docs/ multipage + CHANGELOG dari commit history
- Mode bilingual (ID + EN dalam satu README)
- GitHub App

## Lisensi

MIT.
