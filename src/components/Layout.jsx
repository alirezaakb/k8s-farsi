import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import book, { SITE_NAME } from '../book.js';
import ContentView from './ContentView.jsx';

const headingText = (h) => {
  const c = h.cloneNode(true);
  c.querySelectorAll('small').forEach((s) => s.remove());
  return (c.textContent.trim() || h.textContent.trim()).replace(/\s+/g, ' ');
};

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="foot-links">
        <Link to="/">صفحه‌ی اصلی</Link>
        <Link to="/sources">منابع</Link>
        <span>بر پایه‌ی مستندات رسمی kubernetes.io</span>
      </div>
      <svg className="foot-word" viewBox="0 0 760 150" aria-hidden="true" focusable="false">
        <text x="380" y="118" textAnchor="middle" fontSize="130" fontWeight="900" textLength="740" lengthAdjust="spacingAndGlyphs">{SITE_NAME}</text>
      </svg>
    </footer>
  );
}

// a part heading ("بخش اول: ...") before the first chapter of each part
function WithPart({ part, children }) {
  return (
    <>
      {part && <li className="part">{part}</li>}
      {children}
    </>
  );
}

/** All chapters, grouped by part; the open one is marked. */
function ChapterNav({ current }) {
  useEffect(() => {
    const toc = document.querySelector('nav.toc');
    const cur = toc?.querySelector('li.cur > a');
    if (toc && cur) toc.scrollTop += cur.getBoundingClientRect().top - toc.getBoundingClientRect().top - 60;
  }, [current]);

  return (
    <nav className="toc" aria-label="فهرست فصل‌ها">
      <h2>فصل‌ها</h2>
      <ol>
        {book.chapters.map((c) => {
          const here = c.id === current;
          return (
            <WithPart key={c.id} part={c.part}>
              <li className={here ? 'cur' : undefined}>
                <Link to={'/' + c.id} aria-current={here ? 'page' : undefined}>
                  <span className="n">{c.n}</span><span>{c.title}</span>
                </Link>
              </li>
            </WithPart>
          );
        })}
        <li className={current === 'sources' ? 'cur' : undefined}>
          <Link to="/sources" aria-current={current === 'sources' ? 'page' : undefined}><span className="n" /><span>منابع</span></Link>
        </li>
      </ol>
    </nav>
  );
}

/** The sections of the open chapter; the one being read is marked. */
function Outline({ outline }) {
  useEffect(() => {
    const box = document.querySelector('nav.outline');
    if (!box) return undefined;
    const links = {};
    box.querySelectorAll('a').forEach((a) => { links[a.getAttribute('data-id')] = a; });
    const heads = outline.map((o) => document.getElementById(o.id)).filter(Boolean);
    if (!heads.length) return undefined;

    let active = null;
    let queued = false;
    const spy = () => {
      queued = false;
      const line = window.innerHeight * 0.28;
      let now = null;
      for (const h of heads) { if (h.getBoundingClientRect().top <= line) now = h; else break; }
      const a = now ? links[now.id] : null;
      if (a === active) return;
      active?.classList.remove('on');
      active = a;
      if (!a) return;
      a.classList.add('on');
      const tr = box.getBoundingClientRect();
      const ar = a.getBoundingClientRect();
      if (ar.top < tr.top + 40) box.scrollTop -= tr.top + 40 - ar.top;
      else if (ar.bottom > tr.bottom - 40) box.scrollTop += ar.bottom - (tr.bottom - 40);
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(spy); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    spy();
    return () => window.removeEventListener('scroll', onScroll);
  }, [outline]);

  if (!outline.length) return <div className="outline-slot" />;
  return (
    <nav className="outline" aria-label="در این فصل">
      <h2>در این فصل</h2>
      <ol>
        {outline.map((o) => (
          <li key={o.id}><Link to={{ hash: '#' + o.id }} data-id={o.id}>{o.text}</Link></li>
        ))}
      </ol>
    </nav>
  );
}

function MobileToc({ current }) {
  return (
    <nav aria-label="فهرست فصل‌ها" className="toc-mobile-nav"><details className="toc-mobile">
      <summary>فهرست فصل‌ها</summary>
      <ol>
        <li><Link to="/">صفحه‌ی اصلی جزوه</Link></li>
        {book.chapters.map((c) => (
          <WithPart key={c.id} part={c.part}>
            <li className={c.id === current ? 'cur' : undefined}>
              <Link to={'/' + c.id} aria-current={c.id === current ? 'page' : undefined}>{c.n}. {c.title}</Link>
            </li>
          </WithPart>
        ))}
        <li><Link to="/sources">منابع</Link></li>
      </ol>
    </details></nav>
  );
}

function Crumbs({ chapter }) {
  const part = chapter
    ? book.chapters.slice(0, book.chapters.indexOf(chapter) + 1).reverse().find((c) => c.part)?.part
    : null;
  return (
    <nav className="crumbs" aria-label="مسیر">
      <Link to="/">{SITE_NAME}</Link><i>/</i>
      {chapter
        ? (<><span>{part}</span><i>/</i><span aria-current="page">فصل {chapter.n}</span></>)
        : <span aria-current="page">منابع</span>}
    </nav>
  );
}

function Pager({ chapter }) {
  const i = book.chapters.indexOf(chapter);
  const prev = book.chapters[i - 1];
  const next = book.chapters[i + 1];
  return (
    <nav className="pager" aria-label="فصل قبل و بعد">
      {prev && <Link className="prev" rel="prev" to={'/' + prev.id}><small>فصل قبلی</small><span>{prev.n}. {prev.title}</span></Link>}
      {next
        ? <Link className="next" rel="next" to={'/' + next.id}><small>فصل بعدی</small><span>{next.n}. {next.title}</span></Link>
        : <Link className="next" to="/sources"><small>پایان جزوه</small><span>منابع</span></Link>}
    </nav>
  );
}

/** A chapter or the sources page: breadcrumb, chapter list, content, previous/next, and the chapter's own outline. */
export function Shell({ page, chapter }) {
  const [outline, setOutline] = useState([]);
  const onLoaded = useCallback((el) => {
    setOutline([...el.querySelectorAll('h3[id]')].map((h) => ({ id: h.id, text: headingText(h) })));
  }, []);

  useEffect(() => {
    const name = chapter ? `فصل ${chapter.n}: ${chapter.title}` : 'منابع';
    document.title = `${name} | ${SITE_NAME}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', `${name} — جزوه‌ی آموزشی فارسی کوبرنتیز`);
  }, [chapter]);

  return (
    <>
      <Crumbs chapter={chapter} />
      <div className={chapter ? 'shell' : 'shell no-outline'}>
        <ChapterNav current={page} />
        <main id="main" tabIndex={-1}>
          <MobileToc current={page} />
          <ContentView page={page} onLoaded={onLoaded} />
          {chapter && <Pager chapter={chapter} />}
        </main>
        {chapter && <Outline outline={outline} />}
      </div>
      <Footer />
    </>
  );
}

export function Home() {
  useEffect(() => {
    document.title = `${SITE_NAME}: از صفر تا production`;
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content', 'جزوه‌ی آموزشی فارسی کوبرنتیز از صفر تا production، بر پایه‌ی مستندات رسمی kubernetes.io: ' + book.stats.join('، '));
  }, []);
  return (
    <>
      <div id="main" tabIndex={-1}><ContentView page="home" /></div>
      <Footer />
    </>
  );
}
