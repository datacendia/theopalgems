import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { getLocations } from './admin/api';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    getLocations().then(locs => setLocations(locs.map(loc => ({
      key: loc.key, name: loc.name, city: loc.city, address: loc.address, phone: loc.phone,
    }))));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleHashLink = (e, sectionId) => {
    e.preventDefault();
    navigate('/');
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <>
      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      
      <header className="topbar" role="banner">
        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <nav className={`nav nav--left ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {['Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Watches'].map((cat) => (
            <div key={cat} className="nav-dropdown">
              <Link to={`/category/${cat.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)}>{cat}</Link>
              <div className="nav-dropdown__menu">
                {locations.map((loc) => (
                  <Link key={loc.key} to={`/location/${loc.key}/${cat.toLowerCase()}`} className="nav-dropdown__item" onClick={() => setMobileMenuOpen(false)}>
                    {loc.name}
                    <span>{loc.city}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {/* Mobile-only links */}
          <div className="mobile-nav-extras">
            <a href="/#locations" onClick={(e) => { setMobileMenuOpen(false); handleHashLink(e, 'locations'); }}>Locations</a>
            <Link to="/book" onClick={() => setMobileMenuOpen(false)}>Book Appointment</Link>
          </div>
        </nav>

        <Link to="/" className="logo">Opal Gems</Link>

        <div className="topbar__right">
          {/* Search */}
          <button className="search-btn" onClick={() => setSearchOpen(!searchOpen)} aria-label="Search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <a href="/#locations" className="nav-link desktop-only" onClick={(e) => handleHashLink(e, 'locations')}>Locations</a>
          <Link to="/book" className="pill primary desktop-only">Book Appointment</Link>
        </div>

        {/* Search Overlay */}
        {searchOpen && (
          <div className="search-overlay">
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Search jewelry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button type="submit">Search</button>
              <button type="button" className="search-close" onClick={() => setSearchOpen(false)}>×</button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      <main id="main-content">
        <Outlet />
      </main>

      <footer className="footer" role="contentinfo">
        <div className="footer__main">
          {/* Brand Column */}
          <div className="footer__column footer__brand">
            <Link to="/" className="logo">Opal Gems</Link>
            <p className="footer__tagline">Elevated diamonds, in person.</p>
            <div className="footer__social">
              <a href="https://www.instagram.com/theopalgems" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{display: 'block'}}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Locations Column */}
          <div className="footer__column">
            <h4>Our Boutiques</h4>
            {locations.map((loc) => (
              <div key={loc.key} className="footer__location">
                <strong>{loc.name}</strong>
                <span>{loc.address}</span>
                <a href={`tel:${loc.phone.replace(/[^0-9]/g, '')}`}>{loc.phone}</a>
              </div>
            ))}
          </div>

          {/* Hours Column */}
          <div className="footer__column">
            <h4>Hours</h4>
            <div className="footer__hours">
              <p><strong>Monday - Saturday</strong><br/>10:00 AM - 7:00 PM</p>
              <p><strong>Sunday</strong><br/>11:00 AM - 5:00 PM</p>
              <p className="small">Hours may vary by location and season.</p>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="footer__column">
            <h4>Quick Links</h4>
            <nav className="footer__nav">
              <Link to="/about" onClick={() => window.scrollTo(0, 0)}>About Us</Link>
              <Link to="/craft" onClick={() => window.scrollTo(0, 0)}>Craft Your Diamond</Link>
              <a href="/#locations" onClick={(e) => handleHashLink(e, 'locations')}>Locations</a>
              <Link to="/lab-vs-natural" onClick={() => window.scrollTo(0, 0)}>Lab vs. Natural</Link>
              <Link to="/faq" onClick={() => window.scrollTo(0, 0)}>FAQ</Link>
            </nav>
          </div>

          {/* Contact Column */}
          <div className="footer__column footer__newsletter">
            <h4>Contact Us</h4>
            <p>Our concierge team is available daily.</p>
            <a href="mailto:sales@opalgems.com" className="pill primary" style={{ marginTop: '12px', display: 'inline-block' }}>Email Us</a>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="small">© {new Date().getFullYear()} Opal Gems. All rights reserved.</div>
          <div className="footer__legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
