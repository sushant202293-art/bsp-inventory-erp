import { useEffect, useRef, type RefObject } from 'react';

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  enabled: boolean = true
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [handler, enabled]);

  return ref;
}

export default useClickOutside;
