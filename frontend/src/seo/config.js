import { featurePages, solutionPages } from '../features/landing/data/seoPages.js';
import { intentPages } from '../features/landing/data/intentPages.js';

export const SEO_CONFIG = {
  siteName: 'StockLedger',
  siteUrl: import.meta.env.VITE_SITE_URL || 'https://stockledger.pro',
  defaultLocale: 'en_US',
  defaultLanguage: 'en',
  themeColor: '#0e0c25',
  tileColor: '#0e0c25',
  titleTemplate: '%s | StockLedger',
  defaultTitle: 'StockLedger Business Management System for Shops, Dealers & DSR Teams',
  defaultDescription:
    'StockLedger is a complete business system for shops, dealers, wholesalers and DSR teams in Bangladesh. Manage sales, stock, due, settlement, purchases, accounts, reports and profit in one place.',
  defaultKeywords:
    'business management system Bangladesh, shop management system, dealer software, DSR software, wholesale software, retail POS, stock management, due collection, sales report, profit report, StockLedger',
  defaultImage: '/stockledger-og.png',
  defaultImageAlt: 'StockLedger dashboard showing sales, stock, due and profit reports',
  defaultImageWidth: '1672',
  defaultImageHeight: '941',
  twitterCard: 'summary_large_image',
};

export const PUBLIC_ROUTE_METADATA = {
  '/landing': {
    title: SEO_CONFIG.defaultTitle,
    description:
      'A complete business system for Bangladesh shops, dealers, wholesalers and DSR teams. Manage sales, stock, due, settlement, purchases, reports and profit from one dashboard.',
    canonicalPath: '/landing',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'বাংলাদেশে দোকান, ডিলার ও ডিএসআর টিমের জন্য স্টকলেজার বিজনেস ম্যানেজমেন্ট সিস্টেম',
      description: 'বাংলাদেশের দোকান, ডিলার, হোলসেলার এবং ডিএসআর টিমের জন্য একটি সম্পূর্ণ বিজনেস সিস্টেম। এক ড্যাশবোর্ড থেকে সেলস, স্টক, বকেয়া, সেটেলমেন্ট, পারচেজ, রিপোর্ট এবং প্রফিট পরিচালনা করুন।',
    },
  },
  '/privacy-policy': {
    title: 'Privacy Policy',
    description:
      'Read the StockLedger privacy policy for how account, business, contact and usage data is handled for customers and visitors.',
    canonicalPath: '/privacy-policy',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'প্রাইভেসি পলিসি',
      description: 'কাস্টমার ও ভিজিটরদের জন্য অ্যাকাউন্ট, ব্যবসা, যোগাযোগ এবং ব্যবহারের ডেটা কীভাবে পরিচালিত হয় তা জানতে স্টকলেজারের প্রাইভেসি পলিসি পড়ুন।',
    },
  },
  '/terms': {
    title: 'Terms and Conditions',
    description:
      'Review the StockLedger terms and conditions for using the business management platform and related services.',
    canonicalPath: '/terms',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'শর্তাবলী',
      description: 'বিজনেস ম্যানেজমেন্ট প্ল্যাটফর্ম ও সংশ্লিষ্ট সেবা ব্যবহারের জন্য স্টকলেজারের শর্তাবলী পর্যালোচনা করুন।',
    },
  },
  '/founder': {
    title: 'Founder',
    description:
      'Learn about the founder behind StockLedger and the product vision for practical business management software in Bangladesh.',
    canonicalPath: '/founder',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'প্রতিষ্ঠাতা',
      description: 'স্টকলেজারের পেছনের প্রতিষ্ঠাতা এবং বাংলাদেশের ব্যবহারিক বিজনেস ম্যানেজমেন্ট সফটওয়্যারের প্রোডাক্ট ভিশন সম্পর্কে জানুন।',
    },
  },
};

export const AUTH_ROUTE_METADATA = {
  '/login': {
    title: 'Login',
    description: 'Sign in to your StockLedger business management workspace.',
    canonicalPath: '/login',
    robots: 'noindex,nofollow,noarchive',
    themeColor: '#f6f7f9',
  },
  '/register': {
    title: 'Register',
    description: 'Request access to StockLedger for your business.',
    canonicalPath: '/register',
    robots: 'noindex,nofollow,noarchive',
    themeColor: '#f6f7f9',
  },
};

