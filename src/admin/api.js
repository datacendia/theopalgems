/**
 * Admin API Service
 *
 * All admin DATA reads/writes go through /api/admin-data, which verifies
 * the admin JWT and uses the Supabase service key on the server side.
 * Tables are locked down with RLS so the public anon key cannot bypass.
 *
 * Storage uploads (photos) still use the supabase client directly because
 * Storage has its own bucket-level policies; ensure the GALLERY bucket is
 * configured to allow only authenticated uploads or rotate to a server-side
 * upload endpoint as a follow-up.
 */

import { supabase } from '../lib/supabaseClient.js';
import defaultWatchesData from '../data/watches.js';
import { defaultSections, mergeSections } from '../lib/defaultSiteContent.js';

// ── Admin RPC helper ──
// Server-authenticated database calls. The admin JWT is sent as a Bearer
// token; the server verifies it before performing the requested action.
async function adminFetch(body) {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('Not authenticated. Please log in again.');
  const res = await fetch('/api/admin-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  let parsed = null;
  try { parsed = await res.json(); } catch { /* non-JSON response */ }
  if (res.status === 401) {
    // Session expired or invalid — clear and force re-login
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token_exp');
    throw new Error('Your session has expired. Please log in again.');
  }
  if (!res.ok) {
    throw new Error(parsed?.error || `Request failed (${res.status})`);
  }
  return parsed || {};
}

// Production must set ADMIN_PASSWORD on Netlify; the server endpoint validates against it.
// For local dev, set localStorage.admin_password in DevTools to enable the dev-only
// client fallback (gated by import.meta.env.DEV; tree-shaken from prod builds).
const DEFAULT_PASSWORD = '';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Retry wrapper function
async function withRetry(operation, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i === retries - 1) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
    }
  }
}

// Offline fallback storage
const offlineStorage = {
  get: (key) => {
    try {
      return JSON.parse(localStorage.getItem(`offline_${key}`) || 'null');
    } catch {
      return null;
    }
  },
  set: (key, data) => {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to offline storage:', error);
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(`offline_${key}`);
    } catch (error) {
      console.warn('Failed to remove from offline storage:', error);
    }
  }
};

// Check if we're online
function isOnline() {
  return navigator.onLine;
}

// ── Auth ──
// Server-side verification via /api/admin-login (requires ADMIN_PASSWORD + ADMIN_JWT_SECRET on Netlify).
// In dev mode (vite dev server) we allow a local-password fallback so you can work without
// running Netlify Functions locally. In production builds the fallback is disabled — login
// requires a successful response from /api/admin-login.

export async function adminLogin(password) {
  // Try server-side first
  try {
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const { token, expiresAt } = await res.json();
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_login_time', Date.now().toString());
      if (expiresAt) localStorage.setItem('admin_token_exp', String(expiresAt));
      return true;
    }
    if (res.status === 401) return false;
    // Other status (server misconfig, 500, etc.): fall through only in dev mode
  } catch (err) {
    console.warn('admin-login server call failed:', err);
  }

  // Local dev fallback — only available when running `npm run dev` (Vite dev server).
  // Disabled entirely in production builds. Requires a non-empty admin_password to be
  // set in localStorage; never matches an empty/missing password.
  const devPassword = getAdminPassword();
  if (import.meta.env.DEV && devPassword && password === devPassword) {
    const fallback = 'local:' + btoa(Date.now() + ':' + password);
    localStorage.setItem('admin_token', fallback);
    localStorage.setItem('admin_login_time', Date.now().toString());
    localStorage.setItem('admin_token_exp', String(Date.now() + 24 * 60 * 60 * 1000));
    return true;
  }
  return false;
}

export function adminLogout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_login_time');
  localStorage.removeItem('admin_token_exp');
}

export function isAdminLoggedIn() {
  const token = localStorage.getItem('admin_token');
  const exp = parseInt(localStorage.getItem('admin_token_exp') || '0', 10);
  if (!token) return false;
  if (exp && Date.now() > exp) {
    adminLogout();
    return false;
  }
  // Legacy fallback: if no exp recorded but old login_time exists, honour 24h window
  if (!exp) {
    const loginTime = parseInt(localStorage.getItem('admin_login_time') || '0', 10);
    if (!loginTime || Date.now() - loginTime > 24 * 60 * 60 * 1000) {
      adminLogout();
      return false;
    }
  }
  return true;
}

