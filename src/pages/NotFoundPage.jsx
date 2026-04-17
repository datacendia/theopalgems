import React from 'react';
import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Page Not Found');
  return (
    <div className="page">
      <div className="not-found">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found__actions">
          <Link to="/" className="pill primary">Return Home</Link>
          <Link to="/#locations" className="pill ghost">Find a Boutique</Link>
        </div>
      </div>
    </div>
  );
}
