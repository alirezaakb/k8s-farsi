import { useRef } from 'react';
import { Link } from 'react-router-dom';
import book from '../book.js';
import { fa, isRead, lastPlace, toggleRead, useProgress } from '../lib/progress.js';

const hours = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${fa(m)} دقیقه`;
  return m ? `${fa(h)} ساعت و ${fa(m)} دقیقه` : `${fa(h)} ساعت`;
};

const doneIn = (c) => c.lessons.filter((l) => isRead(c.id, l.id)).length;

// "15 تمرین · …" -> "۱۵ تمرین"
const shortCount = (c) => fa(c.split('·')[0].trim());

// chapters grouped by part: a chapter that has a `part` label starts a new group
const groups = [];
book.chapters.forEach((c) => {
  if (c.part || !groups.length) groups.push({ part: c.part, chapters: [] });
  groups[groups.length - 1].chapters.push(c);
});

function Mark({ chapter, id, label }) {
  return (
    <button type="button" className="chk" aria-pressed={isRead(chapter.id, id)} aria-label={`خوانده شد: ${label}`} title="علامت‌گذاری به‌عنوان خوانده‌شده"
      onClick={() => toggleRead(chapter.id, id)} />
  );
}

function Chapter({ c, open }) {
  const total = c.lessons.length;
  const done = doneIn(c);
  const pct = total ? Math.min(100, Math.round((100 * done) / total)) : 0;
  const minutes = c.lessons.reduce((s, l) => s + l.min, 0);
  const blocks = c.exercises.length;
  return (
    <details className="syl-ch" open={open}>
      <summary>
        <span className="syl-n">{c.n}</span>
        <span className="syl-t">{c.title}</span>
        <span className="syl-m">{fa(total)} درس{blocks ? ` · ${fa(blocks)} بخش تمرین` : ''} · {hours(minutes)}</span>
        <span className="syl-p" role="img" aria-label={`${fa(pct)} درصد خوانده شده`}><i style={{ width: pct + '%' }} /><em>{fa(pct)}٪</em></span>
      </summary>
      <ol className="syl-list">
        {c.lessons.map((l, i) => (
          <li key={l.id} className={isRead(c.id, l.id) ? 'read' : undefined}>
            <Mark chapter={c} id={l.id} label={l.text} />
            <Link to={i === 0 ? '/' + c.id : { pathname: '/' + c.id, hash: '#' + l.id }}>
              <span className="syl-no">{fa(i + 1)}</span><span className="syl-lt">{l.text}</span><small>{fa(l.min)} دقیقه</small>
            </Link>
          </li>
        ))}
        {c.exercises.map((e) => (
          <li key={e.id} className={'syl-ex' + (isRead(c.id, e.id) ? ' read' : '')}>
            <Mark chapter={c} id={e.id} label={e.title} />
            <Link to={{ pathname: '/' + c.id, hash: '#' + e.id }}>
              <span className="syl-kind">{e.interview ? 'مصاحبه' : 'تمرین'}</span><span className="syl-lt">{e.title}</span><small>{shortCount(e.count)}</small>
            </Link>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** The table of contents of the book: parts, chapters, lessons and exercises, with the reader's progress. */
export default function Syllabus() {
  useProgress();
  const box = useRef(null);
  const last = lastPlace();
  const lessons = book.chapters.reduce((s, c) => s + c.lessons.length, 0);
  const blocks = book.chapters.reduce((s, c) => s + c.exercises.length, 0);
  const minutes = book.chapters.reduce((s, c) => s + c.lessons.reduce((t, l) => t + l.min, 0), 0);
  const done = book.chapters.reduce((s, c) => s + doneIn(c), 0);
  const setAll = (on) => box.current?.querySelectorAll('details.syl-ch').forEach((d) => { d.open = on; });
  const lastChapter = last && book.chapters.find((c) => c.id === last.ch);

  return (
    <div className="syl" ref={box}>
      <div className="syl-top">
        <ul className="syl-sum">
          <li>{fa(book.chapters.length)} فصل</li>
          <li>{fa(lessons)} درس</li>
          <li>{fa(blocks)} بخش تمرین و مصاحبه</li>
          <li>مسیر اصلی حدود {hours(minutes)}</li>
          <li>{fa(done)} درس خوانده شد</li>
        </ul>
        <span className="syl-act">
          {lastChapter && (
            <Link className="syl-go" to={{ pathname: '/' + lastChapter.id, hash: '#' + last.id }}>ادامه: فصل {lastChapter.n}، {last.text}</Link>
          )}
          <button type="button" onClick={() => setAll(true)}>باز کردن همه</button>
          <button type="button" onClick={() => setAll(false)}>بستن همه</button>
        </span>
      </div>
      {groups.map((g, gi) => (
        <section className="syl-part" key={gi}>
          {g.part && <h3 className="syl-ph">{g.part}</h3>}
          {g.chapters.map((c) => <Chapter key={c.id} c={c} open={lastChapter?.id === c.id} />)}
        </section>
      ))}
    </div>
  );
}
