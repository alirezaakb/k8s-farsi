// Entrance for the parts of a page as they scroll into view: heading, text, then figures, staggered.
// Uses the Web Animations API, so the page's HTML is never touched (the in-place editor saves it as is).
const HOME = '.hero-text > *,.course-side';
const CHAPTER = '.ch-num,.ch-head h1,.ch-sub,main h3,figure,.story,.note,.warn,.lab,.deep,.ex,.recap,.src-title,.foot li,.lesson > :nth-child(-n+6),.lessonbar > *';

export function initReveal(root, page) {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const targets = [...root.querySelectorAll(page === 'home' ? HOME : CHAPTER)];
  const running = [];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const siblings = [...e.target.parentElement.children].filter((c) => targets.includes(c));
      const delay = Math.min(siblings.indexOf(e.target), 5) * 70;
      running.push(e.target.animate(
        [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }],
        { duration: 700, delay, easing: 'cubic-bezier(.2,.7,.1,1)', fill: 'backwards' },
      ));
    });
  });
  targets.forEach((t) => io.observe(t));
  return () => { io.disconnect(); running.forEach((a) => a.cancel()); };
}
