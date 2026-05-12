import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import SEO from '../components/SEO';

const REFERRAL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google search' },
  { value: 'hotel-concierge', label: 'Hotel concierge or staff' },
  { value: 'friend', label: 'Friend or referral' },
  { value: 'event', label: 'Event or trunk show' },
  { value: 'other', label: 'Somewhere else' },
];

const LOCATION_OPTIONS = [
  { value: 'opal-grand', label: 'Opal Grand — Delray Beach' },
  { value: 'opal-sol', label: 'Opal Sol — Clearwater Beach' },
  { value: 'jupiter-beach', label: 'Jupiter Beach Resort & Spa' },
  { value: 'multiple', label: 'More than one' },
  { value: 'undecided', label: 'Not sure yet' },
];

const INTENT_OPTIONS = [
  { value: 'browsing', label: 'Just browsing' },
  { value: 'looking-to-purchase', label: 'Looking to purchase soon' },
  { value: 'custom-piece', label: 'Interested in a custom piece' },
  { value: 'gift', label: 'Shopping for a gift' },
];

export default function PreferencesPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const justConfirmed = params.get('confirmed') === '1';

  const [referral, setReferral] = useState('');
  const [location, setLocation] = useState('');
  const [intent, setIntent] = useState('');
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  const tokenValid = useMemo(() => /^[a-zA-Z0-9-]{16,}$/.test(token), [token]);

  useEffect(() => {
    if (!tokenValid) {
      setStatus({ state: 'error', message: 'This link is missing or invalid.' });
    }
  }, [tokenValid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tokenValid) return;
    if (!referral && !location && !intent) {
      setStatus({ state: 'error', message: 'Please answer at least one question.' });
      return;
    }
    setStatus({ state: 'loading', message: '' });
    try {
      const res = await fetch('/api/profile-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          referral_source: referral || null,
          location_interest: location || null,
          purchase_intent: intent || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ state: 'error', message: data.error || 'Something went wrong.' });
        return;
      }
      setStatus({ state: 'success', message: data.message || 'Saved. Thank you!' });
    } catch {
      setStatus({ state: 'error', message: 'Network error. Please try again.' });
    }
  };

  if (status.state === 'success') {
    return (
      <main className="container" style={{ paddingTop: 48, paddingBottom: 48, maxWidth: 600 }}>
        <SEO title="Thank you · Opal Gems" noindex />
        <div className="section__header" style={{ textAlign: 'center' }}>
          <p className="eyebrow">Thank you</p>
          <h1 style={{ fontWeight: 400 }}>Your preferences are saved.</h1>
          <p>{status.message}</p>
          <p className="small">We'll keep our messages relevant to what you're looking for.</p>
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/" className="pill primary">Back to Opal Gems</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 48, paddingBottom: 48, maxWidth: 600 }}>
      <SEO title="Your preferences · Opal Gems" noindex />

      <div className="section__header">
        <p className="eyebrow">{justConfirmed ? 'Subscription confirmed' : 'Help us personalize'}</p>
        <h1 style={{ fontWeight: 400 }}>
          {justConfirmed ? "You're on the list." : 'Tell us about you.'}
        </h1>
        <p>
          {justConfirmed
            ? 'Welcome to Opal Gems. So we can send you the most relevant updates, would you mind telling us a bit more?'
            : 'Three quick questions so we can tailor what we send you. All optional.'}
        </p>
      </div>

      {!tokenValid ? (
        <p className="small" role="alert" style={{ color: '#c0392b' }}>
          This link is missing or invalid. Please use the link from your email.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label className="small" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              How did you find us?
            </label>
            <select
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              style={selectStyle}
            >
              <option value="">Prefer not to say</option>
              {REFERRAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="small" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Which boutique are you interested in?
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={selectStyle}
            >
              <option value="">Prefer not to say</option>
              {LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="small" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              What brings you to Opal Gems?
            </label>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              style={selectStyle}
            >
              <option value="">Prefer not to say</option>
              {INTENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {status.state === 'error' && (
            <p className="small" role="alert" style={{ color: '#c0392b', margin: 0 }}>
              {status.message}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <button
              type="submit"
              className="pill primary"
              disabled={status.state === 'loading'}
              style={{ opacity: status.state === 'loading' ? 0.6 : 1 }}
            >
              {status.state === 'loading' ? 'Saving…' : 'Save my preferences'}
            </button>
            <Link to="/" className="small" style={{ color: '#666' }}>Skip for now</Link>
          </div>
        </form>
      )}
    </main>
  );
}

const selectStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 15,
  background: '#fff',
  outline: 'none',
};
