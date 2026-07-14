import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { buildMetadata } from './metadata';

function upsertMetaByName(name, content) {
  let element = document.head.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertMetaByProperty(property, content) {
  let element = document.head.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel, href, attributes = {}) {
  let element = document.head.querySelector(`link[rel="${rel}"]${attributes.sizes ? `[sizes="${attributes.sizes}"]` : ''}`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}


function upsertJsonLd(metadata) {
  const id = 'stockledger-json-ld';
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${metadata.canonicalUrl}#organization`,
        name: metadata.siteName,
        url: 'https://stockledger.pro',
        logo: 'https://stockledger.pro/stockledger-icon-512x512.png',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${metadata.canonicalUrl}#software`,
        name: metadata.siteName,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: metadata.canonicalUrl,
        image: metadata.imageUrl,
        description: metadata.description,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BDT',
          availability: 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${metadata.canonicalUrl}#webpage`,
        url: metadata.canonicalUrl,
        name: metadata.title,
        description: metadata.description,
        isPartOf: {
          '@type': 'WebSite',
          name: metadata.siteName,
          url: 'https://stockledger.pro',
        },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: metadata.imageUrl,
        },
      },
    ],
  };

  element.textContent = JSON.stringify(jsonLd);
}
export function applyMetadata(metadata) {
  document.documentElement.setAttribute('lang', metadata.language);
  document.title = metadata.title;

  upsertMetaByName('description', metadata.description);
  upsertMetaByName('keywords', metadata.keywords);
  upsertMetaByName('robots', metadata.robots);
  upsertMetaByName('googlebot', metadata.robots);
  upsertMetaByName('theme-color', metadata.themeColor);
  upsertMetaByName('application-name', metadata.siteName);
  upsertMetaByName('apple-mobile-web-app-title', metadata.siteName);
  upsertMetaByName('twitter:card', metadata.twitterCard);
  upsertMetaByName('twitter:title', metadata.title);
  upsertMetaByName('twitter:description', metadata.description);
  upsertMetaByName('twitter:image', metadata.imageUrl);
  upsertMetaByName('twitter:image:alt', metadata.imageAlt);

  upsertMetaByProperty('og:site_name', metadata.siteName);
  upsertMetaByProperty('og:type', metadata.ogType);
  upsertMetaByProperty('og:locale', metadata.ogLocale);
  upsertMetaByProperty('og:title', metadata.title);
  upsertMetaByProperty('og:description', metadata.description);
  upsertMetaByProperty('og:url', metadata.canonicalUrl);
  upsertMetaByProperty('og:image', metadata.imageUrl);
  upsertMetaByProperty('og:image:alt', metadata.imageAlt);
  upsertMetaByProperty('og:image:width', metadata.imageWidth);
  upsertMetaByProperty('og:image:height', metadata.imageHeight);

  upsertLink('canonical', metadata.canonicalUrl);
  upsertJsonLd(metadata);
}

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    applyMetadata(buildMetadata(location.pathname));
  }, [location.pathname]);

  return null;
}
