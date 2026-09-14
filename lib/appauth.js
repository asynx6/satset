// Autentikasi GitHub App: app JWT → installation token. Zero dependency
// (node:crypto). Dipakai kalau GH_TOKEN kosong tapi APP_ID + APP_PRIVATE_KEY_PATH
// atau APP_PRIVATE_KEY terisi.
import { createSign, randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

export function createAppJwt(appId, privateKeyPem, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iat: now - 30, exp: now + 540, iss: String(appId) }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const sig = b64url(signer.sign(privateKeyPem));
  return `${header}.${payload}.${sig}`;
}

async function api(path, jwt, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`App API ${res.status} ${path}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

/** Ambil token instalasi untuk owner/repo tertentu (atau org). */
export async function installationTokenFor(repoOrOwner) {
  const appId = process.env.APP_ID;
  const keyPath = process.env.APP_PRIVATE_KEY_PATH;
  let pem = process.env.APP_PRIVATE_KEY;
  if (!appId) throw new Error('APP_ID tidak diset');
  if (!pem && keyPath && existsSync(keyPath)) pem = readFileSync(keyPath, 'utf8');
  if (!pem) throw new Error('APP_PRIVATE_KEY / APP_PRIVATE_KEY_PATH tidak ditemukan');
  pem = pem.replace(/\\n/g, '\n'); // dukung PEM dalam satu baris .env

  const jwt = createAppJwt(appId, pem);
  const owner = repoOrOwner.includes('/') ? repoOrOwner.split('/')[0] : repoOrOwner;

  let inst = await api(`/users/${encodeURIComponent(owner)}/installation`, jwt).catch(async () => {
    // fallback: owner adalah org
    const org = repoOrOwner.includes('/') ? repoOrOwner.split('/')[0] : repoOrOwner;
    return api(`/orgs/${encodeURIComponent(org)}/installation`, jwt);
  });
  const tok = await api(`/app/installations/${inst.id}/access_tokens`, jwt, { method: 'POST' });
  return tok.token;
}

/** Panggil di awal: kalau APP configured, GH_TOKEN diisi dari installation token. */
export async function ensureToken(repoHint) {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  if (!process.env.APP_ID) return null;
  const t = await installationTokenFor(repoHint || process.env.APP_OWNER || 'unknown');
  process.env.GH_TOKEN = t;
  return t;
}
