import React, { useState } from 'react';

export default function ImageWithSkeleton({ src, alt, className = '' }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`image-skeleton-wrapper ${className}`}>
      {!loaded && !error && (
        <div className="skeleton skeleton-image" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{ 
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
    </div>
  );
}
