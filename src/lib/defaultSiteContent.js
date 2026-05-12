/**
 * Default site content.
 *
 * Single source of truth for the homepage `sections` table shape. Both the
 * admin editor (`src/admin/AdminSections.jsx`) and the public site
 * (`App.jsx`, `CategoryPage.jsx`, etc.) read from this file so they never
 * drift apart.
 *
 * When the `sections` table is empty (or a particular key is missing), the
 * public site falls back to these values. Admin edits are merged on top.
 *
 * Keep this file *content-only* — no React, no DOM, so it can be imported
 * from both the public bundle and the admin bundle without bloating either.
 */

export const defaultSections = {
  // ── Hero (top of homepage) ──
  hero: {
    eyebrow: 'Step Into The Opal Experience',
    title: 'Welcome to the World of Opal Gems',
    tagline: 'Elevated Diamonds, In Person',
    ctaText: 'Shop Now',
    ctaUrl: '#categories',
    secondaryCtaText: 'Visit a Boutique',
    secondaryCtaUrl: '#locations',
    images: [
      '/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33.jpeg',
      '/assets/homepage-inspiration/stacked2.jpeg',
      '/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33 (1).jpeg',
    ],
    // Legacy single-image field kept so older admin saves still work.
    image: '/assets/boutique-mood-lifestyle.jpg',
  },

  // ── About strip (homepage section) ──
  about: {
    title: 'A Family Legacy of Fine Jewelry',
    description:
      'With over 30 years of expertise, Opal Gems brings you hand-selected diamonds and bespoke jewelry in the most exclusive resort settings in Florida.',
    ownerImage: '/assets/michelle_and_gill.jfif',
    ownerNames: 'Michelle & Gil',
    ownerTitle: 'Founders of Opal Gems',
  },

  // ── Image grid (5 category tiles) ──
  imageGrid: {
    topLeft: { src: '/assets/homepage-inspiration/lose.jpeg', alt: 'Diamond jewelry' },
    topRight: { src: '/assets/homepage-inspiration/stacked.jpeg', alt: 'Stacked jewelry' },
    bottom: [
      { key: 'necklaces', label: 'Necklaces', image: '/assets/homepage-inspiration/necklace.jpeg' },
      { key: 'earrings', label: 'Earrings', image: '/assets/homepage-inspiration/earings.jpeg' },
      { key: 'bracelets', label: 'Bracelets', image: '/assets/homepage-inspiration/braclet.jpeg' },
      { key: 'rings', label: 'Rings', image: '/assets/homepage-inspiration/ring.jpeg' },
      { key: 'watches', label: 'Watches', image: '/assets/homepage-inspiration/watch.jpeg' },
    ],
  },

  // ── "Crafted for every occasion" panel ──
  crafted: {
    title: 'CRAFTED FOR EVERY OCCASION',
    subtitle: 'From timeless classics to modern statements',
    ctaText: 'Shop All Collections',
    ctaUrl: '/category/rings',
    imageLeft: '/assets/crafted-left.jpeg',
    imageRight: '/assets/crafted-right.jpeg',
  },

  // ── Partnership strip ──
  partnership: {
    eyebrow: 'Our Partnership',
    title: 'Perfect Vacation Partners',
    body:
      'Opal Gems partners with Opal hotels to elevate and complete the perfect vacation. Fine jewelry, curated collections, and personalized service — all steps from the sand. Because the best souvenirs are the ones that sparkle.',
  },

  // ── Full-width marquee carousel ──
  carousel: {
    images: [
      { src: '/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33 (1).jpeg', alt: 'Jewelry showcase' },
      { src: '/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33 (3).jpeg', alt: 'Diamond pieces' },
      { src: '/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33.jpeg', alt: 'Jewelry collection' },
      { src: '/assets/homepage-inspiration/stacked2.jpeg', alt: 'Elegant jewelry' },
      { src: '/assets/homepage-inspiration/lose.jpeg', alt: 'Diamond rings' },
    ],
  },

  // ── Testimonials section ──
  testimonialsHeader: {
    eyebrow: 'What Our Guests Say',
    title: 'Unforgettable experiences.',
  },
  testimonials: [
    { id: 't1', name: 'Sarah M.', location: 'Delray Beach', text: 'The personal attention was incredible. They helped me find the perfect anniversary gift.', rating: 5 },
    { id: 't2', name: 'James R.', location: 'Jupiter', text: 'Outstanding selection and knowledgeable staff. A true luxury experience.', rating: 5 },
    { id: 't3', name: 'Elena K.', location: 'Clearwater', text: 'I fell in love with their collection. The quality is unmatched.', rating: 5 },
  ],
  reviews: {
    score: '4.9',
    count: 'Based on 127 reviews',
  },

  // ── Locations header (cards themselves come from `locations` table) ──
  locationsHeader: {
    eyebrow: 'Locations',
    title: 'Opal hotel boutiques.',
    subtitle: 'Visit us in-resort for private styling and secure checkout.',
  },

  // ── Legacy "categories" row on homepage (kept for AdminSections compat) ──
  categories: [
    { name: 'Necklaces', image: '/assets/category-necklaces.PNG' },
    { name: 'Rings', image: '/assets/category-rings.PNG' },
    { name: 'Earrings', image: '/assets/category-earrings.PNG' },
    { name: 'Bracelets', image: '/assets/category-bracelets.PNG' },
    { name: 'Watches', image: '/assets/category-watches.PNG' },
  ],

  // ── Showcase strip (legacy, replaced by `photos` table where section='showcase') ──
  showcase: [
    { id: 's1', image: '/assets/four_piece_daimonds.PNG', alt: 'Diamond jewelry set' },
    { id: 's2', image: '/assets/Stacked_diamond_eternity_bands.PNG', alt: 'Stacked diamond eternity bands' },
    { id: 's3', image: '/assets/diamonds_loose.PNG', alt: 'Loose diamonds' },
    { id: 's4', image: '/assets/Diamond_necklace.PNG', alt: 'Diamond necklace' },
    { id: 's5', image: '/assets/diamond_rings_on_the_beach.PNG', alt: 'Diamond rings' },
    { id: 's6', image: '/assets/daimond_strands.PNG', alt: 'Diamond strands' },
  ],

  // ── Per-category page hero (drives /category/:slug) ──
  categoryPages: {
    necklaces: {
      title: 'Necklaces',
      description: 'From delicate pendants to statement tennis necklaces, discover pieces that elevate every neckline.',
      image: '/assets/category-necklaces.PNG',
    },
    rings: {
      title: 'Rings',
      description: 'Engagement rings, stackable bands, and cocktail rings crafted with exceptional diamonds.',
      image: '/assets/Stacked_diamond_eternity_bands.PNG',
    },
    earrings: {
      title: 'Earrings',
      description: 'Studs, hoops, and drop earrings designed to catch the light and turn heads.',
      image: '/assets/category-earrings.PNG',
    },
    bracelets: {
      title: 'Bracelets',
      description: 'Tennis bracelets, bangles, and chain bracelets that add sparkle to every gesture.',
      image: '/assets/category-bracelets.PNG',
    },
    watches: {
      title: 'Watches',
      description: 'Luxury timepieces that blend precision craftsmanship with timeless elegance.',
      image: '/assets/watch_category.PNG',
    },
  },

  // ── Watch brand filter on /category/watches ──
  watchBrands: ['All', 'Rolex', 'Audemars Piguet', 'Cartier', 'Patek Philippe'],
};

/**
 * Merge a partial overrides object (e.g. what came back from Supabase) on
 * top of the defaults. One-level deep for object values; arrays replace.
 * Missing keys fall back to the default.
 */
export function mergeSections(overrides) {
  const merged = { ...defaultSections };
  if (!overrides || typeof overrides !== 'object') return merged;
  for (const [key, value] of Object.entries(overrides)) {
    if (value == null) continue;
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof merged[key] === 'object' &&
      !Array.isArray(merged[key])
    ) {
      merged[key] = { ...merged[key], ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}
