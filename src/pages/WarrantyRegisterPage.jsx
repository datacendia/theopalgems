import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabaseClient';

// ─── Reference data ──────────────────────────────────────────────────────────

const LOCATION_OPTIONS = [
  { value: 'opal-grand',    label: 'Opal Grand — Delray Beach, FL' },
  { value: 'opal-sol',      label: 'Opal Sol — Clearwater Beach, FL' },
  { value: 'jupiter-beach', label: 'Jupiter Beach Resort & Spa — Jupiter, FL' },
  { value: 'other',         label: 'Other / event' },
];

const OCCASION_OPTIONS = [
  { value: 'engagement',    label: 'Engagement'   },
  { value: 'anniversary',   label: 'Anniversary'  },
  { value: 'birthday',      label: 'Birthday'     },
  { value: 'self_purchase', label: 'Treating myself' },
  { value: 'gift',          label: 'Gift for someone' },
  { value: 'just_because',  label: 'Just because' },
  { value: 'other',         label: 'Something else' },
];

const RELATIONSHIP_OPTIONS = [
  { value: 'partner',   label: 'Partner'   },
  { value: 'spouse',    label: 'Spouse'    },
  { value: 'parent',    label: 'Parent'    },
  { value: 'child',     label: 'Child'     },
  { value: 'sibling',   label: 'Sibling'   },
  { value: 'friend',    label: 'Friend'    },
  { value: 'colleague', label: 'Colleague' },
  { value: 'self',      label: 'Myself'    },
  { value: 'other',     label: 'Other'     },
];

const DISCOVERY_OPTIONS = [
  { value: 'instagram',          label: 'Instagram'         },
  { value: 'google',             label: 'Google search'     },
  { value: 'hotel_concierge',    label: 'Hotel concierge'   },
  { value: 'walk_in',            label: 'Walked past'       },
  { value: 'returning_customer', label: "I'm a returning customer" },
  { value: 'friend_referral',    label: 'Friend / referral' },
  { value: 'event',              label: 'Event or trunk show' },
  { value: 'other',              label: 'Somewhere else'    },
];

const HOTEL_OPTIONS = [
  { value: 'opal-grand',    label: 'Opal Grand Resort'           },
  { value: 'opal-sol',      label: 'Opal Sol Resort'             },
  { value: 'jupiter-beach', label: 'Jupiter Beach Resort & Spa'  },
  { value: 'other',         label: 'A different hotel'           },
];

const METAL_OPTIONS = [
  { value: 'yellow_gold', label: 'Yellow gold' },
  { value: 'white_gold',  label: 'White gold'  },
  { value: 'rose_gold',   label: 'Rose gold'   },
  { value: 'platinum',    label: 'Platinum'    },
  { value: 'silver',      label: 'Silver'      },
  { value: 'mixed',       label: 'Mixed metals' },
];

const STYLE_OPTIONS = [
  { value: 'classic',     label: 'Classic'     },
  { value: 'modern',      label: 'Modern'      },
  { value: 'vintage',     label: 'Vintage'     },
  { value: 'statement',   label: 'Statement'   },
  { value: 'minimalist',  label: 'Minimalist'  },
  { value: 'bohemian',    label: 'Bohemian'    },
];

