import React, { useState, useEffect } from 'react';
import { getWatches, saveWatch, deleteWatch, uploadPhoto } from './api';

const emptyWatch = {
  id: '',
  brand: 'Rolex',
  name: '',
  price: '',
  description: '',
  image: '',
  url: ''
};

const brands = ['Rolex', 'Audemars Piguet', 'Cartier', 'Patek Philippe', 'Other'];

export default function AdminWatches() {
  const [watches, setWatches] = useState([]);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('All');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    getWatches().then(setWatches);
  }, []);

  const filtered = watches.filter(w => {
    const matchSearch = !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.brand.toLowerCase().includes(search.toLowerCase());
    const matchBrand = brandFilter === 'All' || w.brand === brandFilter;
    return matchSearch && matchBrand;
  });

  const handleNew = () => {
    setEditing({ ...emptyWatch, id: 'watch-' + Date.now() });
  };

  const handleEdit = (watch) => {
    setEditing({ ...watch });
  };

  const handleSave = async () => {
    if (!editing.name || !editing.price) return;
    const updated = await saveWatch(editing);
    setWatches(updated);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    const updated = await deleteWatch(id);
    setWatches(updated);
    setShowDeleteConfirm(null);
  };

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleImagePreview = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadPhoto(file);
      setEditing(prev => ({ ...prev, image: url }));
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Edit Modal
  if (editing) {
    return (
      <div className="admin-page">
        <div className="admin-page__header">
          <div>
            <h1>{editing.id.startsWith('watch-') && !watches.find(w => w.id === editing.id) ? 'Add Watch' : 'Edit Watch'}</h1>
            <p className="admin-page__subtitle">Fill in the watch details below.</p>
          </div>
        </div>

        <div className="admin-card" style={{ maxWidth: 720 }}>
          <div className="admin-form">
            <div className="admin-form__row">
              <div className="admin-field">
                <label>Brand</label>
                <select value={editing.brand} onChange={(e) => setEditing({ ...editing, brand: e.target.value })}>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="admin-field">
                <label>Price</label>
                <input
                  type="text"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                  placeholder="$12,950"
                />
              </div>
            </div>

            <div className="admin-field">
              <label>Watch Name</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Rolex Daytona"
              />
            </div>

            <div className="admin-field">
              <label>Description</label>
              <textarea
                rows={3}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Brief description of the watch"
              />
            </div>

            <div className="admin-field">
              <label>Image</label>
              <div className="admin-image-upload">
                {editing.image && (
                  <div className="admin-image-preview">
                    <img src={editing.image} alt="Preview" />
                  </div>
                )}
                <div className="admin-image-upload__controls">
                  <input
                    type="text"
                    value={editing.image}
                    onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                    placeholder="Image URL or upload below"
                  />
                  <label className={`admin-btn admin-btn--outline admin-btn--sm ${uploading ? 'admin-btn--disabled' : ''}`}>
                    {uploading ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" onChange={handleImagePreview} hidden disabled={uploading} />
                  </label>
                </div>
                {uploadError && <p style={{ color: '#c44', fontSize: 13, marginTop: 6 }}>{uploadError}</p>}
              </div>
            </div>

            <div className="admin-field">
              <label>Product URL (optional)</label>
              <input
                type="url"
                value={editing.url}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="admin-form__actions">
              <button onClick={handleSave} className="admin-btn admin-btn--primary" disabled={!editing.name || !editing.price}>
                Save Watch
              </button>
              <button onClick={() => setEditing(null)} className="admin-btn admin-btn--ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Watches</h1>
          <p className="admin-page__subtitle">{watches.length} watches in your collection</p>
        </div>
        <button onClick={handleNew} className="admin-btn admin-btn--primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Watch
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Search watches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filters">
          {['All', ...brands.filter(b => b !== 'Other')].map(b => (
            <button
              key={b}
              className={`admin-filter-btn ${brandFilter === b ? 'active' : ''}`}
              onClick={() => setBrandFilter(b)}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Image</th>
              <th>Brand</th>
              <th>Name</th>
              <th>Price</th>
              <th>Description</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((watch) => (
              <tr key={watch.id}>
                <td>
                  <div className="admin-table__thumb">
                    {watch.image ? <img src={watch.image} alt={watch.name} /> : <span>No img</span>}
                  </div>
                </td>
                <td><span className="admin-badge">{watch.brand}</span></td>
                <td className="admin-table__name">{watch.name}</td>
                <td className="admin-table__price">{watch.price}</td>
                <td className="admin-table__desc">{watch.description}</td>
                <td>
                  <div className="admin-table__actions">
                    <button onClick={() => handleEdit(watch)} className="admin-icon-btn" title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => setShowDeleteConfirm(watch.id)} className="admin-icon-btn admin-icon-btn--danger" title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-table__empty">
                  No watches found. {search || brandFilter !== 'All' ? 'Try adjusting your filters.' : 'Click "Add Watch" to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="admin-modal admin-modal--sm" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Watch?</h3>
            <p>This action cannot be undone. Are you sure you want to delete this watch?</p>
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
