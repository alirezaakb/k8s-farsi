import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import book, { SITE_NAME } from '../book.js';
import ContentView from './ContentView.jsx';
import { chapterTotal, fa, isRead, lastPlace, readCount, setLast, setSections, toggleRead, useProgress } from '../lib/progress.js';

const headingText = (h) => {
  const c = h.cloneNode(true);
  c.querySelectorAll('small').forEach((s) => s.remove());
  return (c.textContent.trim() || h.textContent.trim()).replace(/\s+/g, ' ');
};

/** Minutes for the main path of one section: its text, code and lab steps, without folded notes and exercises. */
function sectionMinutes(h3) {
  let words = 0;
  let code = 0;
  let steps = 0;
  for (let n = h3.nextElementSibling; n && n.tagName !== 'H3'; n = n.nextElementSibling) {
    if (n.matches('details.more, details.ex')) continue;
    const c = n.cloneNode(true);
    c.querySelectorAll('details.more, details.ex, svg, script, style').forEach((x) => x.remove());
    c.querySelectorAll('pre').forEach((p) => { code += (p.textContent.match(/\n/g) || []).length + 1; p.remove(); });
    words += (c.textContent.match(/\S+/g) || []).length;
    steps += n.matches('h4.step') ? 1 : n.querySelectorAll('h4.step').length;
  }
  return Math.max(1, Math.round(words / 120 + code * 0.06 + steps * 5));
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="foot-links">
        <Link to="/">صفحه‌ی اصلی</Link>
        <Link to="/sources">منابع</Link>
        <span>بر پایه‌ی مستندات رسمی kubernetes.io</span>
      </div>
      <svg className="foot-word" viewBox="0 0 330 64" role="img" aria-label={SITE_NAME}>
        <text x="165" y="48" textAnchor="middle" fontSize="52" fontWeight="900">{SITE_NAME}</text>
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
  useProgress();
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
                  {readCount(c.id) > 0 && chapterTotal(c.id) > 0 && (
                    <em className="prog" title="بخش‌های خوانده‌شده">{fa(Math.min(100, Math.round((100 * readCount(c.id)) / chapterTotal(c.id))))}٪</em>
                  )}
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

/** One line per section: a mark for "read", the title, and the minutes the main path takes. */
function SectionList({ chapter, outline }) {
  useProgress();
  return (
    <ol>
      {outline.map((o) => {
        const read = isRead(chapter.id, o.id);
        return (
          <li key={o.id} className={read ? 'read' : undefined}>
            <button type="button" className="chk" aria-pressed={read} aria-label={`خوانده شد: ${o.text}`} title="علامت‌گذاری به‌عنوان خوانده‌شده"
              onClick={() => toggleRead(chapter.id, o.id)} />
            <Link to={{ hash: '#' + o.id }} data-id={o.id}>{o.text}<small>{fa(o.min)} دقیقه</small></Link>
          </li>
        );
      })}
    </ol>
  );
}

function OutlineSummary({ chapter, outline }) {
  useProgress();
  const minutes = outline.reduce((s, o) => s + o.min, 0);
  const done = outline.filter((o) => isRead(chapter.id, o.id)).length;
  return <p className="outline-sum">مسیر اصلی حدود {fa(minutes)} دقیقه · {fa(done)} از {fa(outline.length)} بخش خوانده شد</p>;
}

/** The sections of the open chapter; the one being read is marked. */
function Outline({ chapter, outline }) {
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
      if (now) setLast(chapter.id, now.id, headingText(now));
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
  }, [outline, chapter]);

  if (!outline.length) return <div className="outline-slot" />;
  return (
    <nav className="outline" aria-label="در این فصل">
      <h2>در این فصل</h2>
      <OutlineSummary chapter={chapter} outline={outline} />
      <SectionList chapter={chapter} outline={outline} />
    </nav>
  );
}

function MobileToc({ current, chapter, outline }) {
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
    </details>
    {chapter && outline.length > 0 && (
      <details className="toc-mobile">
        <summary>بخش‌های این فصل</summary>
        <OutlineSummary chapter={chapter} outline={outline} />
        <SectionList chapter={chapter} outline={outline} />
      </details>
    )}
    </nav>
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
    const list = [...el.querySelectorAll('h3[id]')].map((h) => ({ id: h.id, text: headingText(h), min: sectionMinutes(h) }));
    setOutline(list);
    const sec = el.querySelector('section.ch');
    if (sec) setSections(sec.id, list.map((o) => o.id));
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
          <MobileToc current={page} chapter={chapter} outline={outline} />
          <ContentView page={page} onLoaded={onLoaded} />
          {chapter && <Pager chapter={chapter} />}
        </main>
        {chapter && <Outline chapter={chapter} outline={outline} />}
      </div>
      <Footer />
    </>
  );
}

/** Link back to the section the reader was in last. */
function ResumeBar() {
  useProgress();
  const l = lastPlace();
  const c = l && book.chapters.find((x) => x.id === l.ch);
  if (!c) return null;
  return (
    <div className="resume">
      <Link to={{ pathname: '/' + c.id, hash: '#' + l.id }}>ادامه از جایی که بودید: فصل {c.n}، {l.text}</Link>
    </div>
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
      <ResumeBar />
      <div id="main" tabIndex={-1}><ContentView page="home" /></div>
      <Footer />
    </>
  );
}
