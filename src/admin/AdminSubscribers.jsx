import React, { useState, useEffect, useMemo } from 'react';
import { getSubscribers, deleteSubscriber } from './api';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function downloadCsv(rows) {
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
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | confirmed | pending | unsubscribed
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getSubscribers();
        if (!cancelled) setSubscribers(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load subscribers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const confirmed = subscribers.filter(s => s.confirmed && !s.unsubscribed_at).length;
    const pending = subscribers.filter(s => !s.confirmed && !s.unsubscribed_at).length;
    const unsubscribed = subscribers.filter(s => s.unsubscribed_at).length;
    return { total: subscribers.length, confirmed, pending, unsubscribed };
  }, [subscribers]);

  const filtered = useMemo(() => {
    return subscribers.filter(s => {
      if (filter === 'confirmed' && (!s.confirmed || s.unsubscribed_at)) return false;
      if (filter === 'pending' && (s.confirmed || s.unsubscribed_at)) return false;
      if (filter === 'unsubscribed' && !s.unsubscribed_at) return false;
      if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [subscribers, search, filter]);

  const handleDelete = async (email) => {
    try {
      const updated = await deleteSubscriber(email);
      setSubscribers(updated);
      setShowDeleteConfirm(null);
    } catch (e) {
      setError(e.message || 'Failed to delete subscriber');
    }
  };

  const statusBadge = (s) => {
    if (s.unsubscribed_at) return <span className="admin-badge admin-badge--gray">Unsubscribed</span>;
    if (s.confirmed) return <span className="admin-badge admin-badge--success">Confirmed</span>;
    return <span className="admin-badge admin-badge--warning">Pending</span>;
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Subscribers</h1>
          <p className="admin-page__subtitle">{stats.total} total · {stats.confirmed} confirmed · {stats.pending} pending · {stats.unsubscribed} unsubscribed</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => downloadCsv(filtered)}
            className="admin-btn admin-btn--outline"
            disabled={filtered.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email..."
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4 }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'all', label: `All (${stats.total})` },
              { key: 'confirmed', label: `Confirmed (${stats.confirmed})` },
              { key: 'pending', label: `Pending (${stats.pending})` },
              { key: 'unsubscribed', label: `Unsubscribed (${stats.unsubscribed})` },
            ].map(t => (
              <button
                key={t.key}
                className={`admin-tab ${filter === t.key ? 'active' : ''}`}
                onClick={() => setFilter(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="admin-card">Loading subscribers...</div>
      ) : filtered.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: 40 }}>
          <p>No subscribers found.</p>
        </div>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f8f8', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Email</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Status</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Source</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Subscribed</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 13 }}>Unsubscribed</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 13 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.email} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 12, fontSize: 14 }}>{s.email}</td>
                  <td style={{ padding: 12 }}>{statusBadge(s)}</td>
                  <td style={{ padding: 12, fontSize: 13, color: '#666' }}>{s.source || '—'}</td>
                  <td style={{ padding: 12, fontSize: 13, color: '#666' }}>{formatDate(s.created_at)}</td>
                  <td style={{ padding: 12, fontSize: 13, color: '#666' }}>{formatDate(s.unsubscribed_at)}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <button
                      onClick={() => setShowDeleteConfirm(s.email)}
                      className="admin-icon-btn admin-icon-btn--danger"
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Subscriber?</h3>
            <p>Are you sure you want to permanently delete <strong>{showDeleteConfirm}</strong>?</p>
            <div className="admin-modal__actions">
              <button onClick={() => handleDelete(showDeleteConfirm)} className="admin-btn admin-btn--danger">Delete</button>
              <button onClick={() => setShowDeleteConfirm(null)} className="admin-btn admin-btn--ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
