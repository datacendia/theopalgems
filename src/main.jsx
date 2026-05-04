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

// Lazy-loaded public pages (not on first paint path)
const CraftDiamondPage = lazy(() => import('./pages/CraftDiamondPage.jsx'));
const LabVsNaturalPage = lazy(() => import('./pages/LabVsNaturalPage.jsx'));
const FAQPage = lazy(() => import('./pages/FAQPage.jsx'));
const BookingPage = lazy(() => import('./pages/BookingPage.jsx'));
const SearchPage = lazy(() => import('./pages/SearchPage.jsx'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.jsx'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

// Lazy-loaded admin (separate bundle — public visitors never download these)
const AdminLogin = lazy(() => import('./admin/AdminLogin.jsx'));
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard.jsx'));
const AdminWatches = lazy(() => import('./admin/AdminWatches.jsx'));
const AdminLocations = lazy(() => import('./admin/AdminLocations.jsx'));
const AdminSections = lazy(() => import('./admin/AdminSections.jsx'));
const AdminPhotos = lazy(() => import('./admin/AdminPhotos.jsx'));
const AdminTestimonials = lazy(() => import('./admin/AdminTestimonials.jsx'));
const AdminSettings = lazy(() => import('./admin/AdminSettings.jsx'));
const AdminProducts = lazy(() => import('./admin/AdminProducts.jsx'));
const AdminSubscribers = lazy(() => import('./admin/AdminSubscribers.jsx'));

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
