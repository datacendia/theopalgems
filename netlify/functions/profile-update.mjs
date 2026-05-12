// Netlify Function: update subscriber profile (referral_source, location_interest, purchase_intent)
// POST /api/profile-update { token, referral_source?, location_interest?, purchase_intent? }
// Token is the subscriber's unsubscribe_token (already used as confirmation token).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://theopalgems.com';

const REFERRAL_SOURCES = new Set([
  'instagram', 'google', 'hotel-concierge', 'friend', 'event', 'other',
]);
const LOCATION_INTERESTS = new Set([
  'opal-grand', 'opal-sol', 'jupiter-beach', 'multiple', 'undecided',
]);
const PURCHASE_INTENTS = new Set([
  'browsing', 'looking-to-purchase', 'custom-piece', 'gift',
]);

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

// In-memory rate limiter (per Netlify Function instance).
// 30 requests per IP per hour. Mitigates a malicious actor who has obtained
// a valid token from spamming garbage. Best-effort: serverless instances
// reset between cold starts, but the cap is enough to slow abuse.
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const _ipHits = new Map();

function rateLimit(ip) {
  if (!ip) return false;
  const now = Date.now();
  const entry = _ipHits.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    _ipHits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function clientIp(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown'
  );
}

function sanitizeEnum(value, allowed) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return undefined; // signals "invalid"
  const v = value.trim().toLowerCase();
  if (!allowed.has(v)) return undefined;
  return v;
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') return json(200, { ok: true }, origin);
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' }, origin);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json(500, { error: 'Service unavailable' }, origin);
  }

  if (rateLimit(clientIp(req))) {
    return json(429, { error: 'Too many requests. Please try again later.' }, origin);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' }, origin);
  }

  const token = (payload?.token || '').trim();
  if (!token || token.length < 16 || token.length > 64) {
    return json(400, { error: 'Invalid token.' }, origin);
  }

  const referral = sanitizeEnum(payload?.referral_source, REFERRAL_SOURCES);
  const location = sanitizeEnum(payload?.location_interest, LOCATION_INTERESTS);
  const intent = sanitizeEnum(payload?.purchase_intent, PURCHASE_INTENTS);

  if (referral === undefined || location === undefined || intent === undefined) {
    return json(400, { error: 'Invalid value submitted. Please try again.' }, origin);
  }

  // Require at least one field present (otherwise this is a no-op)
  if (referral == null && location == null && intent == null) {
    return json(400, { error: 'Please answer at least one question.' }, origin);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Verify token exists
    const { data: existing, error: lookupError } = await supabase
      .from('subscribers')
      .select('email, confirmed')
      .eq('unsubscribe_token', token)
      .maybeSingle();

    if (lookupError) {
      console.error('profile-update lookup error:', lookupError);
      return json(500, { error: 'Could not process your request.' }, origin);
    }
    if (!existing) {
      return json(404, { error: 'Link is no longer valid.' }, origin);
    }

    const update = { survey_completed_at: new Date().toISOString() };
    if (referral != null) update.referral_source = referral;
    if (location != null) update.location_interest = location;
    if (intent != null) update.purchase_intent = intent;

    const { error: updateError } = await supabase
      .from('subscribers')
      .update(update)
      .eq('unsubscribe_token', token);

    if (updateError) {
      console.error('profile-update update error:', updateError);
      return json(500, { error: 'Could not save your responses.' }, origin);
    }

    return json(200, { ok: true, message: 'Thank you — your preferences have been saved.' }, origin);
  } catch (err) {
    console.error('profile-update exception:', err);
    return json(500, { error: 'Something went wrong.' }, origin);
  }
};

export const config = { path: '/api/profile-update' };
