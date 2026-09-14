// Kumpulkan "bahan mentah" sebuah repo GitHub lewat API saja (tanpa clone).
import { sanitizeUntrusted } from './sanitize.js';

const GH = 'https://api.github.com';

async function gh(path) {
  const res = await fetch(`${GH}${path}`, {
    headers: {
      'Authorization': `Bearer ${process.env.GH_TOKEN}`,
      'Accept': 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 404) throw new Error(`repo tidak ditemukan / private: ${path}`);
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${path}`);
  return res.json();
}

const FILE_BUDGET_TOTAL = 24000; // char konten yang dikirim ke model
const PRIORITY = [
  [/package\.json$/i, 1200],
  [/composer\.json$/i, 1200],
  [/requirements(-dev)?\.txt$|pyproject\.toml$/i, 1200],
  [/go\.mod$/i, 800],
  [/Cargo\.toml$/i, 800],
  [/Dockerfile$|docker-compose/i, 900],
  [/(^|\/)(main|index|app|server|cli)\.(js|ts|py|go|rs|php)$/i, 700],
  [/routes?\.|router\./i, 700],
  [/\.(sql|prisma)$/i, 600],
  [/README.*\.md$/i, 400], // README lama: bahan, bukan tujuan
];

function priorityOf(path) {
  for (const [re, w] of PRIORITY) if (re.test(path)) return w;
  return 60;
}

function pickExt(path) {
  return /\.(js|ts|tsx|jsx|py|go|rs|php|java|rb|c|cpp|cs|sh|sql|prisma|json|toml|ya?ml|md|html|css|env\.example)$/i.test(path);
}

export async function scanRepo(fullName) {
  const info = await gh(`/repos/${fullName}`);
  const branch = info.default_branch || 'main';

  // tree rekursif (file-path saja) — hemat: 1 request
  const tree = await gh(`/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  const files = (tree.tree || []).filter((t) => t.type === 'blob' && pickExt(t.path) && t.size < 120000);

  // urutan: prioritas ↓, ukuran ↑
  const ordered = files
    .map((f) => ({ ...f, score: priorityOf(f.path) + Math.min(300, f.size / 50) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);

  const chunks = [];
  let budget = FILE_BUDGET_TOTAL;
  for (const f of ordered) {
    if (budget <= 0) break;
    // file kecil diambil utuh, besar dipotong
    const cap = Math.min(f.size, Math.max(2000, priorityOf(f.path) * 6));
    try {
      const blob = await gh(`/repos/${fullName}/contents/${f.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`);
      if (!blob || !blob.content) continue;
      let text;
      if (blob.encoding === 'base64') {
        text = Buffer.from(blob.content.replace(/\s+/g, ''), 'base64').toString('utf8');
      } else continue;
      const take = text.slice(0, Math.min(cap, budget));
      budget -= take.length;
      chunks.push({ path: f.path, content: sanitizeUntrusted(take, Number.MAX_SAFE_INTEGER) });
    } catch { /* skip file bermasalah */ }
  }

  return {
    name: info.name,
    full_name: info.full_name,
    description: info.description,
    language: info.language,
    topics: info.topics || [],
    stars: info.stargazers_count,
    license: info.license?.spdx_id || null,
    has_ci: files.some((f) => f.path.startsWith('.github/workflows/')),
    file_list: files.map((f) => f.path).slice(0, 300),
    chunks,
  };
}
