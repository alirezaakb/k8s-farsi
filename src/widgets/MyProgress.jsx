import { Link } from 'react-router-dom';
import book from '../book.js';
import { fa, isRead, lastPlace, useProgress } from '../lib/progress.js';

const hours = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${fa(m)} دقیقه`;
  return m ? `${fa(h)} ساعت و ${fa(m)} دقیقه` : `${fa(h)} ساعت`;
};

// chapters grouped by part: a chapter that has a `part` label starts a new group
const groups = [];
book.chapters.forEach((c) => {
  if (c.part || !groups.length) groups.push({ part: c.part, chapters: [] });
  groups[groups.length - 1].chapters.push(c);
});

const pct = (done, total) => (total ? Math.round((100 * done) / total) : 0);

/** "My progress": lessons read, time left, exercises ticked, progress per part, and where to continue. */
export default function MyProgress() {
  useProgress();
  const last = lastPlace();
  const lastChapter = last && book.chapters.find((c) => c.id === last.ch);

  const lessons = book.chapters.flatMap((c) => c.lessons.map((l) => ({ c, l })));
  const readLessons = lessons.filter(({ c, l }) => isRead(c.id, l.id));
  const left = lessons.filter(({ c, l }) => !isRead(c.id, l.id)).reduce((s, { l }) => s + l.min, 0);
  const exercises = book.chapters.flatMap((c) => c.exercises.map((e) => ({ c, e })));
  const exDone = exercises.filter(({ c, e }) => isRead(c.id, e.id)).length;
  const all = pct(readLessons.length, lessons.length);

  return (
    <div className="mp">
      <h2 className="mp-h">عملکرد من</h2>
      <p className="mp-big"><b>{fa(all)}٪</b><span>{fa(readLessons.length)} از {fa(lessons.length)} درس خوانده شد</span></p>
      <div className="mp-bar" role="img" aria-label={`${fa(all)} درصد`}><i style={{ width: all + '%' }} /></div>
      <ul className="mp-rows">
        <li><span>زمان باقی‌مانده‌ی مسیر اصلی</span><b>{hours(left)}</b></li>
        <li><span>تمرین و مصاحبه‌ی تیک‌خورده</span><b>{fa(exDone)} از {fa(exercises.length)}</b></li>
      </ul>
      <h3 className="mp-sub">پیشرفت هر بخش</h3>
      <ul className="mp-parts">
        {groups.map((g, i) => {
          const items = g.chapters.flatMap((c) => c.lessons.map((l) => ({ c, l })));
          const d = items.filter(({ c, l }) => isRead(c.id, l.id)).length;
          const p = pct(d, items.length);
          return (
            <li key={i}>
              <span>{g.part || 'پیوست'}</span><em>{fa(p)}٪</em>
              <i><u style={{ width: p + '%' }} /></i>
            </li>
          );
        })}
      </ul>
      {lastChapter
        ? <Link className="mp-go" to={{ pathname: '/' + lastChapter.id, hash: '#' + last.id }}>ادامه: فصل {lastChapter.n}، {last.text}</Link>
        : <Link className="mp-go" to="/ch1">شروع از فصل ۱</Link>}
      <p className="mp-links"><Link to={{ hash: '#plan' }}>برنامه‌ی ۴۹ روزه</Link><Link to={{ hash: '#pathway' }}>مسیر سریع</Link></p>
    </div>
  );
}
