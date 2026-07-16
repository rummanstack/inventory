import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createTranslator } from '../../i18n/translations';

// Strips a leading `/bn` (or bare `/bn`) segment, returning the equivalent
// English-URL path. Used both to detect the current language from the URL
// and to build the sibling URL when switching languages.
export function stripLangPrefix(pathname) {
  if (pathname === '/bn') return '/landing';
  if (pathname.startsWith('/bn/')) return pathname.slice(3);
  return pathname;
}

export function buildLocalizedPath(language, path) {
  const basePath = stripLangPrefix(path);
  return language === 'bn' ? `/bn${basePath}` : basePath;
}

// Language-aware replacement for useLanguage() used only by the public
// marketing pages: language comes from the URL (so it's crawlable and
// prerenderable per-language) instead of localStorage. Returns the same
// { language, setLanguage, t } shape as useLanguage() so it's a drop-in
// swap for every component that already threads that shape down as props.
export function usePublicLanguage() {
  const location = useLocation();
  const navigate = useNavigate();

  const language = location.pathname === '/bn' || location.pathname.startsWith('/bn/') ? 'bn' : 'en';
  const t = useMemo(() => createTranslator(language), [language]);

  function setLanguage(nextLanguage) {
    if (nextLanguage === language) return;
    navigate(`${buildLocalizedPath(nextLanguage, location.pathname)}${location.search}${location.hash}`);
  }

  return { language, setLanguage, t };
}
