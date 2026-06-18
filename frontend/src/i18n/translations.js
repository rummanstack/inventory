import en from './locales/en.js';
import bn from './locales/bn.js';

const translations = {
  en,
  bn,
};

const settlementExtraStrings = {
  en: {
    extraReturnsTitle: 'Extra Returns',
    addExtraReturn: 'Add Extra Return',
    extraReturnProduct: 'Returned Product',
    extraReturnTotal: 'Total extra return: {pieces} pcs',
    noExtraReturns: 'No extra return rows added yet.',
    extraReturnInvalid: 'Choose a product and enter a returned quantity for each extra return row.',
  },
  bn: {
    extraReturnsTitle: 'অতিরিক্ত রিটার্ন',
    addExtraReturn: 'অতিরিক্ত রিটার্ন যোগ',
    extraReturnProduct: 'ফেরত পণ্য',
    extraReturnTotal: 'মোট অতিরিক্ত রিটার্ন: {pieces} pcs',
    noExtraReturns: 'এখনও কোনো অতিরিক্ত রিটার্ন সারি যোগ করা হয়নি।',
    extraReturnInvalid: 'প্রতিটি অতিরিক্ত রিটার্ন সারির জন্য পণ্য নির্বাচন করুন এবং পরিমাণ লিখুন।',
  },
};

for (const [language, values] of Object.entries(settlementExtraStrings)) {
  translations[language].settlement = {
    ...translations[language].settlement,
    ...values,
  };
}

function resolvePath(source, key) {
  return key.split('.').reduce((current, part) => (current && typeof current === 'object' ? current[part] : undefined), source);
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
