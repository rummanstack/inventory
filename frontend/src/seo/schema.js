import { featurePages, getFeaturePage, getSolutionPage, solutionPages } from '../features/landing/data/seoPages.js';
import { getIntentPage, intentPages } from '../features/landing/data/intentPages.js';
import { absoluteUrl, stripLangPrefix, trimTrailingSlash } from './metadata.js';
import { SCHEMA_SITE_CONFIG, STATIC_PAGE_FAQS } from './schemaConfig.js';
import { createTranslator } from '../i18n/translations.js';

const HUB_DEFINITIONS = {
  '/features': {
    nameKey: 'seoContent.breadcrumbFeatures',
    pageType: 'CollectionPage',
    itemListId: 'features-list',
    rawItems: featurePages,
    getPage: getFeaturePage,
    itemPathPrefix: '/features/',
  },
  '/solutions': {
    nameKey: 'seoContent.breadcrumbSolutions',
    pageType: 'CollectionPage',
    itemListId: 'solutions-list',
    rawItems: solutionPages,
    getPage: getSolutionPage,
    itemPathPrefix: '/solutions/',
  },
  '/software': {
    nameKey: 'seoContent.breadcrumbSoftware',
    pageType: 'CollectionPage',
    itemListId: 'software-list',
    rawItems: intentPages,
    getPage: getIntentPage,
    itemPathPrefix: '/software/',
  },
};

// Normalizes a possibly /bn-prefixed pathname down to the plain English base
// path used to key HUB_DEFINITIONS/getFeaturePage/etc. Language is read
// separately from metadata.language, since that's already resolved by
// getRouteMetadata().
function normalizePublicPath(pathname) {
  const normalized = trimTrailingSlash(pathname || '/');
  const basePath = normalized === '/' ? '/landing' : normalized;
  return stripLangPrefix(basePath).basePath;
}

function localizePath(path, language) {
  return language === 'bn' ? `/bn${path}` : path;
}

function buildBreadcrumbNode(canonicalUrl, breadcrumbs, language) {
  if (!breadcrumbs?.length) return null;

  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localizePath(item.path, language)),
    })),
  };
}

