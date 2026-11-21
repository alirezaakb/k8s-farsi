// Works out the lessons of a chapter (title and minutes) and its exercise blocks, from the HTML of content/chN.html.
// The rules are those of src/lib/lessons.js, which splits the same chapter in the browser:
// the first lesson is what comes before the first <h3>, then one lesson per <h3>.
import { parseFragment } from 'parse5';

export const INTRO_TITLE = 'آغاز فصل: ماجرا و هدف';

const attr = (n, name) => ((n.attrs || []).find((a) => a.name === name) || {}).value || '';
const classes = (n) => attr(n, 'class').split(/\s+/);
const isEl = (n) => !!n.tagName;
const textOf = (n) => (n.nodeName === '#text' ? n.value : (n.childNodes || []).map(textOf).join(''));

/** Text, code lines and lab steps of a node, without folded notes, exercises, drawings and scripts. */
function measure(node, acc) {
  if (node.nodeName === '#text') { acc.words += (node.value.match(/\S+/g) || []).length; return; }
  if (!isEl(node)) return;
  const c = classes(node);
  if (node.tagName === 'details' && (c.includes('more') || c.includes('ex'))) return;
  if (['svg', 'script', 'style'].includes(node.tagName)) return;
  if (node.tagName === 'pre') { acc.code += (textOf(node).match(/\n/g) || []).length + 1; return; }
  if (node.tagName === 'h4' && c.includes('step')) acc.steps++;
  for (const ch of node.childNodes || []) measure(ch, acc);
}

const minutes = (nodes) => {
  const acc = { words: 0, code: 0, steps: 0 };
  nodes.forEach((n) => measure(n, acc));
  return Math.max(1, Math.round(acc.words / 120 + acc.code * 0.06 + acc.steps * 5));
};

const headingText = (h) => {
  const own = (n) => (n.nodeName === '#text' ? n.value : n.tagName === 'small' ? '' : (n.childNodes || []).map(own).join(''));
  const t = own(h).replace(/\s+/g, ' ').trim();
  return t || textOf(h).replace(/\s+/g, ' ').trim();
};

export function chapterLessons(html) {
  const root = parseFragment(html);
  const sec = root.childNodes.find((n) => n.tagName === 'section');
  const kids = sec.childNodes;

  let i = 0;
  const isHead = (n) => isEl(n) && (classes(n).includes('ch-head') || classes(n).includes('ch-sub') || (n.tagName === 'details' && classes(n).includes('refs')));
  while (i < kids.length && ((kids[i].nodeName === '#text' && !kids[i].value.trim()) || isHead(kids[i]))) i++;

  const groups = [];
  let cur = { id: attr(sec, 'id'), text: INTRO_TITLE, nodes: [] };
  for (; i < kids.length; i++) {
    const n = kids[i];
    if (isEl(n) && n.tagName === 'h3' && attr(n, 'id')) { groups.push(cur); cur = { id: attr(n, 'id'), text: headingText(n), nodes: [] }; }
    cur.nodes.push(n);
  }
  groups.push(cur);

  const lessons = groups
    .filter((g) => g.nodes.some((n) => isEl(n)))
    .map((g) => ({ id: g.id, text: g.text, min: minutes(g.nodes) }));

  // exercise and interview-question blocks: <details class="ex" id="…"><summary class="ex-h">title <small>N تمرین</small>
  const exercises = [];
  const walk = (n) => {
    for (const c of n.childNodes || []) {
      if (isEl(c) && c.tagName === 'details' && classes(c).includes('ex') && attr(c, 'id')) {
        const sum = (c.childNodes || []).find((x) => isEl(x) && x.tagName === 'summary');
        const own = sum ? headingText(sum) : '';
        const small = sum ? (sum.childNodes || []).find((x) => isEl(x) && x.tagName === 'small') : null;
        exercises.push({
          id: attr(c, 'id'),
          title: own,
          count: small ? textOf(small).replace(/\s+/g, ' ').trim() : '',
          interview: classes(c).includes('iv'),
        });
      }
      walk(c);
    }
  };
  walk(sec);
  return { lessons, exercises };
}
