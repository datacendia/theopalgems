// Netlify Scheduled Function: send delayed survey emails
// Runs daily via cron to send survey emails to subscribers whose
// survey_scheduled_at has passed but they haven't completed it yet.
//
// Schedule: every 6 hours (more frequent than daily to catch timezones)
// Cron: 0 */6 * * *

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems <hello@theopalgems.com>';
const SITE_URL = process.env.SITE_URL || 'https://theopalgems.com';

function surveyEmailHtml({ preferencesUrl, unsubscribeUrl }) {
  return `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #2a2a2a;">
      <div style="text-align:center; margin-bottom:32px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight:500; letter-spacing:0.08em; font-size:28px; margin:0; color:#1a1a1a;">OPAL GEMS</h1>
        <p style="letter-spacing:0.25em; font-size:11px; color:#b4965a; margin:8px 0 0; text-transform:uppercase;">Elevated Diamonds, In Person</p>
      </div>
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight:400; font-size:24px; color:#1a1a1a;">Help us send you what you'll love.</h2>
      <p style="line-height:1.7; font-size:15px;">Thank you for being part of the Opal Gems list. We're working on more thoughtful, less frequent emails — pieces, events, and offers tied to the boutique you actually visit.</p>
      <p style="line-height:1.7; font-size:15px;">Three quick questions (under a minute) will help us send you more relevant updates.</p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${preferencesUrl}" style="display:inline-block; padding:14px 32px; background:#b4965a; color:#fff; text-decoration:none; letter-spacing:0.1em; font-size:13px; text-transform:uppercase; border-radius:50px;">Tell us about you</a>
      </div>
      <p style="line-height:1.7; font-size:13px; color:#888;">Your answers are private and only used to tailor what we send you.</p>
      <hr style="border:none; border-top:1px solid #e6e6e6; margin:32px 0;" />
      <p style="font-size:12px; color:#888; text-align:center; line-height:1.6;">
        Opal Gems · 10 N Ocean Blvd, Delray Beach, FL 33483<br/>
        <a href="${unsubscribeUrl}" style="color:#888; text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `;
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
  return res.json();
}

export default async (req) => {
  console.log('send-scheduled-survey: starting');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return { statusCode: 500, body: 'Configuration error' };
  }

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email sends');
    return { statusCode: 200, body: 'Skipped: no API key' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Find subscribers where:
  // - survey_scheduled_at <= NOW() (time to send)
  // - survey_completed_at IS NULL (not yet completed)
  // - unsubscribed_at IS NULL (still subscribed)
  // - confirmed = true (confirmed subscribers only)
  const now = new Date().toISOString();
  const { data: recipients, error } = await supabase
    .from('subscribers')
    .select('email, unsubscribe_token')
    .lte('survey_scheduled_at', now)
    .is('survey_completed_at', null)
    .is('unsubscribed_at', null)
    .eq('confirmed', true);

  if (error) {
    console.error('Query error:', error);
    return { statusCode: 500, body: 'Database error' };
  }

  if (!recipients?.length) {
    console.log('No pending survey emails to send');
    return { statusCode: 200, body: 'No pending emails' };
  }

  console.log(`Found ${recipients.length} pending survey emails`);

  let sent = 0;
  let failed = 0;

  for (const r of recipients) {
    if (!r.unsubscribe_token) {
      console.log(`  skip ${r.email} (no token)`);
      failed++;
      continue;
    }

    const preferencesUrl = `${SITE_URL}/preferences?token=${encodeURIComponent(r.unsubscribe_token)}`;
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(r.unsubscribe_token)}`;

    try {
      await sendEmail({
        to: r.email,
        subject: 'A quick favor — help us tailor your Opal Gems updates',
        html: surveyEmailHtml({ preferencesUrl, unsubscribeUrl }),
      });
      console.log(`  ✓ ${r.email}`);
      sent++;
      // Rate limit: 120ms between sends
      await new Promise((res) => setTimeout(res, 120));
    } catch (err) {
      console.error(`  ✗ ${r.email} — ${err.message}`);
      failed++;
    }
  }

  console.log(`Done. Sent: ${sent}, Failed: ${failed}`);
  return { statusCode: 200, body: `Sent: ${sent}, Failed: ${failed}` };
};

// Netlify scheduled function: every 6 hours
export const config = {
  schedule: '0 */6 * * *',
};
