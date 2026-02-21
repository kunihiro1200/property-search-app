/**
 * LocalStorage utility functions for quick button state management
 */

export interface QuickButtonStates {
  [buttonLabel: string]: boolean;
}

const STORAGE_KEY_PREFIX = 'buyer_';
const STORAGE_KEY_SUFFIX = '_quick_buttons';

/**
 * Generate storage key for a buyer's button states
 */
function getStorageKey(buyerId: string): string {
  return `${STORAGE_KEY_PREFIX}${buyerId}${STORAGE_KEY_SUFFIX}`;
}

/**
 * Save a button state to localStorage
 * @param buyerId - Unique identifier for the buyer
 * @param buttonLabel - Label of the button to save state for
 * @param disabled - Whether the button is disabled
 * @throws Error if localStorage operation fails
 */
export function saveButtonState(
  buyerId: string,
  buttonLabel: string,
  disabled: boolean
): void {
  if (!buyerId) {
    throw new Error('Invalid buyer ID: cannot save button state');
  }

  const key = getStorageKey(buyerId);
  
  try {
    // Get existing states
    const existingStates = getButtonStates(buyerId);
    
    // Update with new state
    const updatedStates = {
      ...existingStates,
      [buttonLabel]: disabled,
    };
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(updatedStates));
  } catch (error) {
    // Re-throw with more context
    throw new Error(`Failed to save button state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all button states for a buyer from localStorage
 * @param buyerId - Unique identifier for the buyer
 * @returns Object containing button states, or empty object if not found
 */
export function getButtonStates(buyerId: string): QuickButtonStates {
  if (!buyerId) {
    console.warn('Invalid buyer ID: returning empty button states');
    return {};
  }

  const key = getStorageKey(buyerId);
  
  try {
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return {};
    }
    
    const parsed = JSON.parse(stored);
    
    // Validate that parsed data is an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn('Invalid button states data format, returning empty object');
      return {};
    }
    
    return parsed;
  } catch (error) {
    console.warn('Failed to load button states from localStorage:', error);
    return {};
  }
}

/**
 * Clear all button states for a buyer from localStorage
 * @param buyerId - Unique identifier for the buyer
 */
export function clearButtonStates(buyerId: string): void {
  if (!buyerId) {
    console.warn('Invalid buyer ID: cannot clear button states');
    return;
  }

  const key = getStorageKey(buyerId);
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear button states from localStorage:', error);
  }
}

/**
 * Check if localStorage is available
 * @returns true if localStorage is available, false otherwise
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}
