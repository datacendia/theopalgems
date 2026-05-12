// Netlify Function: /api/admin-data
// Server-side proxy for all admin database CRUD operations.
//
// Why this exists:
//   The browser-side admin UI used to call Supabase directly with the public
//   anon key. That meant *anyone* who viewed source could grab the URL+anon
//   key and hit Supabase from outside the app — auth was only on the UI, not
//   on the data layer. This endpoint moves every admin mutation behind a
//   server that:
//     1. Verifies the admin JWT (same scheme as admin-login.mjs)
//     2. Allowlists which tables + actions are permitted
//     3. Uses the SUPABASE_SERVICE_KEY (which bypasses RLS) so the database
//        itself can be locked down with `for all using (false)` policies.
//
// Required env vars:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_KEY    (NEVER expose to the browser)
//   - ADMIN_JWT_SECRET        (same secret used by admin-login.mjs)
//   - ALLOWED_ORIGIN          (defaults to https://theopalgems.com)
//
// Request body:
//   {
//     table:   'watches' | 'products' | 'locations' | 'sections' | 'photos' | 'subscribers' | 'testimonials',
//     action:  'select' | 'upsert' | 'delete' | 'count',
//     filter?: { column: string, value: any } | { column, op: 'eq'|'in'|'is', value: any }[]
//     payload?: object | object[]    // for upsert
//     orderBy?: string               // 'column' or 'column:asc' / 'column:desc'
//     select?:  string               // PostgREST column list, defaults to '*'
//     limit?:   number
//   }

import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://theopalgems.com';

// Tables the admin UI is allowed to touch. Anything not on this list gets a 403.
const ALLOWED_TABLES = new Set([
  'watches',
  'products',
  'locations',
  'sections',
  'photos',
  'subscribers',
  'testimonials',
]);

const ALLOWED_ACTIONS = new Set(['select', 'upsert', 'delete', 'count']);

function corsHeaders(origin) {
  const isAllowed =
    origin === ALLOWED_ORIGIN ||
    origin === 'http://localhost:5173' ||
    origin === 'http://localhost:3000';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
  if (isAllowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function verifyAdminJwt(req) {
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

let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured');
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _supabase;
}

function applyFilters(query, filter) {
  if (!filter) return query;
  const filters = Array.isArray(filter) ? filter : [filter];
  for (const f of filters) {
    if (!f || typeof f.column !== 'string') continue;
    const op = f.op || 'eq';
    switch (op) {
      case 'eq':
        query = query.eq(f.column, f.value);
        break;
      case 'in':
        query = query.in(f.column, Array.isArray(f.value) ? f.value : [f.value]);
        break;
      case 'is':
        query = query.is(f.column, f.value);
        break;
      default:
        // ignore unknown ops to avoid widening surface
        break;
    }
  }
  return query;
}

function parseOrder(orderBy) {
  if (!orderBy || typeof orderBy !== 'string') return null;
  const [col, dir = 'asc'] = orderBy.split(':');
  if (!col) return null;
  return { col, ascending: dir.toLowerCase() !== 'desc' };
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' }, origin);
  }

  if (!verifyAdminJwt(req)) {
    return json(401, { error: 'Unauthorized' }, origin);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' }, origin);
  }

  const { table, action, filter, payload, orderBy, select, limit } = body || {};

  if (!ALLOWED_TABLES.has(table)) {
    return json(403, { error: `Table not allowed: ${table}` }, origin);
  }
  if (!ALLOWED_ACTIONS.has(action)) {
    return json(400, { error: `Unknown action: ${action}` }, origin);
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    console.error('Supabase init failed:', err);
    return json(500, { error: 'Server not configured' }, origin);
  }

  try {
    if (action === 'count') {
      let q = supabase.from(table).select('*', { count: 'exact', head: true });
      q = applyFilters(q, filter);
      const { count, error } = await q;
      if (error) throw error;
      return json(200, { count: count || 0 }, origin);
    }

    if (action === 'select') {
      let q = supabase.from(table).select(select || '*');
      q = applyFilters(q, filter);
      const order = parseOrder(orderBy);
      if (order) q = q.order(order.col, { ascending: order.ascending });
      if (typeof limit === 'number' && limit > 0) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return json(200, { data: data || [] }, origin);
    }

    if (action === 'upsert') {
      if (!payload) {
        return json(400, { error: 'payload required for upsert' }, origin);
      }
      const { data, error } = await supabase.from(table).upsert(payload).select();
      if (error) throw error;
      return json(200, { data: data || [] }, origin);
    }

    if (action === 'delete') {
      if (!filter) {
        return json(400, { error: 'filter required for delete (refusing to delete all rows)' }, origin);
      }
      let q = supabase.from(table).delete();
      q = applyFilters(q, filter);
      const { error } = await q;
      if (error) throw error;
      return json(200, { ok: true }, origin);
    }

    return json(400, { error: 'Unhandled action' }, origin);
  } catch (err) {
    console.error(`admin-data error (${table}/${action}):`, err);
    return json(500, { error: err.message || 'Database error' }, origin);
  }
};

export const config = { path: '/api/admin-data' };
