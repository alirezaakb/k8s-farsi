import book from 'virtual:book';

export default book;
export const BASE = import.meta.env.BASE_URL;
export const SITE_NAME = book.title;
export const chapterIndex = Object.fromEntries(book.chapters.map((c, i) => [c.id, i]));

/** Shape the notes panel expects: chapter id -> { number, title, path, order }. */
export const chaptersForNotes = Object.fromEntries(
  book.chapters.map((c, i) => [c.id, { n: c.n, t: c.title, h: '/' + c.id, o: i }])
);
