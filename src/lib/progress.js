// Reading progress kept in this browser: which sections of each chapter are marked as read,
// and where the reader was last (to continue from there).
import { useSyncExternalStore } from 'react';

const READ = 'jozve-read';
const LAST = 'jozve-last';
const FA = '۰۱۲۳۴۵۶۷۸۹';
export const fa = (n) => String(n).replace(/[0-9]/g, (d) => FA[d]);

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
let data = load(READ, {}); // { ch5: { total: 58, ids: { sectionId: 1 } } }
let last = load(LAST, null); // { ch, id, text }
let version = 0;
const subs = new Set();

const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const changed = () => { version++; subs.forEach((f) => f()); };

export const useProgress = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => version);

export const isRead = (ch, id) => !!data[ch]?.ids?.[id];
// lessons that are marked (exercises can be marked too, but are not counted in the chapter's percentage)
export const readCount = (ch) => {
  const rec = data[ch];
  if (!rec) return 0;
  return rec.lessons ? rec.lessons.filter((id) => rec.ids[id]).length : Object.keys(rec.ids || {}).length;
};
export const chapterTotal = (ch) => data[ch]?.total || 0;
export const lastPlace = () => last;

/** Remember the lessons of the chapter (and its exercise blocks) and drop marks for ones that no longer exist. */
export function setSections(ch, ids, extra = []) {
  const rec = data[ch] || { ids: {} };
  const keep = {};
  [...ids, ...extra].forEach((id) => { if (rec.ids[id]) keep[id] = 1; });
  const same = rec.total === ids.length && rec.lessons && rec.lessons.length === ids.length && rec.lessons.every((x, i) => x === ids[i])
    && Object.keys(keep).length === Object.keys(rec.ids).length;
  if (same) return;
  data = { ...data, [ch]: { total: ids.length, lessons: ids, ids: keep } };
  save(READ, data);
  changed();
}

export function toggleRead(ch, id) {
  const rec = data[ch] || { total: 0, ids: {} };
  const ids = { ...rec.ids };
  if (ids[id]) delete ids[id]; else ids[id] = 1;
  data = { ...data, [ch]: { ...rec, ids } };
  save(READ, data);
  changed();
}

export function setLast(ch, id, text) {
  if (last && last.ch === ch && last.id === id) return;
  last = { ch, id, text };
  save(LAST, last);
  changed();
}
