import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import watches from '../data/watches.js';
import { kiraProducts } from '../data/kiraProducts.js';
import { opalSolProducts } from '../data/opalSolProducts.js';
import { jupiterProducts } from '../data/jupiterProducts.js';
import { opalGrandProducts } from '../data/opalGrandProducts.js';
import { ProductCard, ProductModal } from '../components/ProductModal';
import SEO from '../components/SEO';
import { getPublicLocations } from '../lib/publicData';

// Address-based Google Maps embed — works without an API key (the old
// pre-baked `pb=` embeds used placeholder place-IDs and rendered blank/blue).
function mapEmbedFor(address) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;
}

const locationInfo = {
  'opal-grand': {
    name: 'Opal Grand',
    city: 'Delray Beach, Florida',
    address: '10 North Ocean Boulevard, Delray Beach, FL 33483',
    description: 'Beachfront boutique inside Opal Grand Resort. Same-day try-ons after check-in.',
    longDescription: 'Located in the heart of Delray Beach, our Opal Grand boutique offers an intimate jewelry experience steps from the Atlantic Ocean. Whether you\'re celebrating a special occasion or simply treating yourself, our concierge team is ready to help you find the perfect piece.',
    hours: 'Daily: 10am - 7pm',
    phone: '(561) 274-3200',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=10+N+Ocean+Blvd+Delray+Beach+FL+33483',
    mapEmbed: mapEmbedFor('10 N Ocean Blvd, Delray Beach, FL 33483'),
  },
  'opal-sol': {
    name: 'Opal Sol',
    city: 'Clearwater Beach, Florida',
    address: '400 Coronado Dr, Clearwater Beach, FL 33767',
    description: 'A sister boutique within the Opal Collection portfolio.',
    longDescription: 'Our Opal Sol location brings the Opal Gems experience to Florida\'s stunning Gulf Coast. With panoramic views and sunset styling sessions, this boutique offers a relaxed yet luxurious atmosphere for discovering your next treasure.',
    hours: 'Daily: 10am - 8pm',
    phone: '(727) 229-8171',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=400+Coronado+Dr+Clearwater+Beach+FL+33767',
    mapEmbed: mapEmbedFor('400 Coronado Dr, Clearwater Beach, FL 33767'),
  },
  'jupiter-beach': {
    name: 'Jupiter Beach Resort & Spa',
    city: 'Jupiter, Florida',
    address: '5 North A1A, Jupiter, FL 33477',
    description: 'Steps from the sand with spa-adjacent showcases and relaxed fittings.',
    longDescription: 'Nestled within the Jupiter Beach Resort & Spa, this boutique combines the serenity of a spa retreat with the excitement of fine jewelry discovery. Book a styling session before or after your spa treatment for the ultimate indulgence.',
    hours: 'Daily: 9am - 6pm',
    phone: '(561) 786-2751',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=5+N+A1A+Jupiter+FL+33477',
    mapEmbed: mapEmbedFor('5 N A1A, Jupiter, FL 33477'),
  }
};

// Clean black-background representative images for the "Explore all
// collections" thumbnails (the old ones were inconsistent phone photos).
const categories = [
  { key: 'necklaces', name: 'Necklaces', image: '/assets/homepage-inspiration/necklace.jpeg', description: 'From delicate pendants to statement tennis necklaces, discover pieces that elevate every neckline.' },
  { key: 'rings', name: 'Rings', image: '/assets/homepage-inspiration/ring.jpeg', description: 'Engagement rings, stackable bands, and cocktail rings crafted with exceptional diamonds.' },
  { key: 'earrings', name: 'Earrings', image: '/assets/homepage-inspiration/earings.jpeg', description: 'Studs, hoops, and drop earrings designed to catch the light and turn heads.' },
  { key: 'bracelets', name: 'Bracelets', image: '/assets/homepage-inspiration/braclet.jpeg', description: 'Tennis bracelets, bangles, and chain bracelets that add sparkle to every gesture.' },
  { key: 'watches', name: 'Watches', image: '/assets/homepage-inspiration/watch.jpeg', description: 'Luxury timepieces that blend precision craftsmanship with timeless elegance.' }
];

const brands = ['All', 'Rolex', 'Audemars Piguet', 'Cartier', 'Patek Philippe'];

// A varied "featured" set for the location landing (2 per jewelry category),
// so the page never shows a wall of the same thing.
function featuredProducts(catalog) {
  return ['necklaces', 'rings', 'earrings', 'bracelets']
    .flatMap((c) => catalog.filter((p) => p.category === c).slice(0, 2));
}

