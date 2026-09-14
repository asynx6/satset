import { createServer } from 'node:http';
import { scanRepo } from './scan.js';
import { generateDocs } from './docgen.js';

// POST /generate {repo} → {tagline, category, readme}
// GET /healthz → ok
export function startServer(port = Number(process.env.PORT || 3300)) {
  const server = createServer((req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify(obj));
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST,GET,OPTIONS',
        'access-control-allow-headers': 'content-type',
      });
      return res.end();
    }
    if (req.url === '/healthz') return send(200, { ok: true, bot: 'satset' });
    if (req.method === 'POST' && req.url === '/generate') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', async () => {
        try {
          const { repo } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) return send(400, { error: 'repo harus owner/nama' });
          console.log(`[satset] generate untuk ${repo}`);
          const scan = await scanRepo(repo);
          const out = await generateDocs(scan);
          send(200, out);
        } catch (e) {
          console.error('[satset] gagal:', e.message);
          send(500, { error: e.message.slice(0, 300) });
        }
      });
      return;
    }
    send(404, { error: 'not found' });
  });
  server.listen(port, () => console.log(`SatSet API di port ${port} (POST /generate)`));
  return server;
}
