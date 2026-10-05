import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MacroInspection({ active, onExit, children }: { active: boolean; onExit: () => void; children: ReactNode }) {
  const transform = useRef<ReactZoomPanPinchRef>(null);
  const [exiting, setExiting] = useState(false);
  const lastTap = useRef(0);
  const touch = useRef<{ x: number; y: number; time: number; moved: boolean } | null>(null);
  const exit = useCallback(async () => {
    if (exiting || !active) return;
    setExiting(true);
  }, [active, exiting]);
  useEffect(() => {
    if (!exiting) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      void transform.current?.centerView(1, 320, 'easeInOutQuad').then(() => {
        if (!cancelled) { onExit(); setExiting(false); }
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [exiting, onExit]);
  useEffect(() => {
    lastTap.current = 0;
    const frame = requestAnimationFrame(() => {
      void transform.current?.centerView(active ? 2.5 : 1, 320, 'easeInOutQuad');
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  useEffect(() => {
    if (!active) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') void exit(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [active, exit]);
  return <div className={`inspection-media ${active ? 'inspection-active' : ''}`} onDoubleClick={() => void exit()}
        onTouchStart={event => {
          const point = event.touches[0];
          if (event.touches.length !== 1 || !point) { touch.current = null; lastTap.current = 0; return; }
          touch.current = { x: point.clientX, y: point.clientY, time: Date.now(), moved: false };
        }}
        onTouchMove={event => {
          const point = event.touches[0]; const start = touch.current;
          if (start && (!point || event.touches.length !== 1 || Math.hypot(point.clientX - start.x, point.clientY - start.y) > 8)) start.moved = true;
        }}
        onTouchEnd={() => {
          const start = touch.current; touch.current = null;
          if (!active || !start || start.moved || Date.now() - start.time > 250) { lastTap.current = 0; return; }
          const now = Date.now();
          if (lastTap.current && now - lastTap.current < 300) { lastTap.current = 0; void exit(); } else lastTap.current = now;
        }}>
    <TransformWrapper ref={transform} disabled={!active || exiting} minScale={active && !exiting ? 1.5 : 1} maxScale={4} limitToBounds centerOnInit disablePadding
      wheel={{ step: 0.05 }} panning={{ velocityDisabled: true }} pinch={{ allowPanning: true }} doubleClick={{ disabled: true }} zoomAnimation={{ disabled: true }}>
      <TransformComponent wrapperClass="inspection-wrapper" contentClass="inspection-content">{children}</TransformComponent>
    </TransformWrapper>
    {active && <>

      <div className="inspection-pill"><span>🔍 Macro Zoom Mode • Drag to Explore | Tap to Exit</span><Button variant="ghost" size="icon" aria-label="Exit macro zoom" title="Exit macro zoom" disabled={exiting} onClick={() => void exit()}><X size={14} /></Button></div>
    </>}
  </div>;
}