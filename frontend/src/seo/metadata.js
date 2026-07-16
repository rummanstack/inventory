import { AUTH_ROUTE_METADATA, PRIVATE_APP_METADATA, PUBLIC_ROUTE_METADATA, SEO_CONFIG, SEO_PAGE_METADATA } from './config';

export function trimTrailingSlash(pathname) {
  if (!pathname || pathname === '/') return pathname || '/';
  return pathname.replace(/\/+$/, '');
}

// Splits a normalized pathname into its language-neutral base path and the
// language it was requested in. Bare "/bn" maps to the homepage, matching
// the "/bn" -> "/bn/landing" redirect route registered in App.jsx.
export function stripLangPrefix(pathname) {
  if (pathname === '/bn') return { basePath: '/landing', language: 'bn' };
  if (pathname.startsWith('/bn/')) return { basePath: pathname.slice(3), language: 'bn' };
  return { basePath: pathname, language: 'en' };
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${SEO_CONFIG.siteUrl.replace(/\/+$/, '')}${normalizedPath}`;
}

export function assetUrl(path) {
  return absoluteUrl(path);
}

export function formatTitle(title) {
  if (!title || title === SEO_CONFIG.defaultTitle) return SEO_CONFIG.defaultTitle;
  return SEO_CONFIG.titleTemplate.replace('%s', title);
}

function lookupBaseMetadata(basePath) {
  if (basePath === '/') {
    return PUBLIC_ROUTE_METADATA['/landing'];
  }

  return (
    PUBLIC_ROUTE_METADATA[basePath] ||
    SEO_PAGE_METADATA[basePath] ||
    AUTH_ROUTE_METADATA[basePath] ||
    null
  );
}

export function getRouteMetadata(pathname) {
  const normalizedPath = trimTrailingSlash(pathname);
  const { basePath, language } = stripLangPrefix(normalizedPath);
  const base = lookupBaseMetadata(basePath);

  if (!base) {
    return PRIVATE_APP_METADATA;
  }

  if (language === 'bn') {
    return {
      ...base,
      ...(base.bn || {}),
      canonicalPath: `/bn${base.canonicalPath}`,
      language: 'bn',
      ogLocale: 'bn_BD',
      isLocalizedPublic: true,
    };
  }

  return { ...base, language: 'en', isLocalizedPublic: true };
}

export function buildMetadata(pathname) {
  const routeMetadata = getRouteMetadata(pathname);
  const title = formatTitle(routeMetadata.title);
  const description = routeMetadata.description || SEO_CONFIG.defaultDescription;
  const canonicalPath = routeMetadata.canonicalPath || trimTrailingSlash(pathname) || '/';
  const image = routeMetadata.image || SEO_CONFIG.defaultImage;

  return {
    language: routeMetadata.language || SEO_CONFIG.defaultLanguage,
    isLocalizedPublic: Boolean(routeMetadata.isLocalizedPublic),
    title,
    description,
    keywords: routeMetadata.keywords || SEO_CONFIG.defaultKeywords,
    robots: routeMetadata.robots || 'index,follow,max-image-preview:large',
    canonicalPath,
    canonicalUrl: absoluteUrl(canonicalPath),
    themeColor: routeMetadata.themeColor || SEO_CONFIG.themeColor,
    imageUrl: assetUrl(image),
    imageAlt: routeMetadata.imageAlt || SEO_CONFIG.defaultImageAlt,
    imageWidth: routeMetadata.imageWidth || SEO_CONFIG.defaultImageWidth,
    imageHeight: routeMetadata.imageHeight || SEO_CONFIG.defaultImageHeight,
    ogType: routeMetadata.ogType || 'website',
    ogLocale: routeMetadata.ogLocale || SEO_CONFIG.defaultLocale,
    siteName: SEO_CONFIG.siteName,
    twitterCard: routeMetadata.twitterCard || SEO_CONFIG.twitterCard,
  };
}
