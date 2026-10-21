// Edited text that is kept in this browser:
//  - a draft: edits not saved to GitHub yet
//  - a committed copy: saved to GitHub, shown until the redeployed site contains it
// Both are only used while editing is enabled for this device.
const draftKey = (p) => 'jozve-draft:' + p;
const doneKey = (p) => 'jozve-edit:' + p;

export async function sha1(text) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const drop = (k) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } };

export const saveDraft = (page, html, base) => write(draftKey(page), { html, base, t: Date.now() });
export const clearDraft = (page) => drop(draftKey(page));
export const saveCommitted = (page, html, base) => write(doneKey(page), { html, base, t: Date.now() });

/**
 * Decide which text to show for a page: `raw` is what the site was built with.
 * Returns { text, baseHash, rawHash, dirty }: baseHash identifies the text the shown text is relative to,
 * rawHash the text the site was built with.
 */
export async function resolveText(page, raw) {
  const rawHash = await sha1(raw);
  let text = raw;
  let baseHash = rawHash;

  const done = read(doneKey(page));
  if (done) {
    if (done.html === raw) drop(doneKey(page)); // the deployed site already has it
    else if (done.base === rawHash) { text = done.html; baseHash = await sha1(done.html); } // deploy not finished yet
    else drop(doneKey(page)); // the site changed in some other way
  }

  const draft = read(draftKey(page));
  if (draft) {
    if (draft.base === baseHash) return { text: draft.html, baseHash, rawHash, dirty: true };
    drop(draftKey(page));
  }
  return { text, baseHash, rawHash, dirty: false };
}
