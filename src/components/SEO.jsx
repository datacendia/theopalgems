import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://theopalgems.com';
const DEFAULT_IMAGE = `${SITE_URL}/assets/boutique-mood-lifestyle.jpg`;
const BASE_TITLE = 'Opal Gems';
const DEFAULT_DESCRIPTION =
  "Fine diamond jewelry boutiques inside Florida's premier resorts. Custom engagement rings, necklaces, earrings and bracelets. Book your private styling session.";

/**
 * Reusable SEO / Helmet wrapper for every public page.
 * Sets title, description, canonical, Open Graph, Twitter, and optional JSON-LD.
 *
 * Usage:
 *   <SEO
 *     title="Diamond Rings"
 *     description="..."
 *     path="/category/rings"
 *     image="/assets/category-rings.PNG"
 *     jsonLd={{...}}  // optional structured data object or array
 *   />
 */
/**
 * Build a BreadcrumbList JSON-LD object from an array of { name, path } items.
 * The first crumb should always be Home ("/"). Helper used by pages that pass
 * a `breadcrumbs` prop to SEO.
 */
function buildBreadcrumbList(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.path.startsWith('http') ? c.path : `${SITE_URL}${c.path}`,
    })),
  };
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image,
  type = 'website',
  jsonLd,
  breadcrumbs,
  noIndex = false,
}) {
  const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} | Fine Diamond Jewelry in Florida Resort Boutiques`;
  const url = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const ogImage = image
    ? (image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? image : `/${image}`}`)
    : DEFAULT_IMAGE;

  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  if (Array.isArray(breadcrumbs) && breadcrumbs.length > 1) {
    jsonLdArray.push(buildBreadcrumbList(breadcrumbs));
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Opal Gems" />
      <meta property="og:title" content={title || BASE_TITLE} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || BASE_TITLE} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdArray.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  );
}
