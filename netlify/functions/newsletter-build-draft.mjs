// Netlify Scheduled Function: build the next newsletter draft
//
// Runs weekly, but only creates a draft when it's been ~14 days since the
// last edition (Netlify cron can't natively express "every other week").
// Builds a themed draft from the seasonal calendar + auto-suggested pieces,
// saves it as status='draft', and emails the owner a "ready to review" link.
//
// Cron: Mondays 14:00 UTC.

import { createClient } from '@supabase/supabase-js';
import { themeForDate, suggestPieces } from '../../src/lib/newsletterThemes.js';
import { kiraProducts } from '../../src/data/kiraProducts.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems <hello@theopalgems.com>';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
const SITE_URL = process.env.SITE_URL || 'https://theopalgems.com';

const MIN_GAP_DAYS = 13; // only build a new draft if the last one is older than this

const slim = (p) => ({
  name: p.name,
  description: p.description || '',
  price: p.price ?? null,
  link: p.link || p.image || '',
  category: p.category || '',
});

async function notifyOwner(edition) {
  if (!RESEND_API_KEY || !ADMIN_NOTIFICATION_EMAIL) return;
  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#2a2a2a;">
      <h2 style="color:#1a1a1a;">Your next newsletter draft is ready</h2>
      <p style="line-height:1.7;">A <strong>${edition.theme_name}</strong> edition has been drafted with ${edition.pieces.length} pieces.</p>
      <p style="line-height:1.7;">Subject: <em>${edition.subject}</em></p>
      <p style="margin:24px 0;">
        <a href="${SITE_URL}/admin/newsletter" style="display:inline-block;padding:12px 26px;background:#b4965a;color:#fff;text-decoration:none;border-radius:50px;letter-spacing:0.08em;font-size:13px;text-transform:uppercase;">Review &amp; send</a>
      </p>
      <p style="font-size:13px;color:#888;line-height:1.6;">Nothing is sent until you review it and click Send in the admin.</p>
    </div>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: ADMIN_NOTIFICATION_EMAIL, subject: 'Your next Opal Gems newsletter draft is ready', html }),
    });
  } catch (err) {
    console.error('owner notify failed:', err.message);
  }
}

export default async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase config');
    return new Response('config error', { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  // Biweekly gate: skip if the most recent edition is younger than MIN_GAP_DAYS.
  const { data: recent, error: recErr } = await supabase
    .from('newsletter_editions')
    .select('id, created_at, pieces')
    .order('created_at', { ascending: false })
    .limit(3);
  if (recErr) { console.error(recErr); return new Response('db error', { status: 500 }); }

  if (recent && recent.length) {
    const ageDays = (Date.now() - new Date(recent[0].created_at).getTime()) / 86400000;
    if (ageDays < MIN_GAP_DAYS) {
      console.log(`Skip: last edition is ${ageDays.toFixed(1)}d old (< ${MIN_GAP_DAYS}).`);
      return new Response('skipped (too soon)', { status: 200 });
    }
  }

  // Avoid repeating pieces featured in the last few editions.
  const excludeNames = (recent || []).flatMap((e) => (Array.isArray(e.pieces) ? e.pieces.map((p) => p.name) : []));

  const theme = themeForDate(new Date());
  const pieces = suggestPieces(theme, kiraProducts, { count: 4, excludeNames }).map(slim);

  const scheduledFor = new Date(Date.now() + 2 * 86400000).toISOString(); // suggested send ~2 days out
  const draft = {
    theme_key: theme.key,
    theme_name: theme.name,
    subject: theme.subject,
    headline: theme.headline,
    intro: theme.intro,
    pieces,
    status: 'draft',
    scheduled_for: scheduledFor,
  };

  const { data: inserted, error: insErr } = await supabase
    .from('newsletter_editions').insert(draft).select().single();
  if (insErr) { console.error('insert failed:', insErr); return new Response('insert error', { status: 500 }); }

  await notifyOwner(inserted);
  console.log(`Draft created: ${theme.name} (${pieces.length} pieces)`);
  return new Response('draft created', { status: 200 });
};

// Weekly cron; the 13-day gate above makes it fire biweekly.
export const config = { schedule: '0 14 * * 1' };
