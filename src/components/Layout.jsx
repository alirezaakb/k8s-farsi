import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import book, { SITE_NAME } from '../book.js';
import ContentView from './ContentView.jsx';
import { chapterTotal, fa, isRead, lastPlace, readCount, setSections, toggleRead, useProgress } from '../lib/progress.js';

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

/** One line per lesson: a mark for "read", the title, and the minutes the main path takes. */
function SectionList({ chapter, outline, currentId }) {
  useProgress();
  return (
    <ol>
      {outline.map((o, i) => {
        const read = isRead(chapter.id, o.id);
        const cls = [read ? 'read' : '', o.id === currentId ? 'cur' : ''].filter(Boolean).join(' ') || undefined;
        return (
          <li key={o.id} className={cls}>
            <button type="button" className="chk" aria-pressed={read} aria-label={`خوانده شد: ${o.text}`} title="علامت‌گذاری به‌عنوان خوانده‌شده"
              onClick={() => toggleRead(chapter.id, o.id)} />
            <Link to={{ hash: '#' + o.id }} data-id={o.id} aria-current={o.id === currentId ? 'true' : undefined}>
              <span className="lno">{fa(i + 1)}</span>{o.text}<small>{fa(o.min)} دقیقه</small>
            </Link>
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
  return <p className="outline-sum">{fa(outline.length)} درس، مسیر اصلی حدود {fa(minutes)} دقیقه · {fa(done)} درس خوانده شد</p>;
}

/** The lessons of the open chapter; the one on screen is marked. */
function Outline({ chapter, outline, currentId }) {
  useEffect(() => {
    const box = document.querySelector('nav.outline');
    const a = box?.querySelector('li.cur a');
    if (!box || !a) return;
    const tr = box.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    if (ar.top < tr.top + 40) box.scrollTop -= tr.top + 40 - ar.top;
    else if (ar.bottom > tr.bottom - 40) box.scrollTop += ar.bottom - (tr.bottom - 40);
  }, [currentId, outline]);

  if (!outline.length) return <div className="outline-slot" />;
  return (
    <nav className="outline" aria-label="درس‌های این فصل">
      <h2>درس‌های این فصل</h2>
      <OutlineSummary chapter={chapter} outline={outline} />
      <SectionList chapter={chapter} outline={outline} currentId={currentId} />
    </nav>
  );
}

function MobileToc({ current, chapter, outline, currentId }) {
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
        <summary>درس‌های این فصل</summary>
        <OutlineSummary chapter={chapter} outline={outline} />
        <SectionList chapter={chapter} outline={outline} currentId={currentId} />
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

/** Previous lesson, "read" tick and next lesson, under the lesson on screen. */
function LessonBar({ chapter, outline, currentId }) {
  useProgress();
  const i = outline.findIndex((o) => o.id === currentId);
  if (i < 0) return null;
  const cur = outline[i];
  const prev = outline[i - 1];
  const next = outline[i + 1];
  const read = isRead(chapter.id, cur.id);
  return (
    <nav className="lessonbar" aria-label="درس قبل و بعد">
      <p className="lb-pos">درس {fa(i + 1)} از {fa(outline.length)} · حدود {fa(cur.min)} دقیقه</p>
      <button type="button" className="lb-tick" aria-pressed={read} onClick={() => toggleRead(chapter.id, cur.id)}>
        <i aria-hidden="true" />{read ? 'خوانده شد' : 'این درس را خواندم'}
      </button>
      {prev ? <Link className="lb-prev" to={{ hash: '#' + prev.id }}><small>درس قبلی</small><span>{prev.text}</span></Link> : <span className="lb-gap" />}
      {next ? <Link className="lb-next" to={{ hash: '#' + next.id }}><small>درس بعدی</small><span>{next.text}</span></Link> : <span className="lb-gap" />}
    </nav>
  );
}

/** A chapter or the sources page: breadcrumb, chapter list, one lesson at a time, and the chapter's lesson list. */
export function Shell({ page, chapter }) {
  const [outline, setOutline] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const onLoaded = useCallback((el, list) => {
    const items = list.map(({ id, text, min }) => ({ id, text, min }));
    setOutline(items);
    if (chapter && items.length) setSections(chapter.id, items.map((o) => o.id));
  }, [chapter]);

  useEffect(() => {
    const name = chapter ? `فصل ${chapter.n}: ${chapter.title}` : 'منابع';
    document.title = `${name} | ${SITE_NAME}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', `${name} — جزوه‌ی آموزشی فارسی کوبرنتیز`);
  }, [chapter]);

  const lastLesson = !outline.length || currentId === outline[outline.length - 1].id;

  return (
    <>
      <Crumbs chapter={chapter} />
      <div className={chapter ? 'shell' : 'shell no-outline'}>
        <ChapterNav current={page} />
        <main id="main" tabIndex={-1}>
          <MobileToc current={page} chapter={chapter} outline={outline} currentId={currentId} />
          <ContentView page={page} onLoaded={onLoaded} onLesson={setCurrentId} />
          {chapter && <LessonBar chapter={chapter} outline={outline} currentId={currentId} />}
          {chapter && lastLesson && <Pager chapter={chapter} />}
        </main>
        {chapter && <Outline chapter={chapter} outline={outline} currentId={currentId} />}
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
