import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { kiraProducts } from '../data/kiraProducts.js';
import watches from '../data/watches.js';
import SEO from '../components/SEO';

const categoryLinks = {
  necklaces: '/category/necklaces',
  rings: '/category/rings',
  earrings: '/category/earrings',
  bracelets: '/category/bracelets',
  watches: '/category/watches',
};

const categoryLabels = {
  necklaces: 'Necklaces',
  rings: 'Rings',
  earrings: 'Earrings',
  bracelets: 'Bracelets',
  watches: 'Watches',
};

const allProducts = [
  ...kiraProducts.map((p) => ({
    id: p.name,
    name: p.description || p.name,
    sku: p.name,
    category: p.category,
    image: p.link,
    price: null,
    brand: null,
    href: categoryLinks[p.category] || '/category/' + p.category,
  })),
  ...watches.map((w) => ({
    id: w.id,
    name: w.name,
    sku: w.id,
    category: 'watches',
    image: w.image,
    price: w.price,
    brand: w.brand,
    href: w.url || '/category/watches',
    external: !!w.url,
  })),
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');
  const query = searchParams.get('q') || '';


  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() });
    }
  };

  const grouped = useMemo(() => {
    const groups = {};
    results.forEach((r) => {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    });
    return groups;
  }, [results]);

  return (
    <div className="page">
      <SEO
        title={query ? `Search: "${query}"` : 'Search'}
        description="Search the Opal Gems catalog of diamond jewelry and watches by name, category, brand, or SKU."
        path="/search"
        noIndex
      />
      <div className="page-hero page-hero--sm">
        <div className="page-hero__content">
          <p className="eyebrow">Search</p>
          <h1>Find Your Perfect Piece</h1>
        </div>
      </div>

      <main className="container">
        <section className="section">
          <form onSubmit={handleSubmit} className="search-page-form">
            <div className="search-page-input-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-page-icon">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search by name, category, brand…"
                autoFocus
                className="search-page-input"
              />
              {inputValue && (
                <button type="button" className="search-page-clear" onClick={() => { setInputValue(''); setSearchParams({}); }}>×</button>
              )}
            </div>
            <button type="submit" className="pill primary">Search</button>
          </form>

          {query && (
            <p className="search-page-meta">
              {results.length === 0
                ? `No results for "${query}"`
                : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
            </p>
          )}

          {!query && (
            <div className="search-page-suggestions">
              <p className="small" style={{ marginBottom: '16px' }}>Browse by category:</p>
              <div className="search-page-cats">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <Link key={key} to={categoryLinks[key]} className="pill ghost">{label}</Link>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="search-page-results">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="search-page-group">
                  <div className="search-page-group__header">
                    <h3>{categoryLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
                    <Link to={categoryLinks[cat] || '/category/' + cat} className="search-page-group__link">
                      View all {categoryLabels[cat] || cat} →
                    </Link>
                  </div>
                  <div className="search-results-grid">
                    {items.slice(0, 8).map((item) => (
                      item.external ? (
                        <a key={item.id} href={item.href} target="_blank" rel="noopener noreferrer" className="search-result-card">
                          <div className="search-result-card__image">
                            <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                          </div>
                          <div className="search-result-card__info">
                            <p className="search-result-card__name">{item.name}</p>
                            {item.brand && <span className="search-result-card__brand">{item.brand}</span>}
                            {item.price && <span className="search-result-card__price">{item.price}</span>}
                          </div>
                        </a>
                      ) : (
                        <Link key={item.id} to={item.href} className="search-result-card">
                          <div className="search-result-card__image">
                            <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                          </div>
                          <div className="search-result-card__info">
                            <p className="search-result-card__name">{item.name}</p>
                            {item.brand && <span className="search-result-card__brand">{item.brand}</span>}
                            {item.price && <span className="search-result-card__price">{item.price}</span>}
                          </div>
                        </Link>
                      )
                    ))}
                  </div>
                  {items.length > 8 && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <Link to={categoryLinks[cat] || '/category/' + cat} className="pill ghost">
                        +{items.length - 8} more in {categoryLabels[cat] || cat}
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {query && results.length === 0 && (
            <div className="search-page-empty">
              <p>Try a different term, or browse a category:</p>
              <div className="search-page-cats" style={{ marginTop: '20px' }}>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <Link key={key} to={categoryLinks[key]} className="pill ghost">{label}</Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
