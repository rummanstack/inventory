import { useEffect, useMemo, useState } from 'react';
import { createTranslator, supportedLanguages } from '../../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'stockledger.language';

function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return supportedLanguages.includes(stored) ? stored : 'en';
}

// This hook is mounted globally (InventoryAppProvider wraps the whole app,
// including the public bilingual marketing site), but <html lang> on the
// /bn/* public pages is owned by SeoManager/usePublicLanguage instead --
// otherwise this effect's own unconditional write races it on every mount.
function isPublicBilingualPath() {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname;
  return pathname === '/bn' || pathname.startsWith('/bn/');
}

export function useLanguage() {
  const [language, setLanguageState] = useState(getInitialLanguage);
  const t = useMemo(() => createTranslator(language), [language]);

  function setLanguage(nextLanguage) {
    if (!supportedLanguages.includes(nextLanguage)) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      if (!isPublicBilingualPath()) {
        document.documentElement.lang = nextLanguage;
        document.documentElement.dir = 'ltr';
      }
    }

    setLanguageState(nextLanguage);
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    if (!isPublicBilingualPath()) {
      document.documentElement.lang = language;
      document.documentElement.dir = 'ltr';
    }
  }, [language]);

  return { language, setLanguage, t };
}
