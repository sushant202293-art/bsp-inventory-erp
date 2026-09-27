import { useEffect, useCallback } from 'react';

interface UseKeyPressOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export function useKeyPress(
  targetKey: string,
  callback: () => void,
  options: UseKeyPressOptions = {},
  enabled: boolean = true
): void {
  const { ctrl = false, shift = false, alt = false, meta = false } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      if (event.key === targetKey) {
        if (ctrl && !event.ctrlKey && !event.metaKey) return;
        if (shift && !event.shiftKey) return;
        if (alt && !event.altKey) return;
        if (meta && !event.metaKey) return;

        event.preventDefault();
        callback();
      }
    },
    [targetKey, callback, ctrl, shift, alt, meta, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export default useKeyPress;
