import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

export default function NotFoundPage() {
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
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." path="/404" noIndex />
      <div className="not-found">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found__actions">
          <Link to="/" className="pill primary">Return Home</Link>
          <a href="/#locations" onClick={goToLocations} className="pill ghost">Find a Boutique</a>
        </div>
      </div>
    </div>
  );
}
