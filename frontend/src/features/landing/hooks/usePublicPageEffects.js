import { useEffect } from 'react';

/**
 * Shared chrome for every public (not-logged-in) page:
 * - toggles the `landing-page-active` classes that unlock document scrolling
 * - optionally scrolls to the top on mount (subpages want this, the landing
 *   home page does not)
 * - reveals sections with a fade-and-rise as they enter the viewport
 *
 * Reveal classes are only ever attached from JS, so nothing is hidden without
 * JS, and reduced-motion users see everything instantly (handled in CSS).
 * Skipped under webdriver so the SEO prerender snapshot never captures the
 * opacity-0 `lp-reveal` state in the static HTML.
 */
export function usePublicPageEffects({ scrollToTop = true } = {}) {
  useEffect(() => {
    document.documentElement.classList.add('landing-page-active');
    document.body.classList.add('landing-page-active');
    if (scrollToTop) window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove('landing-page-active');
      document.body.classList.remove('landing-page-active');
    };
  }, [scrollToTop]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || navigator.webdriver) return undefined;
    const targets = document.querySelectorAll(
      '.landing-page > section:not(.landing-hero):not(.public-hero) > .landing-container',
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-reveal-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -60px 0px' },
    );
    targets.forEach((el) => {
      el.classList.add('lp-reveal');
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
}
