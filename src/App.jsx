import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useScrollReveal from './hooks/useScrollReveal';
import { getLocations, getSections, getPhotos } from './admin/api';
import SEO from './components/SEO';

const locationMap = {};

const placeholderImage = '/assets/kira/KJ00061P.MX-3-21.jpg';

function normalizeLocationKey(locationName) {
  const name = (locationName || '').toLowerCase();
  if (name.includes('opal grand')) return 'opal-grand';
  if (name.includes('opal sands')) return 'opal-sands';
  if (name.includes('opal sol')) return 'opal-sol';
  if (name.includes('jupiter')) return 'jupiter-beach';
  return 'opal-grand';
}

function driveToDirect(url) {
  if (!url || typeof url !== 'string') return '';
  const match = url.match(/\/d\/([^/]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
}

function extractDriveId(url) {
  if (!url || typeof url !== 'string') return '';
  const match = url.match(/\/d\/([^/]+)/);
  if (match && match[1]) return match[1];
  const idParam = url.match(/[?&]id=([^&]+)/);
  if (idParam && idParam[1]) return idParam[1];
  return '';
}

function formatPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Availability({ availability }) {
  if (!availability || !availability.length) return null;
  return (
    <div className="availability">
      {availability.map((a, idx) => {
        const loc = locationMap[a.locationKey];
        const label = loc ? `${loc.name} – ${loc.city}` : 'Boutique';
        const status = a.qty > 0 ? 'Available now' : 'Pre-order / Custom';
        return (
          <div key={idx}>
            <strong>✔ {label}</strong>
            <br />
            <span className="small">{status}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProductCard({ product, onTryOn, onViewLocations }) {
  const totalQty = product.availability?.reduce((sum, a) => sum + a.qty, 0) || 0;
  return (
    <article className="card inventory-card product-card">
      <div className="card__media">
        <img
          src={product.image}
          srcSet={`${product.image}?w=400 400w, ${product.image}?w=800 800w, ${product.image} 1200w`}
          sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = placeholderImage;
          }}
        />
      </div>
      <div className="tag">{product.category}</div>
      <h3>{product.name}</h3>
      <p className="small">
        {product.gold} • {product.diamond} • {product.ctw} CTW
      </p>
      <div className="meta">
        <div>
          Price
          <br />
          <strong>{formatPrice(product.price)}</strong>
        </div>
        <div>
          Status
          <br />
          <strong>{totalQty > 0 ? 'In boutique' : 'Pre-order'}</strong>
        </div>
      </div>
      <Availability availability={product.availability} />
      <div className="cta">
        <button className="pill primary" onClick={() => onTryOn(product)}>
          Try it on in person
        </button>
        <button className="pill ghost" onClick={onViewLocations}>
          View boutique
        </button>
      </div>
    </article>
  );
}

function Carousel({ products, onTryOn }) {
  const trackRef = React.useRef(null);
  
  // Filter to unique images only
  const seenImages = new Set();
  const uniqueProducts = products.filter((p) => {
    if (!p.image || p.image === placeholderImage || seenImages.has(p.image)) {
      return false;
    }
    seenImages.add(p.image);
    return true;
  });
  const showcase = uniqueProducts.slice(0, 12);
  
  const scroll = (direction) => {
    if (trackRef.current) {
      const scrollAmount = 344;
      trackRef.current.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  };

  if (!showcase.length) {
    return <p className="small">Inventory not available right now.</p>;
  }

  return (
    <div className="carousel">
      <button className="carousel__nav carousel__nav--prev" onClick={() => scroll(-1)} aria-label="Previous">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div className="carousel__track" ref={trackRef}>
        {showcase.map((product) => (
          <article key={product.id} className="carousel__item card">
            <div className="card__media">
              <img
                src={product.image}
                srcSet={`${product.image}?w=400 400w, ${product.image}?w=800 800w, ${product.image} 1200w`}
                sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
                alt={product.name}
                loading="lazy"
                onError={(e) => { e.currentTarget.src = placeholderImage; }}
              />
            </div>
            <h3>{product.name}</h3>
            <p className="small">{product.category}</p>
            <p className="price">{formatPrice(product.price)}</p>
          </article>
        ))}
      </div>
      <button className="carousel__nav carousel__nav--next" onClick={() => scroll(1)} aria-label="Next">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

function Featured({ products, onTryOn }) {
  const showcase = products.slice(0, 3);
  if (!showcase.length) {
    return <p className="small">Inventory not available right now.</p>;
  }
  return (
    <div className="cards grid-3" id="featured-grid">
      {showcase.map((product) => (
        <article key={product.id} className="card inventory-card">
          <div className="card__media">
            <img
              src={product.image}
              srcSet={`${product.image}?w=400 400w, ${product.image}?w=800 800w, ${product.image} 1200w`}
              sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
              alt={product.name}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = placeholderImage;
              }}
            />
          </div>
          <div className="tag">{product.category}</div>
          <h3>{product.name}</h3>
          <p className="small">
            {product.gold} • {product.diamond} • {product.ctw} CTW
          </p>
          <p>
            <strong>{formatPrice(product.price)}</strong>
          </p>
          <Availability availability={product.availability} />
          <div className="cta">
            <button className="pill primary" onClick={() => onTryOn(product)}>
              Try it on in person
            </button>
            <a className="pill ghost" href="#availability">
              See all availability
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function Modal({ product, onClose }) {
  if (!product) return null;
  return (
    <div className="modal" aria-hidden={!product} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__dialog">
        <button className="close" onClick={onClose} aria-label="Close dialog">
          ×
        </button>
        <p className="eyebrow">Try it on in person</p>
        <h3>{product.name}</h3>
        <p className="small">We’ll meet you in-boutique to style this piece. No online checkout.</p>
        <ul>
          {product.availability?.map((a, idx) => {
            const loc = locationMap[a.locationKey];
            const status = a.qty > 0 ? 'Available now' : 'Pre-order / custom';
            return (
              <li key={idx}>
                <strong>{loc?.name || 'Boutique'}</strong> – {loc?.city || ''}{' '}
                <span className="small">{status}</span>
              </li>
            );
          })}
        </ul>
        <p className="small">Book a private appointment and we'll have your selections ready.</p>
        <div className="cta">
          <Link to="/book" className="pill primary" onClick={onClose}>
            Book Appointment
          </Link>
          <button className="pill ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
const CONTACT_RECIPIENTS = [
  'sales@opalgems.com',
  'alexandramattatia@gmail.com',
  'jean.dixon@ophotels.com',
  'robinjopalgrand@gmail.com'
];

// eslint-disable-next-line no-unused-vars
function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const body = new FormData();
      body.append('name', formData.name);
      body.append('email', formData.email);
      body.append('phone', formData.phone || 'Not provided');
      body.append('message', formData.message);
      body.append('_subject', `New Inquiry from ${formData.name} — Opal Gems`);
      body.append('_cc', CONTACT_RECIPIENTS.slice(1).join(','));
      body.append('_captcha', 'false');
      body.append('_template', 'table');
      const res = await fetch(`https://formsubmit.co/${CONTACT_RECIPIENTS[0]}`, {
        method: 'POST',
        body,
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError('Failed to send. Please email us directly.');
      }
    } catch {
      setError('Failed to send. Please email us directly.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setError('');
    setFormData({ name: '', email: '', phone: '', message: '' });
    onClose();
  };

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal__dialog contact-modal">
        <button className="close" onClick={handleClose} aria-label="Close dialog">×</button>
        {!submitted ? (
          <>
            <p className="eyebrow">Message Concierge</p>
            <h3>How can we help?</h3>
            <p className="small">Our concierge team will respond within 24 hours.</p>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="contact-form__field">
                <label htmlFor="contact-name">Your Name</label>
                <input
                  type="text"
                  id="contact-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="contact-form__row">
                <div className="contact-form__field">
                  <label htmlFor="contact-email">Email</label>
                  <input
                    type="email"
                    id="contact-email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="contact-form__field">
                  <label htmlFor="contact-phone">Phone (optional)</label>
                  <input
                    type="tel"
                    id="contact-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="contact-form__field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  rows="4"
                  required
                  placeholder="Tell us about your visit, the piece you're interested in, or any questions..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
              {error && <p className="small" style={{ color: 'red', margin: '0 0 12px' }}>{error}</p>}
              <div className="contact-form__actions">
                <button type="submit" className="pill primary" disabled={sending}>
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
                <a href={`mailto:${CONTACT_RECIPIENTS[0]}`} className="pill ghost">Email Directly</a>
              </div>
            </form>
          </>
        ) : (
          <div className="contact-success">
            <div className="contact-success__icon">✓</div>
            <h3>Message Sent!</h3>
            <p>Thank you, {formData.name}. Our team will reach out to you at {formData.email} within 24 hours.</p>
            <button className="pill primary" onClick={handleClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalProduct, setModalProduct] = useState(null);
  const [imageManifest, setImageManifest] = useState({});
  const [visibleCount, setVisibleCount] = useState(12);
  const [sortBy, setSortBy] = useState('name');
  const [introPhase, setIntroPhase] = useState('visible');
  const [locations, setLocations] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [heroImage, setHeroImage] = useState('/assets/opal-lobby.jpg');
  const [heroImages, setHeroImages] = useState([
    '/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33.jpeg',
    '/assets/homepage-inspiration/stacked2.jpeg',
    '/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33 (1).jpeg'
  ]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [showcasePhotos, setShowcasePhotos] = useState([]);
  const heroRef = useRef(null);

  useScrollReveal();

  // Load live data from Supabase
  useEffect(() => {
    getPhotos().then(photos => {
      const showcase = photos.filter(p => p.section === 'showcase');
      if (showcase.length > 0) setShowcasePhotos(showcase);
    });
    getLocations().then(locs => {
      const mapped = locs.map(loc => ({
        ...loc,
        status: loc.status || 'active',
        image: loc.hotelImage || loc.image || '',
        mapEmbed: loc.mapEmbed || '',
      }));
      setLocations(mapped);
      mapped.forEach(loc => { locationMap[loc.key] = loc; });
    });
    getSections().then(sections => {
      setTestimonials((sections.testimonials || []).map(t => ({
        quote: t.text || t.quote || '',
        author: t.name || t.author || '',
        location: t.location || '',
      })));
      if (sections.hero?.image) setHeroImage(sections.hero.image);
    });
  }, []);

  // Intro screen: show 3.6s, fade 0.8s, then remove
  useEffect(() => {
    const fadeTimer = setTimeout(() => setIntroPhase('fading'), 3600);
    const removeTimer = setTimeout(() => setIntroPhase('done'), 4400);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  // Parallax effect on hero
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const imgs = heroRef.current.querySelectorAll('.hero-banner__image img');
        const scrollY = window.scrollY;
        const offset = scrollY * 0.35;
        imgs.forEach((img, idx) => {
          const scale = idx === 1 ? 0.85 : 1.15;
          img.style.transform = `scale(${scale}) translateY(${offset}px)`;
        });
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  useEffect(() => {
    Promise.all([
      fetch('/assets/manifest.json').then((r) => r.json()).catch(() => ({})),
      fetch('/inventory.json').then((r) => r.json())
    ])
      .then(([manifest, data]) => {
        setImageManifest(manifest || {});
        const mapped = (data || []).map((item, idx) => {
          const price = Number(item['NEW PRICE'] || item['OLD PRICE'] || 0);
          const qty = Number(item['QTY'] || 0);
          const locKey = normalizeLocationKey(item['LOCATION']);
          const idRaw =
            (item['BARCODE'] && String(item['BARCODE']).trim()) ||
            (item['SKU'] && String(item['SKU']).trim());
          const namePart = (item['NAME'] || 'item').trim() || 'item';
          const ctwPart = (item['CTW'] || item['CT CTR'] || '').toString().trim();
          const id = `${idRaw || 'id'}-${namePart}-${ctwPart}-${idx}`;
          const rawImage = item['PRODUCT IMAGE'] || item['PRODUCT IMAGE '] || '';
          const isLocalPath = rawImage && rawImage.startsWith('/assets/');
          const driveId = extractDriveId(rawImage);
          const localImage = driveId && manifest ? manifest[driveId] : '';
          let finalImage = placeholderImage;
          if (isLocalPath) {
            finalImage = rawImage; // Already has the correct format
          } else if (localImage) {
            finalImage = localImage;
          } else if (rawImage) {
            finalImage = driveToDirect(rawImage);
          }
          return {
            id,
            name: item['NAME'] || 'Jewelry Piece',
            category: item['PRODUCT'] || 'Jewelry',
            ctw: item['CTW'] || item['CT CTR'] || '',
            price: Number.isFinite(price) ? price : 0,
            gold: item['GOLD'] || '',
            diamond: item['DIAMOND'] || '',
            cert: item['CERT'] || '',
            availability: [{ locationKey: locKey, qty: Number.isFinite(qty) ? qty : 0 }],
            image: finalImage
          };
        });
        setProducts(mapped);
      })
      .catch((err) => {
        console.error('Failed to load inventory.json', err);
        setProducts([]);
      });
  }, []);

  const categories = useMemo(() => {
    const valid = new Set(['Necklace', 'Earring', 'Ring', 'Bracelet', 'Pendant', 'Bangle', 'Chain', 'Earrings', 'Hoop Earrings']);
    const set = new Set();
    products.forEach((p) => {
      const cat = (p.category || '').trim();
      if (valid.has(cat)) set.add(cat);
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredRaw = useMemo(() => {
    return products.filter((p) => {
      const matchesTerm = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesLoc =
        locationFilter === 'all' || p.availability?.some((a) => a.locationKey === locationFilter);
      return matchesTerm && matchesCat && matchesLoc;
    });
  }, [products, searchTerm, categoryFilter, locationFilter]);

  const filtered = useMemo(() => {
    return filteredRaw.filter((p) => {
      const priceValid = Number(p.price) > 0;
      const nameValid = (p.name || '').toLowerCase() !== 'jewelry piece' && (p.name || '').trim() !== '';
      return priceValid && nameValid;
    });
  }, [filteredRaw]);

  const sortedProducts = useMemo(() => {
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name-desc':
        sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'price-low':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        break;
    }
    return sorted;
  }, [filtered, sortBy]);

  useEffect(() => {
    setVisibleCount(Math.min(12, sortedProducts.length || 12));
  }, [sortedProducts.length, searchTerm, categoryFilter, locationFilter]);

  return (
    <div className="page">
      <SEO
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Opal Gems',
          url: 'https://theopalgems.com',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://theopalgems.com/search?q={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      {/* Luxury Intro Screen */}
      {introPhase !== 'done' && (
        <div className={`intro-screen${introPhase === 'fading' ? ' fade-out' : ''}`}>
          <div className="intro-screen__logo">Opal Gems</div>
          <div className="intro-screen__line">
            <span className="intro-screen__shine" />
            <span className="intro-screen__twinkle" />
          </div>
          <div className="intro-screen__tagline">Elevated Diamonds, In Person</div>
        </div>
      )}

      {/* Hero Banner with Parallax */}
      <section className="hero-banner hero-banner--parallax" ref={heroRef}>
        <div className="hero-banner__image">
          <div className="hero-banner__images">
            {heroImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt="Opal Gems boutique experience"
                className="hero-banner__multi-image"
                loading="eager"
                fetchpriority={idx === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            ))}
          </div>
        </div>
        <div className="hero-banner__overlay">
          <div className="hero-banner__content">
            <p className="hero-banner__eyebrow">Step Into The Opal Experience</p>
            <h1 className="hero-banner__title">Welcome to the World of Opal Gems</h1>
            <p className="hero-banner__tagline">Elevated Diamonds, In Person</p>
            <div className="hero-banner__actions">
              <a className="pill primary" href="#categories">Shop Now</a>
              <a className="pill ghost" href="#locations">Visit a Boutique</a>
            </div>
          </div>
        </div>
      </section>

      {/* Image Grid Section */}
      <section className="image-grid-section" id="categories">
        <div className="image-grid">
          {/* Top row */}
          <div className="image-grid__top">
            <img src="/assets/homepage-inspiration/lose.jpeg" alt="Diamond jewelry" className="image-grid__item image-grid__item--large" loading="lazy" decoding="async" />
            <img src="/assets/homepage-inspiration/stacked.jpeg" alt="Stacked jewelry" className="image-grid__item image-grid__item--large" loading="lazy" decoding="async" />
          </div>
          {/* Bottom row - Category Selection */}
          <div className="image-grid__bottom">
            <Link to="/category/necklaces" className="image-grid__item-wrapper">
              <img src="/assets/homepage-inspiration/necklace.jpeg" alt="Necklaces" className="image-grid__item" loading="lazy" decoding="async" />
              <span className="image-grid__label">Necklaces</span>
            </Link>
            <Link to="/category/earrings" className="image-grid__item-wrapper">
              <img src="/assets/homepage-inspiration/earings.jpeg" alt="Earrings" className="image-grid__item" loading="lazy" decoding="async" />
              <span className="image-grid__label">Earrings</span>
            </Link>
            <Link to="/category/bracelets" className="image-grid__item-wrapper">
              <img src="/assets/homepage-inspiration/braclet.jpeg" alt="Bracelets" className="image-grid__item" loading="lazy" decoding="async" />
              <span className="image-grid__label">Bracelets</span>
            </Link>
            <Link to="/category/rings" className="image-grid__item-wrapper">
              <img src="/assets/homepage-inspiration/ring.jpeg" alt="Rings" className="image-grid__item" loading="lazy" decoding="async" />
              <span className="image-grid__label">Rings</span>
            </Link>
            <Link to="/category/watches" className="image-grid__item-wrapper">
              <img src="/assets/homepage-inspiration/watch.jpeg" alt="Watches" className="image-grid__item" loading="lazy" decoding="async" />
              <span className="image-grid__label">Watches</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Crafted for Every Occasion - Multi-Image Gallery */}
      <section className="reveal">
        <div className="crafted-section crafted-section--simple">
          <div className="crafted-image-wrapper">
            <img src="/assets/crafted-left.jpeg" alt="Jewelry showcase" className="crafted-image" loading="lazy" decoding="async" />
            <img src="/assets/crafted-right.jpeg" alt="Diamond pieces" className="crafted-image" loading="lazy" decoding="async" />
          </div>
          <div className="crafted-content-wrapper">
            <div className="crafted-content">
              <h2 className="crafted-title">
                CRAFTED FOR EVERY OCCASION
              </h2>
              <p className="crafted-subtitle">
                From timeless classics to modern statements
              </p>
              <Link to="/category/rings" className="pill primary crafted-cta">
                Shop All Collections
              </Link>
            </div>
          </div>
        </div>
      </section>

      
      <main className="container">
        {/* Partnership */}
        <section className="section reveal" id="partnership">
          <div className="section__header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 48px' }}>
            <p className="eyebrow">Our Partnership</p>
            <h2 className="shimmer-text">Perfect Vacation Partners</h2>
            <p>
              Opal Gems partners with Opal hotels to elevate and complete the perfect vacation. Fine jewelry, curated collections, and personalized service — all steps from the sand. Because the best souvenirs are the ones that sparkle.
            </p>
          </div>
        </section>

        {/* Full-Width Carousel */}
        <section className="full-width-carousel">
          <div className="carousel-track">
            <img src="/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33 (1).jpeg" alt="Jewelry showcase" loading="lazy" decoding="async" />
            <img src="/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33 (3).jpeg" alt="Diamond pieces" loading="lazy" decoding="async" />
            <img src="/assets/homepage-inspiration/WhatsApp Image 2026-04-17 at 11.01.33.jpeg" alt="Jewelry collection" loading="lazy" decoding="async" />
            <img src="/assets/homepage-inspiration/stacked2.jpeg" alt="Elegant jewelry" loading="lazy" decoding="async" />
            <img src="/assets/homepage-inspiration/lose.jpeg" alt="Diamond rings" loading="lazy" decoding="async" />
          </div>
        </section>

        {/* Testimonials */}
        <section className="section section--panel reveal" id="testimonials">
          <div className="section__header" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 48px' }}>
            <p className="eyebrow">What Our Guests Say</p>
            <h2>Unforgettable experiences.</h2>
          </div>
          <div className="testimonials-grid stagger-children">
            {testimonials.map((t, idx) => (
              <div key={idx} className="testimonial-card">
                <p className="testimonial-quote">"{t.quote}"</p>
                <p className="testimonial-author">{t.author}</p>
                <p className="testimonial-location">{t.location}</p>
              </div>
            ))}
          </div>

          {/* Reviews & Shop Integration */}
          <div className="reviews-section">
            <div className="reviews-header">
              <div className="reviews-rating">
                <span className="reviews-stars">★★★★★</span>
                <span className="reviews-score">4.9</span>
              </div>
              <span className="reviews-count">Based on 127 reviews</span>
            </div>
          </div>
        </section>

        <section className="section reveal" id="locations">
          <div className="section__header" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 48px' }}>
            <p className="eyebrow">Locations</p>
            <h2>Opal hotel boutiques.</h2>
            <p className="small">Visit us in-resort for private styling and secure checkout.</p>
          </div>
          <div className="locations-grid" id="locations-grid">
            {locations.map((loc) => (
              <article key={loc.key} className="location-card-v2">
                <div className="location-card-v2__image">
                  <img src={loc.image} alt={loc.name} loading="lazy" decoding="async" />
                  <div className="location-card-v2__tag">{loc.status === 'active' ? 'Open' : 'Coming soon'}</div>
                </div>
                <div className="location-card-v2__body">
                  <h3>{loc.name}</h3>
                  <p className="location-card-v2__city">{loc.city}</p>
                  <p className="location-card-v2__address">{loc.address}</p>
                  <p className="location-card-v2__desc">{loc.description}</p>
                  <div className="location-card-v2__actions">
                    <a href={`/location/${loc.key}`} className="pill primary">View Boutique</a>
                    <a
                      href={loc.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill ghost directions-link"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Get Directions
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
