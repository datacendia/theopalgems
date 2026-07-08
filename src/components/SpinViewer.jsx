import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Interactive 360° viewer with zoom.
 *
 * - Auto-rotates the orbit MP4; drag left/right to scrub through the rotation
 *   by hand (one full drag ≈ one full turn).
 * - CLICK (tap) toggles zoom. While zoomed the spin pauses and the view
 *   magnifies, following the cursor/finger so the customer can inspect detail.
 *   Click again to zoom out and resume the gentle auto-spin.
 *
 * Muted + playsInline so it works inline on mobile; falls back to the poster
 * until the video can decode.
 */
export default function SpinViewer({ src, poster, alt = '' }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, startT: 0, moved: 0, width: 1 });
  const idleTimer = useRef(null);
  const [ready, setReady] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const startAuto = useCallback(() => { const v = videoRef.current; if (v) v.play().catch(() => {}); }, []);
  const stopAuto = useCallback(() => { const v = videoRef.current; if (v) v.pause(); }, []);

  const onLoaded = () => { setReady(true); startAuto(); };

  const setOrigin = (clientX, clientY) => {
    const v = videoRef.current, wrap = wrapRef.current;
    if (!v || !wrap) return;
    const r = wrap.getBoundingClientRect();
    const px = Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
    const py = Math.min(100, Math.max(0, ((clientY - r.top) / r.height) * 100));
    v.style.transformOrigin = `${px}% ${py}%`;
  };

  const onPointerDown = (e) => {
    const v = videoRef.current, wrap = wrapRef.current;
    if (!v || !wrap) return;
    stopAuto();
    clearTimeout(idleTimer.current);
    setInteracting(true);
    drag.current = { active: true, startX: e.clientX, startT: v.currentTime, moved: 0, width: wrap.clientWidth || 1 };
    wrap.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const v = videoRef.current;
    if (!v) return;
    // While zoomed, any move pans the magnified view.
    if (zoomed) setOrigin(e.clientX, e.clientY);
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(e.clientY - (d.startY ?? e.clientY)));
    e.preventDefault();
    if (!zoomed && v.duration) {
      const t = d.startT + (dx / d.width) * v.duration; // scrub = rotate
      v.currentTime = ((t % v.duration) + v.duration) % v.duration;
    }
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    wrapRef.current?.releasePointerCapture?.(e.pointerId);
    if (d.moved < 6) {
      // A tap → toggle zoom.
      const next = !zoomed;
      if (next) {
        setOrigin(e.clientX, e.clientY);
        setZoomed(true); // stay paused while zoomed
        setInteracting(false); // let the "Click to zoom out" hint show
      } else {
        setZoomed(false);
        setInteracting(false);
        startAuto();
      }
    } else if (!zoomed) {
      // Was a rotate drag — resume the gentle auto-spin shortly after.
      idleTimer.current = setTimeout(() => { setInteracting(false); startAuto(); }, 1200);
    }
  };

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  return (
    <div
      ref={wrapRef}
      className={`spin-viewer${interacting ? ' is-dragging' : ''}${zoomed ? ' is-zoomed' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={onLoaded}
        draggable={false}
        aria-label={alt}
      />
      <span className="spin-viewer__badge">360°</span>
      {ready && (
        <span className="spin-viewer__hint" aria-hidden="true">
          {zoomed ? 'Click to zoom out' : '↔ Drag to rotate · Click to zoom'}
        </span>
      )}
    </div>
  );
}
