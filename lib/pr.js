import * as gh from './github.js';

// Buka PR berisi README baru: branch docs/satset-readme → main
export async function openDocsPR(repo, readme, tagline) {
  const info = await gh.getRepoInfo(repo);
  const base = info.default_branch || 'main';
  const baseRef = await gh.getRef(repo, base);
  const sha = baseRef.object.sha;
  const branch = `satset/readme-${Date.now().toString(36)}`;
  await gh.createRef(repo, branch, sha);
  const content = Buffer.from(readme, 'utf8').toString('base64');
  await gh.putFile(repo, 'README.md', branch, content, `docs: README hasil SatSet — ${tagline || 'auto-docs'}`, sha);
  const pr = await gh.createPR(
    repo,
    `🤖 docs: README Bahasa Indonesia (dibuat SatSet)`,
    branch,
    base,
    'README dihasilkan otomatis oleh [SatSet](https://github.com/asynx6/satset) dari isi repo. Cek akurasi sebelum merge — kalau ada klaim yang nggak sesuai kode, itu bug di generatornya, laporkan ya.',
  );
  return pr.html_url;
}
