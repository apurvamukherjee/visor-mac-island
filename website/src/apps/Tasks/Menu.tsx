import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  checked?: boolean;
  danger?: boolean;
}

/** A button with a small pop-up list, like the app's borderless menus. Closes on pick, Escape or a click outside. */
export function Menu({ label, items, children, className = '' }: { label: string; items: (MenuItem | 'divider')[]; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!(e.target instanceof Node && ref.current?.contains(e.target))) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <span ref={ref} className="tk-menu">
      <button type="button" className={`tk-menu-btn ${className}`} aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {children}
      </button>
      {open && (
        <span className="tk-menu-list" role="menu">
          {items.map((item, i) => item === 'divider'
            ? <hr key={`d${i}`} />
            : (
              <button
                key={item.label}
                type="button"
                role="menuitemradio"
                aria-checked={item.checked ?? false}
                className={item.danger ? 'is-danger' : ''}
                onClick={() => { item.onSelect(); setOpen(false); }}
              >
                <span aria-hidden>{item.checked ? '✓' : ''}</span>{item.label}
              </button>
            ))}
        </span>
      )}
    </span>
  );
}
