import en from './locales/en.js';
import bn from './locales/bn.js';

const translations = {
  en,
  bn,
};

function resolvePath(source, key) {
  if (!source || typeof source !== 'object') return undefined;
  // Prefer an exact match at this level first — some leaf keys (e.g. permission
  // names like "voucher.view") contain literal dots and aren't nested objects.
  if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
  const dotIndex = key.indexOf('.');
  if (dotIndex === -1) return undefined;
  return resolvePath(source[key.slice(0, dotIndex)], key.slice(dotIndex + 1));
}

export function createTranslator(language) {
  const locale = translations[language] ? language : 'en';
  const bundle = translations[locale];

  return function t(key, values = {}) {
    if (locale === 'bn' && key === 'app.subtitle') {
      return translations.en.app.subtitle;
    }

    const fallback = resolvePath(translations.en, key);
    const template = resolvePath(bundle, key) ?? fallback ?? key;

    if (typeof template !== 'string') {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (_, name) => {
      const value = values[name];
      return value === undefined || value === null ? '' : String(value);
    });
  };
}

export const supportedLanguages = ['en', 'bn'];
