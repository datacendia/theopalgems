#!/usr/bin/env node
/**
 * Email campaign script for Opal Gems subscribers
 * Run: node scripts/send-campaign.mjs
 * 
 * Environment variables needed:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 * - RESEND_API_KEY
 * - RESEND_FROM_EMAIL
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Opal Gems Sales <sales@theopalgems.com>';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
  console.error('Missing required environment variables:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_KEY');
  console.error('- RESEND_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend error ${res.status}: ${txt}`);
  }
  return res.json();
}

function generateCampaignHtml() {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="width=device-width" name="viewport" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta
      content="telephone=no,address=no,email=no,date=no,url=no"
      name="format-detection" />
  </head>
  <body style="background-color:#f5f0e8">
    <div
      style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0"
      data-skip-in-text="true">
      Tell us what fine diamond jewelry you&#x27;re looking for.
      <div>
         ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿ ‌​‍‎‏﻿
      </div>
    </div>
    <table
      border="0"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      align="center">
      <tbody>
        <tr>
          <td style="background-color:#f5f0e8">
            <table
              align="center"
              width="100%"
              border="0"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="max-width:600px;align:center;width:100%;color:#2a2a2a;background-color:#f5f0e8;padding-top:40px;padding-right:24px;padding-bottom:40px;padding-left:24px">
              <tbody>
                <tr style="width:100%">
                  <td>
                    <table
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="text-align:center;padding-bottom:32px">
                      <tbody>
                        <tr>
                          <td>
                            <h1
                              style="margin:0;padding:0;color:#1a1a1a;font-size:32px;font-weight:normal;letter-spacing:2px;margin-top:0;margin-bottom:8px;text-align:center">
                              OPAL GEMS
                            </h1>
                            <p
                              style="margin:0;padding:0;font-size:14px;color:#666666;line-height:160%;letter-spacing:1px;margin-top:0;margin-bottom:0;text-align:center">
                              FINE DIAMOND JEWELRY
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      style="background-color:#ffffff;padding-top:40px;padding-right:32px;padding-bottom:40px;padding-left:32px;border-radius:8px">
                      <tbody>
                        <tr>
                          <td>
                            <h2
                              style="margin:0;padding:0;color:#1a1a1a;font-size:24px;font-weight:normal;margin-top:0;margin-bottom:20px">
                              A Warm Hello from Opal Gems
                            </h2>
                            <p
                              style="margin:0;padding:0;font-size:16px;color:#444444;line-height:160%;margin-top:0;margin-bottom:20px">
                              Thank you for being part of the Opal Gems community. We truly
                              appreciate your interest in our collection of fine
                              diamond jewelry.
                            </p>
                            <p
                              style="margin:0;padding:0;font-size:1em;color:#444444;line-height:160%">
                              In order to provide you with the best possible
                              service, we have three simple questions:
                            </p>
                            <p
                              style="margin:0;padding:0;font-size:1em;color:#444444;line-height:160%">
                              <br />
                            </p>
                            <p
                              style="margin:0;padding:0;font-size:1em;color:#444444;line-height:160%">
                              What types of jewelry interest you most?
                            </p>
                            <p
                              style="margin:0;padding:0;font-size:1em;color:#444444;line-height:160%">
                              Are you shopping for a special occasion?
                            </p>
                            <p
                              style="margin:0;padding:0;font-size:1em;color:#444444;line-height:160%">
                              How can we better serve you?
                            </p>
                            <p
                              style="margin:0;padding:0;font-size:1em;color:#444444;line-height:160%">
                              <br />
                            </p>
                            <p
                              style="margin:0;padding:0;font-size:1em;color:#444444;line-height:160%">
                              Feel free to reply to this email with any
                              thoughts or questions you might have. We read
                              every message and would be delighted to hear
                              from you.
                            </p>
                            <table
                              align="center"
                              width="100%"
                              border="0"
                              cellpadding="0"
                              cellspacing="0"
                              role="presentation">
                              <tbody style="width:100%">
                                <tr style="width:100%">
                                  <td
                                    align="center"
                                    data-id="__react-email-column">
                                    <a
                                      class="button"
                                      href="https://theopalgems.com/book"
                                      style="line-height:100%;text-decoration:none;display:inline-block;max-width:100%;mso-padding-alt:0px;margin:0;padding:0;background-color:#1a1a1a;color:#ffffff;border-radius:4px;padding-top:14px;padding-right:32px;padding-bottom:14px;padding-left:32px;font-size:14px;letter-spacing:1px"
                                      target="_blank"
                                      ><span
                                        ><!--[if mso]><i style="mso-font-width:400%;mso-text-raise:21" hidden>&#8202;&#8202;&#8202;&#8202;</i><![endif]--></span
                                      ><span
                                        style="max-width:100%;display:inline-block;line-height:120%;mso-padding-alt:0px;mso-text-raise:10.5px"
                                        >BOOK A PRIVATE VIEWING</span
                                      ><span
                                        ><!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8202;&#8202;&#8203;</i><![endif]--></span
                                      ></a
                                    >
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                            <p
                              style="margin:0;padding:0;font-size:16px;color:#444444;line-height:160%;margin-top:24px;margin-bottom:20px">
                              Our boutiques are waiting for you inside
                              Florida&#x27;s premier resorts in Delray Beach,
                              Clearwater Beach, and Jupiter. Come experience a
                              personalized styling session in a relaxed, elegant
                              setting.
                            </p>
                            <p
                              style="margin:0;padding:0;font-size:16px;color:#444444;line-height:160%;margin-top:0;margin-bottom:0">
                              Warm regards,<br />The Opal Gems Team
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      align="center"
                      width="100%"
                      border="0"
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                      class="node-footer"
                      style="padding-top:24px">
                      <tbody>
                        <tr>
                          <td>
                            <hr
                              class="divider"
                              style="width:100%;border:none;border-top:1px solid #eaeaea;border-color:#dddddd" />
                            <p
                              style="margin:0;padding:0;font-size:12px;color:#888888;line-height:160%;margin-top:16px;margin-bottom:8px;text-align:center">
                              Opal Gems • Delray Beach • Clearwater Beach •
                              Jupiter
                            </p>
                            <p
                              style="margin:0;padding:0;font-size:12px;color:#888888;line-height:160%;margin-top:0;margin-bottom:0;text-align:center">
                              <a
                                href="https://theopalgems.com"
                                rel="noopener noreferrer nofollow"
                                style="color:#1a1a1a;text-decoration-line:none;text-decoration:underline"
                                target="_blank"
                                >theopalgems.com</a
                              >
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p
                      style="margin:0;padding:0;font-size:1em;color:#444444;line-height:160%">
                      <br />
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

async function main() {
  console.log('Fetching subscribers from Supabase...');
  
  const { data: subscribers, error } = await supabase
    .from('subscribers')
    .select('email, created_at')
    .eq('confirmed', true);

  if (error) {
    console.error('Error fetching subscribers:', error);
    process.exit(1);
  }

  if (!subscribers || subscribers.length === 0) {
    console.log('No confirmed subscribers found.');
    return;
  }

  console.log(`Found ${subscribers.length} confirmed subscribers.`);

  const subject = 'We\'d love to hear from you — Opal Gems';
  const html = generateCampaignHtml();

  console.log(`Sending email with subject: "${subject}"`);
  console.log('Preview of email:');
  console.log(html.substring(0, 500) + '...\n');

  // Confirm before sending
  console.log('\n⚠️  This will send an email to ALL confirmed subscribers.');
  console.log('Type "yes" to confirm, or anything else to cancel:');
  
  // In Node.js, we need to read from stdin for confirmation
  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    if (chunk.trim().toLowerCase() === 'yes') {
      break;
    } else {
      console.log('Cancelled.');
      process.exit(0);
    }
  }

  process.stdin.setRawMode?.(false);
  process.stdin.pause();

  console.log('\nSending emails...');
  let success = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      await sendEmail({
        to: subscriber.email,
        subject,
        html,
      });
      console.log(`✓ Sent to ${subscriber.email}`);
      success++;
      
      // Rate limiting: wait 100ms between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`✗ Failed to send to ${subscriber.email}:`, err.message);
      failed++;
    }
  }

  console.log(`\nDone! Sent: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
