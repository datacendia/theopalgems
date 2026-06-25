import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Interactive 360° viewer.
 *
 * Plays an orbit MP4 as an auto-rotating loop, but lets the customer grab it
 * and drag left/right to scrub through the rotation by hand — one full drag
 * across the frame ≈ one full turn. Releasing resumes the gentle auto-spin.
 *
 * The video is muted + playsInline so it works inline on mobile, and we never
 * rely on audio. Falls back to the poster image until the video can decode.
 */
export default function SpinViewer({ src, poster, alt = '' }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, startT: 0, width: 1 });
  const idleTimer = useRef(null);
  const [ready, setReady] = useState(false);
  const [interacting, setInteracting] = useState(false);

  const startAuto = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);

  const stopAuto = useCallback(() => {
    const v = videoRef.current;
    if (v) v.pause();
  }, []);

  const onLoaded = () => {
    setReady(true);
    startAuto();
  };

  const onPointerDown = (e) => {
    const v = videoRef.current;
    const wrap = wrapRef.current;
    if (!v || !wrap) return;
    stopAuto();
    clearTimeout(idleTimer.current);
    setInteracting(true);
    drag.current = {
      active: true,
      startX: e.clientX,
      startT: v.currentTime,
      width: wrap.clientWidth || 1,
    };
    wrap.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    const v = videoRef.current;
    if (!d.active || !v || !v.duration) return;
    e.preventDefault();
    const dx = e.clientX - d.startX;
    // Full width drag == one full loop of the clip.
    let t = d.startT + (dx / d.width) * v.duration;
    t = ((t % v.duration) + v.duration) % v.duration; // wrap both directions
    v.currentTime = t;
  };

  const endDrag = (e) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    wrapRef.current?.releasePointerCapture?.(e.pointerId);
    // Resume gentle auto-spin shortly after the user lets go.
    idleTimer.current = setTimeout(() => {
      setInteracting(false);
      startAuto();
    }, 1200);
  };

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  return (
    <div
      ref={wrapRef}
      className={`spin-viewer${interacting ? ' is-dragging' : ''}`}
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
          ↔ Drag to rotate
        </span>
      )}
    </div>
  );
}
