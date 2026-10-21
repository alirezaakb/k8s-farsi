import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { BASE } from '../book.js';
import { loadPage, prepare } from '../lib/content.js';
import { editingBuiltIn, editor, useEditor } from '../lib/editor.js';
import { clearDraft, resolveText, saveDraft } from '../lib/overrides.js';
import { initPlan } from '../lib/plan.js';
import { scrollTop, settleTo } from '../lib/settle.js';
import { initNotes } from '../legacy/notes.js';
import widgets from '../widgets/index.js';

// parts of a page the editor must not change: buttons, drawings, images, the label bar of code blocks
const FIXED = '.code .lbl, button, svg, img, input, figure .plate, [data-widget]';

function setEditable(root, on) {
  if (on) {
    root.contentEditable = 'true';
    root.spellcheck = false;
    root.querySelectorAll(FIXED).forEach((e) => { e.contentEditable = 'false'; });
  } else {
    root.removeAttribute('contenteditable');
    root.removeAttribute('spellcheck');
    root.querySelectorAll('[contenteditable]').forEach((e) => e.removeAttribute('contenteditable'));
  }
}

/**
 * Shows the HTML of one page from content/ and wires it to the app:
 * links navigate without reloading, `#id` / `#hl=` in the URL scroll to the target,
 * highlights are re-applied, `data-widget` placeholders become React components,
 * and (when editing is on for this device) the text can be edited in place.
 */
export default function ContentView({ page, onLoaded }) {
  const [html, setHtml] = useState(null);
  const [failed, setFailed] = useState(false);
  const [slots, setSlots] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const ref = useRef(null);
  const notes = useRef(null);
  const base = useRef({ raw: '', bundle: '' }); // hashes: text the edits are relative to / text the site was built with
  const editing = useRef(null); // the editing code, loaded on first use
  const location = useLocation();
  const navigate = useNavigate();
  const { active } = useEditor();

  useEffect(() => {
    let alive = true;
    loadPage(page).then(async (raw) => {
      let shown = { text: raw, dirty: false };
      if (editingBuiltIn()) shown = await resolveText(page, raw);
      if (!alive) return;
      base.current = { raw: shown.baseHash, bundle: shown.rawHash };
      setHtml(prepare(shown.text, page));
      if (shown.dirty) editor.set({ dirty: true, active: true, message: 'ویرایش ثبت‌نشده‌ی قبلی برگردانده شد.' });
    }, () => alive && setFailed(true));
    return () => { alive = false; };
  }, [page, reloadKey]);

  useEffect(() => {
    if (html === null) return undefined;
    const root = ref.current;
    const undo = [];
    if (page === 'home') undo.push(initPlan(root));

    const found = [];
    root.querySelectorAll('[data-widget]').forEach((node) => {
      const Widget = widgets[node.dataset.widget];
      if (!Widget) { console.warn(`widget "${node.dataset.widget}" is not registered`); return; }
      let props = {};
      try { props = JSON.parse(node.dataset.props || '{}'); } catch { console.warn('bad data-props', node); }
      node.textContent = '';
      found.push({ node, Widget, props });
    });
    setSlots(found);

    notes.current = initNotes();
    notes.current?.refresh();
    onLoaded?.(root);
    return () => undo.forEach((f) => f());
  }, [html, page, onLoaded]);

  useEffect(() => {
    if (html === null) return undefined;
    const hl = /^#hl=(.+)$/.exec(location.hash);
    if (hl) { notes.current?.jump(decodeURIComponent(hl[1])); return undefined; }
    if (location.hash.length > 1) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) return settleTo(el);
    }
    scrollTop();
    return undefined;
  }, [html, location.key, location.hash]);

  // ---- in-place editing (only does anything when the edit bar is on)
  useEffect(() => {
    if (html === null || !editingBuiltIn()) return undefined;
    const root = ref.current;
    let timer = null;

    const flush = () => {
      clearTimeout(timer);
      if (!editing.current || !editor.get().dirty) return;
      saveDraft(page, editing.current.serializeContent(root, page), base.current.raw);
    };
    const onInput = () => {
      if (!editor.get().dirty) editor.set({ dirty: true, message: '' });
      clearTimeout(timer);
      timer = setTimeout(flush, 800);
    };
    const onPaste = (e) => { // plain text only: pasted web pages would bring styles into the content
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    };
    const warn = (e) => { if (editor.get().dirty) { e.preventDefault(); e.returnValue = ''; } };

    editor.page = {
      page,
      getRoot: () => root,
      getBase: () => base.current.raw,
      setBase: (h) => { base.current.raw = h; },
      getBundleHash: () => base.current.bundle,
      discard: () => {
        clearDraft(page);
        editor.set({ dirty: false, message: 'ویرایش‌های ثبت‌نشده دور ریخته شد.' });
        setHtml(null);
        setReloadKey((k) => k + 1);
      },
    };
    root.addEventListener('input', onInput);
    root.addEventListener('paste', onPaste);
    window.addEventListener('beforeunload', warn);
    return () => {
      flush();
      root.removeEventListener('input', onInput);
      root.removeEventListener('paste', onPaste);
      window.removeEventListener('beforeunload', warn);
      editor.page = null;
      editor.set({ dirty: false, message: '' });
    };
  }, [html, page]);

  useEffect(() => {
    if (html === null || !editingBuiltIn()) return undefined;
    const root = ref.current;
    document.body.classList.toggle('editing', active);
    if (!active) { setEditable(root, false); return undefined; }
    let alive = true;
    import('../lib/editing.js').then((m) => {
      if (!alive) return;
      editing.current = m;
      setEditable(root, true);
      document.execCommand('defaultParagraphSeparator', false, 'p');
    });
    return () => { alive = false; document.body.classList.remove('editing'); setEditable(root, false); };
  }, [html, active]);

  const onClick = useCallback((e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    if (editor.get().active) { e.preventDefault(); return; } // while editing, a click puts the cursor in the link text
    const href = a.getAttribute('href');
    let to = null;
    if (href.startsWith('#')) to = location.pathname + href;
    else if (href.startsWith(BASE)) to = '/' + href.slice(BASE.length);
    if (to === null) return;
    e.preventDefault();
    navigate(to);
  }, [location.pathname, navigate]);

  if (failed) return <p className="load-msg">بارگذاری این صفحه ممکن نشد. صفحه را دوباره باز کنید.</p>;
  if (html === null) return <p className="load-msg" role="status">در حال بارگذاری…</p>;
  return (
    <>
      <div ref={ref} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
      {slots.map(({ node, Widget, props }, i) => createPortal(<Widget {...props} />, node, i))}
    </>
  );
}
