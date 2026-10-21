import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE } from '../book.js';

// Full-text search: the Pagefind index (public/pagefind, made by scripts/postbuild.mjs) is loaded on first use.
const T = {
  placeholder: 'جستجو در همه‌ی فصل‌ها', clear_search: 'پاک کردن', load_more: 'نتیجه‌های بیشتر', search_label: 'جستجو در جزوه',
  filters_label: 'فیلترها', zero_results: 'نتیجه‌ای برای «[SEARCH_TERM]» پیدا نشد',
  many_results: '[COUNT] نتیجه برای «[SEARCH_TERM]»', one_result: '[COUNT] نتیجه برای «[SEARCH_TERM]»',
  alt_search: 'نتیجه‌ای برای «[SEARCH_TERM]» پیدا نشد؛ نتیجه‌های «[DIFFERENT_TERM]» را می‌بینید',
  search_suggestion: 'نتیجه‌ای برای «[SEARCH_TERM]» پیدا نشد؛ این‌ها را امتحان کنید:', searching: 'در حال جستجوی «[SEARCH_TERM]»…',
};

// the index knows pages as /ch3.html; the app's routes are /ch3
const toRoute = (u) => u.replace(/index\.html(?=#|$)/, '').replace(/\.html(?=#|$)/, '');

let uiPromise = null;
function loadUi() {
  uiPromise ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = BASE + 'pagefind/pagefind-ui.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = BASE + 'pagefind/pagefind-ui.js';
    js.onload = resolve;
    js.onerror = () => { uiPromise = null; reject(new Error('no search index')); };
    document.head.appendChild(js);
  });
  return uiPromise;
}

export default function Search() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const box = useRef(null);
  const ui = useRef(null);
  const last = useRef(null);
  const navigate = useNavigate();

  const show = () => { last.current = document.activeElement; setOpen(true); };
  const hide = () => { setOpen(false); last.current?.focus?.({ preventScroll: true }); };

  useEffect(() => {
    const toggle = () => (open ? hide() : show());
    const onKey = (e) => {
      const a = document.activeElement;
      const typing = a && (/^(input|textarea|select)$/i.test(a.tagName) || a.isContentEditable);
      if (e.key === 'Escape' && open) { hide(); return; }
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); toggle(); }
      else if (e.key === '/' && !typing && !open && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); show(); }
    };
    window.addEventListener('jozve:search', toggle);
    document.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('jozve:search', toggle); document.removeEventListener('keydown', onKey); };
  });

  useEffect(() => {
    if (!open) return;
    const focus = () => { const i = box.current?.querySelector('input'); i?.focus(); i?.select(); };
    if (ui.current) { focus(); return; }
    loadUi().then(() => {
      ui.current = new window.PagefindUI({
        element: box.current, showImages: false, showSubResults: true, excerptLength: 22, resetStyles: false, translations: T,
        // the index is Persian: fold the Arabic yeh and kaf people may type
        processTerm: (t) => t.replace(/ي/g, 'ی').replace(/ك/g, 'ک'),
        processResult: (r) => { r.url = toRoute(r.url); (r.sub_results || []).forEach((s) => { s.url = toRoute(s.url); }); return r; },
      });
      focus();
    }, () => setError(true));
  }, [open]);

  const onClick = (e) => {
    if (e.target === e.currentTarget) { hide(); return; }
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href.startsWith(BASE)) return;
    e.preventDefault();
    hide();
    navigate('/' + href.slice(BASE.length));
  };

  return (
    <div id="sr-wrap" hidden={!open} onClick={onClick}>
      <div id="sr-dlg" role="dialog" aria-modal="true" aria-labelledby="sr-h">
        <h2 id="sr-h">جستجو در همه‌ی فصل‌ها</h2>
        <div id="sr-box" ref={box}>{error && 'فهرست جستجو در دسترس نیست. (در حالت توسعه، اول npm run build و npm run preview را اجرا کنید.)'}</div>
        <p className="sr-hint">میان‌بر: <kbd>/</kbd> یا <kbd>Ctrl</kbd>+<kbd>K</kbd> برای باز کردن، <kbd>Esc</kbd> برای بستن</p>
      </div>
    </div>
  );
}
