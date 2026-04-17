import React, { useState, useEffect } from 'react';
import { getSections, saveSections } from './api';

export default function AdminSections() {
  const [sections, setSections] = useState(null);
  const [activeTab, setActiveTab] = useState('hero');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSections().then(setSections);
  }, []);

  if (!sections) return null;

  const handleSave = async () => {
    await saveSections(sections);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateHero = (field, value) => {
    setSections(prev => ({ ...prev, hero: { ...prev.hero, [field]: value } }));
  };

  const updateAbout = (field, value) => {
    setSections(prev => ({ ...prev, about: { ...prev.about, [field]: value } }));
  };

  const updateTestimonial = (index, field, value) => {
    setSections(prev => {
      const testimonials = [...prev.testimonials];
      testimonials[index] = { ...testimonials[index], [field]: value };
      return { ...prev, testimonials };
    });
  };

  const addTestimonial = () => {
    setSections(prev => ({
      ...prev,
      testimonials: [...prev.testimonials, { id: 't-' + Date.now(), name: '', location: '', text: '', rating: 5 }]
    }));
  };

  const removeTestimonial = (index) => {
    setSections(prev => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, i) => i !== index)
    }));
  };

  const updateCategory = (index, field, value) => {
    setSections(prev => {
      const categories = [...prev.categories];
      categories[index] = { ...categories[index], [field]: value };
      return { ...prev, categories };
    });
  };

  const updateShowcase = (index, field, value) => {
    setSections(prev => {
      const showcase = [...prev.showcase];
      showcase[index] = { ...showcase[index], [field]: value };
      return { ...prev, showcase };
    });
  };

  const tabs = [
    { key: 'hero', label: 'Hero Banner' },
    { key: 'about', label: 'About Section' },
    { key: 'categories', label: 'Categories' },
    { key: 'showcase', label: 'Showcase Gallery' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Homepage Sections</h1>
          <p className="admin-page__subtitle">Edit the content displayed on the homepage.</p>
        </div>
        <button onClick={handleSave} className={`admin-btn ${saved ? 'admin-btn--success' : 'admin-btn--primary'}`}>
          {saved ? '✓ Saved!' : 'Save All Changes'}
        </button>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hero Banner */}
      {activeTab === 'hero' && (
        <div className="admin-card">
          <h3>Hero Banner</h3>
          <div className="admin-form">
            <div className="admin-field">
              <label>Title</label>
              <input type="text" value={sections.hero.title} onChange={(e) => updateHero('title', e.target.value)} />
            </div>
            <div className="admin-field">
              <label>Subtitle</label>
              <textarea rows={3} value={sections.hero.subtitle} onChange={(e) => updateHero('subtitle', e.target.value)} />
            </div>
            <div className="admin-form__row">
              <div className="admin-field">
                <label>CTA Button Text</label>
                <input type="text" value={sections.hero.ctaText} onChange={(e) => updateHero('ctaText', e.target.value)} />
              </div>
              <div className="admin-field">
                <label>CTA Button URL</label>
                <input type="text" value={sections.hero.ctaUrl} onChange={(e) => updateHero('ctaUrl', e.target.value)} />
              </div>
            </div>
            <div className="admin-field">
              <label>Hero Image Path</label>
              <div className="admin-image-upload">
                {sections.hero.image && (
                  <div className="admin-image-preview admin-image-preview--wide">
                    <img src={sections.hero.image} alt="Hero" />
                  </div>
                )}
                <input type="text" value={sections.hero.image} onChange={(e) => updateHero('image', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      {activeTab === 'about' && (
        <div className="admin-card">
          <h3>About Section</h3>
          <div className="admin-form">
            <div className="admin-field">
              <label>Title</label>
              <input type="text" value={sections.about.title} onChange={(e) => updateAbout('title', e.target.value)} />
            </div>
            <div className="admin-field">
              <label>Description</label>
              <textarea rows={4} value={sections.about.description} onChange={(e) => updateAbout('description', e.target.value)} />
            </div>
            <div className="admin-form__row">
              <div className="admin-field">
                <label>Owner Names</label>
                <input type="text" value={sections.about.ownerNames} onChange={(e) => updateAbout('ownerNames', e.target.value)} />
              </div>
              <div className="admin-field">
                <label>Owner Title</label>
                <input type="text" value={sections.about.ownerTitle} onChange={(e) => updateAbout('ownerTitle', e.target.value)} />
              </div>
            </div>
            <div className="admin-field">
              <label>Owner Photo Path</label>
              <div className="admin-image-upload">
                {sections.about.ownerImage && (
                  <div className="admin-image-preview">
                    <img src={sections.about.ownerImage} alt="Owners" />
                  </div>
                )}
                <input type="text" value={sections.about.ownerImage} onChange={(e) => updateAbout('ownerImage', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {activeTab === 'categories' && (
        <div className="admin-card">
          <h3>Product Categories</h3>
          <p className="admin-card__hint">These appear in the category grid on the homepage.</p>
          <div className="admin-form">
            {sections.categories.map((cat, i) => (
              <div key={i} className="admin-inline-item">
                <div className="admin-inline-item__preview">
                  {cat.image && <img src={cat.image} alt={cat.name} />}
                </div>
                <div className="admin-inline-item__fields">
                  <div className="admin-field">
                    <label>Name</label>
                    <input type="text" value={cat.name} onChange={(e) => updateCategory(i, 'name', e.target.value)} />
                  </div>
                  <div className="admin-field">
                    <label>Image Path</label>
                    <input type="text" value={cat.image} onChange={(e) => updateCategory(i, 'image', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Showcase Gallery */}
      {activeTab === 'showcase' && (
        <div className="admin-card">
          <h3>Showcase Gallery</h3>
          <p className="admin-card__hint">The 6-image gallery displayed on the homepage.</p>
          <div className="admin-showcase-grid">
            {sections.showcase.map((item, i) => (
              <div key={item.id || i} className="admin-showcase-item">
                <div className="admin-showcase-item__preview">
                  {item.image && <img src={item.image} alt={item.alt} />}
                </div>
                <div className="admin-field">
                  <label>Image Path</label>
                  <input type="text" value={item.image} onChange={(e) => updateShowcase(i, 'image', e.target.value)} style={{ fontSize: 13 }} />
                </div>
                <div className="admin-field">
                  <label>Alt Text</label>
                  <input type="text" value={item.alt} onChange={(e) => updateShowcase(i, 'alt', e.target.value)} style={{ fontSize: 13 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
