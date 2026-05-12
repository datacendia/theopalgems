// Netlify Function: AI-assisted newsletter draft (admin-only).
// POST /api/draft-newsletter { topic, tone?, audience?, products? }
// Auth: requires Authorization: Bearer <token> (admin token from /api/admin-login).
// Calls Anthropic Claude to produce { subject, preheader, html_body } in Opal Gems voice.
//
// Required env: ANTHROPIC_API_KEY, ADMIN_JWT_SECRET (same as admin login).

import { createHmac, timingSafeEqual } from 'node:crypto';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://theopalgems.com';

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN ||
    origin === 'http://localhost:5173' ||
    origin === 'http://localhost:3000';
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

function json(status, body, origin = '') {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

// Verify Authorization: Bearer <token> using same scheme as admin-login.mjs
function verifyAdmin(req) {
  if (!ADMIN_JWT_SECRET) return false;
  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const token = match[1].trim();
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return false;
  try {
    const expectedSig = createHmac('sha256', ADMIN_JWT_SECRET).update(payloadB64).digest();
    const padded = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const providedSig = Buffer.from(padded, 'base64');
    if (providedSig.length !== expectedSig.length) return false;
    if (!timingSafeEqual(providedSig, expectedSig)) return false;
    const payloadPad = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(payloadPad, 'base64').toString('utf8'));
    if (!payload?.exp || Date.now() > payload.exp) return false;
    if (payload.role !== 'admin') return false;
    return true;
  } catch {
    return false;
  }
}

const SYSTEM_PROMPT = `You write marketing emails for Opal Gems, a fine diamond jewelry brand with three boutiques inside Florida resort hotels: Opal Grand (Delray Beach), Opal Sol (Clearwater Beach), and Jupiter Beach Resort & Spa.

Brand voice:
- Elevated, warm, never pushy. Hospitality-meets-jewelry.
- "Elevated diamonds, in person." Try-on first, no online checkout.
- Hand-curated lab and natural diamonds; custom pieces for anniversaries and special moments.
- Never use emojis. Avoid exclamation marks unless genuinely warranted.
- Short paragraphs. Specific details over hype. Inviting, not transactional.

Output format: respond ONLY with valid JSON in this exact shape:
{
  "subject": "string, 30-60 chars",
  "preheader": "string, 50-100 chars, expands the subject for the inbox preview",
  "html_body": "string, HTML fragment (no <html>/<body>/<head> tags). Use simple inline styles only — paragraphs, headings (h2/h3), <a>, <strong>, <em>. NO images unless you note an [IMAGE: description] placeholder for the team to fill in. Include one clear primary CTA link to https://theopalgems.com or a specific page."
}

Do not include any commentary, code fences, or text outside the JSON object.`;

export default async (req) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') return json(200, { ok: true }, origin);
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' }, origin);

  if (!verifyAdmin(req)) {
    return json(401, { error: 'Unauthorized' }, origin);
  }
  if (!ANTHROPIC_API_KEY) {
    return json(500, { error: 'AI service not configured. Set ANTHROPIC_API_KEY.' }, origin);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' }, origin);
  }

  const topic = (payload?.topic || '').trim();
  if (!topic || topic.length < 5 || topic.length > 1000) {
    return json(400, { error: 'Topic is required (5–1000 chars).' }, origin);
  }
  const tone = (payload?.tone || '').trim().slice(0, 100);
  const audience = (payload?.audience || '').trim().slice(0, 200);
  const products = (payload?.products || '').trim().slice(0, 1000);

  const userPrompt = [
    `Topic: ${topic}`,
    tone ? `Tone preference: ${tone}` : null,
    audience ? `Audience segment: ${audience}` : null,
    products ? `Specific pieces / details to feature: ${products}` : null,
    '',
    'Draft the email now. JSON only.',
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Anthropic error:', res.status, txt);
      return json(502, { error: 'AI provider error.', detail: txt.slice(0, 500) }, origin);
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text || '';

    // Strip optional code fences if present
    const cleaned = text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let draft;
    try {
      draft = JSON.parse(cleaned);
    } catch {
      console.error('AI returned non-JSON:', cleaned.slice(0, 500));
      return json(502, { error: 'AI returned malformed output. Try again.' }, origin);
    }

    if (!draft?.subject || !draft?.html_body) {
      return json(502, { error: 'AI output missing required fields.' }, origin);
    }

    return json(200, {
      ok: true,
      draft: {
        subject: String(draft.subject).slice(0, 200),
        preheader: String(draft.preheader || '').slice(0, 200),
        html_body: String(draft.html_body),
      },
      usage: data?.usage || null,
    }, origin);
  } catch (err) {
    console.error('draft-newsletter exception:', err);
    return json(500, { error: 'Failed to generate draft.' }, origin);
  }
};

export const config = { path: '/api/draft-newsletter' };
