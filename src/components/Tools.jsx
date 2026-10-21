import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../book.js';
import notesUi from '../legacy/notes-ui.html?raw';
import { editingOnThisDevice, editor, useEditor } from '../lib/editor.js';

// ---- reading preferences (kept on <html> as data-* so the CSS can use them, and in localStorage)
const DEF = { fs: '0', lh: 'normal', align: 'start', width: 'narrow' };
const root = document.documentElement;
const readPref = (k) => root.getAttribute('data-' + k) ?? DEF[k];

function writePref(k, v) {
  if (v === DEF[k]) root.removeAttribute('data-' + k);
  else root.setAttribute('data-' + k, v);
  try {
    if (v === DEF[k]) localStorage.removeItem('jozve-' + k);
    else localStorage.setItem('jozve-' + k, v);
  } catch { /* storage unavailable */ }
}

const FONT_SIZES = [
  ['-1', 'کوچک', '0.78rem'], ['0', 'عادی', '0.92rem'], ['1', 'بزرگ', '1.06rem'],
  ['2', 'بزرگ‌تر', '1.2rem'], ['3', 'خیلی بزرگ', '1.36rem'],
];
const GROUPS = [
  { k: 'lh', legend: 'فاصله‌ی سطرها', opts: [['normal', 'عادی'], ['loose', 'باز']] },
  { k: 'align', legend: 'تراز متن', opts: [['start', 'راست‌چین'], ['justify', 'تمام‌چین']] },
  { k: 'width', legend: 'عرض ستون متن', opts: [['narrow', 'مطالعه'], ['wide', 'پهن']] },
];

function ReadingSettings() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => Object.fromEntries(Object.keys(DEF).map((k) => [k, readPref(k)])));
  const btn = useRef(null);
  const panel = useRef(null);

  const set = (k, v) => { writePref(k, v); setPrefs((p) => ({ ...p, [k]: v })); };
  const reset = () => Object.keys(DEF).forEach((k) => set(k, DEF[k]));

  useEffect(() => {
    if (!open) return undefined;
    panel.current?.querySelector('[aria-pressed="true"]')?.focus();
    const close = () => setOpen(false);
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const seg = (k, opts, render) => (
    <div className="seg" data-k={k}>
      {opts.map(([v, label, extra]) => (
        <button key={v} type="button" aria-pressed={prefs[k] === v} onClick={() => set(k, v)} {...(render ? { 'aria-label': label, title: label } : {})}>
          {render ? <span style={{ fontSize: extra, lineHeight: 1 }}>آ</span> : label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <button type="button" className="tbtn" id="rs-btn" ref={btn} aria-expanded={open} aria-controls="rs-panel"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7V5h12v2M10 5v14M7 19h6M14 13v-1h6v1M17 12v7M15.5 19h3" /></svg>
        <span>تنظیمات مطالعه</span>
      </button>
      <div id="rs-panel" ref={panel} role="dialog" aria-label="تنظیمات مطالعه" hidden={!open} onClick={(e) => e.stopPropagation()}>
        <h2>تنظیمات مطالعه</h2>
        <fieldset><legend>اندازه‌ی متن</legend>{seg('fs', FONT_SIZES, true)}</fieldset>
        {GROUPS.map((g) => <fieldset key={g.k}><legend>{g.legend}</legend>{seg(g.k, g.opts)}</fieldset>)}
        <button type="button" id="rs-reset" onClick={reset}>بازگشت به تنظیمات پیش‌فرض</button>
      </div>
    </>
  );
}

// ---- light / dark / follow the system
const THEMES = ['auto', 'light', 'dark'];
const THEME_NAME = { auto: 'خودکار', light: 'روشن', dark: 'تیره' };
const THEME_ICON = {
  auto: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" /></svg>,
  light: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  dark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>,
};

function ThemeButton() {
  const [mode, setMode] = useState(() => {
    const t = root.getAttribute('data-theme');
    return t === 'light' || t === 'dark' ? t : 'auto';
  });
  const next = () => {
    const m = THEMES[(THEMES.indexOf(mode) + 1) % 3];
    if (m === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', m);
    try {
      if (m === 'auto') localStorage.removeItem('jozve-theme');
      else localStorage.setItem('jozve-theme', m);
    } catch { /* storage unavailable */ }
    setMode(m);
  };
  return (
    <button type="button" className="tbtn" id="theme-btn" aria-label="تغییر حالت نمایش"
      title={`حالت نمایش: ${THEME_NAME[mode]} (برای تغییر کلیک کنید)`} onClick={next}>
      {THEME_ICON[mode]}<span>حالت {THEME_NAME[mode]}</span>
    </button>
  );
}

// The notes button is driven by src/legacy/notes.js (badge, aria-expanded), so React never re-renders it.
const NotesButton = memo(function NotesButton() {
  return (
    <button type="button" className="tbtn" id="nt-btn" aria-haspopup="dialog" aria-label="یادداشت‌ها و هایلایت‌ها" title="یادداشت‌ها و هایلایت‌ها">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 11l-6 6v3h3l6-6" /><path d="M22 6l-4-4-9 9 4 4z" /></svg>
      <span>یادداشت‌ها</span><b className="nt-badge" hidden />
    </button>
  );
});

/** The markup notes.js binds to: selection bar, note editor, notes panel, toast. */
export const NotesUI = memo(function NotesUI() {
  return <div dangerouslySetInnerHTML={{ __html: notesUi }} />;
});

// switches in-place text editing on and off (only on devices where it was enabled, see lib/editor.js)
function EditButton() {
  const { active } = useEditor();
  if (!editingOnThisDevice()) return null;
  return (
    <button type="button" className="tbtn" id="ed-btn" aria-pressed={active} aria-label="ویرایش متن" title="ویرایش متن همین صفحه"
      onClick={() => editor.set({ active: !active })}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
      <span>{active ? 'پایان ویرایش' : 'ویرایش متن'}</span>
    </button>
  );
}

export function Tools() {
  const [away, setAway] = useState(false);
  const bar = useRef(null);

  // hide the buttons while reading downward, show them again on the way up
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (bar.current?.querySelector('#rs-panel:not([hidden])')) { last = y; return; }
      if (y > last + 8 && y > 200) setAway(true);
      else if (y < last - 8 || y < 200) setAway(false);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={'tools' + (away ? ' away' : '')} ref={bar} onFocus={() => setAway(false)}>
      <Link className="brand" to="/">{SITE_NAME}</Link>
      <button type="button" className="tbtn" id="sr-btn" aria-haspopup="dialog" aria-label="جستجو در جزوه" title="جستجو در جزوه (Ctrl+K)"
        onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new Event('jozve:search')); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <span>جستجو</span>
      </button>
      <EditButton />
      <NotesButton />
      <ReadingSettings />
      <ThemeButton />
    </div>
  );
}

export function ReadBar() {
  const bar = useRef(null);
  useEffect(() => {
    let queued = false;
    const update = () => {
      queued = false;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, h.scrollTop / max) : 0})`;
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  return <div id="readbar" ref={bar} aria-hidden="true" />;
}

export function ToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const go = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main')?.focus({ preventScroll: true });
  };
  return (
    <button type="button" className={'tbtn' + (show ? ' show' : '')} id="totop" aria-label="بازگشت به بالای صفحه" title="بازگشت به بالا" onClick={go}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  );
}
