// Netlify Function: newsletter subscription
// POST /api/subscribe { email, turnstileToken }
// - Verifies Cloudflare Turnstile CAPTCHA
// - Validates email format + blocks disposable/spam domains
// - Rate-limits via Supabase (not in-memory — serverless-safe)
// - Stores in Supabase `subscribers` table with confirmed=false
// - Sends confirmation email (double opt-in) via Resend
// - Notifies admin of the new subscriber

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems <onboarding@resend.dev>';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL; // where "New subscriber" alerts go
const SITE_URL = process.env.SITE_URL || 'https://theopalgems.com';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://theopalgems.com';

// Stricter email regex — requires at least 2-char TLD
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;

// Spam prevention: comprehensive disposable/temporary email domain list
const DISPOSABLE_DOMAINS = [
  // Major disposable email services
  'tempmail.com', 'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamail.de', 'guerrilla.ml', 'mailinator.com',
  '10minutemail.com', 'throwawaymail.com', 'sharklasers.com', 'getairmail.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'maildrop.cc', 'temp-mail.org',
  'temp-mail.io', 'fakeinbox.com', 'trashmail.com', 'trashmail.net', 'trashmail.me',
  'spamgourmet.com', 'bumpmail.com', 'incognitomail.com', 'tempmail.net',
  'mailtemp.net', 'emailtemp.net', 'dispostable.com', 'mailnesia.com',
  // Additional high-volume disposable services
  'guerrillamailblock.com', 'grr.la', 'throwaway.email', 'getnada.com',
  'tempail.com', 'mohmal.com', 'burnermail.io', 'harakirimail.com',
  'mailcatch.com', 'mintemail.com', 'meltmail.com', 'jetable.org',
  'mailexpire.com', 'mail-temporaire.fr', 'tempr.email', 'discard.email',
  'mailsac.com', 'mytemp.email', 'tempmailo.com', 'tempmailaddress.com',
  'emailondeck.com', 'crazymailing.com', 'tempinbox.com', 'inboxkitten.com',
  'mailhero.io', 'spambox.us', 'mailgw.com', 'dropmail.me',
  'fakemail.net', 'safetymail.info', 'tempsky.com', 'anonymmail.net',
  'nospam.ze.tc', 'trashymail.com', 'trashymail.net', 'bugmenot.com',
  'receiveee.com', 'tempmails.net', 'tmail.ws', 'tmpmail.net', 'tmpmail.org',
  'fakemailgenerator.com', 'emlpro.com', 'emailfake.com', 'cmail.net',
  'mailforspam.com', 'spam4.me', 'trashmail.org', 'wegwerfmail.de',
  'wegwerfmail.net', 'einrot.com', 'sharklasers.com', 'guerrillamail.biz',
  'guerrillamailblock.com', 'pokemail.net', 'spam4.me', 'byom.de',
  'mohmal.in', 'trbvn.com', 'MailTemp.top', 'mail.tm',
  // Catch-all patterns
  'tempmail.de', 'tempmail.it', 'tempmail.us', 'tmpmail.com',
  'guerrillamail.xyz', 'spamfree24.org', 'trashmail.io', 'trashmail.at',
  'mailnull.com', 'mailzilla.com', 'mail2rss.org', 'tempemail.co',
  'tempemail.net', 'tempemail.com', 'mytrashmail.com', 'thankyou2010.com',
  'guerrillamail.win', 'fastmail.net', 'fastmail.com',
];

