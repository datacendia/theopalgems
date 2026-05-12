// Netlify Function: confirm subscription (double opt-in)
// GET /api/confirm?token=<uuid>
// Marks subscriber as confirmed in Supabase, sends welcome email, returns branded HTML page.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems <onboarding@resend.dev>';
const SITE_URL = process.env.SITE_URL || 'https://theopalgems.com';

function htmlPage({ title, heading, message, isError = false }) {
  const accent = isError ? '#c0392b' : '#b4965a';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Opal Gems</title>
  <meta name="robots" content="noindex" />
  <style>
    body { font-family: Georgia, serif; background:#faf8f5; color:#2a2a2a; margin:0; padding:0; min-height:100vh; display:flex; align-items:center; justify-content:center; }
    .card { background:#fff; max-width:520px; margin:20px; padding:48px 32px; border-radius:8px; box-shadow:0 4px 24px rgba(0,0,0,0.06); text-align:center; }
    .brand { letter-spacing:0.1em; font-size:22px; font-weight:500; color:#1a1a1a; margin:0; }
    .eyebrow { letter-spacing:0.25em; font-size:11px; color:${accent}; margin:6px 0 24px; text-transform:uppercase; }
    h1 { font-weight:400; font-size:26px; color:#1a1a1a; margin:0 0 16px; }
    p { line-height:1.7; font-size:15px; color:#4a4a4a; margin:0 0 16px; }
    .pill { display:inline-block; padding:12px 28px; background:${accent}; color:#fff; text-decoration:none; letter-spacing:0.1em; font-size:13px; text-transform:uppercase; margin-top:16px; border-radius:50px; }
  </style>
</head>
<body>
  <div class="card">
    <p class="brand">OPAL GEMS</p>
    <p class="eyebrow">Elevated Diamonds, In Person</p>
    <h1>${heading}</h1>
    <p>${message}</p>
    <a class="pill" href="${SITE_URL}">Visit our boutiques</a>
  </div>
</body>
</html>`;
}

function send(status, html) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return { skipped: true };
  }

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
      <p style="line-height:1.7; font-size:15px;">Thank you for confirming your subscription. You'll be the first to know about new arrivals, private styling events, and special offers at our boutiques inside Florida's premier resorts.</p>
      <p style="line-height:1.7; font-size:15px;">We look forward to welcoming you in person.</p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${SITE_URL}" style="display:inline-block; padding:12px 28px; background:#b4965a; color:#fff; text-decoration:none; letter-spacing:0.1em; font-size:13px; text-transform:uppercase;">Visit our boutiques</a>
      </div>
      <hr style="border:none; border-top:1px solid #e6e6e6; margin:32px 0;" />
      <p style="font-size:12px; color:#888; text-align:center; line-height:1.6;">
        Opal Gems · 10 N Ocean Blvd, Delray Beach, FL 33483<br/>
        You're receiving this because you confirmed your subscription at theopalgems.com.<br/>
        <a href="${unsubscribeUrl}" style="color:#888; text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `;
}

export default async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return send(400, htmlPage({
      title: 'Invalid link',
      heading: 'Invalid confirmation link',
      message: 'This link is missing required information. Please try subscribing again from our website.',
      isError: true,
    }));
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return send(500, htmlPage({
      title: 'Service unavailable',
      heading: 'Something went wrong',
      message: 'Our confirmation service is temporarily unavailable. Please try again in a few minutes.',
      isError: true,
    }));
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Look up the subscriber by token
    const { data: subscriber, error: lookupError } = await supabase
      .from('subscribers')
      .select('email, confirmed, unsubscribe_token')
      .eq('unsubscribe_token', token)
      .maybeSingle();

    if (lookupError) {
      console.error('Confirmation lookup error:', lookupError);
      return send(500, htmlPage({
        title: 'Error',
        heading: 'Unable to confirm',
        message: 'We could not process your request. Please try again shortly.',
        isError: true,
      }));
    }

    if (!subscriber) {
      return send(400, htmlPage({
        title: 'Invalid link',
        heading: 'Link expired or invalid',
        message: 'This confirmation link is no longer valid. Please try subscribing again from our website.',
        isError: true,
      }));
    }

    // Already confirmed
    if (subscriber.confirmed) {
      return send(200, htmlPage({
        title: 'Already confirmed',
        heading: "You're already confirmed!",
        message: `<strong>${subscriber.email}</strong> is already on our list. You'll continue to receive our updates.`,
      }));
    }

    // Mark as confirmed and schedule survey email for 24h later
    const surveyScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: updateError } = await supabase
      .from('subscribers')
      .update({ confirmed: true, survey_scheduled_at: surveyScheduledAt })
      .eq('unsubscribe_token', token);

    if (updateError) {
      console.error('Confirmation update error:', updateError);
      return send(500, htmlPage({
        title: 'Error',
        heading: 'Unable to confirm',
        message: 'We could not process your request. Please try again shortly.',
        isError: true,
      }));
    }

    // Send the actual welcome email now that they confirmed
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${token}`;
    try {
      await sendEmail({
        to: subscriber.email,
        subject: 'Welcome to Opal Gems',
        html: welcomeEmailHtml({ unsubscribeUrl }),
      });
    } catch (err) {
      console.error('Welcome email failed after confirmation:', err);
      // Non-fatal — they're confirmed, just the welcome email failed
    }

    // Redirect to the preferences page so we can capture richer profile info
    // (referral source, location interest, purchase intent). The token doubles
    // as the survey identifier; the welcome email is still on its way.
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${SITE_URL}/preferences?token=${encodeURIComponent(token)}&confirmed=1`,
      },
    });
  } catch (err) {
    console.error('Confirmation exception:', err);
    return send(500, htmlPage({
      title: 'Error',
      heading: 'Something went wrong',
      message: 'Please try again in a few minutes.',
      isError: true,
    }));
  }
};

export const config = { path: '/api/confirm' };
