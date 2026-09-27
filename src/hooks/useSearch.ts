import { useState, useMemo, useCallback } from 'react';
import { useDebounce } from './useDebounce';

export interface UseSearchOptions<T> {
  items: T[];
  keys: (keyof T)[];
  debounceMs?: number;
}

export interface UseSearchReturn<T> {
  query: string;
  setQuery: (query: string) => void;
  results: T[];
  isSearching: boolean;
  clearSearch: () => void;
  resultCount: number;
}

export function useSearch<T extends Record<string, unknown>>({
  items,
  keys,
  debounceMs = 300,
}: UseSearchOptions<T>): UseSearchReturn<T> {
  const [query, setQueryState] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const debouncedQuery = useDebounce(query, debounceMs);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) {
      setIsSearching(false);
      return items;
    }

    setIsSearching(true);

    const lowerQuery = debouncedQuery.toLowerCase().trim();

    const filtered = items.filter((item) =>
      keys.some((key) => {
        const value = item[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerQuery);
      })
    );

    setIsSearching(false);
    return filtered;
  }, [items, keys, debouncedQuery]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setIsSearching(true);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryState('');
    setIsSearching(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching: isSearching && query.trim() !== '',
    clearSearch,
    resultCount: results.length,
  };
}

export default useSearch;
