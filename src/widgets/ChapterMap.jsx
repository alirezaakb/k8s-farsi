import { useState } from 'react';
import { Link } from 'react-router-dom';
import book from '../book.js';
import { fa, isRead, useProgress } from '../lib/progress.js';

// chapters grouped by part: a chapter that has a `part` label starts a new group
const groups = [];
book.chapters.forEach((c) => {
  if (c.part || !groups.length) groups.push({ part: c.part, chapters: [] });
  groups[groups.length - 1].chapters.push(c);
});

/** Every chapter one click away: a square each, filled by how much of it was read. */
export default function ChapterMap() {
  useProgress();
  const [name, setName] = useState('');
  return (
    <div className="cmap" onMouseLeave={() => setName('')}>
      <p className="cm-cap" aria-live="polite">{name || 'یک فصل را انتخاب کنید'}</p>
      {groups.map((g, i) => (
        <div className="cm-part" key={i}>
          <p>{g.part || 'پیوست'}</p>
          <ol>
            {g.chapters.map((c) => {
              const done = c.lessons.filter((l) => isRead(c.id, l.id)).length;
              const pct = c.lessons.length ? Math.round((100 * done) / c.lessons.length) : 0;
              const label = `فصل ${c.n}: ${c.title}${pct ? ` (${fa(pct)}٪ خوانده شد)` : ''}`;
              return (
                <li key={c.id}>
                  <Link to={'/' + c.id} aria-label={label} onMouseEnter={() => setName(label)} onFocus={() => setName(label)} onBlur={() => setName('')}>
                    <i style={{ height: pct + '%' }} />
                    <b>{c.n}</b>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}
