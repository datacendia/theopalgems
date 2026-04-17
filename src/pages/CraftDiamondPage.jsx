import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

const jewelryTypes = [
  { key: 'ring', name: 'Ring', image: '/assets/ring-3-1J1kiCf1QOj607i8A4hnGz1J_k0-JvjOa.jpg', description: 'Engagement rings, cocktail rings, and bands', timeline: '2-4 weeks' },
  { key: 'necklace', name: 'Necklace', image: '/assets/oval-necklace-0-6-1g05xYdd31y4fiSNqo-o3AyEJnkl_bg3Y.jpg', description: 'Pendants, chains, and statement pieces', timeline: '3-5 weeks' },
  { key: 'earrings', name: 'Earrings', image: '/assets/diamond-studs-2-04-1wBEVN7ank-UsWuX6uPZQ5Mxv02Hw19Mh.jpg', description: 'Studs, drops, and hoops', timeline: '2-4 weeks' },
  { key: 'bracelet', name: 'Bracelet', image: '/assets/tennis-bracelet-10-1f8GCCdbeTBl1Dy5TUDdXPbzx8d0H-PA8.jpg', description: 'Tennis bracelets, bangles, and chains', timeline: '4-6 weeks' }
];

const diamondShapes = [
  { key: 'round', name: 'Round Brilliant', description: 'Classic and most brilliant cut', image: '/assets/diamonds/round.PNG' },
  { key: 'princess', name: 'Princess', description: 'Modern square cut with sharp corners', image: '/assets/diamonds/princess.PNG' },
  { key: 'oval', name: 'Oval', description: 'Elongated shape that flatters the finger', image: '/assets/diamonds/oval.PNG' },
  { key: 'cushion', name: 'Cushion', description: 'Soft, rounded corners with vintage appeal', image: '/assets/diamonds/cushion.PNG' },
  { key: 'emerald', name: 'Emerald', description: 'Rectangular step-cut with elegant lines', image: '/assets/diamonds/emerald.PNG' },
  { key: 'pear', name: 'Pear', description: 'Teardrop shape, unique and romantic', image: '/assets/diamonds/pear.PNG' },
  { key: 'marquise', name: 'Marquise', description: 'Elongated with pointed ends', image: '/assets/diamonds/marquise.PNG' },
  { key: 'radiant', name: 'Radiant', description: 'Rectangular with brilliant facets', image: '/assets/diamonds/radiant.PNG' },
  { key: 'asscher', name: 'Asscher', description: 'Square step-cut with Art Deco style', image: '/assets/diamonds/asscher.PNG' },
  { key: 'heart', name: 'Heart', description: 'Romantic symbol of love', image: '/assets/diamonds/heart.PNG' }
];

const diamondTypes = [
  { key: 'lab-grown', name: 'Lab-Grown', description: 'Ethically created, identical properties to natural' },
  { key: 'natural', name: 'Natural', description: 'Earth-mined, GIA/IGI certified' }
];

