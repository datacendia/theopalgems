import React, { useEffect, useMemo, useState } from 'react';
import { getWarrantyRegistrations, deleteWarrantyRegistration, updateWarrantyStatus, updateWarrantyDetails } from './api';

const LOCATION_OPTIONS = [
  { value: '',              label: 'Any boutique' },
  { value: 'opal-grand',    label: 'Opal Grand — Delray Beach' },
  { value: 'opal-sol',      label: 'Opal Sol — Clearwater Beach' },
  { value: 'jupiter-beach', label: 'Jupiter Beach Resort & Spa' },
  { value: 'other',         label: 'Other / event' },
];

const LOCATION_LABELS = {
  'opal-grand':    'Opal Grand',
  'opal-sol':      'Opal Sol',
  'jupiter-beach': 'Jupiter Beach',
  'other':         'Other',
};

const CATEGORY_OPTIONS = [
  '', 'Ring', 'Necklace', 'Earrings', 'Bracelet', 'Pendant', 'Bangle', 'Chain', 'Watch', 'Other',
];

const OCCASION_LABELS = {
  engagement: 'Engagement', anniversary: 'Anniversary', birthday: 'Birthday',
  self_purchase: 'Self-purchase', gift: 'Gift', just_because: 'Just because', other: 'Other',
};
const DISCOVERY_LABELS = {
  instagram: 'Instagram', google: 'Google', hotel_concierge: 'Hotel concierge',
  walk_in: 'Walk-in', returning_customer: 'Returning customer',
  friend_referral: 'Friend / referral', event: 'Event', other: 'Other',
};
const RELATIONSHIP_LABELS = {
  partner: 'Partner', spouse: 'Spouse', parent: 'Parent', child: 'Child',
  sibling: 'Sibling', friend: 'Friend', colleague: 'Colleague', self: 'Self', other: 'Other',
};
const METAL_LABELS = {
  yellow_gold: 'Yellow gold', white_gold: 'White gold', rose_gold: 'Rose gold',
  platinum: 'Platinum', silver: 'Silver', mixed: 'Mixed',
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatPrice(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function downloadCsv(rows) {
  const header = [
    'created_at', 'status', 'customer_name', 'customer_email', 'customer_phone',
    'address_line1', 'address_line2', 'city', 'state_region', 'postal_code', 'country',
    'item_name', 'item_category', 'item_sku', 'item_serial',
    'purchase_price', 'purchase_date', 'store_location',
    'sales_associate', 'receipt_number', 'notes',
    // Tier 1
    'occasion', 'is_gift', 'gift_recipient_name', 'gift_recipient_relationship', 'gift_recipient_birthday',
    'customer_birthday', 'discovery_source', 'is_visiting', 'staying_at_hotel',
    'hotel_name', 'hotel_checkout_date', 'home_city',
    'marketing_opt_in_email', 'marketing_opt_in_sms',
    // Tier 2
    'ring_size', 'chain_length', 'metal_preference', 'style_preferences',
    'engraving_text', 'wants_appraisal', 'care_kit_interest',
    // Tier 3
    'experience_rating', 'photo_url', 'ugc_consent', 'associate_confirmed',
    // Tier 4
    'referred_by', 'is_returning_customer', 'interested_in_events',
  ];
  const escape = (v) => {
    if (v == null) return '';
    if (Array.isArray(v)) v = v.join('; ');
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    header.join(','),
    ...rows.map((r) => header.map((h) => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `opalgems-warranties-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// QR generator panel — staff fills in sale details, page produces a QR
// that encodes the pre-filled /warranty/register URL.
function QrGeneratorPanel() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const [qr, setQr] = useState({
    location:  '',
    item:      '',
    category:  '',
    price:     '',
    sku:       '',
    serial:    '',
    receipt:   '',
    associate: '',
    date:      new Date().toISOString().split('T')[0],
  });

  const targetUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (qr.location)  params.set('location', qr.location);
    if (qr.item)      params.set('item', qr.item);
    if (qr.category)  params.set('category', qr.category);
    if (qr.price)     params.set('price', qr.price);
    if (qr.sku)       params.set('sku', qr.sku);
    if (qr.serial)    params.set('serial', qr.serial);
    if (qr.receipt)   params.set('receipt', qr.receipt);
    if (qr.associate) params.set('associate', qr.associate);
    if (qr.date)      params.set('date', qr.date);
    const qs = params.toString();
    return `${origin}/warranty/register${qs ? `?${qs}` : ''}`;
  }, [qr, origin]);

  // Use the public goqr.me API — no key required, returns a PNG.
  // The customer will scan the QR; the URL inside takes them to the form.
  const qrImageUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=480x480&margin=10&ecc=M&data=${encodeURIComponent(targetUrl)}`,
    [targetUrl]
  );

  const update = (k) => (e) => setQr((prev) => ({ ...prev, [k]: e.target.value }));

  const reset = () => setQr({
    location: '', item: '', category: '', price: '', sku: '',
    serial: '', receipt: '', associate: '', date: new Date().toISOString().split('T')[0],
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      // eslint-disable-next-line no-alert
      alert('Link copied to clipboard.');
    } catch {
      // ignore
    }
  };

  const printQr = () => {
    if (typeof window === 'undefined') return;
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    const itemLabel = qr.item ? qr.item.replace(/</g, '&lt;') : 'Your purchase';
    const locLabel = LOCATION_LABELS[qr.location] || '';
    w.document.write(`<!doctype html><html><head><title>Opal Gems — Warranty QR</title>
      <style>
        @page { margin: 24mm; }
        body { font-family: Georgia, serif; text-align: center; color: #1a1a1a; margin: 0; padding: 40px 24px; }
        .brand { letter-spacing: 0.25em; font-size: 14px; text-transform: uppercase; color: #b8956e; margin-bottom: 8px; }
        .logo { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 500; letter-spacing: 0.12em; margin: 0 0 24px; }
        h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 400; font-size: 28px; margin: 0 0 8px; }
        p.subtitle { color: #555; font-size: 15px; margin: 0 0 24px; }
        .qr { display: inline-block; padding: 20px; border: 1px solid #ece6da; background: #fff; }
        .qr img { display: block; width: 360px; height: 360px; }
        .item { margin-top: 24px; font-size: 18px; }
        .loc { margin-top: 6px; color: #666; font-size: 14px; }
        .footer { margin-top: 32px; font-size: 12px; color: #888; letter-spacing: 0.05em; }
      </style></head>
      <body>
        <div class="brand">Opal Gems</div>
        <h1>Register your warranty</h1>
        <p class="subtitle">Scan with your phone camera to complete your warranty registration.</p>
        <div class="qr"><img src="${qrImageUrl}" alt="Warranty registration QR code" /></div>
        <div class="item"><strong>${itemLabel}</strong></div>
        ${locLabel ? `<div class="loc">${locLabel}</div>` : ''}
        <div class="footer">theopalgems.com · 1-year manufacturing warranty</div>
        <script>window.onload = () => { setTimeout(() => window.print(), 200); };</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="warranty-qr-panel">
      <div className="warranty-qr-panel__form">
        <h2>Generate QR for this sale</h2>
        <p className="warranty-qr-panel__hint">
          Fill in the sale details here — the customer scans the QR and only adds their name, contact &amp; a few quick
          preference questions. The internal details below (SKU, serial/certificate, receipt, price, category) are
          captured <strong>only from this form</strong>, so enter whatever you have at the time of sale.
        </p>

        <div className="warranty-qr-panel__field">
          <label>Boutique</label>
          <select value={qr.location} onChange={update('location')}>
            {LOCATION_OPTIONS.map((o) => <option key={o.value || 'any'} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="warranty-qr-panel__field">
          <label>Item description</label>
          <input type="text" placeholder="e.g. Solitaire Diamond Ring, 1.25 CTW" value={qr.item} onChange={update('item')} />
        </div>

        <div className="warranty-qr-panel__row">
          <div className="warranty-qr-panel__field">
            <label>Category</label>
            <select value={qr.category} onChange={update('category')}>
              {CATEGORY_OPTIONS.map((c) => <option key={c || 'none'} value={c}>{c || 'Select…'}</option>)}
            </select>
          </div>
          <div className="warranty-qr-panel__field">
            <label>Price (USD)</label>
            <input type="text" inputMode="decimal" placeholder="0.00" value={qr.price} onChange={update('price')} />
          </div>
        </div>

        <div className="warranty-qr-panel__row">
          <div className="warranty-qr-panel__field">
            <label>SKU</label>
            <input type="text" value={qr.sku} onChange={update('sku')} />
          </div>
          <div className="warranty-qr-panel__field">
            <label>Serial / certificate #</label>
            <input type="text" value={qr.serial} onChange={update('serial')} />
          </div>
        </div>

        <div className="warranty-qr-panel__row">
          <div className="warranty-qr-panel__field">
            <label>Receipt #</label>
            <input type="text" value={qr.receipt} onChange={update('receipt')} />
          </div>
          <div className="warranty-qr-panel__field">
            <label>Purchase date</label>
            <input type="date" value={qr.date} onChange={update('date')} />
          </div>
        </div>

        <div className="warranty-qr-panel__field">
          <label>Sales associate</label>
          <input type="text" value={qr.associate} onChange={update('associate')} />
        </div>

        <div className="warranty-qr-panel__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={reset}>Reset</button>
          <button type="button" className="admin-btn admin-btn--outline" onClick={copyLink}>Copy link</button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={printQr}>Print QR</button>
        </div>
      </div>

      <div className="warranty-qr-panel__preview">
        <div className="warranty-qr-card">
          <p className="warranty-qr-card__brand">Opal Gems</p>
          <p className="warranty-qr-card__title">Register your warranty</p>
          <p className="warranty-qr-card__subtitle">Scan with your phone camera</p>
          <div className="warranty-qr-card__qr">
            <img src={qrImageUrl} alt="Warranty registration QR code" width={260} height={260} />
          </div>
          {qr.item && <p className="warranty-qr-card__item"><strong>{qr.item}</strong></p>}
          {LOCATION_LABELS[qr.location] && <p className="warranty-qr-card__loc">{LOCATION_LABELS[qr.location]}</p>}
          <p className="warranty-qr-card__url" title={targetUrl}>{targetUrl.replace(/^https?:\/\//, '')}</p>
        </div>
      </div>
    </div>
  );
}

function Stars({ value }) {
  const v = Number(value) || 0;
  return (
    <span className="admin-stars" title={`${v} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="14" height="14" viewBox="0 0 24 24"
          fill={n <= v ? 'var(--accent, #b8956e)' : 'none'}
          stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function Yes({ v }) {
  if (v === true)  return <span className="admin-badge admin-badge--success">Yes</span>;
  if (v === false) return <span className="admin-badge admin-badge--gray">No</span>;
  return <span style={{ color: '#aaa' }}>—</span>;
}

// Registration detail modal
function RegistrationModal({ reg, onClose, onStatusChange, onSaveDetails }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setEditing(false);
    setSaveError('');
    if (reg) {
      setDraft({
        item_name:       reg.item_name || '',
        item_category:   reg.item_category || '',
        item_sku:        reg.item_sku || '',
        item_serial:     reg.item_serial || '',
        purchase_price:  reg.purchase_price != null ? String(reg.purchase_price) : '',
        purchase_date:   reg.purchase_date || '',
        receipt_number:  reg.receipt_number || '',
        store_location:  reg.store_location || '',
        sales_associate: reg.sales_associate || '',
      });
    }
  }, [reg]);

  if (!reg) return null;

  const setD = (k) => (e) => setDraft((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await onSaveDetails(reg.id, draft);
      setEditing(false);
    } catch (err) {
      setSaveError((err && err.message) || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const fullAddress = [
    reg.address_line1,
    reg.address_line2,
    [reg.city, reg.state_region, reg.postal_code].filter(Boolean).join(', '),
    reg.country,
  ].filter(Boolean).join(' · ');

  const hasTier1 = reg.occasion || reg.is_gift != null || reg.customer_birthday || reg.discovery_source ||
                   reg.is_visiting != null || reg.staying_at_hotel != null || reg.home_city ||
                   reg.marketing_opt_in_email != null || reg.marketing_opt_in_sms != null;
  const hasTier2 = reg.ring_size || reg.chain_length || reg.metal_preference ||
                   (reg.style_preferences && reg.style_preferences.length) || reg.engraving_text ||
                   reg.wants_appraisal || reg.care_kit_interest;
  const hasTier3 = reg.experience_rating || reg.photo_url || reg.ugc_consent != null || reg.associate_confirmed != null;
  const hasTier4 = reg.referred_by || reg.is_returning_customer != null || reg.interested_in_events != null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="warranty-detail__header">
          <div>
            <p className="eyebrow">Warranty registration</p>
            <h3>{reg.customer_name}</h3>
            <p className="small">{formatDate(reg.created_at)}</p>
          </div>
          <div className="warranty-detail__status">
            <select
              value={reg.status || 'pending'}
              onChange={(e) => onStatusChange(reg.id, e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="warranty-detail__grid">
          <div>
            <h4>Customer</h4>
            <p><strong>Email:</strong> <a href={`mailto:${reg.customer_email}`}>{reg.customer_email}</a></p>
            <p><strong>Phone:</strong> <a href={`tel:${reg.customer_phone}`}>{reg.customer_phone}</a></p>
            {fullAddress && <p><strong>Address:</strong> {fullAddress}</p>}
            {reg.customer_birthday && <p><strong>Birthday:</strong> {reg.customer_birthday}</p>}
            {reg.home_city && <p><strong>Home city:</strong> {reg.home_city}</p>}
          </div>
          {editing ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <h4>Edit purchase &amp; item details</h4>
              <div className="warranty-edit-grid">
                <label className="warranty-edit-field">
                  <span>Item description</span>
                  <input value={draft.item_name} onChange={setD('item_name')} />
                </label>
                <label className="warranty-edit-field">
                  <span>Category</span>
                  <select value={draft.item_category} onChange={setD('item_category')}>
                    <option value="">Select…</option>
                    {CATEGORY_OPTIONS.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="warranty-edit-field">
                  <span>SKU</span>
                  <input value={draft.item_sku} onChange={setD('item_sku')} />
                </label>
                <label className="warranty-edit-field">
                  <span>Serial / certificate #</span>
                  <input value={draft.item_serial} onChange={setD('item_serial')} />
                </label>
                <label className="warranty-edit-field">
                  <span>Receipt #</span>
                  <input value={draft.receipt_number} onChange={setD('receipt_number')} />
                </label>
                <label className="warranty-edit-field">
                  <span>Price (USD)</span>
                  <input inputMode="decimal" placeholder="0.00" value={draft.purchase_price} onChange={setD('purchase_price')} />
                </label>
                <label className="warranty-edit-field">
                  <span>Purchase date</span>
                  <input type="date" value={draft.purchase_date} onChange={setD('purchase_date')} />
                </label>
                <label className="warranty-edit-field">
                  <span>Boutique</span>
                  <select value={draft.store_location} onChange={setD('store_location')}>
                    <option value="">Select…</option>
                    {LOCATION_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="warranty-edit-field">
                  <span>Sales associate</span>
                  <input value={draft.sales_associate} onChange={setD('sales_associate')} />
                </label>
              </div>
              {saveError && <p className="small" style={{ color: '#c0392b', marginTop: 8 }}>{saveError}</p>}
            </div>
          ) : (
            <>
              <div>
                <div className="warranty-detail__section-head">
                  <h4>Item</h4>
                  <button type="button" className="admin-btn admin-btn--outline admin-btn--sm" onClick={() => setEditing(true)}>
                    Edit details
                  </button>
                </div>
                <p><strong>{reg.item_name}</strong></p>
                {reg.item_category && <p><strong>Category:</strong> {reg.item_category}</p>}
                {reg.item_sku && <p><strong>SKU:</strong> {reg.item_sku}</p>}
                {reg.item_serial && <p><strong>Serial:</strong> {reg.item_serial}</p>}
                {reg.purchase_price != null && <p><strong>Price:</strong> {formatPrice(reg.purchase_price)}</p>}
                {reg.purchase_date && <p><strong>Purchase date:</strong> {reg.purchase_date}</p>}
              </div>
              <div>
                <h4>Sale</h4>
                <p><strong>Boutique:</strong> {LOCATION_LABELS[reg.store_location] || reg.store_location || '—'}</p>
                {reg.sales_associate && <p><strong>Associate:</strong> {reg.sales_associate}</p>}
                {reg.receipt_number && <p><strong>Receipt #:</strong> {reg.receipt_number}</p>}
              </div>
            </>
          )}
          {reg.notes && (
            <div>
              <h4>Notes</h4>
              <p style={{ whiteSpace: 'pre-wrap' }}>{reg.notes}</p>
            </div>
          )}

          {hasTier1 && (
            <div>
              <h4>Occasion &amp; discovery</h4>
              {reg.occasion && <p><strong>Occasion:</strong> {OCCASION_LABELS[reg.occasion] || reg.occasion}</p>}
              {reg.is_gift && (
                <>
                  <p><strong>Gift for:</strong> {reg.gift_recipient_name || '—'}
                    {reg.gift_recipient_relationship && ` (${RELATIONSHIP_LABELS[reg.gift_recipient_relationship] || reg.gift_recipient_relationship})`}
                  </p>
                  {reg.gift_recipient_birthday && <p><strong>Their birthday:</strong> {reg.gift_recipient_birthday}</p>}
                </>
              )}
              {reg.discovery_source && <p><strong>Found us via:</strong> {DISCOVERY_LABELS[reg.discovery_source] || reg.discovery_source}</p>}
              {reg.is_visiting != null && <p><strong>Visiting Florida:</strong> <Yes v={reg.is_visiting} /></p>}
              {reg.staying_at_hotel && (
                <p><strong>Hotel:</strong> {LOCATION_LABELS[reg.hotel_name] || reg.hotel_name || '—'}
                  {reg.hotel_checkout_date && ` (out ${reg.hotel_checkout_date})`}
                </p>
              )}
              <p><strong>Email opt-in:</strong> <Yes v={reg.marketing_opt_in_email} /></p>
              <p><strong>SMS opt-in:</strong> <Yes v={reg.marketing_opt_in_sms} /></p>
            </div>
          )}

          {hasTier2 && (
            <div>
              <h4>Preferences</h4>
              {reg.metal_preference && <p><strong>Metal:</strong> {METAL_LABELS[reg.metal_preference] || reg.metal_preference}</p>}
              {Array.isArray(reg.style_preferences) && reg.style_preferences.length > 0 && (
                <p><strong>Style:</strong> {reg.style_preferences.join(', ')}</p>
              )}
              {reg.ring_size && <p><strong>Ring size:</strong> {reg.ring_size}</p>}
              {reg.chain_length && <p><strong>Chain length:</strong> {reg.chain_length}</p>}
              {reg.engraving_text && <p><strong>Engraving:</strong> "{reg.engraving_text}"</p>}
              <p><strong>Wants appraisal:</strong> <Yes v={reg.wants_appraisal} /></p>
              <p><strong>Care kit interest:</strong> <Yes v={reg.care_kit_interest} /></p>
            </div>
          )}

          {hasTier3 && (
            <div>
              <h4>Experience</h4>
              {reg.experience_rating ? (
                <p><strong>Rating:</strong> <Stars value={reg.experience_rating} /></p>
              ) : null}
              {reg.associate_confirmed != null && (
                <p><strong>Loved associate:</strong> <Yes v={reg.associate_confirmed} /></p>
              )}
              <p><strong>UGC consent:</strong> <Yes v={reg.ugc_consent} /></p>
              {reg.photo_url && (
                <p style={{ marginTop: 12 }}>
                  <a href={reg.photo_url} target="_blank" rel="noreferrer">
                    <img src={reg.photo_url} alt="Customer photo" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 4, border: '1px solid #eee' }} />
                  </a>
                </p>
              )}
            </div>
          )}

          {hasTier4 && (
            <div>
              <h4>Loyalty</h4>
              {reg.referred_by && <p><strong>Referred by:</strong> {reg.referred_by}</p>}
              <p><strong>Returning customer:</strong> <Yes v={reg.is_returning_customer} /></p>
              <p><strong>Wants event invites:</strong> <Yes v={reg.interested_in_events} /></p>
            </div>
          )}
        </div>

        <div className="admin-modal__actions">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="admin-btn admin-btn--ghost" disabled={saving}>Cancel</button>
              <button onClick={handleSave} className="admin-btn admin-btn--primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="admin-btn admin-btn--ghost">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminWarranties() {
  const [tab, setTab] = useState('list'); // 'qr' | 'list'
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [activeId, setActiveId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getWarrantyRegistrations();
        if (!cancelled) setRegistrations(data);
      } catch (e) {
        const msg = (e && e.message) || '';
        // Migrations not yet run? Show a friendly empty state instead of a red banner.
        if (/does not exist/i.test(msg) || /could not find the table/i.test(msg) || /42P01/i.test(msg)) {
          if (!cancelled) {
            setTableMissing(true);
            setRegistrations([]);
          }
        } else if (!cancelled) {
          setError(msg || 'Failed to load warranty registrations');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const total = registrations.length;
    const pending = registrations.filter((r) => (r.status || 'pending') === 'pending').length;
    const confirmed = registrations.filter((r) => r.status === 'confirmed').length;
    const archived = registrations.filter((r) => r.status === 'archived').length;
    return { total, pending, confirmed, archived };
  }, [registrations]);

  // Aggregate insights for the "Audience intel" strip
  const insights = useMemo(() => {
    const ratings = registrations.map((r) => Number(r.experience_rating)).filter((n) => n >= 1 && n <= 5);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    const countBy = (key, labels) => {
      const out = {};
      for (const r of registrations) {
        const v = r[key];
        if (!v) continue;
        out[v] = (out[v] || 0) + 1;
      }
      const ranked = Object.entries(out)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, n]) => ({ label: (labels && labels[k]) || k, n }));
      return ranked;
    };

    const emailOptIn = registrations.filter((r) => r.marketing_opt_in_email).length;
    const smsOptIn   = registrations.filter((r) => r.marketing_opt_in_sms).length;
    const wantsAppraisal = registrations.filter((r) => r.wants_appraisal).length;
    const wantsCareKit = registrations.filter((r) => r.care_kit_interest).length;
    const visiting   = registrations.filter((r) => r.is_visiting).length;
    const returning  = registrations.filter((r) => r.is_returning_customer).length;
    const wantsEvents = registrations.filter((r) => r.interested_in_events).length;
    const totalRevenue = registrations.reduce((sum, r) => sum + (Number(r.purchase_price) || 0), 0);

    return {
      avgRating: avg,
      ratingCount: ratings.length,
      topOccasions: countBy('occasion', OCCASION_LABELS),
      topDiscovery: countBy('discovery_source', DISCOVERY_LABELS),
      emailOptIn, smsOptIn,
      wantsAppraisal, wantsCareKit,
      visiting, returning, wantsEvents,
      totalRevenue,
    };
  }, [registrations]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return registrations.filter((r) => {
      const status = r.status || 'pending';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (locationFilter !== 'all' && (r.store_location || '') !== locationFilter) return false;
      if (!term) return true;
      return (
        (r.customer_name || '').toLowerCase().includes(term) ||
        (r.customer_email || '').toLowerCase().includes(term) ||
        (r.customer_phone || '').toLowerCase().includes(term) ||
        (r.item_name || '').toLowerCase().includes(term) ||
        (r.item_sku || '').toLowerCase().includes(term) ||
        (r.item_serial || '').toLowerCase().includes(term) ||
        (r.receipt_number || '').toLowerCase().includes(term)
      );
    });
  }, [registrations, search, statusFilter, locationFilter]);

  const active = useMemo(
    () => registrations.find((r) => r.id === activeId) || null,
    [registrations, activeId]
  );

  const handleSaveDetails = async (id, fields) => {
    // Let the modal surface its own error if this throws.
    const updated = await updateWarrantyDetails(id, fields);
    setRegistrations(updated);
  };

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await updateWarrantyStatus(id, status);
      setRegistrations(updated);
    } catch (e) {
      setError(e.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    try {
      const updated = await deleteWarrantyRegistration(id);
      setRegistrations(updated);
      setConfirmDeleteId(null);
      if (activeId === id) setActiveId(null);
    } catch (e) {
      setError(e.message || 'Failed to delete registration');
    }
  };

  const statusBadge = (r) => {
    const s = r.status || 'pending';
    if (s === 'confirmed') return <span className="admin-badge admin-badge--success">Confirmed</span>;
    if (s === 'archived')  return <span className="admin-badge admin-badge--gray">Archived</span>;
    return <span className="admin-badge admin-badge--warning">Pending</span>;
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Warranties</h1>
          <p className="admin-page__subtitle">
            {stats.total} total · {stats.pending} pending · {stats.confirmed} confirmed · {stats.archived} archived
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => downloadCsv(filtered)}
            className="admin-btn admin-btn--outline"
            disabled={filtered.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      {/* Top-level tabs: QR generator vs registrations list */}
      <div className="admin-card" style={{ marginBottom: 16, padding: 0 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
          <button
            className={`admin-tab ${tab === 'list' ? 'active' : ''}`}
            onClick={() => setTab('list')}
            style={{ flex: 'none', borderRadius: 0, borderBottom: tab === 'list' ? '2px solid var(--accent)' : '2px solid transparent' }}
          >
            Registrations ({stats.total})
          </button>
          <button
            className={`admin-tab ${tab === 'qr' ? 'active' : ''}`}
            onClick={() => setTab('qr')}
            style={{ flex: 'none', borderRadius: 0, borderBottom: tab === 'qr' ? '2px solid var(--accent)' : '2px solid transparent' }}
          >
            Generate QR
          </button>
        </div>
      </div>

      {tab === 'qr' ? (
        <QrGeneratorPanel />
      ) : (
        <>
          {/* Aggregate insights strip — surfaces the value of the captured data */}
          {registrations.length > 0 && (
            <div className="warranty-insights">
              <div className="warranty-insights__stat">
                <span className="warranty-insights__label">Avg. rating</span>
                <span className="warranty-insights__value">
                  {insights.avgRating ? insights.avgRating.toFixed(1) : '—'}
                  {insights.avgRating ? <Stars value={Math.round(insights.avgRating)} /> : null}
                </span>
                <span className="warranty-insights__sub">{insights.ratingCount} rated</span>
              </div>

              <div className="warranty-insights__stat">
                <span className="warranty-insights__label">Lifetime registered</span>
                <span className="warranty-insights__value">{formatPrice(insights.totalRevenue)}</span>
                <span className="warranty-insights__sub">{stats.total} pieces</span>
              </div>

              <div className="warranty-insights__stat">
                <span className="warranty-insights__label">Marketing opt-ins</span>
                <span className="warranty-insights__value">{insights.emailOptIn}<span className="warranty-insights__unit"> email</span></span>
                <span className="warranty-insights__sub">{insights.smsOptIn} SMS · {insights.wantsEvents} events</span>
              </div>

              <div className="warranty-insights__stat">
                <span className="warranty-insights__label">Top occasion</span>
                <span className="warranty-insights__value">
                  {insights.topOccasions[0]?.label || '—'}
                </span>
                <span className="warranty-insights__sub">
                  {insights.topOccasions.slice(0, 3).map((o) => `${o.label} (${o.n})`).join(' · ') || 'No data yet'}
                </span>
              </div>

              <div className="warranty-insights__stat">
                <span className="warranty-insights__label">Top discovery</span>
                <span className="warranty-insights__value">
                  {insights.topDiscovery[0]?.label || '—'}
                </span>
                <span className="warranty-insights__sub">
                  {insights.topDiscovery.slice(0, 3).map((o) => `${o.label} (${o.n})`).join(' · ') || 'No data yet'}
                </span>
              </div>

              <div className="warranty-insights__stat">
                <span className="warranty-insights__label">Service follow-ups</span>
                <span className="warranty-insights__value">{insights.wantsAppraisal + insights.wantsCareKit}</span>
                <span className="warranty-insights__sub">{insights.wantsAppraisal} appraisals · {insights.wantsCareKit} care kits</span>
              </div>

              <div className="warranty-insights__stat">
                <span className="warranty-insights__label">Audience mix</span>
                <span className="warranty-insights__value">{insights.visiting}<span className="warranty-insights__unit"> visiting</span></span>
                <span className="warranty-insights__sub">{insights.returning} returning customers</span>
              </div>
            </div>
          )}

          <div className="admin-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone, item, SKU…"
                style={{ flex: 1, minWidth: 220, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4 }}
              />
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4 }}
              >
                <option value="all">All boutiques</option>
                <option value="opal-grand">Opal Grand</option>
                <option value="opal-sol">Opal Sol</option>
                <option value="jupiter-beach">Jupiter Beach</option>
                <option value="other">Other</option>
              </select>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { key: 'all',       label: `All (${stats.total})` },
                  { key: 'pending',   label: `Pending (${stats.pending})` },
                  { key: 'confirmed', label: `Confirmed (${stats.confirmed})` },
                  { key: 'archived',  label: `Archived (${stats.archived})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    className={`admin-tab ${statusFilter === t.key ? 'active' : ''}`}
                    onClick={() => setStatusFilter(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="admin-card">Loading warranty registrations…</div>
          ) : filtered.length === 0 ? (
            <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
              {tableMissing ? (
                <>
                  <p><strong>Demo mode</strong> — the warranty database table hasn't been created yet.</p>
                  <p className="small" style={{ marginTop: 8 }}>
                    Submissions from the customer form will look successful but won't be persisted. Run migrations 04 and 05 in Supabase to start capturing real data.
                  </p>
                  <p className="small" style={{ marginTop: 8 }}>
                    The <strong>Generate QR</strong> tab works fully in the meantime.
                  </p>
                </>
              ) : (
                <>
                  <p>No warranty registrations found.</p>
                  <p className="small" style={{ marginTop: 8 }}>
                    Use the <strong>Generate QR</strong> tab to create a QR code for an in-store sale.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="admin-card" style={{ padding: 0, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f8f8', borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Customer</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Item</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Price</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Boutique</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Status</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Submitted</th>
                    <th style={{ padding: 12, textAlign: 'right', fontSize: 13 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                      onClick={() => setActiveId(r.id)}
                    >
                      <td style={{ padding: 12, fontSize: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <strong>{r.customer_name}</strong>
                          {r.is_gift && <span className="admin-badge admin-badge--gray" title="Gift purchase">Gift</span>}
                          {r.is_returning_customer && <span className="admin-badge admin-badge--success" title="Returning customer">VIP</span>}
                        </div>
                        <div className="small" style={{ marginTop: 2 }}>{r.customer_email}</div>
                        {r.experience_rating ? (
                          <div style={{ marginTop: 4 }}><Stars value={r.experience_rating} /></div>
                        ) : null}
                      </td>
                      <td style={{ padding: 12, fontSize: 14 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          {r.photo_url && (
                            <img
                              src={r.photo_url}
                              alt=""
                              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee', flexShrink: 0 }}
                            />
                          )}
                          <div>
                            <div>{r.item_name}</div>
                            {(r.item_sku || r.item_serial) && (
                              <div className="small" style={{ marginTop: 2 }}>
                                {r.item_sku && <span>SKU {r.item_sku}</span>}
                                {r.item_sku && r.item_serial && <span> · </span>}
                                {r.item_serial && <span>S/N {r.item_serial}</span>}
                              </div>
                            )}
                            {r.occasion && (
                              <div className="small" style={{ marginTop: 2, color: 'var(--accent, #b8956e)' }}>
                                {OCCASION_LABELS[r.occasion] || r.occasion}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: 12, fontSize: 14 }}>{formatPrice(r.purchase_price)}</td>
                      <td style={{ padding: 12, fontSize: 13, color: '#666' }}>
                        {LOCATION_LABELS[r.store_location] || r.store_location || '—'}
                      </td>
                      <td style={{ padding: 12 }}>{statusBadge(r)}</td>
                      <td style={{ padding: 12, fontSize: 13, color: '#666' }}>{formatDate(r.created_at)}</td>
                      <td style={{ padding: 12, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="admin-icon-btn admin-icon-btn--danger"
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <RegistrationModal
        reg={active}
        onClose={() => setActiveId(null)}
        onStatusChange={handleStatusChange}
        onSaveDetails={handleSaveDetails}
      />

      {confirmDeleteId && (
        <div className="admin-modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete registration?</h3>
            <p>This will permanently remove the warranty record. This cannot be undone.</p>
            <div className="admin-modal__actions">
              <button onClick={() => handleDelete(confirmDeleteId)} className="admin-btn admin-btn--danger">Delete</button>
              <button onClick={() => setConfirmDeleteId(null)} className="admin-btn admin-btn--ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
