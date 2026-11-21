// Page layout choice: "focus" (default) shows only the lesson, with the chapter and lesson lists in a
// drawer; "off" shows the lists as columns beside the lesson (wide screens only).
import { useEffect, useState } from 'react';

const wide = () => window.matchMedia('(min-width: 921px)').matches;
const compute = () => document.documentElement.getAttribute('data-focus') === 'off' && wide();

/** true when the chapter list and the lesson list sit in columns beside the text. */
export function useColumns() {
  const [v, setV] = useState(compute);
  useEffect(() => {
    const update = () => setV(compute());
    const mq = window.matchMedia('(min-width: 921px)');
    window.addEventListener('jozve:prefs', update);
    mq.addEventListener('change', update);
    update();
    return () => { window.removeEventListener('jozve:prefs', update); mq.removeEventListener('change', update); };
  }, []);
  return v;
}

export const toggleDrawer = () => window.dispatchEvent(new Event('jozve:nav'));
