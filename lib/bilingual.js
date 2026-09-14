// Mode bilingual: README ID (hasil docgen) + terjemahan EN dalam satu file.
import { chat } from './llm.js';
import { sanitizeUntrusted } from './sanitize.js';

export function assembleBilingual(mdId, mdEn) {
  return (
    `<!-- bilingual: versi Indonesia di atas, English di bawah -->\n\n` +
    mdId.trim() +
    `\n\n---\n\n` +
    mdEn.trim() +
    '\n'
  );
}

export async function translateReadme(mdId) {
  const safe = sanitizeUntrusted(mdId, Number.MAX_SAFE_INTEGER);
  const out = await chat(
    [
      {
        role: 'system',
        content:
          'Terjemahkan README markdown ke English yang natural untuk developer. Pertahankan 100% struktur markdown (heading, tabel, code fence, mermaid, badge). Kode, perintah, dan path file tidak diterjemahkan. Jangan tambah atau buang informasi. Balas HANYA hasil markdown, tanpa komentar.',
      },
      { role: 'user', content: safe },
    ],
    { temperature: 0.3, maxTokens: 6000 },
  );
  return out;
}
