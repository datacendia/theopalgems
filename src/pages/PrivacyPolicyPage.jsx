import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

export default function PrivacyPolicyPage() {
  return (
    <div className="page">
      <SEO title="Privacy Policy" description="How Opal Gems collects, uses, and protects your personal information, including GDPR and CCPA-compliant practices." path="/privacy" />
      <div className="page-hero page-hero--small">
        <div className="page-hero__content">
          <p className="eyebrow">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="lead">Last updated: February 2026</p>
        </div>
      </div>

      <main className="container">
        <article className="legal-content">
          <section>
            <h2>Introduction</h2>
            <p>
              Opal Gems ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. 
              This privacy policy explains how we collect, use, and safeguard your information when you visit our boutiques 
              or use our website.
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>
            <h3>Personal Information</h3>
            <p>We may collect the following personal information:</p>
            <ul>
              <li>Name and contact information (email, phone number)</li>
              <li>Billing and shipping addresses</li>
              <li>Payment information (processed securely through third-party providers)</li>
              <li>Purchase history and preferences</li>
              <li>Communication preferences</li>
            </ul>

            <h3>Automatically Collected Information</h3>
            <p>When you visit our website, we may automatically collect:</p>
            <ul>
              <li>Device information (browser type, operating system)</li>
              <li>IP address and location data</li>
              <li>Pages visited and time spent on site</li>
              <li>Referring website information</li>
            </ul>
          </section>

          <section>
            <h2>How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Process and fulfill your orders</li>
              <li>Schedule appointments and provide concierge services</li>
              <li>Send order confirmations and updates</li>
              <li>Respond to your inquiries and requests</li>
              <li>Send promotional communications (with your consent)</li>
              <li>Improve our website and services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>Information Sharing</h2>
            <p>
              We do not sell your personal information. We may share your information with:
            </p>
            <ul>
              <li>Service providers who assist with payment processing, shipping, and marketing</li>
              <li>Professional advisors (lawyers, accountants) as needed</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h2>Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data against 
              unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over 
              the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>
          </section>

          <section>
            <h2>Cookies</h2>
            <p>
              Our website uses cookies to enhance your browsing experience. You can control cookie settings 
              through your browser preferences.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have questions about this privacy policy or your personal data, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> <a href="mailto:sales@opalgems.com">sales@opalgems.com</a><br />
              <strong>Phone:</strong> <a href="tel:+15612519560">+1 (561) 251-9560</a><br />
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
