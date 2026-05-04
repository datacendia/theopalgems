import React, { useState } from 'react';
import {
  getAdminPassword,
  setAdminPassword,
  getWatches,
  getLocations,
  getPhotos,
  getSections,
  getProducts,
  getSubscribers,
} from './api';

export default function AdminSettings() {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [message, setMessage] = useState(null);

  const handleChangePassword = (e) => {
    e.preventDefault();
    setMessage(null);

    if (currentPass !== getAdminPassword()) {
      setMessage({ type: 'error', text: 'Current password is incorrect.' });
      return;
    }
    if (newPass.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPass !== confirmPass) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setAdminPassword(newPass);
    setMessage({ type: 'success', text: 'Password changed successfully!' });
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  };

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
          <h3>Change Password</h3>
          <form onSubmit={handleChangePassword} className="admin-form">
            <div className="admin-field">
              <label>Current Password</label>
              <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} required />
            </div>
            <div className="admin-field">
              <label>New Password</label>
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Min 6 characters" required />
            </div>
            <div className="admin-field">
              <label>Confirm New Password</label>
              <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} required />
            </div>
            <button type="submit" className="admin-btn admin-btn--primary">Update Password</button>
          </form>
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
