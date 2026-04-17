import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import watches from '../data/watches.js';
import { locationCuratedProducts } from '../data/locationCuratedProducts.js';

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
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3571.5!2d-80.073!3d26.4615!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d8e1c2e0c6e6f9%3A0x1234567890abcdef!2s10+N+Ocean+Blvd%2C+Delray+Beach%2C+FL+33483!5e0!3m2!1sen!2sus!4v1700000000000'
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
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3519.8!2d-82.827!3d27.978!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88c2f5e5e0c6e6f9%3A0x1234567890abcdef!2s400+Coronado+Dr%2C+Clearwater+Beach%2C+FL+33767!5e0!3m2!1sen!2sus!4v1700000000000'
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
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3556.2!2d-80.0583!3d26.9423!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d8e1c2e0c6e6f9%3A0x1234567890abcdef!2s5+N+A1A%2C+Jupiter%2C+FL+33477!5e0!3m2!1sen!2sus!4v1700000000000'
  }
};

const categories = [
  { key: 'necklaces', name: 'Necklaces', image: '/assets/kira_individual_items_white/page02_item01.png', description: 'From delicate pendants to statement tennis necklaces, discover pieces that elevate every neckline.' },
  { key: 'rings', name: 'Rings', image: '/assets/ring-3-1J1kiCf1QOj607i8A4hnGz1J_k0-JvjOa.jpg', description: 'Engagement rings, stackable bands, and cocktail rings crafted with exceptional diamonds.' },
  { key: 'earrings', name: 'Earrings', image: '/assets/em-rd-earrings-2-172drLDQopmSdx_4wSl6ASjiUJ5qo5x6c.jpg', description: 'Studs, hoops, and drop earrings designed to catch the light and turn heads.' },
  { key: 'bracelets', name: 'Bracelets', image: '/assets/tennis-bracelet-10-1f8GCCdbeTBl1Dy5TUDdXPbzx8d0H-PA8.jpg', description: 'Tennis bracelets, bangles, and chain bracelets that add sparkle to every gesture.' },
  { key: 'watches', name: 'Watches', image: '/assets/watch_category.PNG', description: 'Luxury timepieces that blend precision craftsmanship with timeless elegance.' }
];

const brands = ['All', 'Rolex', 'Audemars Piguet', 'Cartier', 'Patek Philippe'];

export default function LocationPage() {
  const { locationId, category } = useParams();
  const info = locationInfo[locationId] || locationInfo['opal-grand'];
  const categoryRef = useRef(null);
  const [brandFilter, setBrandFilter] = useState('All');
  
  const selectedCategory = category ? categories.find(c => c.key === category) : null;
  const filteredWatches = brandFilter === 'All' ? watches : watches.filter(w => w.brand === brandFilter);
  const curatedForLocation = locationCuratedProducts[locationId] || [];
  const curatedFiltered = category
    ? curatedForLocation.filter((p) => p.category === category)
    : curatedForLocation;

  useEffect(() => {
    if (category && categoryRef.current) {
      setTimeout(() => {
        categoryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [category]);

  return (
    <div className="page">
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
                <img src={selectedCategory.image} alt={selectedCategory.name} />
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
                <button
                  key={b}
                  className={`pill ${brandFilter === b ? 'primary' : 'ghost'}`}
                  onClick={() => setBrandFilter(b)}
                >
                  {b}
                </button>
              ))}
            </div>

            <div className="watch-grid">
              {filteredWatches.map((watch) => (
                <div key={watch.id} className="watch-card">
                  <div className="watch-card__image">
                    <img src={watch.image} alt={watch.name} />
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

        {curatedFiltered.length > 0 && category !== 'watches' && (
          <section className="section">
            <div className="section__header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 32px' }}>
              <p className="eyebrow">Available at {info.name}</p>
              <h2>{selectedCategory ? selectedCategory.name : 'Featured Pieces'}</h2>
              <p className="small">A curated selection available for try-on at this location.</p>
            </div>

            <div className="cards grid-4">
              {curatedFiltered.map((product, idx) => (
                <div key={`${product.image}-${idx}`} className="card inventory-card">
                  <div className="card__media">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/kira/KJ00061P.MX-3-21.jpg';
                      }}
                    />
                  </div>
                  <div className="card__content">
                    <h3>{product.name}</h3>
                    {product.sku && (
                      <p className="small" style={{ color: 'var(--color-muted, #888)', marginBottom: '4px' }}>SKU: {product.sku}</p>
                    )}
                    {(product.ctw || product.gold || product.diamond) && (
                      <p className="small" style={{ marginBottom: '4px' }}>
                        {[product.ctw && `${product.ctw} CTW`, product.gold, product.diamond].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {product.price > 0 && (
                      <p className="watch-card__price" style={{ marginBottom: '8px' }}>
                        ${product.price.toLocaleString()}
                      </p>
                    )}
                    <div className="card__actions" style={{ marginTop: '8px' }}>
                      <Link
                        to="/book"
                        className="pill primary small"
                      >
                        Book to View
                      </Link>
                    </div>
                  </div>
                </div>
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
              src={info.mapEmbed}
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
                  <img src={cat.image} alt={cat.name} />
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
    </div>
  );
}
