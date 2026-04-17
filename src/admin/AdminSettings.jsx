import React, { useState } from 'react';
import { getAdminPassword, setAdminPassword } from './api';

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

  const handleExportData = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('admin_')) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opalgems-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        setMessage({ type: 'success', text: 'Data imported successfully! Refresh to see changes.' });
      } catch {
        setMessage({ type: 'error', text: 'Invalid backup file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    if (!window.confirm('Are you sure you want to reset ALL data to defaults? This cannot be undone.')) return;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('admin_') && key !== 'admin_token' && key !== 'admin_login_time') {
        keys.push(key);
      }
    }
    keys.forEach(k => localStorage.removeItem(k));
    setMessage({ type: 'success', text: 'All data reset to defaults. Refresh to see changes.' });
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
          <p className="admin-card__hint">Export your data as a backup or import from a previous backup.</p>
          <div className="admin-form" style={{ gap: 12 }}>
            <button onClick={handleExportData} className="admin-btn admin-btn--outline admin-btn--full">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Backup
            </button>
            <label className="admin-btn admin-btn--outline admin-btn--full" style={{ cursor: 'pointer', textAlign: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import Backup
              <input type="file" accept=".json" onChange={handleImportData} hidden />
            </label>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />
            <button onClick={handleResetData} className="admin-btn admin-btn--danger-outline admin-btn--full">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              Reset All Data to Defaults
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <h3>Deployment Info</h3>
        <p className="admin-card__hint">Information about your hosting setup.</p>
        <div className="admin-info-grid">
          <div className="admin-info-item">
            <span className="admin-info-label">Platform</span>
            <span className="admin-info-value">GoDaddy Hosting</span>
          </div>
          <div className="admin-info-item">
            <span className="admin-info-label">Data Storage</span>
            <span className="admin-info-value">Browser Local Storage</span>
          </div>
          <div className="admin-info-item">
            <span className="admin-info-label">Admin Panel</span>
            <span className="admin-info-value">Built-in (React)</span>
          </div>
          <div className="admin-info-item">
            <span className="admin-info-label">Version</span>
            <span className="admin-info-value">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
