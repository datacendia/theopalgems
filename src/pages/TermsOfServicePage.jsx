import React from 'react';
import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

export default function TermsOfServicePage() {
  usePageTitle('Terms of Service');
  
  return (
    <div className="page">
      <div className="page-hero page-hero--small">
        <div className="page-hero__content">
          <p className="eyebrow">Legal</p>
          <h1>Terms of Service</h1>
          <p className="lead">Last updated: February 2026</p>
        </div>
      </div>

      <main className="container">
        <article className="legal-content">
          <section>
            <h2>Agreement to Terms</h2>
            <p>
              By accessing or using Opal Gems' website and services, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2>Products and Services</h2>
            <h3>In-Boutique Experience</h3>
            <p>
              Opal Gems operates exclusively through in-person boutique experiences. All purchases must be made 
              in person at one of our Florida locations. We do not offer online purchasing or shipping services.
            </p>

            <h3>Product Descriptions</h3>
            <p>
              We strive to display our jewelry as accurately as possible. However, colors and appearances may vary 
              slightly due to monitor settings and lighting conditions. All diamonds come with certification from 
              GIA, IGI, or GCAL.
            </p>

            <h3>Pricing</h3>
            <p>
              All prices are in US dollars and are subject to change without notice. Prices displayed on our website 
              are for reference only; final pricing will be confirmed in-boutique.
            </p>
          </section>

          <section>
            <h2>Custom Orders</h2>
            <p>
              Custom jewelry pieces are made to order based on your specifications. Please note:
            </p>
            <ul>
              <li>Custom orders require a deposit (typically 50%)</li>
              <li>Production times vary by piece complexity (2-6 weeks)</li>
              <li>Custom orders are final sale and non-refundable</li>
              <li>Design changes after production begins may incur additional fees</li>
            </ul>
          </section>

          <section>
            <h2>Returns and Exchanges</h2>
            <h3>Return Policy</h3>
            <p>
              We offer a 30-day return policy for unworn items in original condition with receipt and original packaging.
            </p>

            <h3>Exchanges</h3>
            <p>
              Exchanges are welcome within 60 days of purchase. Items must be in original, unworn condition.
            </p>

            <h3>Exclusions</h3>
            <p>
              The following items are final sale and cannot be returned or exchanged:
            </p>
            <ul>
              <li>Custom-made pieces</li>
              <li>Resized rings</li>
              <li>Engraved items</li>
              <li>Items purchased during special promotions (unless otherwise stated)</li>
            </ul>
          </section>

          <section>
            <h2>Appointments</h2>
            <p>
              While walk-ins are welcome, we recommend booking appointments for personalized service. 
              Appointments can be scheduled through our website or by calling the boutique directly.
            </p>
            <p>
              Please provide at least 24 hours notice for appointment cancellations. Repeated no-shows may 
              result in appointment restrictions.
            </p>
          </section>

          <section>
            <h2>Intellectual Property</h2>
            <p>
              All content on this website, including text, images, logos, and designs, is the property of 
              Opal Gems and is protected by copyright and trademark laws. You may not reproduce, distribute, 
              or use our content without written permission.
            </p>
          </section>

          <section>
            <h2>Limitation of Liability</h2>
            <p>
              Opal Gems shall not be liable for any indirect, incidental, special, or consequential damages 
              arising from your use of our website or services. Our total liability shall not exceed the 
              amount paid for the specific product or service in question.
            </p>
          </section>

          <section>
            <h2>Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the State of Florida, 
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2>Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon 
              posting to our website. Your continued use of our services constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              For questions about these terms, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:legal@opalgems.com">legal@opalgems.com</a><br />
              <strong>Phone:</strong> (561) 555-0101<br />
              <strong>Address:</strong> 10 N Ocean Blvd, Delray Beach, FL 33483
            </p>
          </section>

          <div className="legal-actions">
            <Link to="/" className="pill ghost">Back to Home</Link>
          </div>
        </article>
      </main>
    </div>
  );
}
