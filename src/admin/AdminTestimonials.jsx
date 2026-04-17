import React, { useState, useEffect } from 'react';
import { getSections, saveSections } from './api';

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSections().then(sections => setTestimonials(sections.testimonials || []));
  }, []);

  const handleSaveAll = async () => {
    const sections = await getSections();
    sections.testimonials = testimonials;
    await saveSections(sections);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNew = () => {
    setEditing({ id: 't-' + Date.now(), name: '', location: '', text: '', rating: 5 });
  };

  const handleSave = () => {
    if (!editing.name || !editing.text) return;
    const idx = testimonials.findIndex(t => t.id === editing.id);
    if (idx >= 0) {
      const updated = [...testimonials];
      updated[idx] = editing;
      setTestimonials(updated);
    } else {
      setTestimonials([...testimonials, editing]);
    }
    setEditing(null);
  };

  const handleDelete = (id) => {
    setTestimonials(testimonials.filter(t => t.id !== id));
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rating ? '#c9a96e' : '#ddd', fontSize: 16 }}>★</span>
    ));
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Testimonials</h1>
          <p className="admin-page__subtitle">{testimonials.length} customer reviews</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleNew} className="admin-btn admin-btn--outline">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add
          </button>
          <button onClick={handleSaveAll} className={`admin-btn ${saved ? 'admin-btn--success' : 'admin-btn--primary'}`}>
            {saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="admin-testimonial-grid">
        {testimonials.map((t) => (
          <div key={t.id} className="admin-testimonial-card">
            <div className="admin-testimonial-card__stars">{renderStars(t.rating)}</div>
            <p className="admin-testimonial-card__text">"{t.text}"</p>
            <div className="admin-testimonial-card__author">
              <strong>{t.name}</strong>
              <span>{t.location}</span>
            </div>
            <div className="admin-testimonial-card__actions">
              <button onClick={() => setEditing({ ...t })} className="admin-icon-btn" title="Edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button onClick={() => handleDelete(t.id)} className="admin-icon-btn admin-icon-btn--danger" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{testimonials.find(t => t.id === editing.id) ? 'Edit Testimonial' : 'Add Testimonial'}</h3>
            <div className="admin-form">
              <div className="admin-form__row">
                <div className="admin-field">
                  <label>Customer Name</label>
                  <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Sarah M." />
                </div>
                <div className="admin-field">
                  <label>Location</label>
                  <input type="text" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="e.g. Delray Beach" />
                </div>
              </div>
              <div className="admin-field">
                <label>Review Text</label>
                <textarea rows={4} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} placeholder="What did the customer say?" />
              </div>
              <div className="admin-field">
                <label>Rating</label>
                <div className="admin-rating-input">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`admin-star-btn ${n <= editing.rating ? 'active' : ''}`}
                      onClick={() => setEditing({ ...editing, rating: n })}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="admin-modal__actions">
                <button onClick={handleSave} className="admin-btn admin-btn--primary" disabled={!editing.name || !editing.text}>Save</button>
                <button onClick={() => setEditing(null)} className="admin-btn admin-btn--ghost">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
