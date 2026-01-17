import { useState, useEffect, useCallback } from 'react';

interface QuickButtonStates {
  [buttonLabel: string]: boolean;
}

interface UseQuickButtonStateReturn {
  isDisabled: (buttonLabel: string) => boolean;
  disableButton: (buttonLabel: string) => void;
}

// In-memory fallback for when localStorage is unavailable
const inMemoryState: Record<string, QuickButtonStates> = {};

/**
 * Custom hook for managing quick button disabled states with localStorage persistence
 * @param buyerId - Unique identifier for the buyer
 * @returns Object with isDisabled check function and disableButton mutation function
 */
export function useQuickButtonState(buyerId: string): UseQuickButtonStateReturn {
  const [buttonStates, setButtonStates] = useState<QuickButtonStates>({});
  const storageKey = `buyer_${buyerId}_quick_buttons`;

  // Load initial state from localStorage on mount
  useEffect(() => {
    if (!buyerId) {
      console.warn('useQuickButtonState: Invalid buyer ID provided');
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setButtonStates(parsed);
      }
    } catch (error) {
      console.warn('Failed to load button states from localStorage:', error);
      // Try to load from in-memory fallback
      if (inMemoryState[storageKey]) {
        setButtonStates(inMemoryState[storageKey]);
      }
    }
  }, [buyerId, storageKey]);

  // Check if a button is disabled
  const isDisabled = useCallback(
    (buttonLabel: string): boolean => {
      return buttonStates[buttonLabel] === true;
    },
    [buttonStates]
  );

  // Disable a button and persist to localStorage
  const disableButton = useCallback(
    (buttonLabel: string): void => {
      if (!buyerId) {
        console.warn('useQuickButtonState: Cannot disable button without valid buyer ID');
        return;
      }

      const newStates = {
        ...buttonStates,
        [buttonLabel]: true,
      };

      setButtonStates(newStates);

      // Persist to localStorage with error handling
      try {
        localStorage.setItem(storageKey, JSON.stringify(newStates));
      } catch (error) {
        console.warn('Failed to persist button state to localStorage:', error);
        // Fall back to in-memory storage
        inMemoryState[storageKey] = newStates;
      }
    },
    [buyerId, buttonStates, storageKey]
  );

  return {
    isDisabled,
    disableButton,
  };
}
