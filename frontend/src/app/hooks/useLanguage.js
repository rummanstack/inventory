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

export function useLanguage() {
  const [language, setLanguageState] = useState(getInitialLanguage);
  const t = useMemo(() => createTranslator(language), [language]);

  function setLanguage(nextLanguage) {
    if (!supportedLanguages.includes(nextLanguage)) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      document.documentElement.lang = nextLanguage;
      document.documentElement.dir = 'ltr';
    }

    setLanguageState(nextLanguage);
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
  }, [language]);

  return { language, setLanguage, t };
}
