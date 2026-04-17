import React from 'react';
import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

export default function LabVsNaturalPage() {
  usePageTitle('Lab-Grown vs Natural Diamonds');

  return (
    <div className="page">
      <div className="page-hero">
        <div className="page-hero__content">
          <p className="eyebrow">Diamond Education</p>
          <h1>Lab-Grown vs Natural</h1>
          <p className="lead">Both are real diamonds. Learn the differences to choose the right one for you.</p>
        </div>
      </div>

      <main className="container">
        <section className="section">
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
          </div>
        </section>

        {/* Comparison Table */}
        <section className="section">
          <div className="comparison-table-wrapper">
            <h3 style={{ textAlign: 'center', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, marginBottom: '32px' }}>
              Side-by-Side Comparison
            </h3>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Lab-Grown</th>
                  <th>Natural</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="comparison-table__label">Origin</td>
                  <td>Created in controlled laboratory environment</td>
                  <td>Formed naturally over billions of years</td>
                </tr>
                <tr>
                  <td className="comparison-table__label">Price</td>
                  <td>30-50% less than natural</td>
                  <td>Premium pricing</td>
                </tr>
                <tr>
                  <td className="comparison-table__label">Certification</td>
                  <td>IGI, GCAL certified</td>
                  <td>GIA, IGI certified</td>
                </tr>
                <tr>
                  <td className="comparison-table__label">Quality</td>
                  <td>Identical 4Cs grading</td>
                  <td>Identical 4Cs grading</td>
                </tr>
                <tr>
                  <td className="comparison-table__label">Sustainability</td>
                  <td>Eco-friendly, minimal mining impact</td>
                  <td>Kimberley Process certified</td>
                </tr>
                <tr>
                  <td className="comparison-table__label">Resale Value</td>
                  <td>Lower resale market</td>
                  <td>Higher long-term value</td>
                </tr>
              </tbody>
            </table>
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