export function getAdminToken() {
  return localStorage.getItem('admin_token');
}

export function getAdminPassword() {
  return localStorage.getItem('admin_password') || DEFAULT_PASSWORD;
}

export function setAdminPassword(password) {
  localStorage.setItem('admin_password', password);
}

// ── Watches ──
export async function getWatches() {
  return withRetry(async () => {
    try {
      if (!isOnline()) {
        // Fallback to offline storage
        const offlineData = offlineStorage.get('watches');
        if (offlineData) return offlineData;
        
        // Final fallback to default data
        return defaultWatchesData;
      }

      const { data } = await adminFetch({ table: 'watches', action: 'select', orderBy: 'brand:asc' });
      if (!data || data.length === 0) {
        // Empty table — do NOT auto-seed from the client. Use scripts/seed.mjs.
        return [];
      }
      offlineStorage.set('watches', data);
      return data;
    } catch (error) {
      console.error('Failed to get watches:', error);
      
      // Final fallback
      const offlineData = offlineStorage.get('watches');
      if (offlineData) return offlineData;
      
      throw new Error('Unable to load watches. Please check your internet connection.');
    }
  });
}

export async function saveWatch(watch) {
  return withRetry(async () => {
    try {
      if (!watch.id || !watch.brand || !watch.name) {
        throw new Error('Watch ID, brand, and name are required');
      }

      await adminFetch({
        table: 'watches',
        action: 'upsert',
        payload: {
          id: watch.id, brand: watch.brand, name: watch.name, price: watch.price,
          description: watch.description || '', image: watch.image || '', url: watch.url || '',
        },
      });
      
      // Update offline storage
      const updated = await getWatches();
      offlineStorage.set('watches', updated);
      
      return updated;
    } catch (error) {
      console.error('Failed to save watch:', error);
      throw new Error('Unable to save watch. Please try again.');
    }
  });
}

export async function deleteWatch(id) {
  return withRetry(async () => {
    try {
      if (!id) {
        throw new Error('Watch ID is required');
      }

      await adminFetch({ table: 'watches', action: 'delete', filter: { column: 'id', value: id } });
      
      // Update offline storage
      const updated = await getWatches();
      offlineStorage.set('watches', updated);
      
      return updated;
    } catch (error) {
      console.error('Failed to delete watch:', error);
      throw new Error('Unable to delete watch. Please try again.');
    }
  });
}

// ── Products (necklaces, rings, earrings, bracelets) ──
export async function getProducts(category) {
  const { data } = await adminFetch({
    table: 'products',
    action: 'select',
    filter: { column: 'category', value: category },
  });
  return data || [];
}

export async function clearProducts(category) {
  await adminFetch({
    table: 'products',
    action: 'delete',
    filter: { column: 'category', value: category },
  });
}

const _seedingInProgress = {};
export async function seedProducts(category, items) {
  if (_seedingInProgress[category]) return getProducts(category);
  _seedingInProgress[category] = true;
  try {
    const rows = items.map(p => ({ ...p, category }));
    await adminFetch({ table: 'products', action: 'upsert', payload: rows });
    return getProducts(category);
  } finally {
    _seedingInProgress[category] = false;
  }
}

export async function saveProduct(category, product) {
  await adminFetch({
    table: 'products',
    action: 'upsert',
    payload: { ...product, category },
  });
  return getProducts(category);
}

export async function deleteProduct(category, id) {
  await adminFetch({
    table: 'products',
    action: 'delete',
    filter: [
      { column: 'id', value: id },
      { column: 'category', value: category },
    ],
  });
  return getProducts(category);
}

