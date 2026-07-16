const translations = {};
const loadingBundles = {};
const bundleLoaders = {
  en: () => import('./locales/en.js'),
  bn: () => import('./locales/bn.js'),
};

export const supportedLanguages = ['en', 'bn'];

async function loadBundle(language) {
  if (translations[language]) return translations[language];

  if (!loadingBundles[language]) {
    loadingBundles[language] = bundleLoaders[language]().then((module) => {
      translations[language] = module.default;
      return translations[language];
    }).finally(() => {
      delete loadingBundles[language];
    });
  }

  return loadingBundles[language];
}

export async function loadLanguage(language) {
  const locale = supportedLanguages.includes(language) ? language : 'en';
  const requiredBundles = locale === 'en' ? ['en'] : ['en', locale];
  await Promise.all(requiredBundles.map(loadBundle));
  return locale;
}

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
  const bundle = translations[locale] || translations.en;

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
