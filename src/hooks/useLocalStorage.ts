
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

        // Handle array type specifically
        if (Array.isArray(initialValue)) {
          if (Array.isArray(parsedItem)) {
            return parsedItem as T;
          }
          // If initialValue is array but parsedItem isn't, fall back to initialValue
          console.warn(`LocalStorage key "${key}" was expected to be an array but was not. Falling back to initial value.`);
          return initialValue;
        }
        
        // Handle object type (and not array) for merging
        if (
          typeof initialValue === 'object' &&
          initialValue !== null && // initialValue is a non-null object
          !Array.isArray(initialValue) && // Ensure initialValue is not an array here
          typeof parsedItem === 'object' &&
          parsedItem !== null && // parsedItem is a non-null object
          !Array.isArray(parsedItem) // Ensure parsedItem is not an array here
        ) {
          // This merge ensures new properties in initialValue are populated
          // if they are missing from the stored parsedItem.
          return { ...initialValue, ...(parsedItem as Partial<T>) } as T;
        }
        
        // For primitive types or if no special handling is needed.
        // This also covers cases where initialValue and parsedItem are both non-array objects
        // but don't need the specific deep merge logic above (though the above object merge is generally preferred for settings).
        // A basic type check can be useful.
        if (typeof parsedItem === typeof initialValue || (parsedItem === null && initialValue === null)) {
            return parsedItem as T;
        }

        // If types don't match for primitives or unhandled complex types, fall back.
        console.warn(`LocalStorage key "${key}" type mismatch or structure incompatible. Parsed: ${typeof parsedItem}, Expected: ${typeof initialValue}. Falling back to initial value.`);
        return initialValue;
      }
      return initialValue; // No item in localStorage
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue; // Error reading or parsing
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
