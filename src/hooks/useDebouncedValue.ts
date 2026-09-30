import {useEffect, useState} from 'react';

// Returns `value` only after it has stopped changing for `delay` ms.
// Used so search boxes that drive a network request don't fire one request
// per keystroke (each of which also triggers a full list re-render).
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
