import { useEffect } from 'react';

export default function useScrollReveal() {
  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children');
    
    if (!revealElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}
