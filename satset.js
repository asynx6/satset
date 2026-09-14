#!/usr/bin/env node
// SatSet — kirim link repo, dapat README Bahasa Indonesia.
// node satset.js owner/repo                 → cetak README ke stdout
// node satset.js <repo> --write readme-baru.md
// node satset.js <repo> --pr                → buka PR berisi README baru
// node satset.js serve                      → webhook API untuk frontend

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
if (existsSync(join(here, '.env'))) {
  for (const line of readFileSync(join(here, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

function parseRepo(input) {
  if (!input) return null;
  const m =
    input.match(/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i) ||
    input.match(/git@github\.com:([\w.-]+\/[\w.-]+?)\.git$/i) ||
    input.match(/^([\w.-]+\/[\w.-]+)$/);
  return m ? m[1] : null;
}

const argv = process.argv.slice(2);

if (argv[0] === 'serve') {
  const { startServer } = await import('./lib/server.js');
  startServer();
} else {
  const repo = parseRepo(argv[0]);
  if (!repo) {
    console.error('pakai: satset <owner/repo | url github> [--write file] [--pr] | satset serve');
    process.exit(1);
  }
  if (!process.env.LLM_API_KEY) {
    console.error('isi .env dulu (LLM_API_KEY, GH_TOKEN, LLM_MODEL)');
    process.exit(1);
  }
  const { scanRepo } = await import('./lib/scan.js');
  const { generateDocs } = await import('./lib/docgen.js');
  const t0 = Date.now();
  console.error(`🛰️  scan ${repo} ...`);
  const scan = await scanRepo(repo);
  console.error(`📚 ${scan.chunks.length} file ter-baca (${(scan.chunks.reduce((a, c) => a + c.content.length, 0) / 1024).toFixed(1)}KB) —${' '} generate README ...`);
  const out = await generateDocs(scan);
  console.error(`⏱️  selesai ${((Date.now() - t0) / 1000).toFixed(1)}s | tagline: ${out.tagline || '-'} | kategori: ${out.category || '-'}`);

  const wIdx = argv.indexOf('--write');
  if (wIdx > -1) {
    const target = argv[wIdx + 1] || 'README.satset.md';
    writeFileSync(target, out.readme);
    console.log(`💾 ${target} ditulis (${out.readme.length} char) — tagline: ${out.tagline || '-'}`);
  } else if (argv.includes('--pr')) {
    const { openDocsPR } = await import('./lib/pr.js');
    const url = await openDocsPR(repo, out.readme, out.tagline);
    console.log(url);
  } else {
    console.log(out.readme);
  }
}
