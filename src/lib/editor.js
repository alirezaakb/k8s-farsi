// State shared by the "edit text" button, the edit bar and ContentView (kept outside React so the
// heavy editing code can be loaded only when it is used).
import { useSyncExternalStore } from 'react';
import book from '../book.js';

const listeners = new Set();
let state = { active: false, dirty: false, busy: false, message: '', page: null };

export const editor = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  set(patch) { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); },
  /** filled in by ContentView for the page on screen: { getRoot, getBase, setBase, reload } */
  page: null,
};

export const useEditor = () => useSyncExternalStore(editor.subscribe, editor.get);

const DEVICE_KEY = 'jozve-edit-device';

/** Editing is built in only when content/book.json says so... */
export const editingBuiltIn = () => !!book.editing?.enabled;

/** ...and shown only on devices where it was switched on once with ?edit (so readers never see it). */
export function editingOnThisDevice() {
  try { return editingBuiltIn() && localStorage.getItem(DEVICE_KEY) === '1'; } catch { return false; }
}

export function setEditingOnThisDevice(on) {
  try { if (on) localStorage.setItem(DEVICE_KEY, '1'); else localStorage.removeItem(DEVICE_KEY); } catch { /* storage unavailable */ }
  editor.set(on ? {} : { active: false });
}
