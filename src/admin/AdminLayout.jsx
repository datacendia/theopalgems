import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { isAdminLoggedIn, adminLogout } from './api';
import { ErrorProvider } from './ErrorContext';
import './admin.css';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: 'grid' },
  { type: 'divider', label: 'Products' },
  { path: '/admin/watches', label: 'Watches', icon: 'watch' },
  { path: '/admin/products/necklaces', label: 'Necklaces', icon: 'necklace' },
  { path: '/admin/products/rings', label: 'Rings', icon: 'ring' },
  { path: '/admin/products/earrings', label: 'Earrings', icon: 'earring' },
  { path: '/admin/products/bracelets', label: 'Bracelets', icon: 'bracelet' },
  { type: 'divider', label: 'Content' },
  { path: '/admin/locations', label: 'Locations', icon: 'map-pin' },
  { path: '/admin/sections', label: 'Homepage', icon: 'layout' },
  { path: '/admin/photos', label: 'Photos', icon: 'image' },
  { path: '/admin/testimonials', label: 'Testimonials', icon: 'message' },
  { type: 'divider', label: 'Audience' },
  { path: '/admin/subscribers', label: 'Subscribers', icon: 'users' },
  { path: '/admin/newsletter', label: 'Newsletter Drafter', icon: 'message' },
  { type: 'divider', label: 'System' },
  { path: '/admin/settings', label: 'Settings', icon: 'settings' },
];

function NavIcon({ icon }) {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    watch: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    necklace: <><path d="M12 2C8 2 4 5 4 9c0 3 2 5 4 6l2 2h4l2-2c2-1 4-3 4-6 0-4-4-7-8-7z" fill="none"/><circle cx="12" cy="17" r="2"/><line x1="12" y1="19" x2="12" y2="22"/></>,
    ring: <><circle cx="12" cy="12" r="7" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/><path d="M12 5l-1-2h2l-1 2"/></>,
    earring: <><line x1="12" y1="2" x2="12" y2="6"/><circle cx="12" cy="10" r="4" fill="none"/><line x1="12" y1="14" x2="12" y2="18"/><circle cx="12" cy="20" r="2" fill="none"/></>,
    bracelet: <><ellipse cx="12" cy="12" rx="9" ry="5" fill="none"/><path d="M7 8.5c1-1.5 3-2.5 5-2.5s4 1 5 2.5" fill="none"/></>,
    'map-pin': <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    layout: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>,
    message: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[icon]}
    </svg>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin');
  };

  if (!isAdminLoggedIn()) return null;

  return (
    <ErrorProvider>
      <div className="admin">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__header">
            <Link to="/" className="admin-sidebar__logo">Opal Gems</Link>
            <span className="admin-sidebar__badge">Admin</span>
          </div>

          <nav className="admin-sidebar__nav">
            {navItems.map((item, i) => (
              item.type === 'divider' ? (
                <div key={`div-${i}`} className="admin-sidebar__divider">{item.label}</div>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`admin-sidebar__link ${location.pathname === item.path ? 'active' : ''}`}
                >
                  <NavIcon icon={item.icon} />
                  <span>{item.label}</span>
                </Link>
              )
            ))}
          </nav>

          <div className="admin-sidebar__footer">
            <Link to="/" className="admin-sidebar__link" target="_blank">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              <span>View Site</span>
            </Link>
            <button onClick={handleLogout} className="admin-sidebar__link admin-sidebar__logout">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <div className="admin-main">
          <Outlet />
        </div>
      </div>
    </ErrorProvider>
  );
}
