#!/usr/bin/env node
/**
 * Generic newsletter sender for Opal Gems (Path A — own stack).
 *
 * Reads an HTML body from a file, optionally filters subscribers by segment,
 * records the campaign + per-recipient send rows in the database, and sends
 * via Resend with rate limiting.
 *
 * Usage:
 *   node scripts/send-newsletter.mjs \
 *     --subject "May arrivals at Opal Sol" \
 *     --html ./drafts/may-arrivals.html \
 *     [--preheader "Three new pieces just arrived in Clearwater"] \
 *     [--location opal-sol] \              # filter by location_interest
 *     [--intent looking-to-purchase] \     # filter by purchase_intent
 *     [--source instagram] \               # filter by referral_source
 *     [--dry-run] [--yes] [--limit=50]
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, SITE_URL
 *
 * Pre-req: run the SQL in SUBSCRIBER_PROFILE_SETUP.md (creates newsletter_campaigns + newsletter_sends tables).
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(path.resolve(__dirname, '..'), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems <hello@theopalgems.com>';
const SITE_URL = process.env.SITE_URL || 'https://theopalgems.com';

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) {
    const long = process.argv.find((a) => a.startsWith(`${flag}=`));
    return long ? long.split('=').slice(1).join('=') : fallback;
  }
  return process.argv[idx + 1] ?? fallback;
}
const SUBJECT = getArg('--subject');
const HTML_PATH = getArg('--html');
const PREHEADER = getArg('--preheader', '');
const SEG_LOCATION = getArg('--location');
const SEG_INTENT = getArg('--intent');
const SEG_SOURCE = getArg('--source');
const LIMIT_RAW = getArg('--limit');
const LIMIT = LIMIT_RAW ? parseInt(LIMIT_RAW, 10) : null;
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_CONFIRM = process.argv.includes('--yes') || process.argv.includes('-y');

if (!SUBJECT || !HTML_PATH) {
  console.error('Required: --subject "..." --html ./path/to/body.html');
  process.exit(1);
}
if (!fs.existsSync(HTML_PATH)) {
  console.error(`HTML file not found: ${HTML_PATH}`);
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!DRY_RUN && !RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY (or use --dry-run)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const bodyHtml = fs.readFileSync(HTML_PATH, 'utf-8');

function wrapTemplate({ inner, unsubscribeUrl, preferencesUrl, preheader }) {
  // Light wrapper providing branded header, hidden preheader for inbox preview, and footer with unsubscribe
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Opal Gems</title></head>
<body style="margin:0; padding:0; background:#faf8f5; font-family: Georgia, serif; color:#2a2a2a;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader || ''}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:6px;">
        <tr><td style="padding:32px 32px 16px; text-align:center;">
          <h1 style="font-family:'Cormorant Garamond', Georgia, serif; font-weight:500; letter-spacing:0.08em; font-size:28px; margin:0; color:#1a1a1a;">OPAL GEMS</h1>
          <p style="letter-spacing:0.25em; font-size:11px; color:#b4965a; margin:8px 0 0; text-transform:uppercase;">Elevated Diamonds, In Person</p>
        </td></tr>
        <tr><td style="padding:8px 32px 32px;">
          ${inner}
        </td></tr>
        <tr><td style="padding:24px 32px; border-top:1px solid #e6e6e6; text-align:center; font-size:12px; color:#888; line-height:1.6;">
          Opal Gems · 10 N Ocean Blvd, Delray Beach, FL 33483<br/>
          <a href="${preferencesUrl}" style="color:#888; text-decoration:underline;">Update preferences</a>
          &nbsp;·&nbsp;
          <a href="${unsubscribeUrl}" style="color:#888; text-decoration:underline;">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendEmail({ to, subject, html }) {
  if (DRY_RUN) return { dryRun: true };
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

async function promptConfirm(message) {
  if (SKIP_CONFIRM) return true;
  console.log(`\n${message}`);
  console.log('Type "yes" to confirm, anything else to cancel:');
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    return chunk.trim().toLowerCase() === 'yes';
  }
  return false;
}

async function main() {
  console.log('Loading recipient list...');
  let q = supabase
    .from('subscribers')
    .select('email, unsubscribe_token, location_interest, purchase_intent, referral_source')
    .eq('confirmed', true)
    .is('unsubscribed_at', null);
  if (SEG_LOCATION) q = q.eq('location_interest', SEG_LOCATION);
  if (SEG_INTENT) q = q.eq('purchase_intent', SEG_INTENT);
  if (SEG_SOURCE) q = q.eq('referral_source', SEG_SOURCE);
  if (LIMIT) q = q.limit(LIMIT);

  const { data: recipients, error } = await q;
  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }
  if (!recipients?.length) {
    console.log('No matching recipients.');
    return;
  }

  console.log(`Subject: ${SUBJECT}`);
  console.log(`HTML body: ${HTML_PATH} (${bodyHtml.length} bytes)`);
  console.log(`Segment: location=${SEG_LOCATION || '*'} intent=${SEG_INTENT || '*'} source=${SEG_SOURCE || '*'}`);
  console.log(`Recipients: ${recipients.length}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no emails sent)' : 'LIVE SEND'}\n`);

  const ok = await promptConfirm('About to send to all recipients above.');
  if (!ok) {
    console.log('Cancelled.');
    process.exit(0);
  }

  // Record campaign in DB (skipped on dry-run)
  let campaignId = null;
  if (!DRY_RUN) {
    const { data: campaign, error: campErr } = await supabase
      .from('newsletter_campaigns')
      .insert({
        subject: SUBJECT,
        preheader: PREHEADER || null,
        html_body: bodyHtml,
        status: 'sending',
        recipients_count: recipients.length,
      })
      .select('id')
      .single();
    if (campErr) {
      console.error('Failed to record campaign — proceeding without DB log:', campErr.message);
    } else {
      campaignId = campaign.id;
      console.log(`Campaign recorded: ${campaignId}`);
    }
  }

  let success = 0;
  let failed = 0;

  for (const r of recipients) {
    if (!r.unsubscribe_token) {
      console.log(`  skip ${r.email} (no token)`);
      failed++;
      continue;
    }
    const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${encodeURIComponent(r.unsubscribe_token)}`;
    const preferencesUrl = `${SITE_URL}/preferences?token=${encodeURIComponent(r.unsubscribe_token)}`;
    const wrapped = wrapTemplate({ inner: bodyHtml, unsubscribeUrl, preferencesUrl, preheader: PREHEADER });

    try {
      const result = await sendEmail({ to: r.email, subject: SUBJECT, html: wrapped });
      console.log(`  ${DRY_RUN ? 'DRY' : '✓'} ${r.email}`);
      success++;
      if (campaignId && !DRY_RUN) {
        await supabase.from('newsletter_sends').insert({
          campaign_id: campaignId,
          subscriber_email: r.email,
          resend_id: result?.id || null,
        });
      }
      if (!DRY_RUN) await new Promise((res) => setTimeout(res, 120));
    } catch (err) {
      console.error(`  ✗ ${r.email} — ${err.message}`);
      failed++;
      if (campaignId && !DRY_RUN) {
        await supabase.from('newsletter_sends').insert({
          campaign_id: campaignId,
          subscriber_email: r.email,
          error: err.message,
        });
      }
    }
  }

  if (campaignId && !DRY_RUN) {
    await supabase
      .from('newsletter_campaigns')
      .update({ status: failed === recipients.length ? 'failed' : 'sent', sent_at: new Date().toISOString() })
      .eq('id', campaignId);
  }

  console.log(`\nDone. ${DRY_RUN ? 'Would send' : 'Sent'}: ${success}. Failed: ${failed}.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
