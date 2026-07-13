// Netlify Function: /api/newsletter-send
// Renders a newsletter edition and delivers it via Resend.
//   POST { editionId, testEmail? }
//   - Admin-JWT authenticated (same scheme as admin-data.mjs).
//   - testEmail set  -> send only to that address; do NOT mark as sent.
//   - testEmail null -> send to all confirmed, non-unsubscribed subscribers,
//                       then mark the edition sent + record counts.
//
// Note: sends sequentially with a small delay. Fine for the current list size;
// if the list grows large, convert to a Netlify background function.

import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { newsletterEmailHtml } from '../../src/lib/newsletterEmail.js';
import { themeByKey } from '../../src/lib/newsletterThemes.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems <hello@theopalgems.com>';
const SITE_URL = process.env.SITE_URL || 'https://theopalgems.com';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://theopalgems.com';

function corsHeaders(origin) {
  const isAllowed = origin === ALLOWED_ORIGIN || origin === 'http://localhost:5173' || origin === 'http://localhost:3000';
  const h = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
  if (isAllowed) { h['Access-Control-Allow-Origin'] = origin; h['Access-Control-Allow-Credentials'] = 'true'; }
  return h;
}
const json = (status, body, origin) => new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });

function verifyAdminJwt(req) {
  if (!ADMIN_JWT_SECRET) return false;
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const [payloadB64, sigB64] = m[1].trim().split('.');
  if (!payloadB64 || !sigB64) return false;
  try {
    const expected = createHmac('sha256', ADMIN_JWT_SECRET).update(payloadB64).digest();
    const provided = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;
    const payload = JSON.parse(Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return payload?.exp && Date.now() <= payload.exp && payload.role === 'admin';
  } catch { return false; }
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' }, origin);
  if (!verifyAdminJwt(req)) return json(401, { error: 'Unauthorized' }, origin);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return json(500, { error: 'Server not configured' }, origin);
  if (!RESEND_API_KEY) return json(500, { error: 'RESEND_API_KEY not set' }, origin);

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }, origin); }
  const { editionId, testEmail } = body || {};
  if (!editionId) return json(400, { error: 'editionId required' }, origin);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  const { data: edition, error: edErr } = await supabase
    .from('newsletter_editions').select('*').eq('id', editionId).maybeSingle();
  if (edErr) return json(500, { error: edErr.message }, origin);
  if (!edition) return json(404, { error: 'Edition not found' }, origin);
  if (edition.status === 'sent' && !testEmail) return json(400, { error: 'This edition has already been sent.' }, origin);
  if (!Array.isArray(edition.pieces) || edition.pieces.length === 0) return json(400, { error: 'Edition has no pieces.' }, origin);

  const accent = themeByKey(edition.theme_key)?.accent;
  const render = (unsubscribeUrl) => newsletterEmailHtml({
    themeName: edition.theme_name || '',
    headline: edition.headline || '',
    intro: edition.intro || '',
    pieces: edition.pieces,
    siteUrl: SITE_URL,
    unsubscribeUrl,
    accent,
  });
  const subject = edition.subject || 'Opal Gems';

  // ── Test send ──
  if (testEmail) {
    try {
      await sendEmail({ to: testEmail, subject, html: render(`${SITE_URL}/preferences`) });
      return json(200, { ok: true, test: true, sent: 1 }, origin);
    } catch (err) {
      return json(502, { error: `Test send failed: ${err.message}` }, origin);
    }
  }

  // ── Real send to confirmed subscribers ──
  const { data: recipients, error: rErr } = await supabase
    .from('subscribers')
    .select('email, unsubscribe_token')
    .eq('confirmed', true)
    .is('unsubscribed_at', null);
  if (rErr) return json(500, { error: rErr.message }, origin);

  let sent = 0, failed = 0;
  for (const r of recipients || []) {
    const unsub = r.unsubscribe_token
      ? `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(r.unsubscribe_token)}`
      : `${SITE_URL}`;
    try {
      await sendEmail({ to: r.email, subject, html: render(unsub) });
      sent++;
      await new Promise((res) => setTimeout(res, 120));
    } catch (err) {
      console.error(`newsletter send failed for ${r.email}:`, err.message);
      failed++;
    }
  }

  await supabase.from('newsletter_editions').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    recipients_count: (recipients || []).length,
    sent_count: sent,
  }).eq('id', editionId);

  return json(200, { ok: true, sent, failed, recipients: (recipients || []).length }, origin);
};

export const config = { path: '/api/newsletter-send' };
