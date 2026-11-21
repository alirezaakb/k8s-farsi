// A chapter is shown one lesson at a time. A lesson is one section of the chapter (an <h3> and everything
// up to the next one); what comes before the first <h3> is the first lesson, "آغاز فصل".
// The wrappers only exist in the rendered page: the chapter header stays visible, and serializeContent()
// (editing.js) unwraps them, so the text of content/chN.html is never changed by this.

const isSpace = (n) => n.nodeType === 3 && !n.data.trim();
const isHead = (n) => n.nodeType === 1 && n.matches('.ch-head, .ch-sub, details.refs');

export const headingText = (h) => {
  const c = h.cloneNode(true);
  c.querySelectorAll('small').forEach((s) => s.remove());
  return (c.textContent.trim() || h.textContent.trim()).replace(/\s+/g, ' ');
};

/** Minutes for the main path of a lesson: its text, code and lab steps, without folded notes and exercises. */
export function lessonMinutes(el) {
  let words = 0;
  let code = 0;
  let steps = 0;
  for (const n of el.children) {
    if (n.matches('details.more, details.ex')) continue;
    const c = n.cloneNode(true);
    c.querySelectorAll('details.more, details.ex, svg, script, style').forEach((x) => x.remove());
    c.querySelectorAll('pre').forEach((p) => { code += (p.textContent.match(/\n/g) || []).length + 1; p.remove(); });
    words += (c.textContent.match(/\S+/g) || []).length;
    steps += n.matches('h4.step') ? 1 : n.querySelectorAll('h4.step').length;
  }
  return Math.max(1, Math.round(words / 120 + code * 0.06 + steps * 5));
}

const describe = (el) => ({ id: el.dataset.lesson, text: el.dataset.title, min: lessonMinutes(el), el });

/** Wrap the sections of the chapter in root; returns [{ id, text, min, el }]. Safe to call twice. */
export function buildLessons(root) {
  const sec = root.querySelector('section.ch');
  if (!sec || !/^ch\d+$/.test(sec.id)) return [];
  const existing = [...sec.querySelectorAll(':scope > .lesson')];
  if (existing.length) return existing.map(describe);

  const kids = [...sec.childNodes];
  let i = 0;
  while (i < kids.length && (isSpace(kids[i]) || isHead(kids[i]))) i++;

  const groups = [];
  let cur = { id: sec.id, title: 'آغاز فصل', nodes: [] };
  for (; i < kids.length; i++) {
    const n = kids[i];
    if (n.nodeType === 1 && n.tagName === 'H3' && n.id) {
      groups.push(cur);
      cur = { id: n.id, title: headingText(n), nodes: [] };
    }
    cur.nodes.push(n);
  }
  groups.push(cur);

  const out = [];
  for (const g of groups) {
    if (!g.nodes.some((n) => !isSpace(n))) continue; // nothing before the first <h3>
    const wrap = document.createElement('div');
    wrap.className = 'lesson';
    wrap.dataset.lesson = g.id;
    wrap.dataset.title = g.title;
    g.nodes[0].before(wrap);
    g.nodes.forEach((n) => wrap.appendChild(n));
    out.push(describe(wrap));
  }
  return out;
}

/** Show one lesson and hide the others. */
export function showLesson(root, id) {
  root.querySelectorAll('.lesson').forEach((l) => l.classList.toggle('current', l.dataset.lesson === id));
}

/** Put the children of every lesson wrapper back in its place (used when saving an edit). */
export function unwrapLessons(container) {
  container.querySelectorAll('.lesson').forEach((l) => l.replaceWith(...l.childNodes));
}
