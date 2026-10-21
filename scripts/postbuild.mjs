// Runs after `vite build`:
//  1. makes dist/<page>/index.html (and 404.html) so every address opens the app on GitHub Pages
//     with the right <title>, and writes sitemap.xml when SITE_URL is set;
//  2. builds the Pagefind search index from the HTML in content/.
import fs from 'node:fs';
import path from 'node:path';
import * as pagefind from 'pagefind';
import { CONTENT, ROOT, readBook } from './book.mjs';

const DIST = path.join(ROOT, 'dist');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const book = readBook();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const pages = [
  { route: '', file: 'home', title: `${book.title}: از صفر تا production`, desc: `جزوه‌ی آموزشی فارسی کوبرنتیز از صفر تا production، بر پایه‌ی مستندات رسمی kubernetes.io: ${book.stats.join('، ')}` },
  ...book.chapters.map((c) => ({ route: c.id, file: c.id, title: `فصل ${c.n}: ${c.title} | ${book.title}`, desc: `فصل ${c.n}: ${c.title} — جزوه‌ی آموزشی فارسی کوبرنتیز`, search: `فصل ${c.n}: ${c.title}` })),
  { route: 'sources', file: 'sources', title: `منابع | ${book.title}`, desc: 'منابع و مراجع جزوه‌ی آموزشی فارسی کوبرنتیز', search: 'منابع' },
];

// ---- 1. one index.html per address
const shell = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const withMeta = (p) => {
  let html = shell
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(p.desc)}"`);
  if (SITE_URL) html = html.replace('</head>', `<link rel="canonical" href="${SITE_URL}/${p.route}">\n</head>`);
  return html;
};
for (const p of pages) {
  if (!p.route) { fs.writeFileSync(path.join(DIST, 'index.html'), withMeta(p)); continue; }
  fs.mkdirSync(path.join(DIST, p.route), { recursive: true });
  fs.writeFileSync(path.join(DIST, p.route, 'index.html'), withMeta(p));
}
fs.writeFileSync(path.join(DIST, '404.html'), shell);
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
if (SITE_URL) {
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    pages.map((p) => `<url><loc>${SITE_URL}/${p.route}</loc></url>\n`).join('') + '</urlset>\n');
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
}

// ---- 2. search index: Pagefind reads plain HTML files, so wrap each content file in one
const SRC = path.join(ROOT, '.search-src');
fs.rmSync(SRC, { recursive: true, force: true });
fs.mkdirSync(SRC);
for (const p of pages) {
  const body = fs.readFileSync(path.join(CONTENT, p.file + '.html'), 'utf8');
  const name = p.route ? `${p.route}.html` : 'index.html';
  fs.writeFileSync(path.join(SRC, name),
    `<!doctype html><html lang="fa"><head><meta charset="utf-8"><title>${esc(p.search || book.title)}</title></head>` +
    `<body><main data-pagefind-body data-pagefind-meta="title:${esc(p.search || book.title)}">${body}</main></body></html>`);
}
const { index } = await pagefind.createIndex({ forceLanguage: 'fa' });
const added = await index.addDirectory({ path: SRC });
if (added.errors?.length) throw new Error(added.errors.join('\n'));
await index.writeFiles({ outputPath: path.join(DIST, 'pagefind') });
await pagefind.close();
fs.rmSync(SRC, { recursive: true, force: true });

if (book.dangling.length) console.warn(`!! links to ids that do not exist: ${book.dangling.join(', ')}`);
console.log(`postbuild: ${pages.length} pages, search index over ${added.page_count} pages`);