function buildFaqNode(canonicalUrl, faqs) {
  if (!faqs?.length) return null;

  return {
    '@type': 'FAQPage',
    '@id': `${canonicalUrl}#faq`,
    mainEntity: faqs.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

function buildItemListNode(canonicalUrl, hubDefinition, language) {
  if (!hubDefinition) return null;

  return {
    '@type': 'ItemList',
    '@id': `${canonicalUrl}#${hubDefinition.itemListId}`,
    itemListElement: hubDefinition.rawItems.map((raw, index) => {
      const page = hubDefinition.getPage(raw.slug, language);
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: page.title,
        url: absoluteUrl(localizePath(`${hubDefinition.itemPathPrefix}${raw.slug}`, language)),
      };
    }),
  };
}

function buildStaticBreadcrumbs(basePath, t) {
  if (basePath === '/landing') {
    return [{ name: t('seoContent.breadcrumbHome'), path: '/landing' }];
  }

  const staticKeys = {
    '/pricing': 'seoContent.breadcrumbPricing',
    '/contact': 'seoContent.breadcrumbContact',
    '/get-started': 'seoContent.breadcrumbGetStarted',
    '/founder': 'seoContent.breadcrumbFounder',
    '/privacy-policy': 'seoContent.breadcrumbPrivacy',
    '/terms': 'seoContent.breadcrumbTerms',
  };

  const titleKey = staticKeys[basePath];
  if (!titleKey) return null;

  return [
    { name: t('seoContent.breadcrumbHome'), path: '/landing' },
    { name: t(titleKey), path: basePath },
  ];
}

function getPageContext(basePath, language, t) {
  const hubDefinition = HUB_DEFINITIONS[basePath];
  if (hubDefinition) {
    return {
      pageType: hubDefinition.pageType,
      breadcrumbs: [
        { name: t('seoContent.breadcrumbHome'), path: '/landing' },
        { name: t(hubDefinition.nameKey), path: basePath },
      ],
      faqs: STATIC_PAGE_FAQS[basePath] || null,
      hubDefinition,
    };
  }

  if (basePath.startsWith('/features/')) {
    const page = getFeaturePage(basePath.slice('/features/'.length), language);
    if (page) {
      return {
        pageType: 'WebPage',
        breadcrumbs: [
          { name: t('seoContent.breadcrumbHome'), path: '/landing' },
          { name: t('seoContent.breadcrumbFeatures'), path: '/features' },
          { name: page.title, path: basePath },
        ],
        faqs: page.faqs || null,
      };
    }
  }

  if (basePath.startsWith('/solutions/')) {
    const page = getSolutionPage(basePath.slice('/solutions/'.length), language);
    if (page) {
      return {
        pageType: 'WebPage',
        breadcrumbs: [
          { name: t('seoContent.breadcrumbHome'), path: '/landing' },
          { name: t('seoContent.breadcrumbSolutions'), path: '/solutions' },
          { name: page.title, path: basePath },
        ],
        faqs: page.faqs || null,
      };
    }
  }

  if (basePath.startsWith('/software/')) {
    const page = getIntentPage(basePath.slice('/software/'.length), language);
    if (page) {
      return {
        pageType: 'WebPage',
        breadcrumbs: [
          { name: t('seoContent.breadcrumbHome'), path: '/landing' },
          { name: t('seoContent.breadcrumbSoftware'), path: '/software' },
          { name: page.title, path: basePath },
        ],
        faqs: page.faqs || null,
      };
    }
  }

  const staticPageTypes = {
    '/landing': 'WebPage',
    '/pricing': 'WebPage',
    '/contact': 'ContactPage',
    '/get-started': 'WebPage',
    '/founder': 'AboutPage',
    '/privacy-policy': 'WebPage',
    '/terms': 'WebPage',
  };

  return {
    pageType: staticPageTypes[basePath] || 'WebPage',
    breadcrumbs: buildStaticBreadcrumbs(basePath, t),
    faqs: STATIC_PAGE_FAQS[basePath] || null,
  };
}

export function buildStructuredData(pathname, metadata) {
  const basePath = normalizePublicPath(pathname);
  const language = metadata.language;
  const t = createTranslator(language);
  const pageContext = getPageContext(basePath, language, t);
  const canonicalUrl = metadata.canonicalUrl;

  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SCHEMA_SITE_CONFIG.siteUrl}#organization`,
      name: SCHEMA_SITE_CONFIG.siteName,
      url: SCHEMA_SITE_CONFIG.siteUrl,
      logo: SCHEMA_SITE_CONFIG.logoUrl,
      ...(SCHEMA_SITE_CONFIG.sameAs.length ? { sameAs: SCHEMA_SITE_CONFIG.sameAs } : {}),
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: SCHEMA_SITE_CONFIG.contactPhone,
        email: SCHEMA_SITE_CONFIG.contactEmail,
        areaServed: 'BD',
        availableLanguage: ['en', 'bn'],
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SCHEMA_SITE_CONFIG.siteUrl}#website`,
      url: SCHEMA_SITE_CONFIG.siteUrl,
      name: SCHEMA_SITE_CONFIG.siteName,
      publisher: { '@id': `${SCHEMA_SITE_CONFIG.siteUrl}#organization` },
      inLanguage: metadata.language,
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SCHEMA_SITE_CONFIG.siteUrl}#software`,
      name: SCHEMA_SITE_CONFIG.siteName,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SCHEMA_SITE_CONFIG.siteUrl,
      image: metadata.imageUrl,
      description: metadata.description,
      offers: {
        '@type': 'Offer',
        priceCurrency: SCHEMA_SITE_CONFIG.priceCurrency,
        availability: 'https://schema.org/InStock',
      },
      provider: { '@id': `${SCHEMA_SITE_CONFIG.siteUrl}#organization` },
    },
    {
      '@type': pageContext.pageType,
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: metadata.title,
      description: metadata.description,
      isPartOf: { '@id': `${SCHEMA_SITE_CONFIG.siteUrl}#website` },
      about: { '@id': `${SCHEMA_SITE_CONFIG.siteUrl}#software` },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: metadata.imageUrl,
      },
      inLanguage: metadata.language,
      ...(pageContext.breadcrumbs ? { breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` } } : {}),
      ...(pageContext.faqs ? { mainEntity: { '@id': `${canonicalUrl}#faq` } } : {}),
    },
  ];

  const breadcrumbNode = buildBreadcrumbNode(canonicalUrl, pageContext.breadcrumbs, language);
  const faqNode = buildFaqNode(canonicalUrl, pageContext.faqs);
  const itemListNode = buildItemListNode(canonicalUrl, pageContext.hubDefinition, language);

  if (breadcrumbNode) graph.push(breadcrumbNode);
  if (faqNode) graph.push(faqNode);
  if (itemListNode) graph.push(itemListNode);

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