export default function LocationPage() {
  const { locationId, category } = useParams();
  const fallback = locationInfo[locationId] || locationInfo['opal-grand'];
  const [info, setInfo] = useState(fallback);
  const categoryRef = useRef(null);
  const [brandFilter, setBrandFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Live overrides from Admin → Locations. Falls back silently to the
  // hardcoded `locationInfo` if the row is missing or the request fails.
  useEffect(() => {
    let active = true;
    getPublicLocations()
      .then((rows) => {
        if (!active) return;
        const row = (rows || []).find((r) => r.key === locationId);
        if (!row) return;
        setInfo({
          name: row.name || fallback.name,
          city: row.city || fallback.city,
          address: row.address || fallback.address,
          description: row.description || fallback.description,
          longDescription: row.longDescription || row.long_description || fallback.longDescription,
          hours: row.hours || fallback.hours,
          phone: row.phone || fallback.phone,
          mapUrl: row.mapUrl || row.map_url || fallback.mapUrl,
          // Only use an admin-provided embed if present; otherwise keep the
          // reliable address-based one (never the old blank pb= embed).
          mapEmbed: row.mapEmbed || row.map_embed || fallback.mapEmbed,
        });
      })
      .catch(() => { /* keep fallback */ });
    return () => { active = false; };
  }, [locationId]);

  const selectedCategory = category ? categories.find(c => c.key === category) : null;
  const filteredWatches = brandFilter === 'All' ? watches : watches.filter(w => w.brand === brandFilter);
  // Boutiques with their own real in-store stock (photographed on black display
  // busts). Others fall back to the shared catalog.
  const REAL_STOCK = { 'opal-sol': opalSolProducts, 'jupiter-beach': jupiterProducts, 'opal-grand': opalGrandProducts };
  const catalog = REAL_STOCK[locationId] || kiraProducts;
  // Real-stock boutiques show EVERY piece on the landing (not a 2-per-category
  // teaser); shared-catalog boutiques keep the featured set.
  const isRealStock = Boolean(REAL_STOCK[locationId]);
  const gridProducts = category
    ? catalog.filter((p) => p.category === category)
    : (isRealStock ? catalog : featuredProducts(catalog));

  useEffect(() => {
    if (category && categoryRef.current) {
      setTimeout(() => {
        categoryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [category]);

  const locPath = category ? `/location/${locationId}/${category}` : `/location/${locationId}`;
  const locSchema = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: `Opal Gems — ${info.name}`,
    description: info.longDescription,
    url: `https://theopalgems.com${locPath}`,
    telephone: info.phone,
    priceRange: '$$$',
    address: { '@type': 'PostalAddress', streetAddress: info.address.split(',')[0], addressLocality: info.city.split(',')[0], addressRegion: 'FL', addressCountry: 'US' },
    openingHours: info.hours,
  };

  return (
    <div className="page">
      <SEO
        title={`${info.name} Boutique${selectedCategory ? ` — ${selectedCategory.name}` : ''} — ${info.city}`}
        description={`${info.longDescription} Located at ${info.address}. ${info.hours}. Call ${info.phone} to book a styling appointment.`}
        path={locPath}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Locations', path: '/#locations' },
          { name: info.name, path: `/location/${locationId}` },
          ...(selectedCategory
            ? [{ name: selectedCategory.name, path: `/location/${locationId}/${selectedCategory.key}` }]
            : []),
        ]}
        jsonLd={locSchema}
      />
      <div className="page-hero page-hero--location">
        <div className="page-hero__content">
          <p className="eyebrow">Boutique Location</p>
          <h1>{info.name}</h1>
          <p className="lead">{info.city}</p>
          {selectedCategory && (
            <p className="small" style={{ marginTop: '16px' }}>
              Viewing: <strong>{selectedCategory.name}</strong>
            </p>
          )}
        </div>
      </div>

      <main className="container">
        {/* If a specific category is selected, show it prominently */}
        {selectedCategory && (
          <section className="section" id={selectedCategory.key} ref={categoryRef}>
            <div className="category-feature">
              <div className="category-feature__image">
                <img src={selectedCategory.image} alt={selectedCategory.name} loading="lazy" decoding="async" />
              </div>
              <div className="category-feature__content">
                <p className="eyebrow">{selectedCategory.name} at {info.name}</p>
                <h2>{selectedCategory.name}</h2>
                <p>{selectedCategory.description}</p>
                <p className="small">
                  Visit our {info.name} boutique to explore our {selectedCategory.name.toLowerCase()} collection in person.
                  Our concierge team will help you find the perfect piece.
                </p>
                <div className="actions">
                  <a href="/book" className="pill primary">Book Appointment</a>
                  <a href={`tel:${info.phone.replace(/[^0-9]/g, '')}`} className="pill ghost">Call {info.phone}</a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Watch Products Grid */}
        {category === 'watches' && (
          <section className="section">
            <div className="section__header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 32px' }}>
              <p className="eyebrow">Available at {info.name}</p>
              <h2>Luxury Timepieces</h2>
              <p className="small">Browse our curated selection of pre-owned and new watches from the world's most prestigious brands.</p>
            </div>

            <div className="watch-brand-filters">
              {brands.map((b) => (
                <button key={b} className={`pill ${brandFilter === b ? 'primary' : 'ghost'}`} onClick={() => setBrandFilter(b)}>
                  {b}
                </button>
              ))}
            </div>

            <div className="watch-grid">
              {filteredWatches.map((watch) => (
                <div key={watch.id} className="watch-card">
                  <div className="watch-card__image">
                    <img src={watch.image} alt={watch.name} loading="lazy" decoding="async" />
                  </div>
                  <div className="watch-card__info">
                    <p className="watch-card__brand">{watch.brand}</p>
                    <h3 className="watch-card__name">{watch.name}</h3>
                    <p className="watch-card__desc">{watch.description}</p>
                    <p className="watch-card__price">{watch.price}</p>
                    <div className="watch-card__actions">
                      <Link to="/book" className="pill primary small">Book to View</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Jewelry grid — real catalog, same cards as the category pages */}
        {category !== 'watches' && gridProducts.length > 0 && (
          <section className="section">
            <div className="section__header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 32px' }}>
              <p className="eyebrow">Available at {info.name}</p>
              <h2>{selectedCategory ? selectedCategory.name : (isRealStock ? 'Our Collection' : 'Featured Pieces')}</h2>
              <p className="small">{isRealStock && !selectedCategory ? 'Every piece below is currently available to try on at this boutique.' : 'A curated selection available for try-on at this location.'}</p>
            </div>

            <div className="cards grid-4">
              {gridProducts.map((product) => (
                <ProductCard key={product.sku || product.name} product={product} onSelect={setSelectedProduct} />
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="location-details">
            <div className="location-info">
              <h2>About {info.name}</h2>
              <p>{info.longDescription}</p>

              <div className="location-meta">
                <div>
                  <h4>Address</h4>
                  <p>{info.address}</p>
                </div>
                <div>
                  <h4>Hours</h4>
                  <p>{info.hours}</p>
                </div>
                <div>
                  <h4>Phone</h4>
                  <p><a href={`tel:${info.phone.replace(/[^0-9]/g, '')}`}>{info.phone}</a></p>
                </div>
              </div>

              <div className="actions">
                <a href="/book" className="pill primary">Book Appointment</a>
                <a href={`tel:${info.phone.replace(/[^0-9]/g, '')}`} className="pill ghost">Call Boutique</a>
                <a href={info.mapUrl} target="_blank" rel="noopener noreferrer" className="pill ghost directions-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Get Directions
                </a>
              </div>
            </div>
          </div>

          {/* Embedded Google Map */}
          <div className="location-map">
            <iframe
              src={mapEmbedFor(info.address)}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map of ${info.name}`}
            />
          </div>
        </section>

        <section className="section">
          <div className="section__header">
            <p className="eyebrow">Available at {info.name}</p>
            <h2>Explore all collections.</h2>
            <p className="small">Browse our curated selection available for try-on at this location.</p>
          </div>

          <div className="cards grid-5">
            {categories.map((cat) => (
              <Link
                key={cat.key}
                to={`/location/${locationId}/${cat.key}`}
                className={`category-card ${category === cat.key ? 'category-card--active' : ''}`}
              >
                <div className="category-card__image">
                  <img src={cat.image} alt={cat.name} loading="lazy" decoding="async" />
                </div>
                <h3>{cat.name}</h3>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section--panel">
          <div className="section__header" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <p className="eyebrow">Plan Your Visit</p>
            <h2>We can't wait to see you.</h2>
            <p className="small">Book an appointment and we'll have everything ready for your arrival.</p>
          </div>
          <div className="actions" style={{ justifyContent: 'center' }}>
            <a href="/book" className="pill primary">Book Appointment</a>
            <Link to="/" className="pill ghost">Back to Home</Link>
          </div>
        </section>
      </main>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
