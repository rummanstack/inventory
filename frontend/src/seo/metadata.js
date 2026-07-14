import { AUTH_ROUTE_METADATA, PRIVATE_APP_METADATA, PUBLIC_ROUTE_METADATA, SEO_CONFIG, SEO_PAGE_METADATA } from './config';

export function trimTrailingSlash(pathname) {
  if (!pathname || pathname === '/') return pathname || '/';
  return pathname.replace(/\/+$/, '');
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

export function getRouteMetadata(pathname) {
  const normalizedPath = trimTrailingSlash(pathname);

  if (normalizedPath === '/') {
    return PUBLIC_ROUTE_METADATA['/landing'];
  }

  return (
    PUBLIC_ROUTE_METADATA[normalizedPath] ||
    SEO_PAGE_METADATA[normalizedPath] ||
    AUTH_ROUTE_METADATA[normalizedPath] ||
    PRIVATE_APP_METADATA
  );
}

export function buildMetadata(pathname) {
  const routeMetadata = getRouteMetadata(pathname);
  const title = formatTitle(routeMetadata.title);
  const description = routeMetadata.description || SEO_CONFIG.defaultDescription;
  const canonicalPath = routeMetadata.canonicalPath || trimTrailingSlash(pathname) || '/';
  const image = routeMetadata.image || SEO_CONFIG.defaultImage;

  return {
    language: routeMetadata.language || SEO_CONFIG.defaultLanguage,
    title,
    description,
    keywords: routeMetadata.keywords || SEO_CONFIG.defaultKeywords,
    robots: routeMetadata.robots || 'index,follow,max-image-preview:large',
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
