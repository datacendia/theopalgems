import React from 'react';
import SEO from '../components/SEO';

const FAQS = [
  {
    q: 'Do I need an appointment to visit?',
    a: "Walk-ins are always welcome! However, we recommend booking an appointment for a personalized styling session, especially for engagement rings or custom pieces. This ensures a dedicated concierge will be available to assist you.",
  },
  {
    q: "What's the difference between lab-grown and natural diamonds?",
    a: 'Both are real diamonds with identical physical and optical properties. Lab-grown diamonds are created in controlled environments and are typically 30-50% less expensive. Natural diamonds are mined from the earth and may hold higher resale value. Both options are certified by GIA or IGI.',
  },
  {
    q: 'How long does a custom piece take?',
    a: 'Custom pieces typically take 2-6 weeks depending on complexity. Rings usually take 2-4 weeks, necklaces 3-5 weeks, and bracelets 4-6 weeks. Rush orders may be available—please ask your concierge.',
  },
  {
    q: 'Do you offer financing?',
    a: 'Yes, we offer flexible financing options through our partner programs. Speak with your concierge about 0% APR plans and payment schedules that work for your budget.',
  },
  {
    q: 'Can I return or exchange a piece?',
    a: 'We offer a 30-day return policy for unworn pieces in original condition. Custom-made pieces are final sale. Exchanges are welcome within 60 days. Please retain your receipt and original packaging.',
  },
  {
    q: 'Do you ship jewelry?',
    a: 'We specialize in the in-boutique experience and do not ship jewelry. All purchases are made in person at one of our Florida locations. This allows us to ensure proper fitting and provide our signature concierge service.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default function FAQPage() {
  return (
    <div className="page">
      <SEO
        title="Frequently Asked Questions"
        description="Answers to common questions about visiting Opal Gems boutiques, diamond types, custom pieces, financing, returns, and our in-person shopping experience."
        path="/faq"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ]}
        jsonLd={faqSchema}
      />
      <div className="page-hero">
        <div className="page-hero__content">
          <p className="eyebrow">FAQ</p>
          <h1>Common Questions</h1>
          <p className="lead">Everything you need to know about visiting our boutiques and shopping with Opal Gems.</p>
        </div>
      </div>

      <main className="container">
        <section className="section">
          <div className="faq-grid">
            {FAQS.map(({ q, a }, i) => (
              <details key={i} className="faq-item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
