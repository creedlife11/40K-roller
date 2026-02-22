import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic hook backed by AsyncStorage.
 * Returns [value, setValue, isLoaded].
 */
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((data) => {
        if (data !== null) {
          try {
            setValue(JSON.parse(data) as T);
          } catch {
            // corrupted data — use default
          }
        }
      })
      .finally(() => setIsLoaded(true));
  }, [key]);

  const set = useCallback(
    async (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: T) => T)(prev)
            : updater;
        AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [key]
  );

  return [value, set, isLoaded];
}
