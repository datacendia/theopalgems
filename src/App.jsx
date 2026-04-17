import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useScrollReveal from './hooks/useScrollReveal';
import { getLocations, getSections, getPhotos } from './admin/api';
import { Option2Gallery, Option3Gallery, Option4Gallery, Option5Gallery } from './components/GalleryOptions';

const locationMap = {};

const placeholderImage = '/assets/kira/KJ00061P.MX-3-21.jpg';

// Option Selector Component
function GallerySelector({ currentOption, onChange }) {
  return (
    <div style={{ 
      position: 'fixed', 
      top: '20px', 
      right: '20px', 
      background: 'white', 
      padding: '16px', 
      borderRadius: '8px', 
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
      zIndex: 1000,
      fontSize: '14px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Gallery Options:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label><input type="radio" name="gallery" checked={currentOption === 1} onChange={() => onChange(1)} /> Option 1: Rotating Gallery</label>
        <label><input type="radio" name="gallery" checked={currentOption === 2} onChange={() => onChange(2)} /> Option 2: Split Layout</label>
        <label><input type="radio" name="gallery" checked={currentOption === 3} onChange={() => onChange(3)} /> Option 3: Full-Width Carousel</label>
        <label><input type="radio" name="gallery" checked={currentOption === 4} onChange={() => onChange(4)} /> Option 4: Interactive Grid</label>
        <label><input type="radio" name="gallery" checked={currentOption === 5} onChange={() => onChange(5)} /> Option 5: Video Background</label>
      </div>
    </div>
  );
}

// Gallery Component
function Gallery() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const images = [
    '/assets/Stacked_diamond_eternity_bands.PNG',
    '/assets/watch_category.PNG',
    '/assets/category-bracelets.PNG',
    '/assets/category-necklaces.PNG',
    '/assets/category-earrings.PNG'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="crafted-gallery">
      <div className="gallery-container">
        {images.map((src, index) => (
          <div 
            key={index}
            className={`gallery-image ${index === currentIndex ? 'active' : ''}`}
          >
            <img src={src} alt={`Jewelry collection ${index + 1}`} />
          </div>
        ))}
        <div className="gallery-dots">
          {images.map((_, index) => (
            <span 
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

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

const CONTACT_RECIPIENTS = [
  'sales@opalgems.com',
  'alexandramattatia@gmail.com',
  'jean.dixon@ophotels.com',
  'robinjopalgrand@gmail.com'
];

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
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [introPhase, setIntroPhase] = useState('visible');
  const [locations, setLocations] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [heroImage, setHeroImage] = useState('/assets/boutique-mood-lifestyle.jpg');
  const [showcasePhotos, setShowcasePhotos] = useState([]);
  const [galleryOption, setGalleryOption] = useState(2);
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
        const img = heroRef.current.querySelector('.hero-banner__image img');
        if (img) {
          const scrollY = window.scrollY;
          const offset = scrollY * 0.35;
          img.style.transform = `scale(1.15) translateY(${offset}px)`;
        }
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
          <img 
                  src={heroImage} 
                  srcSet={`${heroImage}?w=800 800w, ${heroImage}?w=1600 1600w, ${heroImage} 2400w`}
                  sizes="100vw"
                  alt="Opal Gems boutique experience" 
                />
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

      {/* Category Grid */}
      <section className="categories-section" id="categories">
        <div className="categories-grid stagger-children">
          {[
            { name: 'Necklaces', image: '/assets/category-necklaces.PNG', startingAt: 1250 },
            { name: 'Earrings', image: '/assets/category-earrings.PNG', startingAt: 600 },
            { name: 'Bracelets', image: '/assets/category-bracelets.PNG', startingAt: 3250 },
            { name: 'Rings', image: '/assets/category-rings.PNG', startingAt: 1500 },
            { name: 'Watches', image: '/assets/watch_category.PNG', startingAt: 4500 }
          ].map((cat) => (
            <Link key={cat.name} to={`/category/${cat.name.toLowerCase()}`} className="category-card">
              <div className="category-card__image">
                <img src={cat.image} alt={cat.name} />
              </div>
              <h3>{cat.name}</h3>
              <p className="category-card__starting">Starting at ${cat.startingAt.toLocaleString()}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Crafted for Every Occasion - Multi-Image Gallery */}
      <section className="showcase-gallery reveal">
        <div className="crafted-section">
          <Option2Gallery />
          <div style={{ textAlign: 'center' }}>
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
            <div className="partnership-visual">
              <img src="/assets/Stacked_diamond_eternity_bands.PNG" alt="Diamond jewelry showcase" className="partnership-image" />
            </div>
          </div>
        </section>

        {/* Elegant Divider */}
        <div className="luxury-divider reveal">
          <div className="luxury-divider__line" />
          <div className="luxury-divider__diamond" />
          <div className="luxury-divider__line" />
        </div>

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
                  <img src={loc.image} alt={loc.name} />
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

      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
    </div>
  );
}
