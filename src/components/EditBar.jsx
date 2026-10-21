import { useState } from 'react';
import book from '../book.js';
import { editor, setEditingOnThisDevice, useEditor } from '../lib/editor.js';
import { clearDraft, saveCommitted, sha1 } from '../lib/overrides.js';
import { getRemote, getToken, putRemote, serializeContent, setToken } from '../lib/editing.js';

/** Bar shown at the bottom while editing text: save to GitHub, discard, leave. */
export default function EditBar() {
  const s = useEditor();
  const [tokenOpen, setTokenOpen] = useState(false);
  const [token, setTokenField] = useState('');
  if (!s.active) return null;

  const say = (message) => editor.set({ message });
  const hooks = () => editor.page;

  async function save() {
    const h = hooks();
    if (!h) { say('این صفحه قابل ویرایش نیست.'); return; }
    const t = getToken();
    if (!t) { setTokenOpen(true); say('اول توکن GitHub را وارد کنید.'); return; }
    editor.set({ busy: true, message: 'در حال ثبت…' });
    try {
      const page = h.page;
      const text = serializeContent(h.getRoot(), page);
      const remote = await getRemote(page, t);
      if (remote.text === text) { clearDraft(page); editor.set({ busy: false, dirty: false, message: 'تغییری برای ثبت نیست.' }); return; }
      if ((await sha1(remote.text)) !== h.getBase()
        && !window.confirm('این فایل در GitHub از زمانی که صفحه را باز کرده‌اید عوض شده است. با ویرایش شما جایگزین شود؟')) {
        editor.set({ busy: false, message: 'ثبت لغو شد.' });
        return;
      }
      const label = page === 'home' ? 'صفحه‌ی اصلی' : page === 'sources' ? 'منابع' : 'فصل ' + (book.chapters.find((c) => c.id === page)?.n ?? page);
      await putRemote(page, text, remote.sha, `ویرایش متن ${label}`, t);
      saveCommitted(page, text, h.getBundleHash());
      clearDraft(page);
      h.setBase(await sha1(text));
      editor.set({ busy: false, dirty: false, message: 'ثبت شد. سایت تا یکی دو دقیقه‌ی دیگر برای همه به‌روز می‌شود.' });
    } catch (e) {
      editor.set({ busy: false, message: e.message || String(e) });
    }
  }

  function discard() {
    if (s.dirty && !window.confirm('ویرایش‌های ثبت‌نشده‌ی این صفحه دور ریخته شود؟')) return;
    hooks()?.discard();
  }

  function turnOff() {
    if (s.dirty && !window.confirm('ویرایش‌های ثبت‌نشده‌ی این صفحه در این مرورگر می‌ماند ولی روی سایت نمی‌رود. ویرایش را خاموش کنم؟')) return;
    setEditingOnThisDevice(false);
  }

  const saveToken = () => {
    setToken(token.trim());
    setTokenField('');
    setTokenOpen(false);
    say(token.trim() ? 'توکن ذخیره شد.' : 'توکن پاک شد.');
  };

  return (
    <div className="editbar" role="region" aria-label="ویرایش متن">
      <div className="eb-row">
        <b>ویرایش متن</b>
        <span className="eb-state" aria-live="polite">{s.message || (s.dirty ? 'تغییرهای ثبت‌نشده دارید' : 'متن را مستقیم روی صفحه تغییر دهید')}</span>
        <span className="eb-btns">
          <button type="button" className="eb-pri" onClick={save} disabled={s.busy || !s.dirty}>ثبت در GitHub</button>
          <button type="button" onClick={discard} disabled={s.busy || !s.dirty}>دور انداختن</button>
          <button type="button" onClick={() => setTokenOpen((o) => !o)}>توکن</button>
          <button type="button" onClick={() => editor.set({ active: false })}>پایان ویرایش</button>
          <button type="button" onClick={turnOff} title="دکمه‌ی ویرایش از این دستگاه برداشته می‌شود">خاموش‌کردن</button>
        </span>
      </div>
      {tokenOpen && (
        <form className="eb-row eb-token" onSubmit={(e) => { e.preventDefault(); saveToken(); }}>
          <label htmlFor="eb-token">توکن GitHub (Fine-grained، فقط این مخزن، دسترسی Contents: Read and write)</label>
          <input id="eb-token" type="password" dir="ltr" autoComplete="off" value={token} onChange={(e) => setTokenField(e.target.value)}
            placeholder={getToken() ? 'یک توکن ذخیره شده؛ برای عوض‌کردن توکن تازه را بنویسید' : 'github_pat_…'} />
          <button type="submit" className="eb-pri">ذخیره</button>
          {getToken() && <button type="button" onClick={() => { setToken(''); setTokenOpen(false); say('توکن پاک شد.'); }}>پاک‌کردن توکن</button>}
          <span className="eb-hint">توکن فقط در همین مرورگر نگه‌داری می‌شود.</span>
        </form>
      )}
    </div>
  );
}
