import { useEffect, type RefObject } from 'react';

/** A press anywhere outside `box` closes a popover, as a menu does. */
export function useDismiss(open: boolean, box: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (e.target instanceof Node && !box.current?.contains(e.target)) close();
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open, box, close]);
}
