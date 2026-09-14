const GH = 'https://api.github.com';

async function req(path, opts = {}) {
  const res = await fetch(`${GH}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${process.env.GH_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub ${res.status} ${path}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

export const getRepoInfo = (repo) => req(`/repos/${repo}`);
export const getRef = (repo, branch) => req(`/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
export const createRef = (repo, branch, sha) => req(`/repos/${repo}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }) });
export const putFile = (repo, path, branch, contentB64, message, sha) =>
  req(`/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: contentB64, branch, sha }),
  });
export const createPR = (repo, title, head, base, body) =>
  req(`/repos/${repo}/pulls`, { method: 'POST', body: JSON.stringify({ title, head, base, body }) });
