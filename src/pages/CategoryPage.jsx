import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import watches from '../data/watches.js';
import { kiraProducts } from '../data/kiraProducts.js';
import { ProductCard, ProductModal, buildWhatsAppLink } from '../components/ProductModal';
import SEO from '../components/SEO';
import { getPublicSections, getPublicLocations } from '../lib/publicData';
import { defaultSections } from '../lib/defaultSiteContent';

const PRICE_RANGES = [
  { key: 'all', label: 'All Prices' },
  { key: 'u2', label: 'Under $2,000', min: 0, max: 2000 },
  { key: '2-4', label: '$2,000–$4,000', min: 2000, max: 4000 },
  { key: '4-7', label: '$4,000–$7,000', min: 4000, max: 7000 },
  { key: '7+', label: '$7,000+', min: 7000, max: Infinity },
];
const priceValue = (p) => {
  const n = Number(String(p.price ?? '').replace(/[^0-9.]/g, ''));
  return isNaN(n) || n === 0 ? null : n;
};

export default function CategoryPage() {
  const { category } = useParams();
  const [brandFilter, setBrandFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sortOrder, setSortOrder] = useState('featured');
  const [priceRange, setPriceRange] = useState('all');
  // Live CMS data — fall back to in-memory defaults until Supabase resolves.
  const [categoryPages, setCategoryPages] = useState(defaultSections.categoryPages);
  const [watchBrands, setWatchBrands] = useState(defaultSections.watchBrands);
  const [locations, setLocations] = useState([
    { key: 'opal-grand', name: 'Opal Grand', city: 'Delray Beach, Florida', description: 'Beachfront boutique inside Opal Grand Resort. Same-day try-ons after check-in.', image: '/assets/hotels/opal-grand.PNG' },
    { key: 'opal-sol', name: 'Opal Sol', city: 'Clearwater Beach, Florida', description: 'A sister boutique within the Opal Collection portfolio.', image: '/assets/hotels/opal-sol.PNG' },
    { key: 'jupiter-beach', name: 'Jupiter Beach Resort & Spa', city: 'Jupiter, Florida', description: 'Steps from the sand with spa-adjacent showcases and relaxed fittings.', image: '/assets/hotels/jupiter-beach.PNG' },
  ]);

  useEffect(() => {
    getPublicSections().then((s) => {
      if (s.categoryPages) setCategoryPages(s.categoryPages);
      if (Array.isArray(s.watchBrands) && s.watchBrands.length) setWatchBrands(s.watchBrands);
    });
    getPublicLocations().then((locs) => {
      if (locs && locs.length) {
        setLocations(locs.map((l) => ({
          key: l.key,
          name: l.name,
          city: l.city,
          description: l.description,
          image: l.hotelImage || l.image || l.hotel_image || '',
        })));
      }
    });
  }, []);

  const info = categoryPages?.[category] || categoryPages?.necklaces || defaultSections.categoryPages.necklaces;

  const filteredWatches = brandFilter === 'All' ? watches : watches.filter(w => w.brand === brandFilter);

  const filteredKiraProducts = kiraProducts.filter(product => product.category === category);

  // Price filter + sort (client-side; prerender shows the default "featured / all").
  const activeRange = PRICE_RANGES.find((r) => r.key === priceRange) || PRICE_RANGES[0];
  const rangedProducts = filteredKiraProducts.filter((p) => {
    if (activeRange.key === 'all') return true;
    const v = priceValue(p);
    return v != null && v >= activeRange.min && v < activeRange.max;
  });
  const displayedProducts = sortOrder === 'featured'
    ? rangedProducts
    : [...rangedProducts].sort((a, b) => {
        const av = priceValue(a) ?? (sortOrder === 'price-asc' ? Infinity : -Infinity);
        const bv = priceValue(b) ?? (sortOrder === 'price-asc' ? Infinity : -Infinity);
        return sortOrder === 'price-asc' ? av - bv : bv - av;
      });

  const waLink = buildWhatsAppLink(info.title);

  return (
    <div className="page category-page">
      <SEO
        title={`${info.title} — Fine Diamond Jewelry`}
        description={`${info.description} Visit Opal Gems boutiques in Delray Beach, Clearwater Beach, and Jupiter, Florida to see the full ${info.title.toLowerCase()} collection in person.`}
        path={`/category/${category}`}
        image={info.image}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Collections', path: '/#categories' },
          { name: info.title, path: `/category/${category}` },
        ]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${info.title} | Opal Gems`,
          description: info.description,
          url: `https://theopalgems.com/category/${category}`,
          isPartOf: { '@type': 'WebSite', name: 'Opal Gems', url: 'https://theopalgems.com' },
        }}
      />
      <div className="page-hero page-hero--short">
        <div className="page-hero__content">
          <p className="eyebrow">Our Collection</p>
          <h1>{info.title}</h1>
          <p className="lead">{info.description}</p>
        </div>
      </div>
      <main className="container">
        {/* Watch Products Grid */}
        {category === 'watches' && (
          <section className="section">
            <div className="section__header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 32px' }}>
              <p className="eyebrow">Our Collection</p>
              <h2>Luxury Timepieces</h2>
              <p className="small" style={{ textAlign: 'center' }}>Pre-owned and new watches from the world's most prestigious brands. Available at all Opal Gems locations.</p>
            </div>
            <div className="watch-brand-filters">
              {watchBrands.map((b) => (
                <button key={b} className={`pill ${brandFilter === b ? 'primary' : 'ghost'}`} onClick={() => setBrandFilter(b)}>
                  {b}
                </button>
              ))}
            </div>
            <div className="watch-grid">
              {filteredWatches.map((watch) => (
                <div key={watch.id} className="watch-card" onClick={() => setSelectedProduct({ ...watch, description: watch.name, link: watch.image })} style={{ cursor: 'pointer' }}>
                  <div className="watch-card__image">
                    <img src={watch.image} alt={watch.name} loading="lazy" decoding="async" />
                  </div>
                  <div className="watch-card__info">
                    <p className="watch-card__brand">{watch.brand}</p>
                    <h3 className="watch-card__name">{watch.name}</h3>
                    <p className="watch-card__desc">{watch.description}</p>
                    <p className="watch-card__price">${Math.floor(Number(String(watch.price).replace(/[^0-9.]/g, ''))).toLocaleString()}</p>
                    <div className="watch-card__actions" onClick={(e) => e.stopPropagation()}>
                      <Link to="/book" className="pill primary small">Book to View</Link>
                      <a href={buildWhatsAppLink(watch.name)} target="_blank" rel="noopener noreferrer" className="pill whatsapp small">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style={{ marginRight: '4px' }}>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Kira Products Grid (non-watch categories) */}
        {category !== 'watches' && (
          <section className="section">
            <div className="section__header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 32px' }}>
              <p className="eyebrow">Our Collection</p>
              <h2>{info.title}</h2>
              <p className="small" style={{ textAlign: 'center' }}>Exquisite jewelry pieces crafted with exceptional quality and attention to detail.</p>
            </div>

            {filteredKiraProducts.length > 0 && (
              <div className="catalog-controls">
                <div className="catalog-controls__filters">
                  {PRICE_RANGES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      className={`pill small ${priceRange === r.key ? 'primary' : 'ghost'}`}
                      onClick={() => setPriceRange(r.key)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <label className="catalog-controls__sort">
                  <span>Sort</span>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="featured">Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </label>
              </div>
            )}

            {filteredKiraProducts.length === 0 ? (
              <p className="small" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-muted)' }}>
                No pieces available in this category.
              </p>
            ) : displayedProducts.length === 0 ? (
              <p className="small" style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-muted)' }}>
                No pieces in this price range.
              </p>
            ) : (
              <div className="cards grid-4">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.sku || product.name} product={product} onSelect={setSelectedProduct} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="section">
          <div className="section__header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 48px' }}>
            <p className="eyebrow">Where to Find {info.title}</p>
            <h2>Visit our boutiques to try on in person.</h2>
            <p className="small">Our {info.title.toLowerCase()} collection is available at all Opal Gems locations. Book an appointment for a private styling session.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="cards grid-3" style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
              {locations.map((loc) => (
                <Link key={loc.key} to={`/location/${loc.key}`} className="card location-card">
                  <div className="location-card__image">
                    <img src={loc.image} alt={loc.name} loading="lazy" decoding="async" />
                  </div>
                  <div className="tag">Open</div>
                  <h3>{loc.name}</h3>
                  <p className="small">{loc.city}</p>
                  <p>{loc.description}</p>
                  <span className="pill ghost" style={{ marginTop: '16px' }}>View Location</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section section--panel">
          <div className="section__header" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <p className="eyebrow">Ready to explore?</p>
            <h2>Book your appointment today.</h2>
            <p className="small">Tell us when you're arriving—we'll prep trays in your size.</p>
          </div>
          <div className="actions" style={{ justifyContent: 'center' }}>
            <Link to="/book" className="pill primary">Book Appointment</Link>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="pill whatsapp">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{ marginRight: '6px' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Ask on WhatsApp
            </a>
            <Link to="/" className="pill ghost">Back to Home</Link>
          </div>
        </section>
      </main>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
