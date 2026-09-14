import * as gh from './github.js';

async function createPRFiles(repo, files, branch, base, title, bodyText, baseSha) {
  await gh.createRef(repo, branch, baseSha);
  const entries = [...files.entries()];
  // Contents API per-file (simpel & cukup untuk 1-12 file docs).
  // SHA file dibaca dulu supaya update, bukan create.
  async function shaOf(path) {
    try {
      const cur = await fetch(`https://api.github.com/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`, {
        headers: { 'Authorization': `Bearer ${process.env.GH_TOKEN}`, 'Accept': 'application/vnd.github+json' },
      });
      return cur.ok ? (await cur.json()).sha : null;
    } catch {
      return null;
    }
  }
  for (const [path, content] of entries) {
    await gh.putFile(
      repo,
      path,
      branch,
      Buffer.from(content, 'utf8').toString('base64'),
      `docs(satset): ${path}`,
      await shaOf(path), // update kalau file sudah ada di base; create kalau belum
    );
  }
  const pr = await gh.createPR(repo, title, branch, base, bodyText);
  return pr.html_url;
}

export async function openDocsPR(repo, readme, tagline) {
  return openDocsTreePR(repo, new Map([['README.md', readme]]), tagline);
}

export async function openDocsTreePR(repo, filesMap, tagline) {
  const info = await gh.getRepoInfo(repo);
  const base = info.default_branch || 'main';
  const baseRef = await gh.getRef(repo, base);
  const branch = `satset/docs-${Date.now().toString(36)}`;
  const paths = [...filesMap.keys()].join(', ');
  return createPRFiles(
    repo,
    filesMap,
    branch,
    base,
    `📚 docs: README Bahasa Indonesia (SatSet)${filesMap.size > 1 ? ` + ${filesMap.size - 1} halaman docs` : ''}`,
    `README dihasilkan otomatis oleh [SatSet](https://github.com/asynx6/satset) dari isi repo (${tagline || 'auto-docs'}).\n\nFile: ${paths}\n\nCek akurasi sebelum merge — kalau ada klaim yang tidak sesuai kode, itu bug di generatornya: laporkan ya.`,
    baseRef.object.sha,
  );
}
