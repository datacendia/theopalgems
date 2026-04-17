import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import LocationPage from './pages/LocationPage.jsx';
import CraftDiamondPage from './pages/CraftDiamondPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import LabVsNaturalPage from './pages/LabVsNaturalPage.jsx';
import FAQPage from './pages/FAQPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import TermsOfServicePage from './pages/TermsOfServicePage.jsx';
import Layout from './Layout.jsx';
import AdminLogin from './admin/AdminLogin.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminDashboard from './admin/AdminDashboard.jsx';
import AdminWatches from './admin/AdminWatches.jsx';
import AdminLocations from './admin/AdminLocations.jsx';
import AdminSections from './admin/AdminSections.jsx';
import AdminPhotos from './admin/AdminPhotos.jsx';
import AdminTestimonials from './admin/AdminTestimonials.jsx';
import AdminSettings from './admin/AdminSettings.jsx';
import AdminProducts from './admin/AdminProducts.jsx';
import './styles.css';
import './admin/admin.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
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
    </BrowserRouter>
  </React.StrictMode>
);
