// Loaded only when someone edits: turns the edited page back into the text of its content/ file,
// and saves that file to GitHub with the user's own token.
import book, { BASE } from '../book.js';

const TOKEN_KEY = 'jozve-gh-token';
const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = (n) => String(n).replace(/[0-9]/g, (d) => FA[d]);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Opposite of prepare() in content.js: put the plain `#id` links and `img/` paths back. */
export function unprepare(html) {
  const b = esc(BASE);
  return html
    .replace(new RegExp(`href="${b}(ch\\d+|sources)(#[^"]*)?"`, 'g'), (m, page, hash) => `href="${hash || '#' + page}"`)
    .replace(new RegExp(`href="${b}#([^"]+)"`, 'g'), 'href="#$1"')
    .replace(new RegExp(`src="${b}img/`, 'g'), 'src="img/');
}

/** The text of the page's content file, from what is on screen. */
export function serializeContent(root, page) {
  const c = root.cloneNode(true);
  c.querySelectorAll('mark[data-hl]').forEach((m) => m.replaceWith(...m.childNodes)); // highlights are not content
  c.querySelectorAll('[contenteditable],[spellcheck]').forEach((e) => { e.removeAttribute('contenteditable'); e.removeAttribute('spellcheck'); });
  if (page === 'home') { // what plan.js changes on the page
    const boxes = c.querySelectorAll('#plan input[data-day]').length;
    c.querySelector('#pl-fill')?.removeAttribute('style');
    const count = c.querySelector('#pl-count');
    if (count) count.textContent = fa(0) + ' از ' + fa(boxes) + ' روز';
    c.querySelectorAll('.pl-day.done').forEach((e) => e.classList.remove('done'));
    c.querySelectorAll('.pl-wdone').forEach((e) => { e.textContent = ''; });
  }
  c.normalize();
  const out = unprepare(c.innerHTML);
  return out.endsWith('\n') ? out : out + '\n';
}

// ---- GitHub
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = (t) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } };

const api = (path, token, init = {}) => fetch(`https://api.github.com/repos/${book.editing.repo}/${path}`, {
  ...init,
  headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...init.headers },
});

const utf8ToBase64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const base64ToUtf8 = (b64) => {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

async function fail(res, what) {
  let detail = '';
  try { detail = (await res.json()).message || ''; } catch { /* no body */ }
  const hint = res.status === 401 ? ' (توکن معتبر نیست)' : res.status === 403 || res.status === 404 ? ' (توکن به این مخزن یا به Contents دسترسی ندارد)' : '';
  throw new Error(`${what} ناموفق بود: ${res.status}${hint} ${detail}`.trim());
}

/** Current text and blob sha of content/<page>.html on the branch. */
export async function getRemote(page, token) {
  const path = `contents/content/${page}.html?ref=${encodeURIComponent(book.editing.branch)}`;
  const res = await api(path, token);
  if (!res.ok) await fail(res, 'خواندن فایل از GitHub');
  const j = await res.json();
  let text = j.content ? base64ToUtf8(j.content) : null;
  if (text === null) { // larger than 1 MB: the JSON has no content, ask for the raw file
    const raw = await api(path, token, { headers: { Accept: 'application/vnd.github.raw+json' } });
    if (!raw.ok) await fail(raw, 'خواندن فایل از GitHub');
    text = await raw.text();
  }
  return { sha: j.sha, text: text.split('\r\n').join('\n') };
}

/** Commits `text` as content/<page>.html. */
export async function putRemote(page, text, sha, message, token) {
  const res = await api(`contents/content/${page}.html`, token, {
    method: 'PUT',
    body: JSON.stringify({ message, content: utf8ToBase64(text), sha, branch: book.editing.branch }),
  });
  if (!res.ok) await fail(res, 'ثبت در GitHub');
}
