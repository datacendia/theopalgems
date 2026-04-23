import React, { useState, useEffect } from 'react';
import { getLocations, saveLocation, deleteLocation } from './api';

const emptyLocation = {
  key: '',
  name: '',
  city: '',
  address: '',
  description: '',
  longDescription: '',
  hours: '',
  phone: '',
  hotelImage: '',
  mapUrl: ''
};

export default function AdminLocations() {
  const [locations, setLocations] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    getLocations().then(setLocations);
  }, []);

  const handleNew = () => {
    setEditing({ ...emptyLocation, key: 'location-' + Date.now() });
  };

  const handleEdit = (loc) => {
    setEditing({ ...loc });
  };

  const handleSave = async () => {
    if (!editing.name || !editing.city) return;
    const updated = await saveLocation(editing);
    setLocations(updated);
    setEditing(null);
  };

  const handleDelete = async (key) => {
    const updated = await deleteLocation(key);
    setLocations(updated);
    setShowDeleteConfirm(null);
  };

  if (editing) {
    return (
      <div className="admin-page">
        <div className="admin-page__header">
          <div>
            <h1>{locations.find(l => l.key === editing.key) ? 'Edit Location' : 'Add Location'}</h1>
            <p className="admin-page__subtitle">Update boutique details below.</p>
          </div>
        </div>

        <div className="admin-card" style={{ maxWidth: 720 }}>
          <div className="admin-form">
            <div className="admin-form__row">
              <div className="admin-field">
                <label>Boutique Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Opal Grand"
                />
              </div>
              <div className="admin-field">
                <label>City / State</label>
                <input
                  type="text"
                  value={editing.city}
                  onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                  placeholder="e.g. Delray Beach, Florida"
                />
              </div>
            </div>

            <div className="admin-field">
              <label>Full Address</label>
              <input
                type="text"
                value={editing.address}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                placeholder="10 North Ocean Boulevard, Delray Beach, FL 33483"
              />
            </div>

            <div className="admin-field">
              <label>Short Description</label>
              <input
                type="text"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Brief one-line description"
              />
            </div>

            <div className="admin-field">
              <label>Full Description</label>
              <textarea
                rows={4}
                value={editing.longDescription}
                onChange={(e) => setEditing({ ...editing, longDescription: e.target.value })}
                placeholder="Detailed description of the boutique..."
              />
            </div>

            <div className="admin-form__row">
              <div className="admin-field">
                <label>Hours</label>
                <input
                  type="text"
                  value={editing.hours}
                  onChange={(e) => setEditing({ ...editing, hours: e.target.value })}
                  placeholder="Daily: 10am - 7pm"
                />
              </div>
              <div className="admin-field">
                <label>Phone</label>
                <input
                  type="text"
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  placeholder="(561) 251-9560"
                />
              </div>
            </div>

            <div className="admin-field">
              <label>Hotel Image Path</label>
              <div className="admin-image-upload">
                {editing.hotelImage && (
                  <div className="admin-image-preview">
                    <img src={editing.hotelImage} alt="Hotel" />
                  </div>
                )}
                <input
                  type="text"
                  value={editing.hotelImage}
                  onChange={(e) => setEditing({ ...editing, hotelImage: e.target.value })}
                  placeholder="/assets/hotels/hotel-name.PNG"
                />
              </div>
            </div>

            <div className="admin-field">
              <label>Google Maps URL</label>
              <input
                type="url"
                value={editing.mapUrl}
                onChange={(e) => setEditing({ ...editing, mapUrl: e.target.value })}
                placeholder="https://www.google.com/maps/..."
              />
            </div>

            <div className="admin-form__actions">
              <button onClick={handleSave} className="admin-btn admin-btn--primary" disabled={!editing.name || !editing.city}>
                Save Location
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
          <h1>Locations</h1>
          <p className="admin-page__subtitle">{locations.length} boutique locations</p>
        </div>
        <button onClick={handleNew} className="admin-btn admin-btn--primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Location
        </button>
      </div>

      <div className="admin-locations-grid">
        {locations.map((loc) => (
          <div key={loc.key} className="admin-location-card">
            {loc.hotelImage && (
              <div className="admin-location-card__image">
                <img src={loc.hotelImage} alt={loc.name} />
              </div>
            )}
            <div className="admin-location-card__body">
              <h3>{loc.name}</h3>
              <p className="admin-location-card__city">{loc.city}</p>
              <p className="admin-location-card__desc">{loc.description}</p>
              <div className="admin-location-card__meta">
                <span>{loc.hours}</span>
                <span>{loc.phone}</span>
              </div>
              <div className="admin-location-card__actions">
                <button onClick={() => handleEdit(loc)} className="admin-btn admin-btn--outline admin-btn--sm">Edit</button>
                <button onClick={() => setShowDeleteConfirm(loc.key)} className="admin-btn admin-btn--danger-outline admin-btn--sm">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showDeleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="admin-modal admin-modal--sm" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Location?</h3>
            <p>This will remove this boutique from the site. Are you sure?</p>
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
