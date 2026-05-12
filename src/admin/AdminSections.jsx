import React, { useState, useEffect } from 'react';
import { getSections, saveSections } from './api';
import { mergeSections } from '../lib/defaultSiteContent';

/**
 * Admin → Homepage editor.
 *
 * Edits every CMS-driven block on the public site that lives in the
 * `sections` table. The shape is defined in `src/lib/defaultSiteContent.js`,
 * so the public pages and this editor never drift apart.
 */
export default function AdminSections() {
  const [sections, setSections] = useState(null);
  const [activeTab, setActiveTab] = useState('hero');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSections().then((s) => setSections(mergeSections(s || {})));
  }, []);

  if (!sections) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSections(sections);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  // Generic helpers ─────────────────────────────────────────────────────────
  const setBlock = (block, partial) =>
    setSections((prev) => ({ ...prev, [block]: { ...(prev[block] || {}), ...partial } }));

  const setListItem = (block, index, partial) =>
    setSections((prev) => {
      const list = Array.isArray(prev[block]) ? [...prev[block]] : [];
      list[index] = { ...list[index], ...partial };
      return { ...prev, [block]: list };
    });

  const setNestedListItem = (block, listKey, index, partial) =>
    setSections((prev) => {
      const parent = { ...(prev[block] || {}) };
      const list = Array.isArray(parent[listKey]) ? [...parent[listKey]] : [];
      list[index] = { ...list[index], ...partial };
      parent[listKey] = list;
      return { ...prev, [block]: parent };
    });

  const addToList = (block, item) =>
    setSections((prev) => ({ ...prev, [block]: [...(prev[block] || []), item] }));

  const addToNestedList = (block, listKey, item) =>
    setSections((prev) => {
      const parent = { ...(prev[block] || {}) };
      const list = Array.isArray(parent[listKey]) ? [...parent[listKey]] : [];
      parent[listKey] = [...list, item];
      return { ...prev, [block]: parent };
    });

  const removeFromList = (block, index) =>
    setSections((prev) => ({
      ...prev,
      [block]: (prev[block] || []).filter((_, i) => i !== index),
    }));

  const removeFromNestedList = (block, listKey, index) =>
    setSections((prev) => {
      const parent = { ...(prev[block] || {}) };
      parent[listKey] = (parent[listKey] || []).filter((_, i) => i !== index);
      return { ...prev, [block]: parent };
    });

  const setHeroImage = (index, value) =>
    setSections((prev) => {
      const hero = { ...(prev.hero || {}) };
      const images = Array.isArray(hero.images) ? [...hero.images] : [];
      images[index] = value;
      hero.images = images;
      return { ...prev, hero };
    });

  // Tab definitions ─────────────────────────────────────────────────────────
  const tabs = [
    { key: 'hero', label: 'Hero' },
    { key: 'imageGrid', label: 'Image Grid' },
    { key: 'crafted', label: 'Crafted' },
    { key: 'partnership', label: 'Partnership' },
    { key: 'carousel', label: 'Carousel' },
    { key: 'testimonialsHeader', label: 'Testimonials Hdr' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'locationsHeader', label: 'Locations Hdr' },
    { key: 'about', label: 'About (legacy)' },
    { key: 'categoryPages', label: 'Category Pages' },
    { key: 'watchBrands', label: 'Watch Brands' },
    { key: 'showcase', label: 'Showcase Gallery' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Homepage Sections</h1>
          <p className="admin-page__subtitle">
            Edit every CMS-driven block on the public site.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`admin-btn ${saved ? 'admin-btn--success' : 'admin-btn--primary'}`}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save All Changes'}
        </button>
      </div>

      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────────────── Hero ────────────── */}
      {activeTab === 'hero' && (
        <div className="admin-card">
          <h3>Hero Banner</h3>
          <p className="admin-card__hint">
            The first section visitors see. Eyebrow, title, tagline, two CTA
            buttons, and a parallax image stack.
          </p>
          <div className="admin-form">
            <div className="admin-field">
              <label>Eyebrow</label>
              <input
                type="text"
                value={sections.hero?.eyebrow || ''}
                onChange={(e) => setBlock('hero', { eyebrow: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Title</label>
              <input
                type="text"
                value={sections.hero?.title || ''}
                onChange={(e) => setBlock('hero', { title: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Tagline</label>
              <input
                type="text"
                value={sections.hero?.tagline || ''}
                onChange={(e) => setBlock('hero', { tagline: e.target.value })}
              />
            </div>
            <div className="admin-form__row">
              <div className="admin-field">
                <label>Primary CTA Text</label>
                <input
                  type="text"
                  value={sections.hero?.ctaText || ''}
                  onChange={(e) => setBlock('hero', { ctaText: e.target.value })}
                />
              </div>
              <div className="admin-field">
                <label>Primary CTA URL</label>
                <input
                  type="text"
                  value={sections.hero?.ctaUrl || ''}
                  onChange={(e) => setBlock('hero', { ctaUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="admin-form__row">
              <div className="admin-field">
                <label>Secondary CTA Text</label>
                <input
                  type="text"
                  value={sections.hero?.secondaryCtaText || ''}
                  onChange={(e) => setBlock('hero', { secondaryCtaText: e.target.value })}
                />
              </div>
              <div className="admin-field">
                <label>Secondary CTA URL</label>
                <input
                  type="text"
                  value={sections.hero?.secondaryCtaUrl || ''}
                  onChange={(e) => setBlock('hero', { secondaryCtaUrl: e.target.value })}
                />
              </div>
            </div>

            <h4 style={{ marginTop: 24 }}>Background Images (parallax stack)</h4>
            <p className="admin-card__hint">3 images recommended.</p>
            {(sections.hero?.images || []).map((img, i) => (
              <div key={i} className="admin-inline-item">
                <div className="admin-inline-item__preview">
                  {img && <img src={img} alt="" />}
                </div>
                <div className="admin-inline-item__fields">
                  <div className="admin-field">
                    <label>Image #{i + 1} URL</label>
                    <input
                      type="text"
                      value={img}
                      onChange={(e) => setHeroImage(i, e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger admin-btn--small"
                  onClick={() =>
                    setSections((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        images: (prev.hero?.images || []).filter((_, idx) => idx !== i),
                      },
                    }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() =>
                setSections((prev) => ({
                  ...prev,
                  hero: {
                    ...prev.hero,
                    images: [...(prev.hero?.images || []), ''],
                  },
                }))
              }
            >
              + Add Image
            </button>
          </div>
        </div>
      )}

      {/* ────────────── Image Grid ────────────── */}
      {activeTab === 'imageGrid' && (
        <div className="admin-card">
          <h3>Image Grid (Categories)</h3>
          <p className="admin-card__hint">
            Two large images on top, then 5 category tiles linking to /category/&lt;key&gt;.
          </p>
          <div className="admin-form">
            <h4>Top Row</h4>
            <div className="admin-form__row">
              <div className="admin-field">
                <label>Top-Left Image URL</label>
                <input
                  type="text"
                  value={sections.imageGrid?.topLeft?.src || ''}
                  onChange={(e) =>
                    setBlock('imageGrid', {
                      topLeft: { ...(sections.imageGrid?.topLeft || {}), src: e.target.value },
                    })
                  }
                />
                <label>Alt Text</label>
                <input
                  type="text"
                  value={sections.imageGrid?.topLeft?.alt || ''}
                  onChange={(e) =>
                    setBlock('imageGrid', {
                      topLeft: { ...(sections.imageGrid?.topLeft || {}), alt: e.target.value },
                    })
                  }
                />
              </div>
              <div className="admin-field">
                <label>Top-Right Image URL</label>
                <input
                  type="text"
                  value={sections.imageGrid?.topRight?.src || ''}
                  onChange={(e) =>
                    setBlock('imageGrid', {
                      topRight: { ...(sections.imageGrid?.topRight || {}), src: e.target.value },
                    })
                  }
                />
                <label>Alt Text</label>
                <input
                  type="text"
                  value={sections.imageGrid?.topRight?.alt || ''}
                  onChange={(e) =>
                    setBlock('imageGrid', {
                      topRight: { ...(sections.imageGrid?.topRight || {}), alt: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <h4 style={{ marginTop: 24 }}>Category Tiles</h4>
            {(sections.imageGrid?.bottom || []).map((tile, i) => (
              <div key={i} className="admin-inline-item">
                <div className="admin-inline-item__preview">
                  {tile.image && <img src={tile.image} alt={tile.label || ''} />}
                </div>
                <div className="admin-inline-item__fields">
                  <div className="admin-field">
                    <label>Label</label>
                    <input
                      type="text"
                      value={tile.label || ''}
                      onChange={(e) =>
                        setNestedListItem('imageGrid', 'bottom', i, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label>Slug (key)</label>
                    <input
                      type="text"
                      value={tile.key || ''}
                      onChange={(e) =>
                        setNestedListItem('imageGrid', 'bottom', i, { key: e.target.value })
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label>Image URL</label>
                    <input
                      type="text"
                      value={tile.image || ''}
                      onChange={(e) =>
                        setNestedListItem('imageGrid', 'bottom', i, { image: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger admin-btn--small"
                  onClick={() => removeFromNestedList('imageGrid', 'bottom', i)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => addToNestedList('imageGrid', 'bottom', { key: '', label: '', image: '' })}
            >
              + Add Tile
            </button>
          </div>
        </div>
      )}

      {/* ────────────── Crafted ────────────── */}
      {activeTab === 'crafted' && (
        <div className="admin-card">
          <h3>Crafted For Every Occasion</h3>
          <div className="admin-form">
            <div className="admin-field">
              <label>Title</label>
              <input
                type="text"
                value={sections.crafted?.title || ''}
                onChange={(e) => setBlock('crafted', { title: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Subtitle</label>
              <input
                type="text"
                value={sections.crafted?.subtitle || ''}
                onChange={(e) => setBlock('crafted', { subtitle: e.target.value })}
              />
            </div>
            <div className="admin-form__row">
              <div className="admin-field">
                <label>CTA Text</label>
                <input
                  type="text"
                  value={sections.crafted?.ctaText || ''}
                  onChange={(e) => setBlock('crafted', { ctaText: e.target.value })}
                />
              </div>
              <div className="admin-field">
                <label>CTA URL</label>
                <input
                  type="text"
                  value={sections.crafted?.ctaUrl || ''}
                  onChange={(e) => setBlock('crafted', { ctaUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="admin-form__row">
              <div className="admin-field">
                <label>Left Image URL</label>
                <input
                  type="text"
                  value={sections.crafted?.imageLeft || ''}
                  onChange={(e) => setBlock('crafted', { imageLeft: e.target.value })}
                />
              </div>
              <div className="admin-field">
                <label>Right Image URL</label>
                <input
                  type="text"
                  value={sections.crafted?.imageRight || ''}
                  onChange={(e) => setBlock('crafted', { imageRight: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────── Partnership ────────────── */}
      {activeTab === 'partnership' && (
        <div className="admin-card">
          <h3>Partnership Strip</h3>
          <div className="admin-form">
            <div className="admin-field">
              <label>Eyebrow</label>
              <input
                type="text"
                value={sections.partnership?.eyebrow || ''}
                onChange={(e) => setBlock('partnership', { eyebrow: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Title</label>
              <input
                type="text"
                value={sections.partnership?.title || ''}
                onChange={(e) => setBlock('partnership', { title: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Body</label>
              <textarea
                rows={5}
                value={sections.partnership?.body || ''}
                onChange={(e) => setBlock('partnership', { body: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ────────────── Carousel ────────────── */}
      {activeTab === 'carousel' && (
        <div className="admin-card">
          <h3>Full-Width Carousel</h3>
          <p className="admin-card__hint">Marquee strip below the partnership block.</p>
          <div className="admin-form">
            {(sections.carousel?.images || []).map((img, i) => (
              <div key={i} className="admin-inline-item">
                <div className="admin-inline-item__preview">
                  {img.src && <img src={img.src} alt={img.alt || ''} />}
                </div>
                <div className="admin-inline-item__fields">
                  <div className="admin-field">
                    <label>Image URL</label>
                    <input
                      type="text"
                      value={img.src || ''}
                      onChange={(e) =>
                        setNestedListItem('carousel', 'images', i, { src: e.target.value })
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label>Alt Text</label>
                    <input
                      type="text"
                      value={img.alt || ''}
                      onChange={(e) =>
                        setNestedListItem('carousel', 'images', i, { alt: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger admin-btn--small"
                  onClick={() => removeFromNestedList('carousel', 'images', i)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => addToNestedList('carousel', 'images', { src: '', alt: '' })}
            >
              + Add Image
            </button>
          </div>
        </div>
      )}

      {/* ────────────── Testimonials Header ────────────── */}
      {activeTab === 'testimonialsHeader' && (
        <div className="admin-card">
          <h3>Testimonials Section Header</h3>
          <p className="admin-card__hint">
            The testimonials themselves are managed in <strong>Admin → Testimonials</strong>.
          </p>
          <div className="admin-form">
            <div className="admin-field">
              <label>Eyebrow</label>
              <input
                type="text"
                value={sections.testimonialsHeader?.eyebrow || ''}
                onChange={(e) => setBlock('testimonialsHeader', { eyebrow: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Title</label>
              <input
                type="text"
                value={sections.testimonialsHeader?.title || ''}
                onChange={(e) => setBlock('testimonialsHeader', { title: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ────────────── Reviews ────────────── */}
      {activeTab === 'reviews' && (
        <div className="admin-card">
          <h3>Reviews Score</h3>
          <p className="admin-card__hint">
            Static aggregate score shown below the testimonials.
          </p>
          <div className="admin-form">
            <div className="admin-form__row">
              <div className="admin-field">
                <label>Score (e.g. "4.9")</label>
                <input
                  type="text"
                  value={sections.reviews?.score || ''}
                  onChange={(e) => setBlock('reviews', { score: e.target.value })}
                />
              </div>
              <div className="admin-field">
                <label>Count Caption (e.g. "Based on 127 reviews")</label>
                <input
                  type="text"
                  value={sections.reviews?.count || ''}
                  onChange={(e) => setBlock('reviews', { count: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────── Locations Header ────────────── */}
      {activeTab === 'locationsHeader' && (
        <div className="admin-card">
          <h3>Locations Section Header</h3>
          <p className="admin-card__hint">
            The location cards are managed in <strong>Admin → Locations</strong>.
          </p>
          <div className="admin-form">
            <div className="admin-field">
              <label>Eyebrow</label>
              <input
                type="text"
                value={sections.locationsHeader?.eyebrow || ''}
                onChange={(e) => setBlock('locationsHeader', { eyebrow: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Title</label>
              <input
                type="text"
                value={sections.locationsHeader?.title || ''}
                onChange={(e) => setBlock('locationsHeader', { title: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Subtitle</label>
              <input
                type="text"
                value={sections.locationsHeader?.subtitle || ''}
                onChange={(e) => setBlock('locationsHeader', { subtitle: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ────────────── About (legacy block, kept for backwards compat) ────────────── */}
      {activeTab === 'about' && (
        <div className="admin-card">
          <h3>About Section</h3>
          <p className="admin-card__hint">
            Legacy block. Edits here are stored but not currently displayed on
            the homepage layout.
          </p>
          <div className="admin-form">
            <div className="admin-field">
              <label>Title</label>
              <input
                type="text"
                value={sections.about?.title || ''}
                onChange={(e) => setBlock('about', { title: e.target.value })}
              />
            </div>
            <div className="admin-field">
              <label>Description</label>
              <textarea
                rows={4}
                value={sections.about?.description || ''}
                onChange={(e) => setBlock('about', { description: e.target.value })}
              />
            </div>
            <div className="admin-form__row">
              <div className="admin-field">
                <label>Owner Names</label>
                <input
                  type="text"
                  value={sections.about?.ownerNames || ''}
                  onChange={(e) => setBlock('about', { ownerNames: e.target.value })}
                />
              </div>
              <div className="admin-field">
                <label>Owner Title</label>
                <input
                  type="text"
                  value={sections.about?.ownerTitle || ''}
                  onChange={(e) => setBlock('about', { ownerTitle: e.target.value })}
                />
              </div>
            </div>
            <div className="admin-field">
              <label>Owner Photo URL</label>
              <input
                type="text"
                value={sections.about?.ownerImage || ''}
                onChange={(e) => setBlock('about', { ownerImage: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ────────────── Category Pages ────────────── */}
      {activeTab === 'categoryPages' && (
        <div className="admin-card">
          <h3>Category Page Heroes</h3>
          <p className="admin-card__hint">
            Hero copy shown at the top of each /category/&lt;slug&gt; page.
          </p>
          <div className="admin-form">
            {Object.entries(sections.categoryPages || {}).map(([slug, page]) => (
              <div key={slug} className="admin-inline-item" style={{ alignItems: 'flex-start' }}>
                <div className="admin-inline-item__preview">
                  {page.image && <img src={page.image} alt={page.title || slug} />}
                </div>
                <div className="admin-inline-item__fields" style={{ flex: 1 }}>
                  <div className="admin-field">
                    <label>Slug</label>
                    <input type="text" value={slug} readOnly disabled />
                  </div>
                  <div className="admin-field">
                    <label>Title (h1)</label>
                    <input
                      type="text"
                      value={page.title || ''}
                      onChange={(e) =>
                        setSections((prev) => ({
                          ...prev,
                          categoryPages: {
                            ...(prev.categoryPages || {}),
                            [slug]: { ...page, title: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label>Description (lead)</label>
                    <textarea
                      rows={2}
                      value={page.description || ''}
                      onChange={(e) =>
                        setSections((prev) => ({
                          ...prev,
                          categoryPages: {
                            ...(prev.categoryPages || {}),
                            [slug]: { ...page, description: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="admin-field">
                    <label>OG Image URL</label>
                    <input
                      type="text"
                      value={page.image || ''}
                      onChange={(e) =>
                        setSections((prev) => ({
                          ...prev,
                          categoryPages: {
                            ...(prev.categoryPages || {}),
                            [slug]: { ...page, image: e.target.value },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ────────────── Watch Brands ────────────── */}
      {activeTab === 'watchBrands' && (
        <div className="admin-card">
          <h3>Watch Brand Filters</h3>
          <p className="admin-card__hint">
            Buttons shown on /category/watches. Keep "All" first if you want it as the default.
          </p>
          <div className="admin-form">
            {(sections.watchBrands || []).map((brand, i) => (
              <div key={i} className="admin-inline-item">
                <div className="admin-inline-item__fields">
                  <div className="admin-field">
                    <label>Brand #{i + 1}</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) =>
                        setSections((prev) => {
                          const list = [...(prev.watchBrands || [])];
                          list[i] = e.target.value;
                          return { ...prev, watchBrands: list };
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger admin-btn--small"
                  onClick={() => removeFromList('watchBrands', i)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => addToList('watchBrands', '')}
            >
              + Add Brand
            </button>
          </div>
        </div>
      )}

      {/* ────────────── Showcase Gallery (legacy) ────────────── */}
      {activeTab === 'showcase' && (
        <div className="admin-card">
          <h3>Showcase Gallery</h3>
          <p className="admin-card__hint">
            Legacy 6-image gallery. The live homepage prefers photos from
            <strong> Admin → Photos</strong> with section=showcase.
          </p>
          <div className="admin-showcase-grid">
            {(sections.showcase || []).map((item, i) => (
              <div key={item.id || i} className="admin-showcase-item">
                <div className="admin-showcase-item__preview">
                  {item.image && <img src={item.image} alt={item.alt} />}
                </div>
                <div className="admin-field">
                  <label>Image Path</label>
                  <input
                    type="text"
                    value={item.image || ''}
                    onChange={(e) => setListItem('showcase', i, { image: e.target.value })}
                    style={{ fontSize: 13 }}
                  />
                </div>
                <div className="admin-field">
                  <label>Alt Text</label>
                  <input
                    type="text"
                    value={item.alt || ''}
                    onChange={(e) => setListItem('showcase', i, { alt: e.target.value })}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
