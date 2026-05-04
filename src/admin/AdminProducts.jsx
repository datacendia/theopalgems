import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProducts, seedProducts, saveProduct, deleteProduct, clearProducts } from './api';
import { kiraProducts } from '../data/kiraProducts';

const categoryConfig = {
  necklaces: { singular: 'Necklace', plural: 'Necklaces' },
  rings: { singular: 'Ring', plural: 'Rings' },
  earrings: { singular: 'Earring', plural: 'Earrings' },
  bracelets: { singular: 'Bracelet', plural: 'Bracelets' },
};

const locationLabels = {
  'opal-grand': 'Opal Grand',
  'opal-sol': 'Opal Sol',
  'jupiter-beach': 'Jupiter Beach',
};

export default function AdminProducts() {
  const { category } = useParams();
  const config = categoryConfig[category] || { singular: 'Product', plural: 'Products', inventoryMatch: [] };

  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSearch('');
      setLocationFilter('All');
      setEditing(null);

      // Load existing products; only seed from kiraProducts if database is empty
      const existing = await getProducts(category);
      if (existing.length > 0) {
        setProducts(existing);
        setLoading(false);
        return;
      }

      const items = kiraProducts
        .filter(p => p.category === category)
        .map(p => ({
          id: `${category}-${p.name}`,
          name: p.description,
          image: p.link,
          sku: p.name,
          location: 'opal-grand',
          price: '',
          price_num: 0,
          ctw: '',
          gold: '',
          diamond: '',
          cert: '',
          qty: 1,
        }));
      const seeded = await seedProducts(category, items);
      setProducts(seeded);
      setLoading(false);
    };
    load();
  }, [category]);

  const handleResyncFromKira = async () => {
    if (!window.confirm('This will DELETE all current products in this category and reseed from the master kiraProducts list. Continue?')) return;
    setLoading(true);
    await clearProducts(category);
    const items = kiraProducts
      .filter(p => p.category === category)
      .map(p => ({
        id: `${category}-${p.name}`,
        name: p.description,
        image: p.link,
        sku: p.name,
        location: 'opal-grand',
        price: '',
        price_num: 0,
        ctw: '',
        gold: '',
        diamond: '',
        cert: '',
        qty: 1,
      }));
    const seeded = await seedProducts(category, items);
    setProducts(seeded);
    setLoading(false);
  };

  const locations = ['All', ...new Set(products.map(p => p.location))];
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchLoc = locationFilter === 'All' || p.location === locationFilter;
    return matchSearch && matchLoc;
  });

  const handleNew = () => {
    setEditing({
      id: `${category}-new-${Date.now()}`,
      name: '',
      ctw: '',
      gold: '',
      diamond: '',
      price: '',
      priceNum: 0,
      image: '',
      location: 'opal-grand',
      sku: '',
      barcode: '',
      cert: '',
      qty: 1,
    });
  };

  const handleEdit = (product) => setEditing({ ...product });

  const handleSave = async () => {
    if (!editing.name) return;
    const updated = await saveProduct(category, editing);
    setProducts(updated);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    const updated = await deleteProduct(category, id);
    setProducts(updated);
    setShowDeleteConfirm(null);
  };

  const handleImagePreview = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditing(prev => ({ ...prev, image: ev.target.result }));
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page__header"><h1>{config.plural}</h1></div>
        <div className="admin-card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#6b7280' }}>Loading {config.plural.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  // Edit form
  if (editing) {
    return (
      <div className="admin-page">
        <div className="admin-page__header">
          <div>
            <h1>{products.find(p => p.id === editing.id) ? `Edit ${config.singular}` : `Add ${config.singular}`}</h1>
            <p className="admin-page__subtitle">Fill in the product details below.</p>
          </div>
        </div>

        <div className="admin-card" style={{ maxWidth: 720 }}>
          <div className="admin-form">
            <div className="admin-field">
              <label>Product Name</label>
              <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={`e.g. Diamond ${config.singular}`} />
            </div>

            <div className="admin-form__row">
              <div className="admin-field">
                <label>Price</label>
                <input type="text" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} placeholder="$1,690" />
              </div>
              <div className="admin-field">
                <label>Carat Weight (CTW)</label>
                <input type="text" value={editing.ctw} onChange={(e) => setEditing({ ...editing, ctw: e.target.value })} placeholder="1.6" />
              </div>
            </div>

            <div className="admin-form__row">
              <div className="admin-field">
                <label>Gold Type</label>
                <input type="text" value={editing.gold} onChange={(e) => setEditing({ ...editing, gold: e.target.value })} placeholder="14KW" />
              </div>
              <div className="admin-field">
                <label>Diamond Quality</label>
                <input type="text" value={editing.diamond} onChange={(e) => setEditing({ ...editing, diamond: e.target.value })} placeholder="F + VVS" />
              </div>
            </div>

            <div className="admin-form__row">
              <div className="admin-field">
                <label>Location</label>
                <select value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })}>
                  <option value="opal-grand">Opal Grand</option>
                  <option value="opal-sol">Opal Sol</option>
                  <option value="jupiter-beach">Jupiter Beach</option>
                </select>
              </div>
              <div className="admin-field">
                <label>Quantity</label>
                <input type="number" min="0" value={editing.qty} onChange={(e) => setEditing({ ...editing, qty: Number(e.target.value) })} />
              </div>
            </div>

            <div className="admin-form__row">
              <div className="admin-field">
                <label>SKU</label>
                <input type="text" value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
              </div>
              <div className="admin-field">
                <label>Certificate</label>
                <input type="text" value={editing.cert} onChange={(e) => setEditing({ ...editing, cert: e.target.value })} placeholder="GIA / NC" />
              </div>
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
                  <input type="text" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="/assets/image.jpg" />
                  <label className="admin-btn admin-btn--outline admin-btn--sm">
                    Upload
                    <input type="file" accept="image/*" onChange={handleImagePreview} hidden />
                  </label>
                </div>
              </div>
            </div>

            <div className="admin-form__actions">
              <button onClick={handleSave} className="admin-btn admin-btn--primary" disabled={!editing.name}>Save {config.singular}</button>
              <button onClick={() => setEditing(null)} className="admin-btn admin-btn--ghost">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>{config.plural}</h1>
          <p className="admin-page__subtitle">{products.length} {config.plural.toLowerCase()} in inventory</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleResyncFromKira} className="admin-btn admin-btn--ghost" title="Reset to master kiraProducts list (deletes current edits)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Resync from Kira
          </button>
          <button onClick={handleNew} className="admin-btn admin-btn--primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add {config.singular}
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder={`Search ${config.plural.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="admin-filters">
          {locations.map(loc => (
            <button key={loc} className={`admin-filter-btn ${locationFilter === loc ? 'active' : ''}`} onClick={() => setLocationFilter(loc)}>
              {loc === 'All' ? 'All Locations' : (locationLabels[loc] || loc)}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Image</th>
              <th>Name</th>
              <th>CTW</th>
              <th>Gold</th>
              <th>Diamond</th>
              <th>Price</th>
              <th>Location</th>
              <th>Qty</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className="admin-table__thumb">
                    {product.image ? <img src={product.image} alt={product.name} /> : <span>No img</span>}
                  </div>
                </td>
                <td className="admin-table__name">{product.name}</td>
                <td>{product.ctw}</td>
                <td>{product.gold}</td>
                <td>{product.diamond}</td>
                <td className="admin-table__price">{product.price}</td>
                <td><span className="admin-badge admin-badge--sm">{locationLabels[product.location] || product.location}</span></td>
                <td>{product.qty}</td>
                <td>
                  <div className="admin-table__actions">
                    <button onClick={() => handleEdit(product)} className="admin-icon-btn" title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => setShowDeleteConfirm(product.id)} className="admin-icon-btn admin-icon-btn--danger" title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="admin-table__empty">
                  No {config.plural.toLowerCase()} found. {search || locationFilter !== 'All' ? 'Try adjusting your filters.' : `Click "Add ${config.singular}" to get started.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showDeleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="admin-modal admin-modal--sm" onClick={(e) => e.stopPropagation()}>
            <h3>Delete {config.singular}?</h3>
            <p>This action cannot be undone. Are you sure?</p>
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
