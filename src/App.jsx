import { lazy, Suspense, useEffect } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import book, { chaptersForNotes } from './book.js';
import { Footer, Home, Shell } from './components/Layout.jsx';
import Search from './components/Search.jsx';
import { NotesUI, ReadBar, ToTop, Tools } from './components/Tools.jsx';
import { editingBuiltIn, editingOnThisDevice, setEditingOnThisDevice, useEditor } from './lib/editor.js';

const EditBar = lazy(() => import('./components/EditBar.jsx'));

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
  const location = useLocation();
  useEditor(); // re-render when editing is switched on or off for this device
  useEffect(() => { window.jozveGo = navigate; }, [navigate]);

  // ?edit turns the edit button on for this device (and ?edit=0 off), then the address is cleaned
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (!q.has('edit')) return;
    if (editingBuiltIn()) setEditingOnThisDevice(q.get('edit') !== '0');
    q.delete('edit');
    navigate({ pathname: location.pathname, search: q.toString() ? '?' + q : '', hash: location.hash }, { replace: true });
  }, [location, navigate]);

  return (
    <>
      <a className="skip" href="#main">پرش به متن اصلی</a>
      <Tools />
      <ToTop />
      <ReadBar />
      <NotesUI />
      <Search />
      {editingOnThisDevice() && <Suspense fallback={null}><EditBar /></Suspense>}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sources" element={<Shell key="sources" page="sources" chapter={null} />} />
        <Route path="/:chapter" element={<ChapterRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
