// Netlify Function: unsubscribe
// GET /api/unsubscribe?token=<uuid>  (token-based only — prevents abuse)
// Marks subscriber as unsubscribed in Supabase, returns a branded HTML page.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
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
    <a class="pill" href="${SITE_URL}">Return to site</a>
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

export default async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  // Token-only — no email fallback to prevent unsubscribe abuse
  if (!token) {
    return send(400, htmlPage({
      title: 'Invalid link',
      heading: 'Invalid unsubscribe link',
      message: 'This link is missing required information. If you continue to receive emails, please reply to any email and ask to be removed.',
      isError: true,
    }));
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return send(500, htmlPage({
      title: 'Service unavailable',
      heading: 'Something went wrong',
      message: 'Our unsubscribe service is temporarily unavailable. Please try again in a few minutes, or reply to any email to request removal.',
      isError: true,
    }));
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('subscribers')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .select('email')
      .maybeSingle();

    if (error) {
      console.error('Unsubscribe error:', error);
      return send(500, htmlPage({
        title: 'Error',
        heading: 'Unable to unsubscribe',
        message: 'We could not process your request. Please try again shortly, or reply to any email to request removal.',
        isError: true,
      }));
    }

    if (!data) {
      // Token didn't match — either invalid, or already unsubscribed
      return send(200, htmlPage({
        title: 'Already unsubscribed',
        heading: "You've been removed",
        message: 'This email address is no longer on our list. You will not receive further marketing emails from us.',
      }));
    }

    return send(200, htmlPage({
      title: 'Unsubscribed',
      heading: "You've been unsubscribed",
      message: `We've removed <strong>${data.email}</strong> from our list. You'll no longer receive marketing emails. We're sorry to see you go — you're welcome back anytime.`,
    }));
  } catch (err) {
    console.error('Unsubscribe exception:', err);
    return send(500, htmlPage({
      title: 'Error',
      heading: 'Something went wrong',
      message: 'Please try again in a few minutes.',
      isError: true,
    }));
  }
};

export const config = { path: '/api/unsubscribe' };