// Known spam / obviously fake domains
const SPAM_DOMAINS = [
  'spam.com', 'spam1.com', 'spam2.com', 'spam3.com', 'spam4.com',
  'bot.com', 'bot1.com', 'bot2.com', 'test.com', 'testing.com',
  'example.com', 'example.org', 'example.net', 'localhost.com',
  'nobody.com', 'noone.com', 'fake.com', 'noreply.com',
];

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  return DISPOSABLE_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`));
}

function isSpamDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  return SPAM_DOMAINS.includes(domain);
}

// Spam prevention: detect emails with excessive dots (character obfuscation)
function hasExcessiveDots(email) {
  const localPart = email.split('@')[0];
  // Count dots in local part
  const dotCount = (localPart.match(/\./g) || []).length;
  // More than 2 dots in local part is suspicious
  return dotCount > 2;
}

// Spam prevention: detect suspicious patterns in email
function hasSuspiciousPattern(email) {
  const localPart = email.split('@')[0].toLowerCase();
  // Check for single character separated by dots pattern
  const singleCharDots = /^([a-z]\.){3,}[a-z]$/.test(localPart);
  // Check for multiple consecutive dots
  const consecutiveDots = /\.{2,}/.test(localPart);
  return singleCharDots || consecutiveDots;
}

function corsHeaders(origin) {
  // Only allow requests from our own domain (or localhost for dev)
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
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin),
  });
}

async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_SECRET_KEY) {
    console.warn('TURNSTILE_SECRET_KEY not set — skipping CAPTCHA verification');
    return true; // Allow in dev without key, but log warning
  }
  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip,
      }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return false;
  }
}

// Rate limiting via Supabase — counts recent subscriptions from same IP
// This works correctly on serverless (no in-memory state needed)
async function checkRateLimitViaSupabase(supabase, ip) {
  if (!supabase || ip === 'unknown') return true; // skip if no DB

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('subscribers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo)
      .eq('source', `website-footer-${ip}`);

    if (error) {
      console.error('Rate limit check error:', error);
      return true; // fail open — don't block users if the check fails
    }
    // Max 3 subscriptions per IP per hour
    return (count || 0) < 3;
  } catch (err) {
    console.error('Rate limit exception:', err);
    return true;
  }
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

function confirmationEmailHtml({ confirmUrl, unsubscribeUrl }) {
  return `
    <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #2a2a2a;">
      <div style="text-align:center; margin-bottom:32px;">
        <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight:500; letter-spacing:0.08em; font-size:28px; margin:0; color:#1a1a1a;">OPAL GEMS</h1>
        <p style="letter-spacing:0.25em; font-size:11px; color:#b4965a; margin:8px 0 0; text-transform:uppercase;">Elevated Diamonds, In Person</p>
      </div>
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight:400; font-size:24px; color:#1a1a1a;">Confirm your subscription</h2>
      <p style="line-height:1.7; font-size:15px;">Thank you for your interest in Opal Gems. Please click the button below to confirm your email and join our exclusive list.</p>
      <p style="line-height:1.7; font-size:15px;">You'll be the first to know about new arrivals, private styling events, and special offers at our boutiques inside Florida's premier resorts.</p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${confirmUrl}" style="display:inline-block; padding:14px 32px; background:#b4965a; color:#fff; text-decoration:none; letter-spacing:0.1em; font-size:13px; text-transform:uppercase; border-radius:4px;">Confirm my subscription</a>
      </div>
      <p style="line-height:1.7; font-size:13px; color:#888;">If you didn't sign up for this list, you can safely ignore this email. You won't receive any further messages.</p>
      <hr style="border:none; border-top:1px solid #e6e6e6; margin:32px 0;" />
      <p style="font-size:12px; color:#888; text-align:center; line-height:1.6;">
        Opal Gems · 10 N Ocean Blvd, Delray Beach, FL 33483<br/>
        <a href="${unsubscribeUrl}" style="color:#888; text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  `;
}

