// Netlify Function: warranty registration submissions
// POST /api/warranty-register { customer_name, customer_email, customer_phone, address_*, item_*, purchase_price, ... }
//
// Flow:
//   1. Customer scans QR code in boutique → loads /warranty/register
//   2. Submits the form → this endpoint
//   3. We validate, store in Supabase, email customer + admin
//
// Required env vars:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_KEY    (bypasses RLS)
//   - RESEND_API_KEY           (optional, for emails)
//   - RESEND_FROM_EMAIL
//   - ADMIN_NOTIFICATION_EMAIL (optional, where new-registration alerts go)
//   - SALES_NOTIFICATION_EMAIL (optional, defaults to sales@theopalgems.com)
//   - ALLOWED_ORIGIN

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems <onboarding@resend.dev>';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
const SALES_NOTIFICATION_EMAIL = process.env.SALES_NOTIFICATION_EMAIL || 'sales@theopalgems.com';
const SITE_URL = process.env.SITE_URL || 'https://theopalgems.com';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://theopalgems.com';

// ─── Inventory-app sync (Andrew's separate Supabase project) ─────────────────
// When set, each warranty registration also creates/updates a row in the
// inventory app's `customers` table so it appears in its Customers tab.
// Both are optional — if either is missing the sync is skipped and warranty
// registration continues to work normally.
const INVENTORY_SUPABASE_URL = process.env.INVENTORY_SUPABASE_URL;
const INVENTORY_SUPABASE_SERVICE_KEY = process.env.INVENTORY_SUPABASE_SERVICE_KEY;
const INVENTORY_CUSTOMERS_TABLE = process.env.INVENTORY_CUSTOMERS_TABLE || 'customers';

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

// Tight allowlist for the store_location enum (free text fallback still allowed but trimmed)
const KNOWN_LOCATIONS = new Set(['opal-grand', 'opal-sol', 'jupiter-beach', 'other']);
const KNOWN_CATEGORIES = new Set([
  'Ring', 'Rings', 'Necklace', 'Necklaces', 'Earring', 'Earrings',
  'Bracelet', 'Bracelets', 'Pendant', 'Bangle', 'Chain', 'Watch', 'Other',
]);

// Tier 1-4 enum allowlists. Anything outside the set is silently dropped
// (we never want to store junk in fields the analytics views will group by).
const KNOWN_OCCASIONS = new Set([
  'engagement', 'anniversary', 'birthday', 'self_purchase', 'gift', 'just_because', 'other',
]);
const KNOWN_DISCOVERY = new Set([
  'instagram', 'google', 'hotel_concierge', 'walk_in', 'returning_customer', 'friend_referral', 'event', 'other',
]);
const KNOWN_RELATIONSHIPS = new Set([
  'partner', 'spouse', 'parent', 'child', 'sibling', 'friend', 'colleague', 'self', 'other',
]);
const KNOWN_METALS = new Set([
  'yellow_gold', 'white_gold', 'rose_gold', 'platinum', 'silver', 'mixed',
]);
const KNOWN_STYLES = new Set([
  'classic', 'modern', 'vintage', 'statement', 'minimalist', 'bohemian',
]);
const KNOWN_HOTELS = new Set([
  'opal-grand', 'opal-sol', 'jupiter-beach', 'other',
]);

