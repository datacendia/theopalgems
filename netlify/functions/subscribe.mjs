// Netlify Function: newsletter subscription
// POST /api/subscribe { email }
// - Validates email
// - Stores in Supabase `subscribers` table (with unique unsubscribe_token)
// - Sends branded confirmation email via Resend (with unsubscribe link)
// - Notifies admin of the new subscriber

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems <onboarding@resend.dev>';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL; // where "New subscriber" alerts go
const SITE_URL = process.env.SITE_URL || 'https://theopalgems.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

async function sendEmail({ to, subject, html, replyTo }) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return { skipped: true };
  }
  const body = {
    from: RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  };
  if (replyTo) body.reply_to = replyTo;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend error ${res.status}: ${txt}`);
  }
  return res.json();
}

function welcomeEmailHtml({ unsubscribeUrl }) {
  return `
    <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #2a2a2a;">
      <div style="text-align:center; margin-bottom:32px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight:500; letter-spacing:0.08em; font-size:28px; margin:0; color:#1a1a1a;">OPAL GEMS</h1>
        <p style="letter-spacing:0.25em; font-size:11px; color:#b4965a; margin:8px 0 0; text-transform:uppercase;">Elevated Diamonds, In Person</p>
      </div>
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight:400; font-size:24px; color:#1a1a1a;">Welcome to Opal Gems.</h2>
      <p style="line-height:1.7; font-size:15px;">Thank you for joining our exclusive list. You'll be the first to know about new arrivals, private styling events, and special offers at our boutiques inside Florida's premier resorts.</p>
      <p style="line-height:1.7; font-size:15px;">We look forward to welcoming you in person.</p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${SITE_URL}" style="display:inline-block; padding:12px 28px; background:#b4965a; color:#fff; text-decoration:none; letter-spacing:0.1em; font-size:13px; text-transform:uppercase;">Visit our boutiques</a>
      </div>
      <hr style="border:none; border-top:1px solid #e6e6e6; margin:32px 0;" />
      <p style="font-size:12px; color:#888; text-align:center; line-height:1.6;">
        Opal Gems · 10 N Ocean Blvd, Delray Beach, FL 33483<br/>
        You're receiving this because you subscribed at theopalgems.com.<br/>
        <a href="${unsubscribeUrl}" style="color:#888; text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `;
}

function adminNotificationHtml({ email, source, when }) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #2a2a2a;">
      <h2 style="margin:0 0 12px; color:#1a1a1a;">New subscriber</h2>
      <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
      <p style="margin:0 0 8px;"><strong>Source:</strong> ${source || '(unknown)'}</p>
      <p style="margin:0 0 8px;"><strong>When:</strong> ${when}</p>
      <hr style="border:none; border-top:1px solid #e6e6e6; margin:20px 0;" />
      <p style="margin:0; font-size:13px; color:#666;">
        View all subscribers in your Supabase dashboard under the <code>subscribers</code> table.
      </p>
    </div>
  `;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return json(200, { ok: true });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const email = (payload?.email || '').trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { error: 'Please enter a valid email address.' });
  }

  let unsubscribeToken = null;
  let supabaseStatus = 'skipped';
  let isDuplicate = false;

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
      });

      // Try to insert and get the row back (including generated token)
      const { data: inserted, error } = await supabase
        .from('subscribers')
        .insert({ email, source: 'website-footer' })
        .select('unsubscribe_token')
        .single();

      if (error) {
        if (error.code === '23505') {
          // duplicate: fetch existing token so they can still unsubscribe
          isDuplicate = true;
          const { data: existing } = await supabase
            .from('subscribers')
            .select('unsubscribe_token')
            .eq('email', email)
            .single();
          unsubscribeToken = existing?.unsubscribe_token || null;
          supabaseStatus = 'already-subscribed';
        } else {
          console.error('Supabase insert error:', error);
          supabaseStatus = 'error';
        }
      } else {
        unsubscribeToken = inserted?.unsubscribe_token || null;
        supabaseStatus = 'saved';
      }
    } catch (err) {
      console.error('Supabase exception:', err);
      supabaseStatus = 'error';
    }
  }

  const unsubscribeUrl = unsubscribeToken
    ? `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}`
    : `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(email)}`;

  // Send welcome email
  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to Opal Gems',
      html: welcomeEmailHtml({ unsubscribeUrl }),
    });
  } catch (err) {
    console.error('Welcome email failed:', err);
    return json(502, {
      error: 'We saved your subscription but could not send the confirmation email. Please try again shortly.',
      supabaseStatus,
    });
  }

  // Send admin notification (non-fatal — never block the user response if this fails)
  if (ADMIN_NOTIFICATION_EMAIL && !isDuplicate) {
    try {
      await sendEmail({
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: `New subscriber: ${email}`,
        html: adminNotificationHtml({
          email,
          source: 'website-footer',
          when: new Date().toISOString(),
        }),
        replyTo: email,
      });
    } catch (err) {
      console.error('Admin notification failed (non-fatal):', err);
    }
  }

  return json(200, {
    ok: true,
    message: isDuplicate
      ? "You're already on our list — we've resent your welcome email."
      : 'Thanks for subscribing! Check your inbox for a welcome message.',
    supabaseStatus,
  });
};

export const config = { path: '/api/subscribe' };
