import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getProducts } from './api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ watches: 0, locations: 0, photos: 0, testimonials: 0, categories: 0, necklaces: 0, rings: 0, earrings: 0, bracelets: 0, subscribers: 0 });

  useEffect(() => {
    const load = async () => {
      const [base, necklaces, rings, earrings, bracelets] = await Promise.all([
        getDashboardStats(),
        getProducts('necklaces'),
        getProducts('rings'),
        getProducts('earrings'),
        getProducts('bracelets'),
      ]);
      setStats({ ...base, necklaces: necklaces.length, rings: rings.length, earrings: earrings.length, bracelets: bracelets.length });
    };
    load();
  }, []);

  const cards = [
    { label: 'Watches', count: stats.watches, path: '/admin/watches', color: '#c9a96e', icon: 'watch' },
    { label: 'Necklaces', count: stats.necklaces, path: '/admin/products/necklaces', color: '#b07d8a', icon: 'map' },
    { label: 'Rings', count: stats.rings, path: '/admin/products/rings', color: '#8a7db0', icon: 'map' },
    { label: 'Earrings', count: stats.earrings, path: '/admin/products/earrings', color: '#7da8b0', icon: 'map' },
    { label: 'Bracelets', count: stats.bracelets, path: '/admin/products/bracelets', color: '#b0a07d', icon: 'map' },
    { label: 'Locations', count: stats.locations, path: '/admin/locations', color: '#5b8a72', icon: 'map' },
    { label: 'Photos', count: stats.photos, path: '/admin/photos', color: '#7b6cb5', icon: 'image' },
    { label: 'Testimonials', count: stats.testimonials, path: '/admin/testimonials', color: '#c47a5a', icon: 'message' },
    { label: 'Subscribers', count: stats.subscribers, path: '/admin/subscribers', color: '#5a8ac4', icon: 'users' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Dashboard</h1>
        <p className="admin-page__subtitle">Welcome to the Opal Gems admin panel. Manage your content below.</p>
      </div>

      <div className="admin-stats">
        {cards.map((card) => (
          <Link key={card.label} to={card.path} className="admin-stat-card" style={{ '--stat-color': card.color }}>
            <div className="admin-stat-card__count">{card.count}</div>
            <div className="admin-stat-card__label">{card.label}</div>
            <div className="admin-stat-card__bar" />
          </Link>
        ))}
      </div>

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Quick Actions</h3>
          <div className="admin-quick-actions">
            <Link to="/admin/watches" className="admin-btn admin-btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Watch
            </Link>
            <Link to="/admin/photos" className="admin-btn admin-btn--outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Manage Photos
            </Link>
            <Link to="/admin/sections" className="admin-btn admin-btn--outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
              Edit Homepage
            </Link>
            <a href="https://calendly.com/event_types/user/me" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              View Bookings (Calendly)
            </a>
            <a href="/" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View Live Site
            </a>
          </div>
        </div>

        <div className="admin-card">
          <h3>Getting Started</h3>
          <div className="admin-help-list">
            <div className="admin-help-item">
              <span className="admin-help-num">1</span>
              <div>
                <strong>Change your password</strong>
                <p>Go to Settings and set a secure admin password.</p>
              </div>
            </div>
            <div className="admin-help-item">
              <span className="admin-help-num">2</span>
              <div>
                <strong>Manage your watches</strong>
                <p>Add, edit, or remove luxury timepieces from your collection.</p>
              </div>
            </div>
            <div className="admin-help-item">
              <span className="admin-help-num">3</span>
              <div>
                <strong>Update your homepage</strong>
                <p>Edit the hero banner, testimonials, and showcase gallery.</p>
              </div>
            </div>
            <div className="admin-help-item">
              <span className="admin-help-num">4</span>
              <div>
                <strong>Manage locations</strong>
                <p>Update boutique info, addresses, hours, and phone numbers.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
