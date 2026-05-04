import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import Layout from './Layout.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import LocationPage from './pages/LocationPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import './styles.css';

// Wraps a dynamic import so that if the browser tries to load a stale
// chunk that no longer exists on the new deploy, we do one hard reload
// to pick up the fresh index.html with current hashes.
// Guarded by sessionStorage so we never loop.
function lazyWithReload(factory) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      const key = '__chunk_reloaded__';
      const message = String(err?.message || '');
      const isChunkError =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Failed to load module script') ||
        message.includes('error loading dynamically imported module');
      if (isChunkError && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        // Return a placeholder — page is about to reload anyway
        return { default: () => null };
      }
      throw err;
    }
  });
}

// Clear the reload guard on successful navigation
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => sessionStorage.removeItem('__chunk_reloaded__'));
}

// Lazy-loaded public pages (not on first paint path)
const CraftDiamondPage = lazyWithReload(() => import('./pages/CraftDiamondPage.jsx'));
const LabVsNaturalPage = lazyWithReload(() => import('./pages/LabVsNaturalPage.jsx'));
const FAQPage = lazyWithReload(() => import('./pages/FAQPage.jsx'));
const BookingPage = lazyWithReload(() => import('./pages/BookingPage.jsx'));
const SearchPage = lazyWithReload(() => import('./pages/SearchPage.jsx'));
const PrivacyPolicyPage = lazyWithReload(() => import('./pages/PrivacyPolicyPage.jsx'));
const TermsOfServicePage = lazyWithReload(() => import('./pages/TermsOfServicePage.jsx'));
const NotFoundPage = lazyWithReload(() => import('./pages/NotFoundPage.jsx'));

// Lazy-loaded admin (separate bundle — public visitors never download these)
const AdminLogin = lazyWithReload(() => import('./admin/AdminLogin.jsx'));
const AdminLayout = lazyWithReload(() => import('./admin/AdminLayout.jsx'));
const AdminDashboard = lazyWithReload(() => import('./admin/AdminDashboard.jsx'));
const AdminWatches = lazyWithReload(() => import('./admin/AdminWatches.jsx'));
const AdminLocations = lazyWithReload(() => import('./admin/AdminLocations.jsx'));
const AdminSections = lazyWithReload(() => import('./admin/AdminSections.jsx'));
const AdminPhotos = lazyWithReload(() => import('./admin/AdminPhotos.jsx'));
const AdminTestimonials = lazyWithReload(() => import('./admin/AdminTestimonials.jsx'));
const AdminSettings = lazyWithReload(() => import('./admin/AdminSettings.jsx'));
const AdminProducts = lazyWithReload(() => import('./admin/AdminProducts.jsx'));
const AdminSubscribers = lazyWithReload(() => import('./admin/AdminSubscribers.jsx'));

function PageFallback() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="route-spinner" aria-label="Loading" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Admin Routes (no site header/footer) */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/watches" element={<AdminWatches />} />
            <Route path="/admin/products/:category" element={<AdminProducts />} />
            <Route path="/admin/locations" element={<AdminLocations />} />
            <Route path="/admin/sections" element={<AdminSections />} />
            <Route path="/admin/photos" element={<AdminPhotos />} />
            <Route path="/admin/testimonials" element={<AdminTestimonials />} />
            <Route path="/admin/subscribers" element={<AdminSubscribers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          {/* Public Site Routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<App />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/location/:locationId" element={<LocationPage />} />
            <Route path="/location/:locationId/:category" element={<LocationPage />} />
            <Route path="/craft" element={<CraftDiamondPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/lab-vs-natural" element={<LabVsNaturalPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/book" element={<BookingPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
