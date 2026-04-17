import React from 'react';
import { Link } from 'react-router-dom';

// Option 2: Split Layout with Multiple Products
export function Option2Gallery() {
  return (
    <div className="crafted-gallery option-2">
      <div className="multi-product-container">
        <div className="product-stack">
          <img src="/assets/Stacked_diamond_eternity_bands.PNG" alt="Stacked rings" />
          <img src="/assets/category-bracelets.PNG" alt="Tennis bracelet" />
        </div>
      </div>
    </div>
  );
}

// Option 3: Full-Width Carousel
export function Option3Gallery() {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  
  const slides = [
    { image: "/assets/Stacked_diamond_eternity_bands.PNG", title: "RINGS", category: "rings" },
    { image: "/assets/watch_category.PNG", title: "WATCHES", category: "watches" },
    { image: "/assets/category-bracelets.PNG", title: "BRACELETS", category: "bracelets" },
    { image: "/assets/category-necklaces.PNG", title: "NECKLACES", category: "necklaces" },
    { image: "/assets/category-earrings.PNG", title: "EARRINGS", category: "earrings" }
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="crafted-gallery option-3">
      <div className="fullscreen-carousel">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="slide-overlay">
              <h3>{slide.title}</h3>
              <Link to={`/category/${slide.category}`} className="pill ghost">Shop {slide.title}</Link>
            </div>
          </div>
        ))}
        <div className="carousel-nav">
          {slides.map((_, index) => (
            <button 
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Option 4: Interactive Grid
export function Option4Gallery() {
  const products = [
    { image: "/assets/Stacked_diamond_eternity_bands.PNG", title: "Rings", category: "rings" },
    { image: "/assets/watch_category.PNG", title: "Watches", category: "watches" },
    { image: "/assets/category-bracelets.PNG", title: "Bracelets", category: "bracelets" },
    { image: "/assets/category-necklaces.PNG", title: "Necklaces", category: "necklaces" },
    { image: "/assets/category-earrings.PNG", title: "Earrings", category: "earrings" },
    { image: "/assets/diamonds_loose.PNG", title: "Diamonds", category: "rings" }
  ];

  return (
    <div className="crafted-gallery option-4">
      <div className="interactive-grid">
        {products.map((product, index) => (
          <Link key={index} to={`/category/${product.category}`} className="grid-item">
            <div className="grid-item-image">
              <img src={product.image} alt={product.title} />
              <div className="grid-item-overlay">
                <h4>{product.title}</h4>
                <span className="grid-arrow">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Option 5: Video Background
export function Option5Gallery() {
  return (
    <div className="crafted-gallery option-5">
      <div className="video-hero">
        <div className="video-background">
          <img src="/assets/Stacked_diamond_eternity_bands.PNG" alt="Jewelry showcase" />
          <div className="video-overlay"></div>
        </div>
        <div className="video-content">
          <div className="shimmer-text">LUXURY REDEFINED</div>
          <h2>CRAFTED FOR EVERY OCCASION</h2>
          <p>Experience the artistry of fine jewelry</p>
          <div className="video-cta">
            <Link to="/category/rings" className="pill primary">Explore Collections</Link>
            <button className="pill ghost">Watch Video</button>
          </div>
        </div>
      </div>
    </div>
  );
}
