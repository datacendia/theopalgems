// One-time end-to-end test of the warranty → inventory "customers" sync.
//
// It posts a fake warranty registration to the LIVE /api/warranty-register
// endpoint (exactly like a real customer would), then checks Andrew's
// inventory Supabase to confirm the customer row was created, then deletes
// the test row so nothing is left behind.
//
// No secrets are stored in this file — it reads them from env vars.
//
// ── Run it (PowerShell) ───────────────────────────────────────────────────
//   $env:INVENTORY_SUPABASE_URL="https://foypszldhyslqknpjilc.supabase.co"
//   $env:INVENTORY_SUPABASE_SERVICE_KEY="eyJ...the service_role JWT..."
//   node scripts/test-warranty-sync.mjs
//
// ── Run it (bash / git-bash) ──────────────────────────────────────────────
//   INVENTORY_SUPABASE_URL="https://foypszldhyslqknpjilc.supabase.co" \
//   INVENTORY_SUPABASE_SERVICE_KEY="eyJ..." \
//   node scripts/test-warranty-sync.mjs
//
// Optional: SITE_URL (defaults to https://theopalgems.com) to test a deploy
// preview instead, e.g. SITE_URL="https://deploy-preview--theopalgems.netlify.app"

const SITE     = process.env.SITE_URL || 'https://theopalgems.com';
const INV_URL  = process.env.INVENTORY_SUPABASE_URL;
const INV_KEY  = process.env.INVENTORY_SUPABASE_SERVICE_KEY;
const TABLE    = process.env.INVENTORY_CUSTOMERS_TABLE || 'customers';

if (!INV_URL || !INV_KEY) {
  console.error('✗ Set INVENTORY_SUPABASE_URL and INVENTORY_SUPABASE_SERVICE_KEY first (see header).');
  process.exit(1);
}

const stamp     = Date.now();
const testEmail = `sync-test+${stamp}@opalgems.invalid`; // .invalid → no real email delivery
const testName  = `ZZ Sync Test ${stamp}`;

const payload = {
  customer_name:          testName,
  customer_email:         testEmail,
  customer_phone:         '+10000000000',
  item_name:              'TEST — Solitaire Ring (safe to delete)',
  purchase_date:          new Date().toISOString().slice(0, 10),
  store_location:         'opal-grand',
  occasion:               'engagement',
  marketing_opt_in_email: true,
};

const restHeaders = {
  apikey:          INV_KEY,
  Authorization:   `Bearer ${INV_KEY}`,
  'Content-Type':  'application/json',
};

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function findCustomer() {
  const url = `${INV_URL}/rest/v1/${TABLE}?select=id,full_name,email,phone,marketing_consent,consent_at,notes&email=eq.${encodeURIComponent(testEmail)}`;
  const res = await fetch(url, { headers: restHeaders });
  if (!res.ok) throw new Error(`lookup failed: HTTP ${res.status} — ${await res.text()}`);
  return res.json();
}

async function deleteCustomer() {
  const url = `${INV_URL}/rest/v1/${TABLE}?email=eq.${encodeURIComponent(testEmail)}`;
  await fetch(url, { method: 'DELETE', headers: restHeaders });
}

(async () => {
  console.log(`\n1) Posting test registration → ${SITE}/api/warranty-register`);
  const res  = await fetch(`${SITE}/api/warranty-register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  console.log(`   → HTTP ${res.status}`, body);
  if (!res.ok) { console.error('   ✗ Endpoint rejected the submission. Stopping.'); process.exit(1); }
  if (body.demo) {
    console.warn('   ⚠ Endpoint is in DEMO MODE — Supabase env vars are missing on Netlify, so nothing was saved.');
  }

  console.log("\n2) Looking for the synced row in the inventory customers table…");
  let rows = [];
  for (let i = 0; i < 6 && rows.length === 0; i++) {
    await pause(1500);
    rows = await findCustomer();
    if (rows.length === 0) console.log('   …not yet, retrying');
  }

  if (rows.length) {
    console.log('   ✅ SUCCESS — customer synced into the inventory app:');
    console.log('  ', JSON.stringify(rows[0], null, 2));
  } else {
    console.log('   ❌ Not found after retries. Check the Netlify function log for');
    console.log('      "Inventory customer sync failed" or "Inventory sync skipped".');
  }

  console.log('\n3) Cleaning up the test row…');
  await deleteCustomer();
  const after = await findCustomer();
  console.log(after.length
    ? '   ⚠ Cleanup may have failed — remove the "ZZ Sync Test" row manually.'
    : '   ✅ Test row removed.');

  console.log('\nℹ This also created a row in YOUR warranty_registrations table —');
  console.log('  delete it from Admin → Warranties when convenient.');
  console.log('\nDone.\n');
})().catch((e) => { console.error('\n✗ Test failed:', e.message || e); process.exit(1); });
