import React, { useState } from 'react';
import {
  getWatches,
  getLocations,
  getPhotos,
  getSections,
  getProducts,
  getSubscribers,
} from './api';

export default function AdminSettings() {
  const [message, setMessage] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setMessage(null);
    setExporting(true);
    try {
      const [watches, locations, photos, sections, necklaces, rings, earrings, bracelets, subscribers] = await Promise.all([
        getWatches(),
        getLocations(),
        getPhotos(),
        getSections(),
        getProducts('necklaces'),
        getProducts('rings'),
        getProducts('earrings'),
        getProducts('bracelets'),
        getSubscribers().catch(() => []),
      ]);

      const backup = {
        exported_at: new Date().toISOString(),
        version: '1.1.0',
        data: {
          watches,
          locations,
          photos,
          sections,
          products: { necklaces, rings, earrings, bracelets },
          subscribers,
        },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opalgems-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Backup downloaded successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: `Export failed: ${err.message}` });
    } finally {
      setExporting(false);
    }
  };

  const handleExportSubscribersCsv = async () => {
    setMessage(null);
    try {
      const rows = await getSubscribers();
      const header = ['email', 'source', 'confirmed', 'created_at', 'unsubscribed_at'];
      const escape = (v) => {
        if (v == null) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [
        header.join(','),
        ...rows.map(r => header.map(h => escape(r[h])).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opalgems-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Subscribers CSV downloaded.' });
    } catch (err) {
      setMessage({ type: 'error', text: `Export failed: ${err.message}` });
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Settings</h1>
          <p className="admin-page__subtitle">Manage your admin panel settings.</p>
        </div>
      </div>

      {message && (
        <div className={`admin-alert admin-alert--${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="admin-grid-2">
        <div className="admin-card">
          <h3>Admin Password</h3>
          <p className="admin-card__hint" style={{ marginBottom: 16 }}>
            Your admin password is managed as a server-side secret for security.
            It cannot be changed from this panel.
          </p>
          <div style={{ background: '#f8f8f8', borderLeft: '3px solid #c9a96e', padding: '14px 18px', fontSize: 14, lineHeight: 1.6 }}>
            <strong>To change your password:</strong>
            <ol style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18 }}>
              <li>Sign in to your Netlify dashboard</li>
              <li>Go to <em>Project configuration → Environment variables</em></li>
              <li>Edit the <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>ADMIN_PASSWORD</code> value</li>
              <li>Trigger a redeploy from the <em>Deploys</em> tab</li>
            </ol>
          </div>
          <p className="admin-card__hint" style={{ marginTop: 12, fontSize: 12 }}>
            <strong>Tip:</strong> Use a long random password (16+ characters) and store it in a password manager.
          </p>
        </div>

        <div className="admin-card">
          <h3>Data Management</h3>
          <p className="admin-card__hint">Download a JSON snapshot of all Supabase data, or export the subscribers list as CSV.</p>
          <div className="admin-form" style={{ gap: 12 }}>
            <button onClick={handleExportData} className="admin-btn admin-btn--outline admin-btn--full" disabled={exporting}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {exporting ? 'Exporting...' : 'Export Full Backup (JSON)'}
            </button>
            <button onClick={handleExportSubscribersCsv} className="admin-btn admin-btn--outline admin-btn--full">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Subscribers (CSV)
            </button>
            <p className="admin-card__hint" style={{ marginTop: 8, fontSize: 12 }}>
              <strong>Note:</strong> Restoring backups is best done directly in your Supabase dashboard for safety.
            </p>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <h3>Deployment Info</h3>
        <p className="admin-card__hint">Information about your hosting setup.</p>
        <div className="admin-info-grid">
          <div className="admin-info-item">
            <span className="admin-info-label">Platform</span>
            <span className="admin-info-value">Netlify</span>
          </div>
          <div className="admin-info-item">
            <span className="admin-info-label">Data Storage</span>
            <span className="admin-info-value">Supabase (Postgres + Storage)</span>
          </div>
          <div className="admin-info-item">
            <span className="admin-info-label">Email Service</span>
            <span className="admin-info-value">Resend</span>
          </div>
          <div className="admin-info-item">
            <span className="admin-info-label">Admin Panel</span>
            <span className="admin-info-value">Built-in (React)</span>
          </div>
          <div className="admin-info-item">
            <span className="admin-info-label">Version</span>
            <span className="admin-info-value">1.1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