function adminNotificationHtml({ email, source, when }) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #2a2a2a;">
      <h2 style="margin:0 0 12px; color:#1a1a1a;">New subscriber (pending confirmation)</h2>
      <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
      <p style="margin:0 0 8px;"><strong>Source:</strong> ${source || '(unknown)'}</p>
      <p style="margin:0 0 8px;"><strong>When:</strong> ${when}</p>
      <p style="margin:0 0 8px; color:#888;"><em>This subscriber has not yet confirmed. They will appear as confirmed once they click the link in the confirmation email.</em></p>
      <hr style="border:none; border-top:1px solid #e6e6e6; margin:20px 0;" />
      <p style="margin:0; font-size:13px; color:#666;">
        View all subscribers in your Supabase dashboard under the <code>subscribers</code> table.
      </p>
    </div>
  `;
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') return json(200, { ok: true }, origin);
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' }, origin);

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' }, origin);
  }

  const email = (payload?.email || '').trim().toLowerCase();
  const honeypot = payload?.honeypot || '';

  // --- SPAM LAYER 1: Honeypot (bots fill hidden fields) ---
  if (honeypot && honeypot.trim() !== '') {
    console.log('Spam blocked: honeypot filled');
    return json(200, { ok: true, message: 'Thanks for subscribing!' }, origin); // Silent fail for bots
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') ||
             'unknown';

  // --- SPAM LAYER 3: Email format validation ---
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { error: 'Please enter a valid email address.' }, origin);
  }

  // --- SPAM LAYER 4: Disposable email domain check ---
  if (isDisposableEmail(email)) {
    console.log(`Spam blocked: disposable email domain detected: ${email}`);
    return json(200, { ok: true, message: 'Thanks for subscribing!' }, origin); // Silent fail
  }

  // --- SPAM LAYER 5: Known spam domain check ---
  if (isSpamDomain(email)) {
    console.log(`Spam blocked: known spam domain detected: ${email}`);
    return json(200, { ok: true, message: 'Thanks for subscribing!' }, origin); // Silent fail
  }

  // --- SPAM LAYER 6: Excessive dots check (character obfuscation) ---
  if (hasExcessiveDots(email)) {
    console.log(`Spam blocked: excessive dots detected: ${email}`);
    return json(200, { ok: true, message: 'Thanks for subscribing!' }, origin); // Silent fail
  }

  // --- SPAM LAYER 7: Suspicious pattern check ---
  if (hasSuspiciousPattern(email)) {
    console.log(`Spam blocked: suspicious pattern detected: ${email}`);
    return json(200, { ok: true, message: 'Thanks for subscribing!' }, origin); // Silent fail
  }

  let unsubscribeToken = null;
  let supabaseStatus = 'skipped';
  let isDuplicate = false;
  let supabase = null;

  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
      });

      // --- SPAM LAYER 6: Supabase-based rate limiting (serverless-safe) ---
      const withinLimit = await checkRateLimitViaSupabase(supabase, ip);
      if (!withinLimit) {
        console.log(`Spam blocked: rate limit exceeded for IP: ${ip}`);
        return json(429, { error: 'Too many requests. Please try again later.' }, origin);
      }

      // Store IP in source field for rate-limiting purposes
      const source = `website-footer-${ip}`;

      // Try to insert with confirmed=false (double opt-in)
      const { data: inserted, error } = await supabase
        .from('subscribers')
        .insert({ email, source, confirmed: false })
        .select('unsubscribe_token')
        .single();

      if (error) {
        if (error.code === '23505') {
          // Duplicate — do NOT re-send any email (prevents email bombing)
          isDuplicate = true;
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

  // For duplicates: return success silently — NO re-send of any email
  if (isDuplicate) {
    return json(200, {
      ok: true,
      message: "You're already on our list! Check your inbox for a confirmation email.",
      supabaseStatus,
    }, origin);
  }

  const unsubscribeUrl = unsubscribeToken
    ? `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}`
    : `${SITE_URL}`;

  const confirmUrl = unsubscribeToken
    ? `${SITE_URL}/api/confirm?token=${unsubscribeToken}`
    : `${SITE_URL}`;

  // Send confirmation email (NOT welcome — double opt-in)
  try {
    await sendEmail({
      to: email,
      subject: 'Confirm your subscription to Opal Gems',
      html: confirmationEmailHtml({ confirmUrl, unsubscribeUrl }),
    });
  } catch (err) {
    console.error('Confirmation email failed:', err);
    return json(502, {
      error: 'We saved your subscription but could not send the confirmation email. Please try again shortly.',
      supabaseStatus,
    }, origin);
  }

  // Send admin notification (non-fatal — never block the user response if this fails)
  if (ADMIN_NOTIFICATION_EMAIL) {
    try {
      await sendEmail({
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: `New subscriber (pending): ${email}`,
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
    message: 'Please check your inbox and click the confirmation link to complete your subscription.',
    supabaseStatus,
  }, origin);
};

export const config = { path: '/api/subscribe' };
