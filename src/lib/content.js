import book, { BASE } from '../book.js';

// content/*.html, one lazy chunk per page
const modules = import.meta.glob('/content/*.html', { query: '?raw', import: 'default' });

export function loadPage(page) {
  const load = modules[`/content/${page}.html`];
  return load ? load() : Promise.reject(new Error(`no content for ${page}`));
}

/**
 * Content is written with plain `#id` links and `img/...` paths. Links to other pages and
 * the base URL of the site are filled in here, so a link can point at any id in the book.
 */
export function prepare(html, page) {
  return html
    .replace(/href="#([^"]+)"/g, (m, id) => {
      const target = book.idPage[id];
      if (!target || target === page) return m;
      if (target === 'home') return `href="${BASE}#${id}"`;
      return `href="${BASE}${target}${id === target ? '' : '#' + id}"`;
    })
    .replace(/src="img\//g, `src="${BASE}img/`);
}