// ── Locations ──
const defaultLocations = [
  { key: 'opal-grand', name: 'Opal Grand', city: 'Delray Beach, Florida', address: '10 North Ocean Boulevard, Delray Beach, FL 33483', description: 'Beachfront boutique inside Opal Grand Resort. Same-day try-ons after check-in.', long_description: 'Located in the heart of Delray Beach, our Opal Grand boutique offers an intimate jewelry experience steps from the Atlantic Ocean.', hours: 'Daily: 10am - 7pm', phone: '(561) 274-3200', hotel_image: '/assets/hotels/opal-grand.PNG', map_url: 'https://www.google.com/maps/search/?api=1&query=10+N+Ocean+Blvd+Delray+Beach+FL+33483', map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3571.5!2d-80.0425!3d26.4615!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDI3JzQxLjQiTiA4MMKwMDInMzMuMCJX!5e0!3m2!1sen!2sus!4v1700000000000', status: 'active' },
  { key: 'opal-sol', name: 'Opal Sol', city: 'Clearwater Beach, Florida', address: '400 Coronado Dr, Clearwater Beach, FL 33767', description: 'A sister boutique within the Opal Collection portfolio.', long_description: 'Our Opal Sol location brings the Opal Gems experience to Florida\'s stunning Gulf Coast.', hours: 'Daily: 10am - 8pm', phone: '(727) 229-8171', hotel_image: '/assets/hotels/opal-sol.PNG', map_url: 'https://www.google.com/maps/search/?api=1&query=400+Coronado+Dr+Clearwater+Beach+FL+33767', map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3519.8!2d-82.827!3d27.978!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjfCsDU4JzQxLjAiTiA4MsKwNDknMzcuMiJX!5e0!3m2!1sen!2sus!4v1700000000000', status: 'active' },
  { key: 'jupiter-beach', name: 'Jupiter Beach Resort & Spa', city: 'Jupiter, Florida', address: '5 North A1A, Jupiter, FL 33477', description: 'Steps from the sand with spa-adjacent showcases and relaxed fittings.', long_description: 'Nestled within the Jupiter Beach Resort & Spa, this boutique combines the serenity of a spa retreat with the excitement of fine jewelry discovery.', hours: 'Daily: 9am - 6pm', phone: '(561) 786-2751', hotel_image: '/assets/hotels/jupiter-beach.PNG', map_url: 'https://www.google.com/maps/search/?api=1&query=5+N+A1A+Jupiter+FL+33477', map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3556.2!2d-80.0583!3d26.9423!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDU2JzMyLjMiTiA4MMKwMDMnMjkuOSJX!5e0!3m2!1sen!2sus!4v1700000000000', status: 'active' }
];

function mapLocationRow(l) {
  return {
    ...l,
    hotelImage: l.hotel_image,
    longDescription: l.long_description,
    mapUrl: l.map_url,
    mapEmbed: l.map_embed,
  };
}

export async function getLocations() {
  try {
    const { data } = await adminFetch({ table: 'locations', action: 'select' });
    if (data && data.length > 0) return data.map(mapLocationRow);
  } catch (err) {
    console.warn('getLocations failed, using defaults:', err);
  }
  // Fall back to in-memory defaults if the table is empty or the request failed.
  // Seeding the database is a one-time admin operation; do not auto-write from the client.
  return defaultLocations.map(mapLocationRow);
}

export async function saveLocation(location) {
  await adminFetch({
    table: 'locations',
    action: 'upsert',
    payload: {
      key: location.key, name: location.name, city: location.city,
      address: location.address, description: location.description,
      long_description: location.longDescription || location.long_description || '',
      hours: location.hours || '', phone: location.phone || '',
      hotel_image: location.hotelImage || location.hotel_image || '',
      map_url: location.mapUrl || location.map_url || '',
      map_embed: location.mapEmbed || location.map_embed || '',
      status: location.status || 'active',
    },
  });
  return getLocations();
}

export async function deleteLocation(key) {
  await adminFetch({
    table: 'locations',
    action: 'delete',
    filter: { column: 'key', value: key },
  });
  return getLocations();
}

// ── Homepage Sections ──
// Default content lives in `src/lib/defaultSiteContent.js` so the public
// site and the admin editor always agree on the shape of `sections`.
// Re-export for any caller that needs to introspect the defaults.
export { defaultSections };

export async function getSections() {
  try {
    const { data } = await adminFetch({ table: 'sections', action: 'select' });
    if (data && data.length > 0) {
      const result = {};
      data.forEach((row) => { result[row.key] = row.value; });
      return mergeSections(result);
    }
  } catch (err) {
    console.warn('getSections failed, using defaults:', err);
  }
  // No client-side auto-seed. Use scripts/seed.mjs to populate sections once.
  return mergeSections({});
}

export async function saveSections(sections) {
  const rows = Object.entries(sections).map(([key, value]) => ({ key, value }));
  await adminFetch({ table: 'sections', action: 'upsert', payload: rows });
  return sections;
}

export async function updateSection(key, value) {
  await adminFetch({ table: 'sections', action: 'upsert', payload: { key, value } });
  return getSections();
}

// ── Photos / Gallery ──
export async function getPhotos() {
  try {
    const { data } = await adminFetch({ table: 'photos', action: 'select', orderBy: 'section:asc' });
    return data || [];
  } catch (error) {
    console.error('Failed to fetch photos:', error);
    throw new Error('Unable to load photos. Please check your connection.');
  }
}

export async function uploadPhoto(file) {
  // Validate file
  if (!file) {
    throw new Error('No file selected');
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, GIF, or WebP images.');
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File too large. Please upload images smaller than 10MB.');
  }

  try {
    const ext = file.name.split('.').pop();
    const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    
    // Check if bucket exists, create if needed
    const { data: buckets } = await supabase.storage.listBuckets();
    const galleryBucket = buckets.find(b => b.name === 'GALLERY');
    
    if (!galleryBucket) {
      // Create bucket if it doesn't exist
      const { error: bucketError } = await supabase.storage.createBucket('GALLERY', {
        public: true,
        allowedMimeTypes: allowedTypes,
        fileSizeLimit: maxSize
      });
      if (bucketError) throw bucketError;
    }

    const { error } = await supabase.storage.from('GALLERY').upload(path, file, { 
      upsert: false,
      contentType: file.type
    });
    
    if (error) throw error;
    
    const { data } = supabase.storage.from('GALLERY').getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    if (error.message.includes('bucket')) {
      throw new Error('Storage configuration error. Please contact administrator.');
    } else if (error.message.includes('size')) {
      throw new Error('File size exceeds limit. Please upload smaller images.');
    } else {
      throw new Error('Upload failed. Please try again.');
    }
  }
}

export async function savePhoto(photo) {
  try {
    // Validate photo data
    if (!photo.src || !photo.alt) {
      throw new Error('Photo URL and alt text are required');
    }

    await adminFetch({
      table: 'photos',
      action: 'upsert',
      payload: {
        id: photo.id,
        src: photo.src,
        alt: photo.alt,
        section: photo.section || 'showcase',
      },
    });
    return getPhotos();
  } catch (error) {
    console.error('Failed to save photo:', error);
    throw new Error('Unable to save photo. Please try again.');
  }
}

export async function deletePhoto(id) {
  try {
    if (!id) {
      throw new Error('Photo ID is required');
    }

    // Get photo info before deleting (server-side, so it works regardless of RLS).
    const { data: rows } = await adminFetch({
      table: 'photos',
      action: 'select',
      select: 'src',
      filter: { column: 'id', value: id },
      limit: 1,
    });
    const photo = rows && rows[0];

    if (photo && photo.src) {
      // Storage delete still uses the client. If the GALLERY bucket has open
      // delete policies this is fine; tighten the bucket policy if you need
      // server-side gating here too.
      try {
        const url = new URL(photo.src);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf('photos')).join('/');
        await supabase.storage.from('GALLERY').remove([filePath]);
      } catch (storageErr) {
        console.warn('Storage delete failed (continuing with DB delete):', storageErr);
      }
    }

    await adminFetch({
      table: 'photos',
      action: 'delete',
      filter: { column: 'id', value: id },
    });

    return getPhotos();
  } catch (error) {
    console.error('Failed to delete photo:', error);
    throw new Error('Unable to delete photo. Please try again.');
  }
}

// ── Subscribers ──
export async function getSubscribers() {
  const { data } = await adminFetch({
    table: 'subscribers',
    action: 'select',
    select: 'email, source, confirmed, referral_source, location_interest, purchase_intent, survey_completed_at, created_at, unsubscribed_at',
    orderBy: 'created_at:desc',
  });
  return data || [];
}

export async function deleteSubscriber(email) {
  await adminFetch({
    table: 'subscribers',
    action: 'delete',
    filter: { column: 'email', value: email },
  });
  return getSubscribers();
}

// ── Newsletter editions ──
export async function getNewsletterEditions() {
  const { data } = await adminFetch({
    table: 'newsletter_editions',
    action: 'select',
    orderBy: 'created_at:desc',
  });
  return data || [];
}

export async function saveNewsletterEdition(edition) {
  const { data } = await adminFetch({
    table: 'newsletter_editions',
    action: 'upsert',
    payload: edition,
  });
  return (data && data[0]) || edition;
}

export async function deleteNewsletterEdition(id) {
  if (!id) throw new Error('Edition id is required');
  await adminFetch({
    table: 'newsletter_editions',
    action: 'delete',
    filter: { column: 'id', value: id },
  });
}

// Send (or test-send) an edition. Goes through a dedicated function that
// renders the email and delivers via Resend. testEmail => send only to that
// address and do NOT mark the edition as sent.
export async function sendNewsletterEdition(editionId, testEmail = null) {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('Not authenticated. Please log in again.');
  const res = await fetch('/api/newsletter-send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ editionId, testEmail }),
  });
  let parsed = null;
  try { parsed = await res.json(); } catch { /* non-JSON */ }
  if (res.status === 401) {
    localStorage.removeItem('admin_token');
    throw new Error('Your session has expired. Please log in again.');
  }
  if (!res.ok) throw new Error(parsed?.error || `Send failed (${res.status})`);
  return parsed || {};
}

// ── Warranty registrations ──
export async function getWarrantyRegistrations() {
  const { data } = await adminFetch({
    table: 'warranty_registrations',
    action: 'select',
    orderBy: 'created_at:desc',
  });
  return data || [];
}

export async function updateWarrantyStatus(id, status) {
  if (!id) throw new Error('Registration id is required');
  const allowed = new Set(['pending', 'confirmed', 'archived']);
  if (!allowed.has(status)) throw new Error('Invalid status');
  await adminFetch({
    table: 'warranty_registrations',
    action: 'upsert',
    payload: { id, status },
  });
  return getWarrantyRegistrations();
}

export async function deleteWarrantyRegistration(id) {
  if (!id) throw new Error('Registration id is required');
  await adminFetch({
    table: 'warranty_registrations',
    action: 'delete',
    filter: { column: 'id', value: id },
  });
  return getWarrantyRegistrations();
}

// Editable purchase/item details (staff corrections after submission)
const EDITABLE_WARRANTY_FIELDS = new Set([
  'item_name', 'item_category', 'item_sku', 'item_serial',
  'purchase_price', 'purchase_date', 'receipt_number',
  'store_location', 'sales_associate',
]);

export async function updateWarrantyDetails(id, fields) {
  if (!id) throw new Error('Registration id is required');
  const payload = { id };
  for (const [k, v] of Object.entries(fields || {})) {
    if (!EDITABLE_WARRANTY_FIELDS.has(k)) continue;
    if (k === 'purchase_price') {
      const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
      payload[k] = Number.isFinite(n) ? n : null;
    } else {
      payload[k] = v === '' ? null : v;
    }
  }
  await adminFetch({
    table: 'warranty_registrations',
    action: 'upsert',
    payload,
  });
  return getWarrantyRegistrations();
}

// ── Stats (for dashboard) ──
export async function getDashboardStats() {
  const [watches, locations, photos, sections] = await Promise.all([
    getWatches(),
    getLocations(),
    getPhotos(),
    getSections(),
  ]);

  let subscribers = 0;
  try {
    const { count } = await adminFetch({
      table: 'subscribers',
      action: 'count',
      filter: { column: 'confirmed', value: true },
    });
    subscribers = count || 0;
  } catch (e) {
    console.warn('Failed to fetch subscriber count', e);
  }

  return {
    watches: watches.length,
    locations: locations.length,
    photos: photos.length,
    testimonials: sections.testimonials?.length || 0,
    categories: sections.categories?.length || 0,
    subscribers,
  };
}
