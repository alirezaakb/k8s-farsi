// One-off content migration for layered reading (safe to run again; it skips what is already done).
//
//   node tools/layers.mjs
//
// 1. Every exercise box becomes a closed <details class="ex"> (its header is the <summary>).
// 2. In each chapter, the "توضیح تکمیلی" boxes of a section are collected into one closed
//    <details class="more"> placed right after that section's main text (before its exercises).
import fs from 'node:fs';
import path from 'node:path';
import { parseFragment } from 'parse5';
import { CONTENT } from '../scripts/book.mjs';
import { canon } from '../scripts/canonicalize.mjs';

const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = (n) => String(n).replace(/[0-9]/g, (d) => FA[d]);
const cls = (n) => ((n.attrs || []).find((a) => a.name === 'class') || {}).value || '';
const hasClass = (n, c) => n.nodeName === 'div' && cls(n).split(/\s+/).includes(c);
const text = (n) => n.value ?? (n.childNodes || []).map(text).join('');
const parse = (html) => parseFragment(html, { sourceCodeLocationInfo: true });

function apply(html, ops) {
  const sorted = [...ops].sort((a, b) => b.start - a.start || b.end - a.end);
  let out = html;
  for (const o of sorted) out = out.slice(0, o.start) + o.text + out.slice(o.end);
  return out;
}

/** Pass 1: exercise boxes -> <details class="ex"><summary class="ex-h">…</summary>… */
function exercises(html) {
  const ops = [];
  const walk = (n) => {
    for (const c of n.childNodes || []) {
      if (hasClass(c, 'ex')) {
        const head = c.childNodes.find((x) => hasClass(x, 'ex-h'));
        const loc = c.sourceCodeLocation;
        if (head && loc.endTag) {
          ops.push({ start: loc.startTag.startOffset, end: loc.startTag.endOffset, text: html.slice(loc.startTag.startOffset, loc.startTag.endOffset).replace(/^<div/, '<details') });
          ops.push({ start: loc.endTag.startOffset, end: loc.endTag.endOffset, text: '</details>' });
          const h = head.sourceCodeLocation;
          ops.push({ start: h.startTag.startOffset, end: h.startTag.endOffset, text: html.slice(h.startTag.startOffset, h.startTag.endOffset).replace(/^<div/, '<summary') });
          ops.push({ start: h.endTag.startOffset, end: h.endTag.endOffset, text: '</summary>' });
        }
      }
      walk(c);
    }
  };
  walk(parse(html));
  return apply(html, ops);
}

/** Pass 2: collect the supplementary boxes of every section after its main text. */
function supplements(html) {
  const root = parse(html);
  const sec = root.childNodes.find((n) => n.nodeName === 'section');
  const kids = sec.childNodes.filter((n) => n.nodeName !== '#text' && n.nodeName !== '#comment');
  const isDeep = (n) => hasClass(n, 'deep') && /^\s*توضیح تکمیلی/.test(text((n.childNodes || []).find((x) => x.nodeName === 'b') || { value: '' }));
  const endsSection = (n) => hasClass(n, 'ex') || n.nodeName === 'details' && cls(n).split(/\s+/).includes('ex') || hasClass(n, 'recap') || (hasClass(n, 'story') && cls(n).includes('solved'));
  const sections = [];
  let cur = { start: 0, items: [] };
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].nodeName === 'h3') { sections.push(cur); cur = { start: i, items: [] }; }
    cur.items.push(kids[i]);
  }
  sections.push(cur);

  const ops = [];
  for (const s of sections) {
    const deep = s.items.filter(isDeep);
    if (!deep.length) continue;
    const loc = (n) => n.sourceCodeLocation;
    // where the group goes: before the first exercise / recap / solved story of the section, else after the last child
    const stop = s.items.find((n) => endsSection(n));
    const lastEl = s.items[s.items.length - 1];
    const at = stop ? loc(stop).startOffset : loc(lastEl).endOffset;
    const lineStart = stop ? html.lastIndexOf('\n', at) + 1 : at;
    const pieces = deep.map((n) => html.slice(loc(n).startOffset, loc(n).endOffset));
    const group = `<details class="more">\n  <summary>نکته‌های تکمیلی این بخش <small>(${fa(deep.length)})</small></summary>\n  ${pieces.join('\n  ')}\n  </details>\n\n`;
    // remove the boxes (with their indentation and line break), then insert the group
    for (const n of deep) {
      let a = loc(n).startOffset;
      let b = loc(n).endOffset;
      a = html.lastIndexOf('\n', a - 1) + 1;
      if (html.slice(a, loc(n).startOffset).trim() !== '') a = loc(n).startOffset;
      if (html[b] === '\n') b++;
      if (html[b] === '\n' && html[a - 1] === '\n') b++; // a blank line left on both sides: drop one
      ops.push({ start: a, end: b, text: '' });
    }
    if (stop) ops.push({ start: lineStart, end: lineStart, text: '  ' + group });
    else ops.push({ start: at, end: at, text: '\n\n  ' + group.trimEnd() });
  }
  return apply(html, ops);
}

let changed = 0;
for (const f of fs.readdirSync(CONTENT).filter((n) => /^ch\d+\.html$/.test(n))) {
  const p = path.join(CONTENT, f);
  const raw = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  let out = raw;
  if (!out.includes('<details class="ex')) out = exercises(out);
  if (!out.includes('<details class="more">')) out = supplements(out);
  out = canon(out);
  if (out !== raw) { fs.writeFileSync(p, out); changed++; }
}
console.log(`${changed} files changed`);

// 3. The summary of each supplementary group also lists the titles of its boxes, so the reader can choose.
const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let titled = 0;
for (const f of fs.readdirSync(CONTENT).filter((n) => /^ch\d+\.html$/.test(n))) {
  const p = path.join(CONTENT, f);
  const raw = fs.readFileSync(p, 'utf8');
  const out = raw.replace(/<details class="more">([\s\S]*?)<\/details>/g, (whole, inner) => {
    if (inner.includes('class="m-t"')) return whole;
    const titles = [...inner.matchAll(/<div class="deep"><b>توضیح تکمیلی:\s*([\s\S]*?)<\/b>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim());
    if (!titles.length) return whole;
    return whole.replace('</summary>', ` <span class="m-t">${escapeHtml(titles.join(' · '))}</span></summary>`);
  });
  if (out !== raw) { fs.writeFileSync(p, canon(out)); titled++; }
}
console.log(`${titled} files got titles in their group summaries`);

// 4. The chapter's reference links become one closed row: <details class="refs"> around the <p class="ch-sub">.
let refs = 0;
for (const f of fs.readdirSync(CONTENT).filter((n) => /^ch\d+\.html$/.test(n))) {
  const p = path.join(CONTENT, f);
  const raw = fs.readFileSync(p, 'utf8');
  if (raw.includes('<details class="refs">')) continue;
  const out = raw.replace(/<p class="ch-sub">([\s\S]*?)<\/p>/, (whole, inner) => {
    const n = (inner.match(/<a /g) || []).length;
    return n ? `<details class="refs"><summary>مراجع رسمی این فصل <small>(${fa(n)})</small></summary>${whole}</details>` : whole;
  });
  if (out !== raw) { fs.writeFileSync(p, canon(out)); refs++; }
}
console.log(`${refs} files: reference links folded`);
