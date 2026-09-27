import { useState, useEffect, useCallback } from 'react';

export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((q: string): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(q).matches;
  }, []);

  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = () => {
      setMatches(mediaQuery.matches);
    };

    handleChange();

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query, getMatches]);

  return matches;
}

export default useMediaQuery;