const HUB_METADATA = {
  '/features': {
    title: 'StockLedger Features',
    description: 'Explore StockLedger features for inventory, retail POS, accounting, HR and payroll, purchases, due collection, DSR management, installments, reporting, and repair workflows.',
    canonicalPath: '/features',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'অপারেশন, অ্যাকাউন্টিং, এইচআর ও গ্রোথের জন্য স্টকলেজার ফিচার',
      description: 'ইনভেন্টরি, রিটেইল পিওএস, অ্যাকাউন্টিং, এইচআর ও পেরোল, পারচেজ, বকেয়া আদায়, ডিএসআর ম্যানেজমেন্ট, ইনস্টলমেন্ট, রিপোর্টিং এবং রিপেয়ার ওয়ার্কফ্লোর জন্য স্টকলেজার ফিচার এক্সপ্লোর করুন।',
    },
  },
  '/solutions': {
    title: 'StockLedger Solutions by Business Type',
    description: 'See how StockLedger fits retail shops, wholesalers, dealers, distributors, DSR sales teams, pharmacies, and grocery stores in Bangladesh.',
    canonicalPath: '/solutions',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'রিটেইলার, হোলসেলার, ডিলার, ডিএসআর টিম ও ফার্মেসির জন্য স্টকলেজার সমাধান',
      description: 'বাংলাদেশে রিটেইল দোকান, হোলসেলার, ডিলার, ডিস্ট্রিবিউটর, ডিএসআর সেলস টিম, ফার্মেসি এবং মুদি দোকানের জন্য স্টকলেজার কীভাবে উপযুক্ত তা দেখুন।',
    },
  },
  '/software': {
    title: 'Business Software Guides in Bangladesh',
    description: 'Explore high-intent StockLedger software guides for business management, inventory, POS, accounting, HR, DSR, wholesale, pharmacy, and shop operations in Bangladesh.',
    canonicalPath: '/software',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'বাংলাদেশে উচ্চ-ইন্টেন্ট স্টকলেজার সফটওয়্যার গাইড',
      description: 'বাংলাদেশে বিজনেস ম্যানেজমেন্ট, ইনভেন্টরি, পিওএস, অ্যাকাউন্টিং, এইচআর, ডিএসআর, হোলসেল, ফার্মেসি এবং শপ অপারেশনের জন্য উচ্চ-ইন্টেন্ট স্টকলেজার সফটওয়্যার গাইড এক্সপ্লোর করুন।',
    },
  },
  '/pricing': {
    title: 'Pricing',
    description: 'Compare StockLedger plans for sales, inventory, accounting, HR, DSR, installments, reports, setup, training, and support.',
    canonicalPath: '/pricing',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'প্রাইসিং',
      description: 'সেলস, ইনভেন্টরি, অ্যাকাউন্টিং, এইচআর, ডিএসআর, ইনস্টলমেন্ট, রিপোর্ট, সেটআপ, ট্রেনিং এবং সাপোর্টের জন্য স্টকলেজার প্ল্যান তুলনা করুন।',
    },
  },
  '/get-started': {
    title: 'Get Started',
    description: 'Start StockLedger with the right setup for your business workflows, modules, users, opening data, training, and onboarding path.',
    canonicalPath: '/get-started',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'শুরু করুন',
      description: 'আপনার বিজনেস ওয়ার্কফ্লো, মডিউল, ইউজার, ওপেনিং ডেটা, ট্রেনিং এবং অনবোর্ডিং পথের জন্য সঠিক সেটআপ দিয়ে স্টকলেজার শুরু করুন।',
    },
  },
  '/contact': {
    title: 'Contact StockLedger',
    description: 'Book a StockLedger demo or ask about setup, pricing, modules, users, branches, training, and the right configuration for your business.',
    canonicalPath: '/contact',
    robots: 'index,follow,max-image-preview:large',
    bn: {
      title: 'স্টকলেজারের সাথে যোগাযোগ করুন',
      description: 'স্টকলেজার ডেমো বুক করুন অথবা সেটআপ, প্রাইসিং, মডিউল, ইউজার, শাখা, ট্রেনিং এবং আপনার ব্যবসার সঠিক কনফিগারেশন সম্পর্কে জিজ্ঞাসা করুন।',
    },
  },
};

// /features/*, /solutions/*, /software/* metadata is generated straight from
// the same data files that drive the page content (seoPages.js/intentPages.js)
// instead of being hand-duplicated a second time, so title/description can
// never drift from the actual page body.
function buildPageMetadataEntries(pages, basePath) {
  return pages.reduce((acc, page) => {
    const path = `${basePath}/${page.slug}`;
    acc[path] = {
      title: page.en.title,
      description: page.en.description,
      canonicalPath: path,
      robots: 'index,follow,max-image-preview:large',
      ...(page.bn ? { bn: { title: page.bn.title, description: page.bn.description } } : {}),
    };
    return acc;
  }, {});
}

export const SEO_PAGE_METADATA = {
  ...HUB_METADATA,
  ...buildPageMetadataEntries(featurePages, '/features'),
  ...buildPageMetadataEntries(solutionPages, '/solutions'),
  ...buildPageMetadataEntries(intentPages, '/software'),
};

export const PRIVATE_APP_METADATA = {
  title: 'Workspace',
  description: 'StockLedger secure business management workspace.',
  canonicalPath: '/landing',
  robots: 'noindex,nofollow,noarchive',
};
