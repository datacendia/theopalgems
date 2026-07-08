import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Interactive 360° viewer with zoom.
 *
 * - Auto-rotates the orbit MP4; drag left/right to scrub the rotation by hand.
 * - TAP / CLICK toggles zoom (works with mouse and touch). While zoomed the
 *   spin pauses and the view magnifies, following the cursor/finger so the
 *   customer can inspect detail; drag pans. Tap again to zoom out and resume.
 *
 * Muted + playsInline so it plays inline on mobile; poster shows until decode.
 */
export default function SpinViewer({ src, poster, alt = '' }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, startT: 0, moved: 0, width: 1 });
  const justDragged = useRef(false);
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
    clearTimeout(idleTimer.current);
    justDragged.current = false;
    if (!zoomed) { stopAuto(); setInteracting(true); }
    drag.current = { active: true, startX: e.clientX, startT: v.currentTime, moved: 0, width: wrap.clientWidth || 1, captured: false };
    // NB: don't capture the pointer here — capturing on touch suppresses the
    // follow-up `click`, which breaks tap-to-zoom on mobile. Capture only once
    // a real drag starts (below).
  };

  const onPointerMove = (e) => {
    const v = videoRef.current;
    if (!v) return;
    if (zoomed) setOrigin(e.clientX, e.clientY); // pan follows pointer while zoomed
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > 6) {
      justDragged.current = true;
      if (!d.captured) { wrapRef.current?.setPointerCapture?.(e.pointerId); d.captured = true; }
    }
    if (!zoomed && v.duration) {
      const t = d.startT + (dx / d.width) * v.duration; // scrub = rotate
      v.currentTime = ((t % v.duration) + v.duration) % v.duration;
      e.preventDefault();
    }
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    if (d.active) { d.active = false; if (d.captured) wrapRef.current?.releasePointerCapture?.(e.pointerId); }
    if (!zoomed && justDragged.current) {
      // Was a rotate drag — resume the gentle auto-spin shortly after.
      idleTimer.current = setTimeout(() => { setInteracting(false); startAuto(); }, 1200);
    }
  };

  // Tap/click toggles zoom. Ignored right after a drag (rotate/pan).
  const onClick = (e) => {
    if (justDragged.current) { justDragged.current = false; return; }
    if (!zoomed) {
      setOrigin(e.clientX, e.clientY);
      stopAuto();
      setInteracting(false);
      setZoomed(true);
    } else {
      setZoomed(false);
      startAuto();
    }
  };

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  return (
    <div
      ref={wrapRef}
      className={`spin-viewer${interacting ? ' is-dragging' : ''}${zoomed ? ' is-zoomed' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onClick}
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
          {zoomed ? 'Tap to zoom out' : '↔ Drag to rotate · Tap to zoom'}
        </span>
      )}
    </div>
  );
}
