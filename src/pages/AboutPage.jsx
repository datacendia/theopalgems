import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

export default function AboutPage() {
  const navigate = useNavigate();
  const goToLocations = (e) => {
    e.preventDefault();
    navigate('/');
    setTimeout(() => {
      const el = document.getElementById('locations');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="page">
      <SEO
        title="About Opal Gems"
        description="Founded inside Florida's premier resorts, Opal Gems is a family-led diamond jewelry atelier offering an elevated, in-person shopping experience with master jewelers on-site."
        path="/about"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]}
      />
      <div className="page-hero">
        <div className="page-hero__content">
          <p className="eyebrow">About Opal Gems</p>
          <h1>Elevated diamonds, in person.</h1>
          <p className="lead">We curate fine jewelry inside premier resorts—designed to be tried on in a serene boutique with concierge support.</p>
        </div>
      </div>

      <main className="container">
        <section className="section" id="about">
          <div className="about-grid">
            <div className="about-image">
              <img src="/assets/opal-lobby.jpg" alt="Opal Gems boutique" loading="lazy" decoding="async" />
            </div>
            <div className="about-content">
              <p className="eyebrow">Our Story</p>
              <h2>Where luxury meets hospitality.</h2>
              <p>
                We curate fine jewelry inside premier resorts. Every piece is hand-selected for clarity, cut, and craft—designed to be tried on in a serene boutique with concierge support.
              </p>
              <p className="small">
                From engagement rings to statement necklaces, our collection is crafted for those who appreciate the art of fine jewelry. Visit us at any of our Florida locations for a private styling experience.
              </p>
              <div className="actions">
                <a className="pill primary" href="/#locations" onClick={goToLocations}>Visit a boutique</a>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Diamonds Subsection */}
        <section className="section">
          <div className="section__header" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 40px' }}>
            <p className="eyebrow">Custom Creations</p>
            <h2>Bespoke diamonds, crafted for you.</h2>
          </div>
          <div className="custom-diamonds-grid">
            <div className="custom-diamond-card">
              <h3>Lab-Grown Diamonds</h3>
              <p>
                Ethically created with the same physical, chemical, and optical properties as mined diamonds. 
                Our lab-grown stones are certified by leading gemological laboratories and graded using the 
                industry-standard <strong>4Cs framework</strong>: Cut, Color, Clarity, and Carat weight.
              </p>
            </div>
            <div className="custom-diamond-card">
              <h3>Natural Diamonds</h3>
              <p>
                For those who prefer earth-mined stones, we source natural diamonds through ethical channels. 
                Each stone is certified by <strong>GIA</strong> (Gemological Institute of America) or <strong>IGI</strong> (International Gemological Institute), 
                ensuring authenticity and quality.
              </p>
            </div>
            <div className="custom-diamond-card">
              <h3>Custom Made Pieces</h3>
              <p>
                Work with our designers to create a one-of-a-kind piece. From concept to completion, 
                we follow <strong>Kimberley Process</strong> standards for natural diamonds and adhere to 
                <strong> FTC guidelines</strong> for transparent diamond disclosure.
              </p>
            </div>
          </div>
          <p className="small" style={{ textAlign: 'center', marginTop: '32px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            All diamonds—lab-grown and natural—come with certification from GIA, IGI, or GCAL, 
            ensuring you receive exactly what you expect.
          </p>
          <div style={{ textAlign: 'center', marginTop: '48px' }}>
            <Link to="/craft" className="pill primary" style={{ padding: '18px 40px', fontSize: '14px' }}>
              Start Your Custom Design
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
