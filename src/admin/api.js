/**
 * Admin API Service — Supabase backend
 * Auth token stored in localStorage (session only)
 * All data reads/writes go to Supabase
 */

import { supabase } from '../lib/supabaseClient.js';
import defaultWatchesData from '../data/watches.js';

// Legacy fallback password for local dev when ADMIN_PASSWORD env var isn't set.
// Production must set ADMIN_PASSWORD on Netlify; the server endpoint will use that.
const DEFAULT_PASSWORD = 'opalgems2024';

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
// Primary path: server-side verification via /api/admin-login (requires ADMIN_PASSWORD + ADMIN_JWT_SECRET on Netlify)
// Fallback (local dev only): client-side password check using DEFAULT_PASSWORD or stored override
//
// Token format from server: <payloadB64>.<sigB64>
// Token format from local fallback: local:<base64>

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
    // Otherwise fall through to local check (e.g. server not configured during dev)
  } catch (err) {
    console.warn('admin-login server call failed, falling back to local check:', err);
  }

  // Local dev fallback
  if (password === getAdminPassword()) {
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

      const { data, error } = await supabase.from('watches').select('*').order('brand');
      
      if (error) {
        // Try offline fallback on error
        const offlineData = offlineStorage.get('watches');
        if (offlineData) {
          console.warn('Using offline data due to connection error');
          return offlineData;
        }
        throw error;
      }
      
      if (!data || data.length === 0) {
        // Seed on first load
        const seeds = defaultWatchesData.map(w => ({
          id: w.id, brand: w.brand, name: w.name, price: w.price,
          description: w.description || '', image: w.image || '', url: w.url || ''
        }));
        await supabase.from('watches').upsert(seeds);
        return seeds;
      }
      
      // Save to offline storage for future use
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

      const result = await supabase.from('watches').upsert({
        id: watch.id, brand: watch.brand, name: watch.name, price: watch.price,
        description: watch.description || '', image: watch.image || '', url: watch.url || ''
      });
      
      if (result.error) throw result.error;
      
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

      const result = await supabase.from('watches').delete().eq('id', id);
      if (result.error) throw result.error;
      
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
  const { data } = await supabase.from('products').select('*').eq('category', category);
  return data || [];
}

export async function clearProducts(category) {
  await supabase.from('products').delete().eq('category', category);
}

const _seedingInProgress = {};
export async function seedProducts(category, items) {
  if (_seedingInProgress[category]) return getProducts(category);
  _seedingInProgress[category] = true;
  try {
    const rows = items.map(p => ({ ...p, category }));
    await supabase.from('products').upsert(rows);
    return getProducts(category);
  } finally {
    _seedingInProgress[category] = false;
  }
}

export async function saveProduct(category, product) {
  await supabase.from('products').upsert({ ...product, category });
  return getProducts(category);
}

export async function deleteProduct(category, id) {
  await supabase.from('products').delete().eq('id', id).eq('category', category);
  return getProducts(category);
}

