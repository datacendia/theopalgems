// Netlify Function: admin login
// POST /api/admin-login { password }
// Verifies password against ADMIN_PASSWORD env var.
// Returns a signed session token (HMAC-SHA256) on success.
//
// Required env vars:
// - ADMIN_PASSWORD       : the actual admin password (server secret)
// - ADMIN_JWT_SECRET     : random secret used to sign session tokens
//
// Optional:
// - ALLOWED_ORIGIN       : CORS origin (defaults to https://theopalgems.com)

import { createHmac, timingSafeEqual } from 'node:crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://theopalgems.com';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

function base64UrlEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Issues a token of the form: <payloadB64>.<sigB64>
// payload = JSON({ exp: <ms>, role: 'admin' })
export function signAdminToken(secret, ttlMs = TOKEN_TTL_MS) {
  const payload = JSON.stringify({ exp: Date.now() + ttlMs, role: 'admin' });
  const payloadB64 = base64UrlEncode(payload);
  const sig = createHmac('sha256', secret).update(payloadB64).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

// Verifies a token signature and expiry. Returns parsed payload or null.
export function verifyAdminToken(secret, token) {
  if (!token || typeof token !== 'string') return null;
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest();
  let providedSig;
  try {
    providedSig = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } catch {
    return null;
  }
  if (providedSig.length !== expectedSig.length) return null;
  if (!timingSafeEqual(providedSig, expectedSig)) return null;

  let payload;
  try {
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number') return null;
  if (Date.now() > payload.exp) return null;
  if (payload.role !== 'admin') return null;
  return payload;
}

export default async (req) => {
  const origin = req.headers.get('origin') === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN;

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, origin);
  }

  if (!ADMIN_PASSWORD || !ADMIN_JWT_SECRET) {
    console.error('admin-login: ADMIN_PASSWORD or ADMIN_JWT_SECRET not configured');
    return json(500, { error: 'Server not configured' }, origin);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' }, origin);
  }

  const submitted = typeof body?.password === 'string' ? body.password : '';
  if (!submitted) {
    return json(400, { error: 'Password required' }, origin);
  }

  // Constant-time comparison
  const a = Buffer.from(submitted);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    // Brief delay to slow brute-force
    await new Promise(r => setTimeout(r, 400));
    return json(401, { error: 'Invalid password' }, origin);
  }

  const token = signAdminToken(ADMIN_JWT_SECRET);
  return json(200, { token, expiresAt: Date.now() + TOKEN_TTL_MS }, origin);
};

export const config = { path: '/api/admin-login' };
