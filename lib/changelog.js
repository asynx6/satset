// Changelog generator: commit history → CHANGELOG.md gaya Keep a Changelog.
import { chat } from './llm.js';
import { sanitizeUntrusted } from './sanitize.js';

const GH = 'https://api.github.com';

export async function fetchCommits(repo, count = 100) {
  const res = await fetch(
    `${GH}/repos/${repo}/commits?per_page=${Math.min(count, 100)}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.GH_TOKEN}`,
        'Accept': 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!res.ok) throw new Error(`GitHub ${res.status} fetchCommits`);
  const list = await res.json();
  return list.map((c) => ({
    sha: c.sha.slice(0, 7),
    date: (c.commit?.author?.date || '').slice(0, 10),
    message: (c.commit?.message || '').split('\n')[0],
  }));
}

// Konvensional commit prefix → kelompok Keep a Changelog. Pure, teruji.
const BUCKETS = {
  feat: 'Added',
  fix: 'Fixed',
  perf: 'Performance',
  refactor: 'Changed',
  docs: 'Documentation',
  test: 'Tests',
  ci: 'CI',
  build: 'Build',
  revert: 'Reverted',
  chore: 'Chore',
  style: 'Style',
};

export function groupCommits(commits) {
  const groups = new Map();
  for (const c of commits || []) {
    const m = String(c.message || '').match(/^(feat|fix|perf|refactor|docs|test|ci|build|revert|chore|style)(\([^)]*\))?!?:\s*(.+)/i);
    const key = m ? BUCKETS[m[1].toLowerCase()] : 'Other';
    const entry = { ...c, text: (m ? m[3] : c.message).trim() };
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return groups;
}

export function renderChangelog(commits, repoName) {
  const groups = groupCommits(commits);
  const order = ['Added', 'Fixed', 'Performance', 'Changed', 'Documentation', 'Tests', 'CI', 'Build', 'Reverted', 'Other', 'Chore', 'Style'];
  const lines = [`# Changelog`, ``, `Dibuat otomatis oleh SatSet dari riwayat commit \`${repoName}\`. Format mengikuti Keep a Changelog.`, ''];
  for (const name of order) {
    const items = groups.get(name);
    if (!items?.length) continue;
    lines.push(`## ${name}`, '');
    for (const it of items) {
      lines.push(`- \`${it.sha}\` (${it.date}) ${it.text}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

// Opsional: ringkasan AI di atas daftar mentah (satu panggilan, murah).
export async function polishChangelog(commits, repoName) {
  const base = renderChangelog(commits, repoName);
  const data = sanitizeUntrusted(base, 12000);
  const out = await chat(
    [
      {
        role: 'system',
        content:
          'Kamu merapikan CHANGELOG. Gabungkan item yang duplikat/belang-belong dalam satu kelompok, buang commit yang jelas tidak layak dicatat (typo whitespace dsb), pertahankan format markdown Keep a Changelog, bahasa entri tetap aslinya (campuran ID/EN tidak masalah). JANGAN menambah entri baru. Balas HANYA markdown changelog, tanpa pembuka.',
      },
      { role: 'user', content: data },
    ],
    { temperature: 0.2, maxTokens: 4000 },
  );
  return out.startsWith('#') ? out : `# Changelog\n\n${out}`;
}
