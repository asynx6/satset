# Setup GitHub App (opsional)

Tanpa app pun SatSet jalan penuh dengan PAT biasa (`GH_TOKEN`). Mode App berguna
kalau kamu mau jalan sebagai bot sendiri tanpa token personal, atau dipakai
banyak orang lewat satu install.

## 1. Buat app

1. Buka https://github.com/settings/apps/new (harus login; ini langkah manual
   satu kali).
2. Isi:
   - GitHub App name: `SatSet` (atau brand kamu)
   - Homepage URL: https://github.com/asynx6/satset
   - Callback URL: boleh kosong (CLI/API mode tidak butuh OAuth redirect)
   - **Repository permissions**: `Contents: Read & write`, `Pull requests: Read & write`, `Metadata: Read`
   - Where can this GitHub App be installed? → Any account
3. Create → lalu **Generate a private key** (dapat file `.pem` unduhan).
4. Dari halaman app, catat **App ID** (angka).

## 2. Install app ke repo

Di halaman app → Install App → pilih repo (atau akun seluruhnya).
Catat URL install: `https://github.com/installs/<N>` — N adalah installation ID.

## 3. Konfigurasi SatSet

```ini
# .env
APP_ID=12345
APP_PRIVATE_KEY_PATH=./satset-app.pem
# GH_TOKEN dikosongkan/hapus — SatSet ambil installation token sendiri
```

PEM boleh juga satu baris: `APP_PRIVATE_KEY=***\n..."` (literal `\n`).

## 4. Tes

```bash
node satset.js owner/repo            # kalau auth app benar, tidak ada pesan "butuh GH_TOKEN"
```

Log "auth app gagal: ..." = App ID / path key / hak install salah — cek ulang langkah 1–2.

## Batas yang jujur

- SatSet belum jadi *layanan webhook app* (instal sekali, otomatis nge-docs-in
  semua repo). Sekarang App hanya dipakai sebagai **sumber kredensial** yang lebih
  bersih daripada PAT pribadi. Webhook App menyusul kalau ada yang butuh.
- Rate limit installation token = sama ketatnya dengan PAT; untuk pemakaian massal
  sediapkan beberapa install / akun bot.
