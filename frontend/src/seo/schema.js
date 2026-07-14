import { featurePages, getFeaturePage, getSolutionPage, solutionPages } from '../features/landing/data/seoPages.js';
import { getIntentPage, intentPages } from '../features/landing/data/intentPages.js';
import { absoluteUrl, trimTrailingSlash } from './metadata.js';
import { SCHEMA_SITE_CONFIG, STATIC_PAGE_FAQS } from './schemaConfig.js';

const HUB_DEFINITIONS = {
  '/features': {
    name: 'Features',
    pageType: 'CollectionPage',
    itemListId: 'features-list',
    items: featurePages,
    itemPathPrefix: '/features/',
  },
  '/solutions': {
    name: 'Solutions',
    pageType: 'CollectionPage',
    itemListId: 'solutions-list',
    items: solutionPages,
    itemPathPrefix: '/solutions/',
  },
  '/software': {
    name: 'Software Guides',
    pageType: 'CollectionPage',
    itemListId: 'software-list',
    items: intentPages,
    itemPathPrefix: '/software/',
  },
};

function normalizePublicPath(pathname) {
  const normalized = trimTrailingSlash(pathname || '/');
  return normalized === '/' ? '/landing' : normalized;
}

function buildBreadcrumbNode(canonicalUrl, breadcrumbs) {
  if (!breadcrumbs?.length) return null;

  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
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

function buildItemListNode(canonicalUrl, hubDefinition) {
  if (!hubDefinition) return null;

  return {
    '@type': 'ItemList',
    '@id': `${canonicalUrl}#${hubDefinition.itemListId}`,
    itemListElement: hubDefinition.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      url: absoluteUrl(`${hubDefinition.itemPathPrefix}${item.slug}`),
    })),
  };
}

function buildStaticBreadcrumbs(pathname) {
  if (pathname === '/landing') {
    return [{ name: 'Home', path: '/landing' }];
  }

  const staticTitles = {
    '/pricing': 'Pricing',
    '/contact': 'Contact',
    '/get-started': 'Get Started',
    '/founder': 'Founder',
    '/privacy-policy': 'Privacy Policy',
    '/terms': 'Terms and Conditions',
  };

  const title = staticTitles[pathname];
  if (!title) return null;

  return [
    { name: 'Home', path: '/landing' },
    { name: title, path: pathname },
  ];
}

function getPageContext(pathname) {
  const hubDefinition = HUB_DEFINITIONS[pathname];
  if (hubDefinition) {
    return {
      pageType: hubDefinition.pageType,
      breadcrumbs: [
        { name: 'Home', path: '/landing' },
        { name: hubDefinition.name, path: pathname },
      ],
      faqs: STATIC_PAGE_FAQS[pathname] || null,
      hubDefinition,
    };
  }

  if (pathname.startsWith('/features/')) {
    const page = getFeaturePage(pathname.slice('/features/'.length));
    if (page) {
      return {
        pageType: 'WebPage',
        breadcrumbs: [
          { name: 'Home', path: '/landing' },
          { name: 'Features', path: '/features' },
          { name: page.title, path: pathname },
        ],
        faqs: page.faqs || null,
      };
    }
  }

  if (pathname.startsWith('/solutions/')) {
    const page = getSolutionPage(pathname.slice('/solutions/'.length));
    if (page) {
      return {
        pageType: 'WebPage',
        breadcrumbs: [
          { name: 'Home', path: '/landing' },
          { name: 'Solutions', path: '/solutions' },
          { name: page.title, path: pathname },
        ],
        faqs: page.faqs || null,
      };
    }
  }

  if (pathname.startsWith('/software/')) {
    const page = getIntentPage(pathname.slice('/software/'.length));
    if (page) {
      return {
        pageType: 'WebPage',
        breadcrumbs: [
          { name: 'Home', path: '/landing' },
          { name: 'Software Guides', path: '/software' },
          { name: page.title, path: pathname },
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
    pageType: staticPageTypes[pathname] || 'WebPage',
    breadcrumbs: buildStaticBreadcrumbs(pathname),
    faqs: STATIC_PAGE_FAQS[pathname] || null,
  };
}

export function buildStructuredData(pathname, metadata) {
  const normalizedPath = normalizePublicPath(pathname);
  const pageContext = getPageContext(normalizedPath);
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

  const breadcrumbNode = buildBreadcrumbNode(canonicalUrl, pageContext.breadcrumbs);
  const faqNode = buildFaqNode(canonicalUrl, pageContext.faqs);
  const itemListNode = buildItemListNode(canonicalUrl, pageContext.hubDefinition);

  if (breadcrumbNode) graph.push(breadcrumbNode);
  if (faqNode) graph.push(faqNode);
  if (itemListNode) graph.push(itemListNode);

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
