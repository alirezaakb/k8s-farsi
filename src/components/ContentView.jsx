import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { BASE } from '../book.js';
import { loadPage, prepare } from '../lib/content.js';
import { initPlan } from '../lib/plan.js';
import { scrollTop, settleTo } from '../lib/settle.js';
import { initNotes } from '../legacy/notes.js';
import widgets from '../widgets/index.js';

/**
 * Shows the HTML of one page from content/ and wires it to the app:
 * links navigate without reloading, `#id` / `#hl=` in the URL scroll to the target,
 * highlights are re-applied, and `data-widget` placeholders become React components.
 */
export default function ContentView({ page, onLoaded }) {
  const [html, setHtml] = useState(null);
  const [failed, setFailed] = useState(false);
  const [slots, setSlots] = useState([]);
  const ref = useRef(null);
  const notes = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    loadPage(page).then((h) => alive && setHtml(prepare(h, page)), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [page]);

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

  const onClick = useCallback((e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
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
