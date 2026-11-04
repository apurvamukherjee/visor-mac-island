import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// MarqueeTextView: a title too long for its line drifts to its end and back, instead of being cut off.
const PX_PER_S = 28;
const MIN_S = 6;

export function Marquee({ children, className = '' }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  // Measured, not guessed: the line's width depends on the font, the calendar and the mirror beside it.
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => setOverflow(Math.max(0, Math.ceil(i.scrollWidth - o.clientWidth)));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(o);
    watch.observe(i);
    return () => watch.disconnect();
  }, [children]);

  return (
    <div
      ref={outer}
      className={`marquee ${className}`}
      data-scroll={overflow > 0 || undefined}
      style={{ '--shift': `${-overflow}px`, '--marquee-s': `${Math.max(MIN_S, (2 * overflow) / PX_PER_S + 3)}s` } as React.CSSProperties}
    >
      <span ref={inner}>{children}</span>
    </div>
  );
}
