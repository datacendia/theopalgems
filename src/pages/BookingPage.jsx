import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const CALENDLY_URL = 'https://calendly.com/theopalgems-sales/30min';

export default function BookingPage() {
  useEffect(() => {
    // Load Calendly widget script if not already loaded
    if (!document.getElementById('calendly-script')) {
      const script = document.createElement('script');
      script.id = 'calendly-script';
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.head.appendChild(script);
    }
    // Load Calendly CSS if not already loaded
    if (!document.getElementById('calendly-css')) {
      const link = document.createElement('link');
      link.id = 'calendly-css';
      link.rel = 'stylesheet';
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(link);
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page booking-page">
      <SEO
        title="Book Your Visit"
        description="Book a private styling appointment at any Opal Gems boutique in Delray Beach, Clearwater Beach, or Jupiter, Florida. 30–60 minute one-on-one concierge session with complimentary champagne."
        path="/book"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Book Appointment', path: '/book' },
        ]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Private Jewelry Styling Appointment',
          provider: { '@type': 'JewelryStore', name: 'Opal Gems' },
          areaServed: { '@type': 'State', name: 'Florida' },
          serviceType: 'In-boutique jewelry consultation',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', description: 'Complimentary appointment' },
        }}
      />
      <div className="page-hero page-hero--short">
        <div className="page-hero__content">
          <p className="eyebrow">Private Appointment</p>
          <h1>Book Your Visit</h1>
          <p className="lead">Choose a time that works for you. We'll have your selections ready.</p>
        </div>
      </div>

      <main className="container" style={{ gap: '64px' }}>
        <section className="section">
          <div className="booking-page__layout">
            {/* Left: info */}
            <div className="booking-page__info">
              <p className="eyebrow">What to Expect</p>
              <h2>A private, pressure-free experience</h2>
              <p>Your appointment is a one-on-one session with our jewelry concierge. We'll prepare a curated tray of pieces based on your preferences.</p>
              <ul className="booking-page__benefits">
                <li>
                  <span className="booking-page__benefit-icon">◈</span>
                  <span>30–60 minute private viewing</span>
                </li>
                <li>
                  <span className="booking-page__benefit-icon">◈</span>
                  <span>Complimentary champagne &amp; styling advice</span>
                </li>
                <li>
                  <span className="booking-page__benefit-icon">◈</span>
                  <span>No pressure — browse at your own pace</span>
                </li>
                <li>
                  <span className="booking-page__benefit-icon">◈</span>
                  <span>Available at all 3 Florida boutiques</span>
                </li>
              </ul>
              <p className="small" style={{ color: 'var(--muted)', marginTop: '24px' }}>
                Can't find a time? <a href="https://wa.me/+15612519560" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Message us on WhatsApp</a> or call your nearest boutique.
              </p>
            </div>

            {/* Right: Calendly embed */}
            <div className="booking-page__calendar">
              <div
                className="calendly-inline-widget"
                data-url={CALENDLY_URL}
                style={{ minWidth: '320px', height: '700px' }}
              />
            </div>
          </div>
        </section>

        <section className="section section--panel" style={{ textAlign: 'center' }}>
          <p className="eyebrow">Prefer to browse first?</p>
          <h2>Explore our collections</h2>
          <p className="small">View all available pieces before your appointment.</p>
          <div className="actions" style={{ justifyContent: 'center', marginTop: '24px' }}>
            {['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Watches'].map((cat) => (
              <Link key={cat} to={`/category/${cat.toLowerCase()}`} className="pill ghost">{cat}</Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
