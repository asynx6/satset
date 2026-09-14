# 📚 SatSet

**Kirim link repo → dapat README Bahasa Indonesia lengkap.** Tanpa kamu baca kodenya sedikit pun.

![CI-style](https://img.shields.io/badge/node-%E2%89%A518-brightgreen) ![deps](https://img.shields.io/badge/dependencies-0-blue) ![license](https://img.shields.io/badge/license-MIT-green)

Nemu repo keren tapi dokumentasinya nggak ada / English-only / cuma "TODO"?
SatSet scan repo-nya lewat GitHub API (tanpa clone), lalu AI menulis README
lengkap: fitur, quickstart copy-paste, tabel API, diagram arsitektur Mermaid,
troubleshooting — **semua bersumber dari kode nyata, bukan karangan.**

## Kenapa

Dokumentasi itu pekerjaan yang paling sering ditunda developer Indonesia.
SatSet mengubahnya jadi 5 menit: tempel link, dapat PR README.

Yang bikin SatSet beda dari docgen AI lain:
- **Berbahasa Indonesia mengalir** — istilah teknis tetap English, bukan hasil translate kaku
- **Anti-ngarang keras** — system prompt melarang klaim tanpa bukti di kode; fitur yang tidak terbukti tidak ditulis
- **Anti prompt-injection** — komentar jailbreak di kode repo target diredam & justru dilaporkan sebagai temuan security (turunan langsung dari 🟢 [Gazer](https://github.com/asynx6/gazer-review))
- **Zero dependency**, Node ≥ 18, hemat: scan 23KB bahan → 1 panggilan model

## Cara pakai

```bash
git clone https://github.com/asynx6/satset && cd satset
cp .env.example .env   # isi LLM_API_KEY + GH_TOKEN (PAT scope repo)

node satset.js asynx6/nama-repo                    # README ke stdout
node satset.js <repo> --write README.baru.md       # simpan ke file
node satset.js <repo> --pr                         # langsung buka PR docs!
node satset.js serve                               # API: POST /generate {repo}
```

URL GitHub juga diterima: `node satset.js https://github.com/asynx6/satset`

## Contoh nyata

README `FictionFlow` (aplikasi Express + SQLite + vanilla JS, 97 file ter-track)
digenerate SatSet dalam ~5 menit: **379 baris, 23,4KB bahan**, dan saat spot-check
manual — endpoint, nama fungsi, konstanta limit, file test, bahkan rencana internal
di `docs/` — semuanya cocok dengan kode nyata, nol klaim mengada-ada.

## Endpoint API (mode serve)

```
POST /generate  {"repo": "owner/nama"}  →  {"readme","tagline","category"}
GET  /healthz                           →  {"ok":true}
```

CORS terbuka supaya bisa dipakai frontend statis mana pun.

## Cara kerja

```
link repo → GitHub API tree (1 request) → pilih file berbobot
          → baca ~13 file kunci (24KB) → LLM → JSON {readme, tagline}
          → stdout / file / PR
```

## Roadmap

- [ ] Web UI one-box (tempel link → baca README-nya di browser)
- [ ] Generate `docs/` multipage + CHANGELOG dari commit history
- [ ] Mode bilingual (ID + EN dalam satu README)
- [ ] Integrasi GitHub App (sama seperti rencana Gazer)

## Lisensi

MIT · Ditenagai oleh 🟢 Gazer lineage · Dibuat di VPS 1GB RAM, Indonesia 🇮🇩
