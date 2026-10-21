// Scroll to an element and keep correcting while lazy images above it change the layout.
// html has `scroll-behavior: smooth`, so every jump is explicitly instant.
let current = null;

export function settleTo(el) {
  const token = {};
  current = token;
  let prev = null;
  let stable = 0;
  let n = 0;
  const stop = () => {
    if (current === token) current = null;
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchstart', stop);
    window.removeEventListener('keydown', stop);
  };
  const step = () => {
    if (current !== token) return;
    const top = Math.round(el.getBoundingClientRect().top);
    if (prev !== null && Math.abs(top - prev) <= 1) stable++;
    else stable = 0;
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    prev = Math.round(el.getBoundingClientRect().top);
    if (stable < 4 && n++ < 40) requestAnimationFrame(step);
    else stop();
  };
  window.addEventListener('wheel', stop, { passive: true });
  window.addEventListener('touchstart', stop, { passive: true });
  window.addEventListener('keydown', stop);
  step();
  return stop;
}

export function scrollTop() {
  current = null;
  window.scrollTo({ top: 0, behavior: 'instant' });
}
