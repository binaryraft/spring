
import { useState, useEffect } from 'react';

// Define a dispatch type for SetStateAction for clarity
type SetValue<T> = React.Dispatch<React.SetStateAction<T>>;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Step 1: Initialize state with initialValue.
  // This ensures server and initial client render match.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // State to track if we have initialized from localStorage
  const [isInitialized, setIsInitialized] = useState(false);

  // Step 2: useEffect to read from localStorage and update state.
  // This runs only on the client, after the initial render (hydration).
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsedItem = JSON.parse(item);

        // Apply merging logic similar to previous versions
        if (Array.isArray(initialValue)) {
          if (Array.isArray(parsedItem)) {
            setStoredValue(parsedItem as T);
          } else {
            console.warn(`LocalStorage key "${key}" was expected to be an array but was not. Using initial value.`);
            // storedValue remains initialValue from useState
          }
        } else if (
          typeof initialValue === 'object' &&
          initialValue !== null &&
          !Array.isArray(initialValue) &&
          typeof parsedItem === 'object' &&
          parsedItem !== null &&
          !Array.isArray(parsedItem)
        ) {
          setStoredValue({ ...initialValue, ...(parsedItem as Partial<T>) } as T);
        } else {
          // For primitive types or if no special handling is needed.
          if (typeof parsedItem === typeof initialValue || (parsedItem === null && initialValue === null)) {
            setStoredValue(parsedItem as T);
          } else {
            console.warn(`LocalStorage key "${key}" type mismatch. Parsed: ${typeof parsedItem}, Expected: ${typeof initialValue}. Using initial value.`);
            // storedValue remains initialValue
          }
        }
      }
      // If item is null (not found), storedValue remains initialValue.
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      // storedValue remains initialValue in case of error.
    }
    // Mark as initialized after attempting to load from localStorage
    setIsInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only depends on key, effectively runs once on mount unless key changes.

  // Step 3: useEffect to save back to localStorage when storedValue changes *and* we've initialized.
  // This also runs only on the client.
  useEffect(() => {
    // Don't save to localStorage until we've attempted to load from it first
    if (typeof window === 'undefined' || !isInitialized) {
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, isInitialized]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