// ── Locations ──
const defaultLocations = [
  { key: 'opal-grand', name: 'Opal Grand', city: 'Delray Beach, Florida', address: '10 North Ocean Boulevard, Delray Beach, FL 33483', description: 'Beachfront boutique inside Opal Grand Resort. Same-day try-ons after check-in.', long_description: 'Located in the heart of Delray Beach, our Opal Grand boutique offers an intimate jewelry experience steps from the Atlantic Ocean.', hours: 'Daily: 10am - 7pm', phone: '(561) 274-3200', hotel_image: '/assets/hotels/opal-grand.PNG', map_url: 'https://www.google.com/maps/search/?api=1&query=10+N+Ocean+Blvd+Delray+Beach+FL+33483', map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3571.5!2d-80.0425!3d26.4615!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDI3JzQxLjQiTiA4MMKwMDInMzMuMCJX!5e0!3m2!1sen!2sus!4v1700000000000', status: 'active' },
  { key: 'opal-sol', name: 'Opal Sol', city: 'Clearwater Beach, Florida', address: '400 Coronado Dr, Clearwater Beach, FL 33767', description: 'A sister boutique within the Opal Collection portfolio.', long_description: 'Our Opal Sol location brings the Opal Gems experience to Florida\'s stunning Gulf Coast.', hours: 'Daily: 10am - 8pm', phone: '(727) 229-8171', hotel_image: '/assets/hotels/opal-sol.PNG', map_url: 'https://www.google.com/maps/search/?api=1&query=400+Coronado+Dr+Clearwater+Beach+FL+33767', map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3519.8!2d-82.827!3d27.978!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjfCsDU4JzQxLjAiTiA4MsKwNDknMzcuMiJX!5e0!3m2!1sen!2sus!4v1700000000000', status: 'active' },
  { key: 'jupiter-beach', name: 'Jupiter Beach Resort & Spa', city: 'Jupiter, Florida', address: '5 North A1A, Jupiter, FL 33477', description: 'Steps from the sand with spa-adjacent showcases and relaxed fittings.', long_description: 'Nestled within the Jupiter Beach Resort & Spa, this boutique combines the serenity of a spa retreat with the excitement of fine jewelry discovery.', hours: 'Daily: 9am - 6pm', phone: '(561) 786-2751', hotel_image: '/assets/hotels/jupiter-beach.PNG', map_url: 'https://www.google.com/maps/search/?api=1&query=5+N+A1A+Jupiter+FL+33477', map_embed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3556.2!2d-80.0583!3d26.9423!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjbCsDU2JzMyLjMiTiA4MMKwMDMnMjkuOSJX!5e0!3m2!1sen!2sus!4v1700000000000', status: 'active' }
];

export async function getLocations() {
  const { data, error } = await supabase.from('locations').select('*');
  if (error || !data || data.length === 0) {
    await supabase.from('locations').upsert(defaultLocations);
    return defaultLocations.map(l => ({ ...l, hotelImage: l.hotel_image, longDescription: l.long_description, mapUrl: l.map_url, mapEmbed: l.map_embed }));
  }
  return data.map(l => ({ ...l, hotelImage: l.hotel_image, longDescription: l.long_description, mapUrl: l.map_url, mapEmbed: l.map_embed }));
}

export async function saveLocation(location) {
  await supabase.from('locations').upsert({
    key: location.key, name: location.name, city: location.city,
    address: location.address, description: location.description,
    long_description: location.longDescription || location.long_description || '',
    hours: location.hours || '', phone: location.phone || '',
    hotel_image: location.hotelImage || location.hotel_image || '',
    map_url: location.mapUrl || location.map_url || '',
    map_embed: location.mapEmbed || location.map_embed || '',
    status: location.status || 'active'
  });
  return getLocations();
}

export async function deleteLocation(key) {
  await supabase.from('locations').delete().eq('key', key);
  return getLocations();
}

// ── Homepage Sections ──
const defaultSections = {
  hero: { title: 'Elevated Diamonds, In Person', subtitle: 'Three boutiques across Florida\'s most iconic resort destinations.', image: '/assets/boutique-mood-lifestyle.jpg', ctaText: 'Book Appointment', ctaUrl: '/book' },
  about: { title: 'A Family Legacy of Fine Jewelry', description: 'With over 30 years of expertise, Opal Gems brings you hand-selected diamonds and bespoke jewelry in the most exclusive resort settings in Florida.', ownerImage: '/assets/michelle_and_gill.jfif', ownerNames: 'Michelle & Gil', ownerTitle: 'Founders of Opal Gems' },
  testimonials: [
    { id: 't1', name: 'Sarah M.', location: 'Delray Beach', text: 'The personal attention was incredible. They helped me find the perfect anniversary gift.', rating: 5 },
    { id: 't2', name: 'James R.', location: 'Jupiter', text: 'Outstanding selection and knowledgeable staff. A true luxury experience.', rating: 5 },
    { id: 't3', name: 'Elena K.', location: 'Clearwater', text: 'I fell in love with their collection. The quality is unmatched.', rating: 5 }
  ],
  categories: [
    { name: 'Necklaces', image: '/assets/category-necklaces.PNG' },
    { name: 'Rings', image: '/assets/category-rings.PNG' },
    { name: 'Earrings', image: '/assets/category-earrings.PNG' },
    { name: 'Bracelets', image: '/assets/category-bracelets.PNG' },
    { name: 'Watches', image: '/assets/category-watches.PNG' }
  ],
  showcase: [
    { id: 's1', image: '/assets/four_piece_daimonds.PNG', alt: 'Diamond jewelry set' },
    { id: 's2', image: '/assets/Stacked_diamond_eternity_bands.PNG', alt: 'Stacked diamond eternity bands' },
    { id: 's3', image: '/assets/diamonds_loose.PNG', alt: 'Loose diamonds' },
    { id: 's4', image: '/assets/Diamond_necklace.PNG', alt: 'Diamond necklace' },
    { id: 's5', image: '/assets/diamond_rings_on_the_beach.PNG', alt: 'Diamond rings' },
    { id: 's6', image: '/assets/daimond_strands.PNG', alt: 'Diamond strands' }
  ]
};

export async function getSections() {
  const { data } = await supabase.from('sections').select('*');
  if (!data || data.length === 0) {
    const rows = Object.entries(defaultSections).map(([key, value]) => ({ key, value }));
    await supabase.from('sections').upsert(rows);
    return defaultSections;
  }
  const result = {};
  data.forEach(row => { result[row.key] = row.value; });
  return { ...defaultSections, ...result };
}

export async function saveSections(sections) {
  const rows = Object.entries(sections).map(([key, value]) => ({ key, value }));
  await supabase.from('sections').upsert(rows);
  return sections;
}

export async function updateSection(key, value) {
  await supabase.from('sections').upsert({ key, value });
  return getSections();
}

// ── Photos / Gallery ──
export async function getPhotos() {
  try {
    const { data, error } = await supabase.from('photos').select('*').order('section');
    if (error) throw error;
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

    const { error } = await supabase.from('photos').upsert({ 
      id: photo.id, 
      src: photo.src, 
      alt: photo.alt, 
      section: photo.section || 'showcase' 
    });
    
    if (error) throw error;
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

    // Get photo info before deleting
    const { data: photo } = await supabase.from('photos').select('src').eq('id', id).single();
    
    if (photo && photo.src) {
      // Extract file path from URL
      const url = new URL(photo.src);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf('photos')).join('/');
      
      // Delete from storage
      await supabase.storage.from('GALLERY').remove([filePath]);
    }

    // Delete from database
    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) throw error;
    
    return getPhotos();
  } catch (error) {
    console.error('Failed to delete photo:', error);
    throw new Error('Unable to delete photo. Please try again.');
  }
}

// ── Subscribers ──
export async function getSubscribers() {
  const { data, error } = await supabase
    .from('subscribers')
    .select('email, source, confirmed, created_at, unsubscribed_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteSubscriber(email) {
  const { error } = await supabase
    .from('subscribers')
    .delete()
    .eq('email', email);
  if (error) throw error;
  return getSubscribers();
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
    const { count } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('confirmed', true);
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
