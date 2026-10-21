// Study-plan checkboxes on the home page: ticked days are kept in localStorage.
const KEY = 'jozve-plan2-done';
const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = (n) => String(n).replace(/[0-9]/g, (d) => FA[d]);

export function initPlan(root) {
  let done = {};
  try { done = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { done = {}; }
  const boxes = [...root.querySelectorAll('#plan input[data-day]')];
  const total = boxes.length;

  const paint = () => {
    let c = 0;
    boxes.forEach((b) => {
      const d = b.getAttribute('data-day');
      b.checked = !!done[d];
      b.closest('.pl-day').classList.toggle('done', b.checked);
      if (b.checked) c++;
    });
    const fill = root.querySelector('#pl-fill');
    if (fill) fill.style.width = (total ? (100 * c) / total : 0) + '%';
    const count = root.querySelector('#pl-count');
    if (count) count.textContent = fa(c) + ' از ' + fa(total) + ' روز';
    root.querySelectorAll('.pl-wdone').forEach((e) => {
      const a = +e.getAttribute('data-from');
      const z = +e.getAttribute('data-to');
      let k = 0;
      for (let i = a; i <= z; i++) if (done[i]) k++;
      e.textContent = k ? '✓ ' + fa(k) + ' از ' + fa(z - a + 1) : '';
    });
  };

  const onChange = (e) => {
    const b = e.target;
    if (!b.matches || !b.matches('#plan input[data-day]')) return;
    const d = b.getAttribute('data-day');
    if (b.checked) done[d] = 1;
    else delete done[d];
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch { /* storage unavailable */ }
    paint();
  };
  root.addEventListener('change', onChange);
  paint();
  return () => root.removeEventListener('change', onChange);
}
