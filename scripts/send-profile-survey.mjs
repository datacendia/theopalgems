#!/usr/bin/env node
/**
 * One-time profile survey blast.
 * Sends a short branded email to every confirmed subscriber that has NOT
 * yet completed the profile survey, asking them to fill it out.
 *
 * Each recipient gets a unique link with their unsubscribe_token so we can
 * attribute their answers back to their row.
 *
 * Usage:
 *   node scripts/send-profile-survey.mjs              # interactive — asks confirm
 *   node scripts/send-profile-survey.mjs --dry-run    # log who would receive, send nothing
 *   node scripts/send-profile-survey.mjs --yes        # skip confirm prompt
 *   node scripts/send-profile-survey.mjs --limit=10   # cap recipients
 *
 * Required env vars (.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL
 *   SITE_URL (defaults to https://theopalgems.com)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(path.resolve(__dirname, '..'), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems <hello@theopalgems.com>';
const SITE_URL = process.env.SITE_URL || 'https://theopalgems.com';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_CONFIRM = args.includes('--yes') || args.includes('-y');
const LIMIT = (() => {
  const a = args.find((x) => x.startsWith('--limit='));
  return a ? parseInt(a.split('=')[1], 10) : null;
})();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}
if (!DRY_RUN && !RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY (use --dry-run to skip sending)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

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
  console.log('Fetching subscribers without survey responses...');
  let query = supabase
    .from('subscribers')
    .select('email, unsubscribe_token, created_at')
    .eq('confirmed', true)
    .is('unsubscribed_at', null)
    .is('survey_completed_at', null)
    .order('created_at', { ascending: true });
  if (LIMIT) query = query.limit(LIMIT);

  const { data: recipients, error } = await query;
  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }
  if (!recipients?.length) {
    console.log('No subscribers need the survey. All done.');
    return;
  }

  console.log(`\nFound ${recipients.length} recipients:`);
  for (const r of recipients.slice(0, 10)) {
    console.log(`  - ${r.email}`);
  }
  if (recipients.length > 10) console.log(`  ... and ${recipients.length - 10} more`);

  const ok = await promptConfirm(
    DRY_RUN
      ? `DRY RUN — no emails will actually be sent.`
      : `This will send the profile survey email to ${recipients.length} recipients.`
  );
  if (!ok) {
    console.log('Cancelled.');
    process.exit(0);
  }

  let success = 0;
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
      console.log(`  ${DRY_RUN ? 'DRY' : '✓'} ${r.email}`);
      success++;
      if (!DRY_RUN) await new Promise((res) => setTimeout(res, 120)); // rate limit
    } catch (err) {
      console.error(`  ✗ ${r.email} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. ${DRY_RUN ? 'Would send' : 'Sent'}: ${success}. Failed: ${failed}.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
