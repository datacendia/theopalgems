import React, { useState, useEffect } from 'react';
import { getPhotos, savePhoto, deletePhoto, uploadPhoto } from './api';
import { useError, useLoading, validateForm } from './ErrorContext';

export default function AdminPhotos() {
  const [photos, setPhotos] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [filter, setFilter] = useState('all');
  const { addError, addSuccess } = useError();
  const { loading, execute } = useLoading();

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const existing = await execute(() => getPhotos());
        if (existing.length > 0) {
          setPhotos(existing);
          return;
        }
        
        // Seed with the live site showcase images
        const defaults = [
          { id: 'photo-rings', src: '/assets/Stacked_diamond_eternity_bands.PNG', alt: 'Diamond rings collection', section: 'showcase' },
          { id: 'photo-necklaces', src: '/assets/category-necklaces.PNG', alt: 'Diamond necklace', section: 'showcase' },
          { id: 'photo-earrings', src: '/assets/category-earrings.PNG', alt: 'Diamond earrings', section: 'showcase' },
          { id: 'photo-bracelets', src: '/assets/category-bracelets.PNG', alt: 'Diamond bracelet', section: 'showcase' },
          { id: 'photo-watches', src: '/assets/watch_category.PNG', alt: 'Luxury watches', section: 'showcase' },
          { id: 'photo-diamonds', src: '/assets/diamonds_loose.PNG', alt: 'Loose diamonds', section: 'showcase' },
        ];
        
        let seeded = existing;
        for (const p of defaults) {
          seeded = await execute(() => savePhoto(p));
        }
        setPhotos(seeded);
        addSuccess('Default photos seeded successfully');
      } catch (error) {
        addError(error.message);
      }
    };
    
    loadPhotos();
  }, [execute, addError, addSuccess]);

  const sections = ['all', ...new Set(photos.map(p => p.section))];
  const filtered = filter === 'all' ? photos : photos.filter(p => p.section === filter);

  const handleNew = () => {
    setEditing({ id: 'photo-' + Date.now(), src: '', alt: '', section: 'showcase' });
  };

  const handleSave = async () => {
    try {
      // Validate form
      const validation = validateForm(editing, {
        src: { required: true },
        alt: { required: true, minLength: 3 },
        section: { required: true }
      });
      
      if (!validation.isValid) {
        addError('Please fill in all required fields correctly');
        return;
      }

      const updated = await execute(() => savePhoto(editing));
      setPhotos(updated);
      setEditing(null);
      addSuccess('Photo saved successfully');
    } catch (error) {
      addError(error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const updated = await execute(() => deletePhoto(id));
      setPhotos(updated);
      setShowDeleteConfirm(null);
      addSuccess('Photo deleted successfully');
    } catch (error) {
      addError(error.message);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      const url = await execute(() => uploadPhoto(file));
      setEditing(prev => ({ ...prev, src: url }));
      addSuccess('Photo uploaded successfully');
    } catch (error) {
      addError(error.message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>Photo Gallery</h1>
        <p className="admin-page__subtitle">Manage photos for homepage sections and showcases.</p>
      </div>

      <div className="admin-controls">
        <div className="admin-filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="admin-select">
            {sections.map(section => (
              <option key={section} value={section}>
                {section === 'all' ? 'All Sections' : section.charAt(0).toUpperCase() + section.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button className="admin-btn admin-btn--primary" onClick={handleNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Photo
        </button>
      </div>

      {editing && (
        <div className="admin-modal">
          <div className="admin-modal__dialog">
            <div className="admin-modal__header">
              <h3>{editing.id.startsWith('photo-') ? 'Add Photo' : 'Edit Photo'}</h3>
              <button className="admin-modal__close" onClick={() => setEditing(null)}>×</button>
            </div>
            <div className="admin-modal__body">
              <div className="form-field">
                <label>Photo URL</label>
                <input
                  type="text"
                  value={editing.src}
                  onChange={(e) => setEditing({ ...editing, src: e.target.value })}
                  placeholder="Enter photo URL or upload file"
                  className="admin-input"
                />
              </div>
              
              <div className="form-field">
                <label>Or Upload File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  className="admin-input"
                />
              </div>
              
              <div className="form-field">
                <label>Alt Text</label>
                <input
                  type="text"
                  value={editing.alt}
                  onChange={(e) => setEditing({ ...editing, alt: e.target.value })}
                  placeholder="Describe the photo for accessibility"
                  className="admin-input"
                />
              </div>
              
              <div className="form-field">
                <label>Section</label>
                <select
                  value={editing.section}
                  onChange={(e) => setEditing({ ...editing, section: e.target.value })}
                  className="admin-select"
                >
                  <option value="showcase">Showcase</option>
                  <option value="hero">Hero</option>
                  <option value="about">About</option>
                  <option value="testimonials">Testimonials</option>
                </select>
              </div>
            </div>
            <div className="admin-modal__footer">
              <button className="admin-btn admin-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button 
                className="admin-btn admin-btn--primary" 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-grid">
        {filtered.map(photo => (
          <div key={photo.id} className="admin-card">
            <div className="admin-card__image">
              <img src={photo.src} alt={photo.alt} />
            </div>
            <div className="admin-card__content">
              <h4>{photo.alt}</h4>
              <p className="small">{photo.section}</p>
              <div className="admin-card__actions">
                <button className="admin-btn admin-btn--outline" onClick={() => setEditing(photo)}>
                  Edit
                </button>
                <button 
                  className="admin-btn admin-btn--danger" 
                  onClick={() => setShowDeleteConfirm(photo.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showDeleteConfirm && (
        <div className="admin-modal">
          <div className="admin-modal__dialog admin-modal__dialog--small">
            <div className="admin-modal__header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="admin-modal__body">
              <p>Are you sure you want to delete this photo? This action cannot be undone.</p>
            </div>
            <div className="admin-modal__footer">
              <button className="admin-btn admin-btn--ghost" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </button>
              <button 
                className="admin-btn admin-btn--danger" 
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
