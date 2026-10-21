// Reads content/ and works out the table of contents and where every link target lives.
// Used by the Vite plugin (virtual:book) and by scripts/postbuild.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT = path.join(ROOT, 'content');

const text = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const idsOf = (html) => [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);

export function readBook() {
  const meta = JSON.parse(fs.readFileSync(path.join(CONTENT, 'book.json'), 'utf8'));
  const read = (name) => fs.readFileSync(path.join(CONTENT, name), 'utf8');

  const files = fs.readdirSync(CONTENT).filter((f) => /^ch\d+\.html$/.test(f))
    .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));

  const pageIds = {}; // page -> ids defined in it
  const chapters = files.map((f, i) => {
    const id = f.replace('.html', '');
    const html = read(f);
    const n = (html.match(/<span class="ch-num">([^<]*)<\/span>/) || [])[1]?.trim() ?? String(i + 1);
    const h2 = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    pageIds[id] = idsOf(html);
    return { id, n, title: h2 ? text(h2[1]) : id, part: meta.parts[id] || null };
  });
  pageIds.home = idsOf(read('home.html'));
  pageIds.sources = idsOf(read('sources.html'));

  // only ids that some link points at are needed to resolve "#id" links across pages
  const referenced = new Set();
  for (const name of [...files, 'home.html', 'sources.html']) {
    for (const m of read(name).matchAll(/href="#([^"]+)"/g)) referenced.add(m[1]);
  }
  const idPage = {};
  for (const [page, ids] of Object.entries(pageIds)) {
    for (const id of ids) if (referenced.has(id)) idPage[id] = page;
  }
  const dangling = [...referenced].filter((id) => !(id in idPage) && id !== 'main');

  const stats = [...(read('home.html').match(/<ul class="meta">([\s\S]*?)<\/ul>/)?.[1] ?? '').matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]));
  return { title: meta.title, tagline: meta.tagline, editing: meta.editing ?? { enabled: false }, chapters, idPage, stats, dangling };
}
