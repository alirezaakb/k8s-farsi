import { useEffect } from 'react';
import { Route, Routes, useNavigate, useParams, Link } from 'react-router-dom';
import book, { chaptersForNotes } from './book.js';
import { Footer, Home, Shell } from './components/Layout.jsx';
import Search from './components/Search.jsx';
import { NotesUI, ReadBar, ToTop, Tools } from './components/Tools.jsx';

// notes.js reads the chapter list from here and asks us to change page
window.JOZVE_CH = chaptersForNotes;

function ChapterRoute() {
  const { chapter: id } = useParams();
  const chapter = book.chapters.find((c) => c.id === id);
  return chapter ? <Shell key={id} page={id} chapter={chapter} /> : <NotFound />;
}

function NotFound() {
  useEffect(() => { document.title = 'صفحه پیدا نشد | ' + book.title; }, []);
  return (
    <>
      <main className="load-msg" id="main" tabIndex={-1}>
        <h1>صفحه پیدا نشد</h1>
        <p><Link to="/">بازگشت به فهرست {book.title}</Link></p>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  const navigate = useNavigate();
  useEffect(() => { window.jozveGo = navigate; }, [navigate]);

  return (
    <>
      <a className="skip" href="#main">پرش به متن اصلی</a>
      <Tools />
      <ToTop />
      <ReadBar />
      <NotesUI />
      <Search />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sources" element={<Shell key="sources" page="sources" chapter={null} />} />
        <Route path="/:chapter" element={<ChapterRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
