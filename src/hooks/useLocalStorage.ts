
import { useState, useEffect } from 'react';

type SetValue<T> = (value: T | ((val: T) => T)) => void;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsedItem = JSON.parse(item);
        // If initialValue is an object and parsedItem is also an object,
        // merge them. This ensures that new properties in initialValue (e.g., new default settings)
        // are populated if they are missing from the stored parsedItem.
        // Properties from parsedItem (localStorage) will override those in initialValue.
        if (
          typeof initialValue === 'object' &&
          initialValue !== null &&
          typeof parsedItem === 'object' &&
          parsedItem !== null
        ) {
          return { ...initialValue, ...(parsedItem as Partial<T>) } as T;
        }
        return parsedItem as T; // Return parsed item if not merging (e.g., not objects)
      }
      return initialValue; // Return initialValue if no item in localStorage
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const valueToStore =
          typeof storedValue === 'function'
            ? (storedValue as (val: T) => T)(storedValue)
            : storedValue;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

export default useLocalStorage;
