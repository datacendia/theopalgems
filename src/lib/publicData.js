/**
 * Public-site data readers.
 *
 * These run in every visitor's browser and use the public anon Supabase key
 * to fetch live CMS content (locations, homepage sections, gallery photos).
 *
 * Required RLS: the corresponding tables must allow anonymous SELECT but
 * deny anon INSERT/UPDATE/DELETE. See ADMIN_RLS_LOCKDOWN.md for the policies.
 *
 * Admin writes always go through /api/admin-data (see src/admin/api.js).
 */

import { supabase } from './supabaseClient.js';
import { mergeSections } from './defaultSiteContent.js';

// Cache reads for the lifetime of the page so we don't refetch on every
// component mount.
const _cache = new Map();
async function cached(key, loader) {
  if (_cache.has(key)) return _cache.get(key);
  const promise = loader();
  _cache.set(key, promise);
  try {
    return await promise;
  } catch (err) {
    _cache.delete(key); // allow retry on next call
    throw err;
  }
}

// ── Locations ──
function mapLocationRow(l) {
  return {
    ...l,
    hotelImage: l.hotel_image,
    longDescription: l.long_description,
    mapUrl: l.map_url,
    mapEmbed: l.map_embed,
  };
}

export async function getPublicLocations() {
  return cached('locations', async () => {
    const { data, error } = await supabase.from('locations').select('*');
    if (error) throw error;
    return (data || []).map(mapLocationRow);
  });
}

// ── Homepage sections ──
// Returns a fully-populated object (defaults merged with whatever the
// admin has saved in Supabase). Public pages can rely on every key being
// present without null-guarding every field.
export async function getPublicSections() {
  return cached('sections', async () => {
    try {
      const { data, error } = await supabase.from('sections').select('*');
      if (error) throw error;
      const overrides = {};
      (data || []).forEach((row) => { overrides[row.key] = row.value; });
      return mergeSections(overrides);
    } catch (err) {
      console.warn('getPublicSections failed, using defaults:', err);
      return mergeSections({});
    }
  });
}

// ── Gallery photos ──
export async function getPublicPhotos() {
  return cached('photos', async () => {
    const { data, error } = await supabase.from('photos').select('*').order('section');
    if (error) throw error;
    return data || [];
  });
}

// ── Watches (public catalog) ──
export async function getPublicWatches() {
  return cached('watches', async () => {
    const { data, error } = await supabase.from('watches').select('*').order('brand');
    if (error) throw error;
    return data || [];
  });
}

// ── Products by category (public catalog) ──
export async function getPublicProducts(category) {
  return cached(`products:${category}`, async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category);
    if (error) throw error;
    return data || [];
  });
}
