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
export const readCount = (ch) => Object.keys(data[ch]?.ids || {}).length;
export const chapterTotal = (ch) => data[ch]?.total || 0;
export const lastPlace = () => last;

/** Remember how many sections the chapter has and drop marks for sections that no longer exist. */
export function setSections(ch, ids) {
  const rec = data[ch] || { ids: {} };
  const keep = {};
  ids.forEach((id) => { if (rec.ids[id]) keep[id] = 1; });
  if (rec.total === ids.length && Object.keys(keep).length === Object.keys(rec.ids).length) return;
  data = { ...data, [ch]: { total: ids.length, ids: keep } };
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
