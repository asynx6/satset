# Changelog
Format mengikuti Keep a Changelog.

## [0.2.0] - 2026-09-14
### Added
- Web UI: `node satset.js serve` lalu buka `/` — satu kotak, tempel link, baca hasil, tombol download
- `--changelog`: CHANGELOG.md dari riwayat commit (kelompok konvensional commit + perapian AI)
- `--bilingual`: README Indonesia + English dalam satu file
- `--docs [DIR]`: README dipecah jadi halaman `docs/*.md` per bagian; digabung `--pr` jadi satu PR multipage (teruji: PR 14 file di gazer-demo)
- `--pr` kombinasi dengan mode apa pun
- Mode GitHub App: `APP_ID` + `APP_PRIVATE_KEY[_PATH]` menggantikan PAT (`lib/appauth.js`, JWT RS256 + installation token)
- Test naik jadi 30 kasus (changelog grouping, docs splitter, bilingual assembler, verifikasi kriptografis JWT)

### Changed
- Timeout LLM default 300s (provider lambat buat generate panjang)

## [0.1.0] - 2026-09-13
Rilis pertama: scan repo via GitHub API tanpa clone, generate README Bahasa
Indonesia terikat bukti kode, filter prompt-injection warisan Gazer, CLI
(stdout/file/PR), API server.