const LOCATION_LABELS = {
  'opal-grand':    'Opal Grand — Delray Beach, FL',
  'opal-sol':      'Opal Sol — Clearwater Beach, FL',
  'jupiter-beach': 'Jupiter Beach Resort & Spa — Jupiter, FL',
};

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN ||
    origin === 'http://localhost:5173' ||
    origin === 'http://localhost:3000';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(status, body, origin = '') {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function clientIp(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

// In-memory rate limit per Function instance: 10 submissions / IP / hour
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const _ipHits = new Map();
function rateLimit(ip) {
  if (!ip || ip === 'unknown') return false;
  const now = Date.now();
  const entry = _ipHits.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    _ipHits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function trim(v, max = 500) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  // Accept YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

function parsePrice(v) {
  if (v == null || v === '') return null;
  const num = Number(String(v).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(num)) return null;
  if (num < 0 || num > 10_000_000) return null;
  return Math.round(num * 100) / 100;
}

function parseBool(v) {
  if (v === true || v === 'true' || v === 1 || v === '1' || v === 'yes') return true;
  if (v === false || v === 'false' || v === 0 || v === '0' || v === 'no') return false;
  return null;
}

function parseEnum(v, allowed) {
  if (v == null || v === '') return null;
  const s = String(v).trim().toLowerCase();
  return allowed.has(s) ? s : null;
}

function parseEnumArray(v, allowed, maxLen = 10) {
  if (!Array.isArray(v)) return null;
  const out = [];
  const seen = new Set();
  for (const item of v) {
    if (out.length >= maxLen) break;
    const s = typeof item === 'string' ? item.trim().toLowerCase() : '';
    if (!s || seen.has(s) || !allowed.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out.length ? out : null;
}

function parseRating(v) {
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > 5) return null;
  return n;
}

// Loose URL whitelist for the customer photo. Must be an https URL pointing
// at our own Supabase project (storage bucket). Anything else is dropped.
function parsePhotoUrl(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!/^https:\/\/[\w.-]+\/storage\/v1\/object\/public\/warranty-photos\//.test(s)) return null;
  if (s.length > 600) return null;
  return s;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(num) {
  if (num == null) return '—';
  return `$${Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function sendEmail({ to, subject, html, replyTo }) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return { skipped: true };
  }
  const body = { from: RESEND_FROM_EMAIL, to, subject, html };
  if (replyTo) body.reply_to = replyTo;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend error ${res.status}: ${txt}`);
  }
  return res.json();
}

function customerEmailHtml(reg) {
  const locationLabel = LOCATION_LABELS[reg.store_location] || reg.store_location || 'our boutique';
  return `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2a2a2a;">
      <div style="text-align:center; margin-bottom:32px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight:500; letter-spacing:0.08em; font-size:28px; margin:0; color:#1a1a1a;">OPAL GEMS</h1>
        <p style="letter-spacing:0.25em; font-size:11px; color:#b8956e; margin:8px 0 0; text-transform:uppercase;">Warranty Registration</p>
      </div>
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight:400; font-size:24px; color:#1a1a1a;">Thank you, ${escapeHtml(reg.customer_name)}.</h2>
      <p style="line-height:1.7; font-size:15px;">Your purchase from ${escapeHtml(locationLabel)} has been registered. Please keep this email for your records — it serves as your warranty confirmation.</p>

      <div style="background:#f8f6f2; border:1px solid #ece6da; padding:20px 24px; margin:24px 0;">
        <p style="margin:0 0 12px; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#b8956e;">Registered Piece</p>
        <p style="margin:0 0 6px;"><strong>${escapeHtml(reg.item_name)}</strong></p>
        ${reg.item_category ? `<p style="margin:0 0 6px; color:#666; font-size:14px;">Category: ${escapeHtml(reg.item_category)}</p>` : ''}
        ${reg.item_sku ? `<p style="margin:0 0 6px; color:#666; font-size:14px;">SKU: ${escapeHtml(reg.item_sku)}</p>` : ''}
        ${reg.item_serial ? `<p style="margin:0 0 6px; color:#666; font-size:14px;">Serial: ${escapeHtml(reg.item_serial)}</p>` : ''}
        ${reg.purchase_price != null ? `<p style="margin:0 0 6px; color:#666; font-size:14px;">Purchase price: ${formatPrice(reg.purchase_price)}</p>` : ''}
        ${reg.purchase_date ? `<p style="margin:0 0 6px; color:#666; font-size:14px;">Purchase date: ${escapeHtml(reg.purchase_date)}</p>` : ''}
        ${reg.receipt_number ? `<p style="margin:0; color:#666; font-size:14px;">Receipt #: ${escapeHtml(reg.receipt_number)}</p>` : ''}
      </div>

      <p style="line-height:1.7; font-size:15px;">Your warranty covers manufacturing defects for one (1) year from the date of purchase. To make a claim, simply reply to this email or contact your boutique directly.</p>

      <p style="line-height:1.7; font-size:15px; margin-top:24px;">We look forward to welcoming you back.</p>
      <p style="line-height:1.7; font-size:15px; margin-top:24px;"><em>— The Opal Gems team</em></p>

      <hr style="border:none; border-top:1px solid #e6e6e6; margin:32px 0;" />
      <p style="font-size:12px; color:#888; text-align:center; line-height:1.6;">
        Opal Gems · 10 N Ocean Blvd, Delray Beach, FL 33483<br/>
        <a href="${SITE_URL}" style="color:#888; text-decoration:underline;">theopalgems.com</a>
      </p>
    </div>
  `;
}

function adminEmailHtml(reg) {
  const locationLabel = LOCATION_LABELS[reg.store_location] || reg.store_location || '(unspecified)';
  const fullAddress = [reg.address_line1, reg.address_line2, [reg.city, reg.state_region, reg.postal_code].filter(Boolean).join(', '), reg.country]
    .filter(Boolean).join(' · ');
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #2a2a2a;">
      <h2 style="margin:0 0 12px;">New warranty registration</h2>
      <p style="margin:0 0 16px; color:#666;">${escapeHtml(locationLabel)} · ${escapeHtml(new Date().toISOString())}</p>

      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr><td style="padding:6px 0; color:#888; width:140px;">Name</td><td style="padding:6px 0;"><strong>${escapeHtml(reg.customer_name)}</strong></td></tr>
        <tr><td style="padding:6px 0; color:#888;">Email</td><td style="padding:6px 0;">${escapeHtml(reg.customer_email)}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Phone</td><td style="padding:6px 0;">${escapeHtml(reg.customer_phone)}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Address</td><td style="padding:6px 0;">${escapeHtml(fullAddress || '—')}</td></tr>
        <tr><td colspan="2" style="padding:12px 0 6px;"><hr style="border:none; border-top:1px solid #eee;"/></td></tr>
        <tr><td style="padding:6px 0; color:#888;">Item</td><td style="padding:6px 0;"><strong>${escapeHtml(reg.item_name)}</strong></td></tr>
        ${reg.item_category ? `<tr><td style="padding:6px 0; color:#888;">Category</td><td style="padding:6px 0;">${escapeHtml(reg.item_category)}</td></tr>` : ''}
        ${reg.item_sku ? `<tr><td style="padding:6px 0; color:#888;">SKU</td><td style="padding:6px 0;">${escapeHtml(reg.item_sku)}</td></tr>` : ''}
        ${reg.item_serial ? `<tr><td style="padding:6px 0; color:#888;">Serial</td><td style="padding:6px 0;">${escapeHtml(reg.item_serial)}</td></tr>` : ''}
        ${reg.purchase_price != null ? `<tr><td style="padding:6px 0; color:#888;">Price</td><td style="padding:6px 0;">${formatPrice(reg.purchase_price)}</td></tr>` : ''}
        ${reg.purchase_date ? `<tr><td style="padding:6px 0; color:#888;">Purchase date</td><td style="padding:6px 0;">${escapeHtml(reg.purchase_date)}</td></tr>` : ''}
        ${reg.sales_associate ? `<tr><td style="padding:6px 0; color:#888;">Associate</td><td style="padding:6px 0;">${escapeHtml(reg.sales_associate)}</td></tr>` : ''}
        ${reg.receipt_number ? `<tr><td style="padding:6px 0; color:#888;">Receipt #</td><td style="padding:6px 0;">${escapeHtml(reg.receipt_number)}</td></tr>` : ''}
        ${reg.notes ? `<tr><td style="padding:6px 0; color:#888; vertical-align:top;">Notes</td><td style="padding:6px 0; white-space:pre-wrap;">${escapeHtml(reg.notes)}</td></tr>` : ''}
      </table>

      <p style="margin-top:20px; font-size:13px; color:#666;">View all registrations in the admin dashboard under <strong>Warranties</strong>.</p>
    </div>
  `;
}

// Compose a one-line summary of the warranty context so the rich data we
// capture isn't lost inside the inventory app's single `notes` column.
function buildCustomerNote(reg) {
  const parts = [];
  if (reg.item_name) parts.push(reg.item_name);
  if (reg.item_sku) parts.push(`SKU ${reg.item_sku}`);
  if (reg.item_serial) parts.push(`S/N ${reg.item_serial}`);
  if (reg.purchase_date) parts.push(`purchased ${reg.purchase_date}`);
  if (reg.store_location) parts.push(LOCATION_LABELS[reg.store_location] || reg.store_location);
  if (reg.occasion) parts.push(`occasion: ${reg.occasion}`);
  if (reg.is_returning_customer) parts.push('returning customer');
  const head = `Warranty registration${parts.length ? ' — ' + parts.join(' · ') : ''}`;
  return head.slice(0, 1000);
}

function buildCustomerAddress(reg) {
  const line = [
    reg.address_line1,
    reg.address_line2,
    [reg.city, reg.state_region, reg.postal_code].filter(Boolean).join(', '),
    reg.country && reg.country !== 'United States' ? reg.country : null,
  ].filter(Boolean).join(', ');
  return line || null;
}

// Best-effort, non-fatal sync into the inventory app's customers table.
// Find-or-create by email so repeat registrations don't create duplicates.
async function syncCustomerToInventory(reg) {
  if (!INVENTORY_SUPABASE_URL || !INVENTORY_SUPABASE_SERVICE_KEY) {
    return { skipped: true, reason: 'not-configured' };
  }

  const inv = createClient(INVENTORY_SUPABASE_URL, INVENTORY_SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const marketingConsent = !!(reg.marketing_opt_in_email || reg.marketing_opt_in_sms);
  const customer = {
    full_name: reg.customer_name,
    phone: reg.customer_phone || null,
    email: reg.customer_email,
    address: buildCustomerAddress(reg),
    marketing_consent: marketingConsent,
    consent_at: marketingConsent ? new Date().toISOString() : null,
    notes: buildCustomerNote(reg),
    // created_by is intentionally omitted — it's the staff user who manually
    // added the customer; automated rows leave it null.
  };

  // De-dupe on email (case-insensitive).
  const { data: existing, error: findErr } = await inv
    .from(INVENTORY_CUSTOMERS_TABLE)
    .select('id')
    .ilike('email', reg.customer_email)
    .limit(1);
  if (findErr) throw findErr;

  if (existing && existing.length) {
    // Update contact details + bump consent (never downgrade an existing opt-in).
    const update = {
      full_name: customer.full_name,
      phone: customer.phone,
      address: customer.address || undefined, // don't blank an address they already have
      notes: customer.notes,
    };
    if (marketingConsent) {
      update.marketing_consent = true;
      update.consent_at = customer.consent_at;
    }
    const { error: updErr } = await inv
      .from(INVENTORY_CUSTOMERS_TABLE)
      .update(update)
      .eq('id', existing[0].id);
    if (updErr) throw updErr;
    return { updated: existing[0].id };
  }

  const { data: created, error: insErr } = await inv
    .from(INVENTORY_CUSTOMERS_TABLE)
    .insert(customer)
    .select('id')
    .single();
  if (insErr) throw insErr;
  return { created: created?.id };
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') return json(200, { ok: true }, origin);
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' }, origin);

  if (rateLimit(clientIp(req))) {
    return json(429, { error: 'Too many submissions. Please try again later.' }, origin);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid request.' }, origin);
  }

  // Honeypot — bots tend to fill hidden fields
  if (payload?.honeypot && String(payload.honeypot).trim() !== '') {
    return json(200, { ok: true, message: 'Thanks!' }, origin); // silent fail
  }

  const customer_name  = trim(payload?.customer_name, 120);
  const customer_email = (trim(payload?.customer_email, 254) || '').toLowerCase();
  const customer_phone = trim(payload?.customer_phone, 40);
  const address_line1  = trim(payload?.address_line1, 200);
  const address_line2  = trim(payload?.address_line2, 200);
  const city           = trim(payload?.city, 100);
  const state_region   = trim(payload?.state_region, 100);
  const postal_code    = trim(payload?.postal_code, 20);
  const country        = trim(payload?.country, 100) || 'United States';
  const item_name      = trim(payload?.item_name, 200);
  const item_categoryRaw = trim(payload?.item_category, 60);
  const item_category  = item_categoryRaw && KNOWN_CATEGORIES.has(item_categoryRaw) ? item_categoryRaw : item_categoryRaw;
  const item_sku       = trim(payload?.item_sku, 80);
  const item_serial    = trim(payload?.item_serial, 80);
  const purchase_price = parsePrice(payload?.purchase_price);
  const purchase_date  = parseDate(payload?.purchase_date);
  const store_locRaw   = trim(payload?.store_location, 60);
  const store_location = store_locRaw
    ? (KNOWN_LOCATIONS.has(store_locRaw) ? store_locRaw : store_locRaw)
    : null;
  const sales_associate = trim(payload?.sales_associate, 120);
  const receipt_number  = trim(payload?.receipt_number, 80);
  const notes           = trim(payload?.notes, 2000);

  // Tier 1 — Marketing intelligence
  const occasion                    = parseEnum(payload?.occasion, KNOWN_OCCASIONS);
  const is_gift                     = parseBool(payload?.is_gift);
  const gift_recipient_name         = trim(payload?.gift_recipient_name, 120);
  const gift_recipient_relationship = parseEnum(payload?.gift_recipient_relationship, KNOWN_RELATIONSHIPS);
  const gift_recipient_birthday     = parseDate(payload?.gift_recipient_birthday);
  const customer_birthday           = parseDate(payload?.customer_birthday);
  const discovery_source            = parseEnum(payload?.discovery_source, KNOWN_DISCOVERY);
  const is_visiting                 = parseBool(payload?.is_visiting);
  const staying_at_hotel            = parseBool(payload?.staying_at_hotel);
  const hotel_name                  = parseEnum(payload?.hotel_name, KNOWN_HOTELS) || trim(payload?.hotel_name, 120);
  const hotel_checkout_date         = parseDate(payload?.hotel_checkout_date);
  const home_city                   = trim(payload?.home_city, 120);
  const marketing_opt_in_email      = parseBool(payload?.marketing_opt_in_email);
  const marketing_opt_in_sms        = parseBool(payload?.marketing_opt_in_sms);

  // Tier 2 — Product preferences
  const ring_size          = trim(payload?.ring_size, 20);
  const chain_length       = trim(payload?.chain_length, 40);
  const metal_preference   = parseEnum(payload?.metal_preference, KNOWN_METALS);
  const style_preferences  = parseEnumArray(payload?.style_preferences, KNOWN_STYLES);
  const engraving_text     = trim(payload?.engraving_text, 120);
  const wants_appraisal    = parseBool(payload?.wants_appraisal);
  const care_kit_interest  = parseBool(payload?.care_kit_interest);

  // Tier 3 — Experience capture
  const experience_rating  = parseRating(payload?.experience_rating);
  const photo_url          = parsePhotoUrl(payload?.photo_url);
  const ugc_consent        = parseBool(payload?.ugc_consent);
  const associate_confirmed = parseBool(payload?.associate_confirmed);

  // Tier 4 — Loyalty & referrals
  const referred_by             = trim(payload?.referred_by, 200);
  const is_returning_customer   = parseBool(payload?.is_returning_customer);
  const interested_in_events    = parseBool(payload?.interested_in_events);

  // Required fields
  const missing = [];
  if (!customer_name)  missing.push('customer_name');
  if (!customer_email) missing.push('customer_email');
  if (!customer_phone) missing.push('customer_phone');
  if (!item_name)      missing.push('item_name');
  if (missing.length) {
    return json(400, { error: 'Please complete the required fields.', fields: missing }, origin);
  }

  if (!EMAIL_RE.test(customer_email) || customer_email.length > 254) {
    return json(400, { error: 'Please enter a valid email address.' }, origin);
  }
  // Loose phone check — at least 7 digits
  const phoneDigits = customer_phone.replace(/\D/g, '');
  if (phoneDigits.length < 7) {
    return json(400, { error: 'Please enter a valid phone number.' }, origin);
  }

  // Demo-mode short-circuit: if the Supabase env vars are missing OR if the
  // operator flipped WARRANTY_DEMO_MODE, we skip the DB write + emails and
  // return a believable success response. Useful for showing the flow to
  // stakeholders before migrations have been run.
  const demoMode = !SUPABASE_URL || !SUPABASE_SERVICE_KEY || process.env.WARRANTY_DEMO_MODE === 'true';
  if (demoMode) {
    console.warn('warranty-register: DEMO MODE — submission accepted but not persisted');
    return json(200, {
      ok: true,
      demo: true,
      message: 'Thank you. Your warranty registration is confirmed — check your email for a copy.',
    }, origin);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const row = {
    customer_name,
    customer_email,
    customer_phone,
    address_line1,
    address_line2,
    city,
    state_region,
    postal_code,
    country,
    item_name,
    item_category,
    item_sku,
    item_serial,
    purchase_price,
    purchase_date,
    store_location,
    sales_associate,
    receipt_number,
    notes,
    // Tier 1 — Marketing intelligence
    occasion,
    is_gift,
    gift_recipient_name,
    gift_recipient_relationship,
    gift_recipient_birthday,
    customer_birthday,
    discovery_source,
    is_visiting,
    staying_at_hotel,
    hotel_name,
    hotel_checkout_date,
    home_city,
    marketing_opt_in_email: !!marketing_opt_in_email,
    marketing_opt_in_sms:   !!marketing_opt_in_sms,
    // Tier 2 — Product preferences
    ring_size,
    chain_length,
    metal_preference,
    style_preferences,
    engraving_text,
    wants_appraisal:        !!wants_appraisal,
    care_kit_interest:      !!care_kit_interest,
    // Tier 3 — Experience capture
    experience_rating,
    photo_url,
    ugc_consent:            !!ugc_consent,
    associate_confirmed,
    // Tier 4 — Loyalty & referrals
    referred_by,
    is_returning_customer,
    interested_in_events:   !!interested_in_events,
    status: 'pending',
    source_ip: clientIp(req).slice(0, 64),
    user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
  };

  const { data: inserted, error: insertError } = await supabase
    .from('warranty_registrations')
    .insert(row)
    .select('id, created_at')
    .single();

  if (insertError) {
    // Table not yet created (migrations 04/05 not run) → still let the
    // customer see the success screen so we can demo the flow.
    const missingTable =
      insertError.code === '42P01' ||
      /relation .* does not exist/i.test(insertError.message || '') ||
      /could not find the table/i.test(insertError.message || '');
    if (missingTable) {
      console.warn('warranty-register: warranty_registrations table missing — returning demo success');
      return json(200, {
        ok: true,
        demo: true,
        message: 'Thank you. Your warranty registration is confirmed — check your email for a copy.',
      }, origin);
    }
    console.error('warranty-register insert error:', insertError);
    return json(500, { error: 'Could not save your registration. Please try again.' }, origin);
  }

  // Sync into the inventory app's Customers tab — non-fatal if it fails so a
  // sync outage never blocks the customer's warranty confirmation.
  try {
    const result = await syncCustomerToInventory(row);
    if (result?.skipped) {
      console.log('Inventory sync skipped:', result.reason);
    } else {
      console.log('Inventory sync ok:', result);
    }
  } catch (err) {
    console.error('Inventory customer sync failed (non-fatal):', err?.message || err);
  }

  // Customer confirmation email — non-fatal if it fails
  try {
    await sendEmail({
      to: customer_email,
      subject: 'Your Opal Gems warranty registration',
      html: customerEmailHtml(row),
    });
  } catch (err) {
    console.error('Customer email failed (non-fatal):', err);
  }

  // Internal notification — non-fatal. Sent to the admin address and the
  // sales inbox so the team is alerted to every new registration.
  const notifyRecipients = [...new Set(
    [ADMIN_NOTIFICATION_EMAIL, SALES_NOTIFICATION_EMAIL]
      .filter(Boolean)
      .map((e) => e.trim().toLowerCase())
  )];
  if (notifyRecipients.length) {
    try {
      await sendEmail({
        to: notifyRecipients,
        subject: `New warranty registration: ${customer_name} — ${item_name}`,
        html: adminEmailHtml(row),
        replyTo: customer_email,
      });
    } catch (err) {
      console.error('Warranty notification failed (non-fatal):', err);
    }
  }

  return json(200, {
    ok: true,
    id: inserted?.id,
    message: 'Thank you. Your warranty registration is confirmed — check your email for a copy.',
  }, origin);
};

export const config = { path: '/api/warranty-register' };
