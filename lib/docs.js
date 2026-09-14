// README besar → README ringkas + docs/ multipage (pecah per heading H2).
import { chat } from './llm.js';
import { sanitizeUntrusted } from './sanitize.js';

const SLUG_MAP = {
  'ini apa': 'overview',
  'fitur': 'features',
  'quickstart': 'quickstart',
  'cara pakai': 'usage',
  'arsitektur': 'architecture',
  'endpoint': 'api',
  'api': 'api',
  'konfigurasi': 'configuration',
  'config': 'configuration',
  'development': 'development',
  'troubleshooting': 'troubleshooting',
  'catatan keamanan': 'security',
  'keamanan': 'security',
};

export function slugFor(heading) {
  const h = heading.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  for (const [k, v] of Object.entries(SLUG_MAP)) if (h.startsWith(k)) return v;
  return h.replace(/\s+/g, '-').slice(0, 40) || 'section';
}

/** Pecah markdown per heading H2. Bagian sebelum H2 pertama = intro. */
export function splitReadme(md) {
  const lines = String(md).split(/\r?\n/);
  const sections = [];
  let current = { heading: null, lines: [] };
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    const m = !inFence && line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (current.heading !== null || current.lines.join('').trim()) sections.push(current);
      current = { heading: m[1], lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.heading !== null || current.lines.join('').trim()) sections.push(current);
  const intro = sections.find((s) => s.heading === null);
  const body = sections.filter((s) => s.heading !== null);
  return { intro: (intro?.lines || []).join('\n').trim(), sections: body };
}

export function buildDocsTree(md) {
  const { intro, sections } = splitReadme(md);
  const files = new Map();
  const used = new Set();
  const toc = [];
  for (const s of sections) {
    let slug = slugFor(s.heading);
    if (used.has(slug)) slug = `${slug}-${[...used].length}`;
    used.add(slug);
    const file = `docs/${slug}.md`;
    files.set(file, `# ${s.heading}\n\n${s.lines.slice(1).join('\n').trim()}\n`);
    toc.push({ heading: s.heading, file });
  }
  const readme =
    `${intro || '# Dokumentasi'}\n\n## Dokumentasi\n\n${toc.map((t) => `- [${t.heading}](${t.file})`).join('\n')}\n`;
  files.set('README.md', readme);
  return files;
}

// Ringkas intro README kalau ternyata dia sendiri terlalu panjang.
export async function summarizeIntro(text) {
  const safe = sanitizeUntrusted(text, 4000);
  return chat(
    [
      { role: 'system', content: 'Ringkas teks ini jadi maksimal 600 karakter, bahasa sama, tanpa embel-embel. Balas hasil saja.' },
      { role: 'user', content: safe },
    ],
    { temperature: 0.2, maxTokens: 400 },
  );
}