const VISITING_OPTIONS = [
  { value: 'local',     label: "I'm local"                  },
  { value: 'visiting',  label: "I'm visiting Florida"       },
  { value: 'hotel',     label: "I'm staying at a hotel"     },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Reusable presentational pieces ──────────────────────────────────────────

function ChipGroup({ options, value, onChange, multi = false, ariaLabel }) {
  const isSelected = (v) => multi ? (Array.isArray(value) && value.includes(v)) : value === v;
  const toggle = (v) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    } else {
      onChange(value === v ? '' : v); // tap again to deselect
    }
  };
  return (
    <div className="chip-group" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`chip ${isSelected(o.value) ? 'chip--selected' : ''}`}
          onClick={() => toggle(o.value)}
          aria-pressed={isSelected(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle">
      <span className="toggle__copy">
        <span className="toggle__label">{label}</span>
        {hint && <span className="toggle__hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__switch" aria-hidden="true" />
    </label>
  );
}

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const active = hover || value || 0;
  return (
    <div className="star-rating" role="radiogroup" aria-label="Experience rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className={`star ${n <= active ? 'star--on' : ''}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(value === n ? 0 : n)}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// ─── Photo upload (Supabase storage, anon-bucket pattern) ────────────────────

async function compressImage(file, maxDim = 1400, quality = 0.85) {
  // Best-effort client-side compression — keeps phone-size uploads tiny.
  // If anything goes wrong we just fall back to the original file.
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = URL.createObjectURL(file);
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], (file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function PhotoUpload({ url, onUploadedUrl, onError }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      onError && onError('Please choose an image.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      onError && onError('Image is too large (max 12MB).');
      return;
    }
    try {
      setUploading(true);
      onError && onError('');
      const compressed = await compressImage(file);
      const ext = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from('warranty-photos')
        .upload(path, compressed, { contentType: compressed.type || 'image/jpeg', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('warranty-photos').getPublicUrl(path);
      onUploadedUrl(data.publicUrl);
    } catch (err) {
      console.error(err);
      onError && onError('Upload failed. You can submit without the photo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="photo-upload">
      {url ? (
        <div className="photo-upload__preview">
          <img src={url} alt="Your piece" />
          <button type="button" className="photo-upload__remove" onClick={() => onUploadedUrl('')}>Remove</button>
        </div>
      ) : (
        <label className={`photo-upload__drop ${uploading ? 'is-uploading' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            disabled={uploading}
          />
          <span className="photo-upload__icon" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
          <span className="photo-upload__label">
            {uploading ? 'Uploading…' : 'Add a photo of your piece'}
          </span>
          <span className="photo-upload__hint">Optional — JPG/PNG, max 12MB</span>
        </label>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WarrantyRegisterPage() {
  const [params] = useSearchParams();

  const initial = useMemo(() => ({
    // Identity
    customer_name:    '',
    customer_email:   '',
    customer_phone:   '',
    // Item — customer-facing basics
    item_name:        params.get('item') || '',
    purchase_date:    params.get('date') || todayIso(),
    store_location:   params.get('location') || '',
    sales_associate:  params.get('associate') || '',
    // Item — associate-only details (silently carried from QR if pre-filled;
    // not shown to the customer, can be completed by the associate in admin).
    item_category:    params.get('category') || '',
    item_sku:         params.get('sku') || '',
    item_serial:      params.get('serial') || '',
    purchase_price:   params.get('price') || '',
    receipt_number:   params.get('receipt') || '',
    notes:            '',
    // Tier 1 — Marketing intelligence
    occasion:                    '',
    is_gift:                     false,
    gift_recipient_name:         '',
    gift_recipient_relationship: '',
    gift_recipient_birthday:     '',
    customer_birthday:           '',
    discovery_source:            '',
    visiting_status:             '', // local | visiting | hotel  (derived → is_visiting + staying_at_hotel)
    hotel_name:                  '',
    hotel_checkout_date:         '',
    home_city:                   '',
    marketing_opt_in_email:      true,  // pre-checked — opt-out style
    marketing_opt_in_sms:        false,
    // Tier 2 — Product preferences
    ring_size:           '',
    chain_length:        '',
    metal_preference:    '',
    style_preferences:   [],
    engraving_text:      '',
    wants_appraisal:     false,
    care_kit_interest:   false,
    // Tier 3 — Experience capture
    experience_rating:    0,
    photo_url:            '',
    ugc_consent:          false,
    associate_confirmed:  null,   // null = unanswered
    // Tier 4 — Loyalty & referrals
    referred_by:             '',
    is_returning_customer:   null,
    interested_in_events:    false,
    // Anti-spam
    honeypot:            '',
  }), [params]);

  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState({ state: 'idle', message: '', fields: [] });
  const [photoError, setPhotoError] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const set = (k) => (v) => setForm((prev) => ({ ...prev, [k]: v }));
  const setEvt = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ state: 'loading', message: '', fields: [] });

    // Derive is_visiting / staying_at_hotel from the single visiting_status chip
    const is_visiting      = form.visiting_status === 'visiting' || form.visiting_status === 'hotel';
    const staying_at_hotel = form.visiting_status === 'hotel';

    const payload = {
      ...form,
      is_visiting,
      staying_at_hotel,
      // Only send hotel fields if they actually said they're at one
      hotel_name:          staying_at_hotel ? form.hotel_name : '',
      hotel_checkout_date: staying_at_hotel ? form.hotel_checkout_date : '',
      // Only send recipient fields if it's a gift
      gift_recipient_name:         form.is_gift ? form.gift_recipient_name : '',
      gift_recipient_relationship: form.is_gift ? form.gift_recipient_relationship : '',
      gift_recipient_birthday:     form.is_gift ? form.gift_recipient_birthday : '',
      // Strip out client-only key
      visiting_status: undefined,
    };

    try {
      const res = await fetch('/api/warranty-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ state: 'error', message: data.error || 'Something went wrong. Please try again.', fields: data.fields || [] });
        return;
      }
      setStatus({ state: 'success', message: data.message || 'Your warranty registration is confirmed.', fields: [] });
    } catch {
      setStatus({ state: 'error', message: 'Network error. Please try again.', fields: [] });
    }
  };

  if (status.state === 'success') {
    return (
      <div className="page warranty-page">
        <SEO title="Warranty Confirmed" path="/warranty/register" noIndex />
        <main className="container warranty-page__container">
          <div className="warranty-success">
            <div className="warranty-success__icon" aria-hidden="true">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <p className="eyebrow">Warranty Registered</p>
            <h1>Thank you, {form.customer_name.split(' ')[0] || 'friend'}.</h1>
            <p className="lead">{status.message}</p>
            <div className="warranty-success__summary">
              <p><strong>{form.item_name}</strong></p>
              {form.purchase_price && <p className="small">Purchase price: ${Number(form.purchase_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
              {form.purchase_date && <p className="small">Purchase date: {form.purchase_date}</p>}
            </div>
            <p className="small">A copy has been emailed to <strong>{form.customer_email}</strong>. Please keep it for your records.</p>
            <div className="warranty-success__actions">
              <Link to="/" className="pill primary">Back to Opal Gems</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isInvalid = (f) => status.fields?.includes(f);

  return (
    <div className="page warranty-page">
      <SEO
        title="Warranty Registration"
        description="Register your Opal Gems purchase for warranty coverage."
        path="/warranty/register"
        noIndex
      />

      <header className="warranty-page__hero">
        <div className="warranty-page__hero-content">
          <p className="eyebrow">Warranty Registration</p>
          <h1>Register your piece</h1>
          <p className="lead">
            Welcome — let's take a moment to register your new piece. Your warranty
            covers manufacturing defects for one (1) year from the date of purchase.
          </p>
        </div>
      </header>

      <main className="container warranty-page__container">
        <form className="warranty-form" onSubmit={handleSubmit} noValidate>
          {/* Honeypot */}
          <input
            type="text"
            name="website"
            value={form.honeypot}
            onChange={setEvt('honeypot')}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
          />

          {/* ── Your details ── */}
          <section className="warranty-form__section">
            <h2 className="warranty-form__title">Your details</h2>
            <p className="warranty-form__hint">So we can reach you about your warranty.</p>

            <div className="warranty-form__field">
              <label htmlFor="customer_name">Full name <span className="warranty-form__required">*</span></label>
              <input
                id="customer_name"
                type="text"
                autoComplete="name"
                required
                value={form.customer_name}
                onChange={setEvt('customer_name')}
                className={isInvalid('customer_name') ? 'has-error' : ''}
              />
            </div>

            <div className="warranty-form__row">
              <div className="warranty-form__field">
                <label htmlFor="customer_email">Email <span className="warranty-form__required">*</span></label>
                <input
                  id="customer_email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={form.customer_email}
                  onChange={setEvt('customer_email')}
                  className={isInvalid('customer_email') ? 'has-error' : ''}
                />
              </div>
              <div className="warranty-form__field">
                <label htmlFor="customer_phone">Phone <span className="warranty-form__required">*</span></label>
                <input
                  id="customer_phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  value={form.customer_phone}
                  onChange={setEvt('customer_phone')}
                  className={isInvalid('customer_phone') ? 'has-error' : ''}
                />
              </div>
            </div>
          </section>

          {/* ── Your purchase ── */}
          <section className="warranty-form__section">
            <h2 className="warranty-form__title">Your purchase</h2>
            <p className="warranty-form__hint">Just the basics — our team has the rest on file.</p>

            <div className="warranty-form__field">
              <label htmlFor="item_name">Item description <span className="warranty-form__required">*</span></label>
              <input
                id="item_name" type="text" required
                placeholder="e.g. Solitaire Diamond Ring, 1.25 CTW"
                value={form.item_name} onChange={setEvt('item_name')}
                className={isInvalid('item_name') ? 'has-error' : ''}
              />
            </div>

            <div className="warranty-form__row">
              <div className="warranty-form__field">
                <label htmlFor="purchase_date">Purchase date</label>
                <input id="purchase_date" type="date" value={form.purchase_date} onChange={setEvt('purchase_date')} />
              </div>
              <div className="warranty-form__field">
                <label htmlFor="store_location">Boutique</label>
                <select id="store_location" value={form.store_location} onChange={setEvt('store_location')}>
                  <option value="">Select…</option>
                  {LOCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="warranty-form__field">
              <label htmlFor="sales_associate">Sales associate <span className="warranty-form__optional">(if you remember)</span></label>
              <input id="sales_associate" type="text" placeholder="Who helped you today?"
                value={form.sales_associate} onChange={setEvt('sales_associate')} />
            </div>
          </section>

          {/* ── About this purchase (Tier 1) ── */}
          <section className="warranty-form__section warranty-form__section--accent">
            <h2 className="warranty-form__title">A few quick questions</h2>
            <p className="warranty-form__hint">All optional — but they help us serve you better and personalize your follow-up.</p>

            <div className="warranty-form__field">
              <label className="warranty-form__qlabel">What's the occasion?</label>
              <ChipGroup
                options={OCCASION_OPTIONS}
                value={form.occasion}
                onChange={set('occasion')}
                ariaLabel="Occasion"
              />
            </div>

            <Toggle
              checked={form.is_gift}
              onChange={set('is_gift')}
              label="This is a gift for someone else"
              hint="So we don't reveal the surprise."
            />

            {form.is_gift && (
              <div className="warranty-form__conditional">
                <div className="warranty-form__row">
                  <div className="warranty-form__field">
                    <label>Recipient's name</label>
                    <input type="text" value={form.gift_recipient_name} onChange={setEvt('gift_recipient_name')} />
                  </div>
                  <div className="warranty-form__field">
                    <label>Recipient's birthday</label>
                    <input type="date" value={form.gift_recipient_birthday} onChange={setEvt('gift_recipient_birthday')} />
                  </div>
                </div>
                <div className="warranty-form__field">
                  <label className="warranty-form__qlabel">Relationship</label>
                  <ChipGroup
                    options={RELATIONSHIP_OPTIONS}
                    value={form.gift_recipient_relationship}
                    onChange={set('gift_recipient_relationship')}
                    ariaLabel="Relationship"
                  />
                </div>
              </div>
            )}

            <div className="warranty-form__field">
              <label htmlFor="customer_birthday">Your birthday (we love to celebrate)</label>
              <input id="customer_birthday" type="date" value={form.customer_birthday} onChange={setEvt('customer_birthday')} />
            </div>

            <div className="warranty-form__field">
              <label className="warranty-form__qlabel">How did you find us?</label>
              <ChipGroup
                options={DISCOVERY_OPTIONS}
                value={form.discovery_source}
                onChange={set('discovery_source')}
                ariaLabel="How did you find us"
              />
            </div>

            <div className="warranty-form__field">
              <label className="warranty-form__qlabel">Where are you joining us from?</label>
              <ChipGroup
                options={VISITING_OPTIONS}
                value={form.visiting_status}
                onChange={set('visiting_status')}
                ariaLabel="Visiting status"
              />
            </div>

            {form.visiting_status === 'hotel' && (
              <div className="warranty-form__conditional">
                <div className="warranty-form__field">
                  <label className="warranty-form__qlabel">Which hotel?</label>
                  <ChipGroup
                    options={HOTEL_OPTIONS}
                    value={form.hotel_name}
                    onChange={set('hotel_name')}
                    ariaLabel="Hotel"
                  />
                </div>
                <div className="warranty-form__field">
                  <label>Checkout date</label>
                  <input type="date" value={form.hotel_checkout_date} onChange={setEvt('hotel_checkout_date')} />
                </div>
              </div>
            )}

            {(form.visiting_status === 'visiting' || form.visiting_status === 'hotel') && (
              <div className="warranty-form__field">
                <label htmlFor="home_city">Home city</label>
                <input id="home_city" type="text" value={form.home_city} onChange={setEvt('home_city')}
                  placeholder="e.g. New York, NY" />
              </div>
            )}
          </section>

          {/* ── Your style (Tier 2) ── */}
          <section className="warranty-form__section warranty-form__section--accent">
            <h2 className="warranty-form__title">Your style</h2>
            <p className="warranty-form__hint">Helps us hand-pick pieces for you next time.</p>

            <div className="warranty-form__field">
              <label className="warranty-form__qlabel">Favourite metal</label>
              <ChipGroup
                options={METAL_OPTIONS}
                value={form.metal_preference}
                onChange={set('metal_preference')}
                ariaLabel="Metal preference"
              />
            </div>

            <div className="warranty-form__field">
              <label className="warranty-form__qlabel">Style — pick all that resonate</label>
              <ChipGroup
                options={STYLE_OPTIONS}
                value={form.style_preferences}
                onChange={set('style_preferences')}
                multi
                ariaLabel="Style preferences"
              />
            </div>

            <div className="warranty-form__row">
              <div className="warranty-form__field">
                <label htmlFor="ring_size">Ring size</label>
                <input id="ring_size" type="text" placeholder="e.g. 6.5" value={form.ring_size} onChange={setEvt('ring_size')} />
              </div>
              <div className="warranty-form__field">
                <label htmlFor="chain_length">Chain length</label>
                <input id="chain_length" type="text" placeholder='e.g. 18"' value={form.chain_length} onChange={setEvt('chain_length')} />
              </div>
            </div>

            <div className="warranty-form__field">
              <label htmlFor="engraving_text">Engraving (if any)</label>
              <input id="engraving_text" type="text" maxLength={120} placeholder="Initials, date, message…"
                value={form.engraving_text} onChange={setEvt('engraving_text')} />
            </div>

            <Toggle
              checked={form.wants_appraisal}
              onChange={set('wants_appraisal')}
              label="I'd like an insurance appraisal"
              hint="Our team will email you the appraisal letter."
            />
            <Toggle
              checked={form.care_kit_interest}
              onChange={set('care_kit_interest')}
              label="Send me a complimentary care guide"
              hint="Keep your piece sparkling between visits."
            />
          </section>

          {/* ── Your experience (Tier 3) ── */}
          <section className="warranty-form__section warranty-form__section--accent">
            <h2 className="warranty-form__title">Your experience</h2>
            <p className="warranty-form__hint">A tiny rating and an optional photo. That's it.</p>

            <div className="warranty-form__field">
              <label className="warranty-form__qlabel">How would you rate today's visit?</label>
              <StarRating value={form.experience_rating} onChange={set('experience_rating')} />
            </div>

            <div className="warranty-form__field">
              <label className="warranty-form__qlabel">A photo of your piece (optional)</label>
              <PhotoUpload
                url={form.photo_url}
                onUploadedUrl={set('photo_url')}
                onError={setPhotoError}
              />
              {photoError && <p className="small" style={{ color: '#c0392b', marginTop: 8 }}>{photoError}</p>}
            </div>

            <Toggle
              checked={form.ugc_consent}
              onChange={set('ugc_consent')}
              label="You may feature my photo on Opal Gems social"
              hint="We'll always credit you — and you can withdraw consent any time."
            />

            {form.sales_associate && (
              <div className="warranty-form__field">
                <label className="warranty-form__qlabel">Was {form.sales_associate} a great host?</label>
                <ChipGroup
                  options={[
                    { value: 'yes',     label: 'Yes, wonderful' },
                    { value: 'no',      label: 'Could be better' },
                  ]}
                  value={form.associate_confirmed === true ? 'yes' : form.associate_confirmed === false ? 'no' : ''}
                  onChange={(v) => set('associate_confirmed')(v === 'yes' ? true : v === 'no' ? false : null)}
                  ariaLabel="Associate confirmation"
                />
              </div>
            )}
          </section>

          {/* ── Stay in touch (Tier 4) ── */}
          <section className="warranty-form__section warranty-form__section--accent">
            <h2 className="warranty-form__title">Stay in touch</h2>
            <p className="warranty-form__hint">We'll only reach out when we have something worth your time.</p>

            <Toggle
              checked={form.marketing_opt_in_email}
              onChange={set('marketing_opt_in_email')}
              label="Email me new arrivals and private events"
            />
            <Toggle
              checked={form.marketing_opt_in_sms}
              onChange={set('marketing_opt_in_sms')}
              label="Text me about VIP previews and trunk shows"
              hint="We'll never share your number. Reply STOP any time."
            />
            <Toggle
              checked={form.interested_in_events}
              onChange={set('interested_in_events')}
              label="Invite me to trunk shows and private events"
            />

            <div className="warranty-form__field">
              <label className="warranty-form__qlabel">Were you referred by someone?</label>
              <input type="text" placeholder="Their name (optional)" value={form.referred_by} onChange={setEvt('referred_by')} />
            </div>

            <div className="warranty-form__field">
              <label className="warranty-form__qlabel">Are you a returning customer?</label>
              <ChipGroup
                options={[
                  { value: 'yes',  label: 'Yes — welcome back to me' },
                  { value: 'no',   label: 'First purchase' },
                ]}
                value={form.is_returning_customer === true ? 'yes' : form.is_returning_customer === false ? 'no' : ''}
                onChange={(v) => set('is_returning_customer')(v === 'yes' ? true : v === 'no' ? false : null)}
                ariaLabel="Returning customer"
              />
            </div>

            <div className="warranty-form__field">
              <label htmlFor="notes">Anything else? (optional)</label>
              <textarea id="notes" rows="3" maxLength={2000}
                placeholder="Sizing notes, special requests, or just say hi…"
                value={form.notes} onChange={setEvt('notes')} />
            </div>
          </section>

          {status.state === 'error' && (
            <div className="warranty-form__error" role="alert">{status.message}</div>
          )}

          <div className="warranty-form__actions">
            <button
              type="submit"
              className="pill primary warranty-form__submit"
              disabled={status.state === 'loading'}
            >
              {status.state === 'loading' ? 'Submitting…' : 'Register my warranty'}
            </button>
            <p className="small warranty-form__legal">
              By submitting, you agree we may use your contact details for warranty service and order communications.
              See our <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