export default function CraftDiamondPage() {
  usePageTitle('Craft Your Diamond');
  const [step, setStep] = useState(1);
  const [selectedJewelry, setSelectedJewelry] = useState(null);
  const [selectedShape, setSelectedShape] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleJewelrySelect = (jewelry) => {
    setSelectedJewelry(jewelry);
    setStep(2);
  };

  const handleShapeSelect = (shape) => {
    setSelectedShape(shape);
    setStep(3);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(4);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = new FormData();
      body.append('name', formData.name);
      body.append('email', formData.email);
      body.append('Jewelry Type', selectedJewelry?.name || '');
      body.append('Diamond Shape', selectedShape?.name || '');
      body.append('Diamond Type', selectedType?.name || '');
      body.append('Est. Timeline', selectedJewelry?.timeline || '');
      body.append('notes', formData.notes || 'None');
      body.append('_subject', `Custom Diamond Inquiry from ${formData.name} — Opal Gems`);
      body.append('_cc', 'alexandramattatia@gmail.com,jean.dixon@ophotels.com,robinjopalgrand@gmail.com');
      body.append('_captcha', 'false');
      body.append('_template', 'table');
      await fetch('https://formsubmit.co/sales@opalgems.com', { method: 'POST', body });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
  };

  const resetSelection = () => {
    setStep(1);
    setSelectedJewelry(null);
    setSelectedShape(null);
    setSelectedType(null);
    setFormData({ name: '', email: '', notes: '' });
    setSubmitted(false);
  };

  return (
    <div className="page">
      <div className="page-hero">
        <div className="page-hero__content">
          <p className="eyebrow">Custom Creations</p>
          <h1>Craft Your Diamond</h1>
          <p className="slogan">Created by you, crafted with love.</p>
          <p className="lead">Design a bespoke piece tailored to your vision. Select your jewelry type, diamond shape, and let us bring it to life.</p>
        </div>
      </div>

      <main className="container">
        {/* Progress Indicator */}
        <div className="craft-progress">
          <div className={`craft-progress__step ${step >= 1 ? 'active' : ''} ${selectedJewelry ? 'completed' : ''}`}>
            <span className="craft-progress__number">1</span>
            <span className="craft-progress__label">Jewelry Type</span>
          </div>
          <div className="craft-progress__line" />
          <div className={`craft-progress__step ${step >= 2 ? 'active' : ''} ${selectedShape ? 'completed' : ''}`}>
            <span className="craft-progress__number">2</span>
            <span className="craft-progress__label">Diamond Shape</span>
          </div>
          <div className="craft-progress__line" />
          <div className={`craft-progress__step ${step >= 3 ? 'active' : ''} ${selectedType ? 'completed' : ''}`}>
            <span className="craft-progress__number">3</span>
            <span className="craft-progress__label">Diamond Type</span>
          </div>
          <div className="craft-progress__line" />
          <div className={`craft-progress__step ${step >= 4 ? 'active' : ''} ${submitted ? 'completed' : ''}`}>
            <span className="craft-progress__number">4</span>
            <span className="craft-progress__label">Contact</span>
          </div>
        </div>

        {/* Step 1: Jewelry Type */}
        {step === 1 && (
          <section className="section craft-section">
            <div className="section__header" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 40px' }}>
              <h2>What type of jewelry are you creating?</h2>
              <p className="small">Select the piece you'd like to craft</p>
            </div>
            <div className="craft-grid craft-grid--4">
              {jewelryTypes.map((jewelry) => (
                <button
                  key={jewelry.key}
                  className="craft-option"
                  onClick={() => handleJewelrySelect(jewelry)}
                >
                  <div className="craft-option__image">
                    <img src={jewelry.image} alt={jewelry.name} />
                  </div>
                  <h3>{jewelry.name}</h3>
                  <p className="small">{jewelry.description}</p>
                  <span className="craft-option__timeline">{jewelry.timeline}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 2: Diamond Shape */}
        {step === 2 && (
          <section className="section craft-section">
            <div className="section__header" style={{ textAlign: 'center' }}>
              <h2>Choose your diamond shape</h2>
              <p className="small">Creating a {selectedJewelry?.name.toLowerCase()}</p>
            </div>
            <div className="craft-grid craft-grid--5">
              {diamondShapes.map((shape) => (
                <button
                  key={shape.key}
                  className="craft-option craft-option--shape"
                  onClick={() => handleShapeSelect(shape)}
                >
                  <div className="diamond-shape-img">
                    <img src={shape.image} alt={shape.name} />
                  </div>
                  <h3>{shape.name}</h3>
                  <p className="small">{shape.description}</p>
                </button>
              ))}
            </div>
            <div className="craft-nav">
              <button className="pill ghost" onClick={() => setStep(1)}>← Back</button>
            </div>
          </section>
        )}

        {/* Step 3: Diamond Type */}
        {step === 3 && (
          <section className="section craft-section">
            <div className="section__header" style={{ textAlign: 'center' }}>
              <h2>Lab-grown or natural?</h2>
              <p className="small">{selectedShape?.name} diamond for your {selectedJewelry?.name.toLowerCase()}</p>
            </div>
            <div className="craft-grid craft-grid--2">
              {diamondTypes.map((type) => (
                <button
                  key={type.key}
                  className="craft-option craft-option--large"
                  onClick={() => handleTypeSelect(type)}
                >
                  <h3>{type.name}</h3>
                  <p>{type.description}</p>
                </button>
              ))}
            </div>
            <div className="craft-nav">
              <button className="pill ghost" onClick={() => setStep(2)}>← Back</button>
            </div>
          </section>
        )}

        {/* Step 4: Contact Form */}
        {step === 4 && !submitted && (
          <section className="section craft-section">
            <div className="section__header" style={{ textAlign: 'center' }}>
              <h2>Almost there!</h2>
              <p className="small">Tell us how to reach you</p>
            </div>

            <div className="craft-summary">
              <h3>Your Selection</h3>
              <div className="craft-summary__items">
                <div className="craft-summary__item">
                  <span className="label">Jewelry</span>
                  <span className="value">{selectedJewelry?.name}</span>
                </div>
                <div className="craft-summary__item">
                  <span className="label">Shape</span>
                  <span className="value">{selectedShape?.name}</span>
                </div>
                <div className="craft-summary__item">
                  <span className="label">Type</span>
                  <span className="value">{selectedType?.name}</span>
                </div>
                <div className="craft-summary__item">
                  <span className="label">Est. Timeline</span>
                  <span className="value craft-summary__timeline">{selectedJewelry?.timeline}</span>
                </div>
              </div>
            </div>

            <form className="craft-form" onSubmit={handleSubmit}>
              <div className="craft-form__field">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="craft-form__field">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="craft-form__field">
                <label htmlFor="notes">Additional Notes (optional)</label>
                <textarea
                  id="notes"
                  rows="4"
                  placeholder="Tell us about your vision, preferred carat size, budget range, or any other details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="craft-form__actions">
                <button type="button" className="pill ghost" onClick={() => setStep(3)}>← Back</button>
                <button type="submit" className="pill primary">Submit Inquiry</button>
              </div>
            </form>
          </section>
        )}

        {/* Success Message */}
        {submitted && (
          <section className="section craft-section">
            <div className="craft-success">
              <div className="craft-success__icon">✓</div>
              <h2>Thank you, {formData.name}!</h2>
              <p>We've received your custom diamond inquiry. Our team will reach out to you at <strong>{formData.email}</strong> within 24 hours to discuss your {selectedType?.name.toLowerCase()} {selectedShape?.name.toLowerCase()} {selectedJewelry?.name.toLowerCase()}.</p>
              <div className="actions" style={{ marginTop: '32px' }}>
                <button className="pill primary" onClick={resetSelection}>Create Another</button>
                <Link to="/" className="pill ghost">Back to Home</Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
