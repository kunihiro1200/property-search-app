import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getSellerButtonStates,
  setSellerButtonStates,
} from '../utils/callModeQuickButtonStorage';

/**
 * Button state type
 * - 'pending': Button clicked but not yet saved
 * - 'persisted': Button state saved to localStorage
 */
export type ButtonState = 'pending' | 'persisted';

export interface CallModeQuickButtonState {
  /**
   * Map of button IDs to their current state
   */
  disabledButtons: Map<string, ButtonState>;

  /**
   * Handle quick button click - marks button as pending disable
   * @param buttonId - Unique identifier for the button
   */
  handleQuickButtonClick: (buttonId: string) => void;

  /**
   * Handle save button click - persists all pending states to localStorage
   */
  handleSave: () => void;

  /**
   * Check if a button is disabled (either pending or persisted)
   * @param buttonId - Unique identifier for the button
   * @returns true if button is disabled, false otherwise
   */
  isButtonDisabled: (buttonId: string) => boolean;

  /**
   * Get the current state of a button
   * @param buttonId - Unique identifier for the button
   * @returns 'pending', 'persisted', or null if not disabled
   */
  getButtonState: (buttonId: string) => ButtonState | null;
}

/**
 * Custom hook for managing call mode quick button disabled states
 * 
 * This hook manages a two-stage disable process:
 * 1. Pending: User clicks button, marked as pending but not saved
 * 2. Persisted: User clicks save, pending states are persisted to localStorage
 * 
 * @param sellerId - Unique identifier for the seller
 * @returns Object with state and handler functions
 */
export function useCallModeQuickButtonState(
  sellerId: string | undefined
): CallModeQuickButtonState {
  const [disabledButtons, setDisabledButtons] = useState<Map<string, ButtonState>>(
    new Map()
  );
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Load persisted states from localStorage on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (!sellerId) {
      console.warn('[useCallModeQuickButtonState] Invalid seller ID provided');
      return;
    }

    // Load asynchronously to avoid blocking render
    const loadStates = async () => {
      try {
        const persistedStates = getSellerButtonStates(sellerId);
        
        if (isMountedRef.current) {
          setDisabledButtons(persistedStates);
        }
      } catch (error) {
        console.error('[useCallModeQuickButtonState] Failed to load button states:', error);
      }
    };

    loadStates();

    return () => {
      isMountedRef.current = false;
    };
  }, [sellerId]);

  /**
   * Handle quick button click - mark as pending
   */
  const handleQuickButtonClick = useCallback((buttonId: string) => {
    if (!buttonId) {
      console.warn('[useCallModeQuickButtonState] Invalid button ID');
      return;
    }

    setDisabledButtons((prev) => {
      const newMap = new Map(prev);
      // Only set to pending if not already disabled
      if (!newMap.has(buttonId)) {
        newMap.set(buttonId, 'pending');
      }
      return newMap;
    });
  }, []);

  /**
   * Handle save - persist all pending states to localStorage
   */
  const handleSave = useCallback(() => {
    if (!sellerId) {
      console.warn('[useCallModeQuickButtonState] Cannot save without valid seller ID');
      return;
    }

    setDisabledButtons((prev) => {
      const newMap = new Map(prev);
      const persistedMap = new Map<string, 'persisted'>();

      // Convert all pending states to persisted
      newMap.forEach((state, buttonId) => {
        if (state === 'pending') {
          newMap.set(buttonId, 'persisted');
        }
        if (newMap.get(buttonId) === 'persisted') {
          persistedMap.set(buttonId, 'persisted');
        }
      });

      // Save to localStorage
      try {
        setSellerButtonStates(sellerId, persistedMap);
      } catch (error) {
        console.error('[useCallModeQuickButtonState] Failed to persist button states:', error);
      }

      return newMap;
    });
  }, [sellerId]);

  /**
   * Check if a button is disabled (pending or persisted)
   */
  const isButtonDisabled = useCallback(
    (buttonId: string): boolean => {
      return disabledButtons.has(buttonId);
    },
    [disabledButtons]
  );

  /**
   * Get the current state of a button
   */
  const getButtonState = useCallback(
    (buttonId: string): ButtonState | null => {
      return disabledButtons.get(buttonId) || null;
    },
    [disabledButtons]
  );

  return {
    disabledButtons,
    handleQuickButtonClick,
    handleSave,
    isButtonDisabled,
    getButtonState,
  };
}
