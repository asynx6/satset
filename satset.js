#!/usr/bin/env node
// SatSet — kirim link repo, dapat README Bahasa Indonesia (+ changelog, bilingual, docs/).
// node satset.js owner/repo                 → README ke stdout
// node satset.js <repo> --write FILE        → simpan README ke file
// node satset.js <repo> --pr                → buka PR docs
// node satset.js <repo> --changelog         → CHANGELOG.md dari commit history
// node satset.js <repo> --bilingual         → README ID + EN dalam satu file
// node satset.js <repo> --docs DIR          → README + docs/ terpecah per bagian
// node satset.js serve                      → API: POST /generate, /changelog

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
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
    console.error('pakai: satset <owner/repo | url> [--write f] [--pr] [--changelog] [--bilingual] [--docs DIR] | satset serve');
    process.exit(1);
  }
  if (!process.env.LLM_API_KEY) {
    console.error('isi .env dulu (LLM_API_KEY, GH_TOKEN, LLM_MODEL)');
    process.exit(1);
  }

  // GitHub App auth (opsional): kalau GH_TOKEN kosong tapi APP_ID terisi,
  // ambil installation token otomatis.
  try {
    const { ensureToken } = await import('./lib/appauth.js');
    await ensureToken(repo);
  } catch (e) {
    console.error(`auth app gagal: ${e.message}`);
    process.exit(1);
  }
  if (!process.env.GH_TOKEN) {
    console.error('butuh GH_TOKEN atau APP_ID + APP_PRIVATE_KEY di .env');
    process.exit(1);
  }

  // ── mode changelog: commit history saja, tanpa scan/README ───────────
  if (argv.includes('--changelog')) {
    const { fetchCommits, polishChangelog } = await import('./lib/changelog.js');
    console.error(`🛰️  ambil riwayat commit ${repo} ...`);
    const commits = await fetchCommits(repo);
    console.error(`📚 ${commits.length} commit — rapikan dengan AI ...`);
    const md = await polishChangelog(commits, repo);
    if (argv.includes('--pr')) {
      const { openDocsTreePR } = await import('./lib/pr.js');
      const url = await openDocsTreePR(repo, new Map([['CHANGELOG.md', md]]), 'changelog');
      console.log(url);
    } else {
      const wIdx = argv.indexOf('--write');
      const target = wIdx > -1 ? argv[wIdx + 1] : null;
      if (target) { writeFileSync(target, md); console.log(`💾 ${target}`); }
      else console.log(md);
    }
    process.exit(0);
  }

  const { scanRepo } = await import('./lib/scan.js');
  const { generateDocs } = await import('./lib/docgen.js');
  const t0 = Date.now();
  console.error(`🛰️  scan ${repo} ...`);
  const scan = await scanRepo(repo);
  console.error(`📚 ${scan.chunks.length} file ter-baca (${(scan.chunks.reduce((a, c) => a + c.content.length, 0) / 1024).toFixed(1)}KB) — generate README ...`);
  let out = await generateDocs(scan);
  console.error(`⏱️  ${((Date.now() - t0) / 1000).toFixed(1)}s | ${out.tagline || '-'} | ${out.category || '-'}`);

  // ── mode bilingual: tambah bagian English ────────────────────────────
  if (argv.includes('--bilingual')) {
    const { translateReadme, assembleBilingual } = await import('./lib/bilingual.js');
    console.error('🌐 terjemahkan EN ...');
    const en = await translateReadme(out.readme);
    out.readme = assembleBilingual(out.readme, en);
  }

  const wIdx = argv.indexOf('--write');
  const dIdx = argv.indexOf('--docs');
  if (dIdx > -1) {
    // README + docs/ terpecah, tulis ke direktori
    const { buildDocsTree } = await import('./lib/docs.js');
    const dir = argv[dIdx + 1] || join(here, 'satset-out', repo.replace('/', '__'));
    const files = buildDocsTree(out.readme);
    for (const [rel, content] of files) {
      const full = join(dir, rel);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    console.log(`💾 ${files.size} file ditulis → ${dir}`);
    if (argv.includes('--pr')) {
      const { openDocsTreePR } = await import('./lib/pr.js');
      const url = await openDocsTreePR(repo, files, out.tagline);
      console.log(url);
    }
  } else if (wIdx > -1) {
    const target = argv[wIdx + 1] || 'README.satset.md';
    writeFileSync(target, out.readme);
    console.log(`💾 ${target} ditulis (${out.readme.length} char)`);
    if (argv.includes('--pr')) {
      const { openDocsPR } = await import('./lib/pr.js');
      const url = await openDocsPR(repo, out.readme, out.tagline);
      console.log(url);
    }
  } else if (argv.includes('--pr')) {
    const { openDocsPR } = await import('./lib/pr.js');
    const url = await openDocsPR(repo, out.readme, out.tagline);
    console.log(url);
  } else {
    console.log(out.readme);
  }
}
