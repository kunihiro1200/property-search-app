/**
 * LocalStorage utility functions for call mode quick button state management
 * 
 * This module manages the persistent storage of quick button disabled states
 * for the call mode page. Unlike the buyer detail implementation, this supports
 * a two-stage disable process: pending (clicked but not saved) and persisted (saved).
 */

export interface CallModeButtonState {
  disabledAt: string; // ISO timestamp
  state: 'persisted';
}

export interface CallModeQuickButtonStorageData {
  [sellerId: string]: {
    [buttonId: string]: CallModeButtonState;
  };
}

const STORAGE_KEY = 'callModeQuickButtons';

// In-memory fallback for when localStorage is unavailable
let inMemoryStorage: CallModeQuickButtonStorageData = {};

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all data from storage
 */
function getAllData(): CallModeQuickButtonStorageData {
  if (!isLocalStorageAvailable()) {
    return inMemoryStorage;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored);
    
    // Validate data structure
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn('[callModeQuickButtonStorage] Invalid data format, returning empty object');
      return {};
    }

    return parsed;
  } catch (error) {
    console.error('[callModeQuickButtonStorage] Failed to load data:', error);
    return inMemoryStorage;
  }
}

/**
 * Save all data to storage
 */
function saveAllData(data: CallModeQuickButtonStorageData): void {
  if (!isLocalStorageAvailable()) {
    inMemoryStorage = data;
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('[callModeQuickButtonStorage] Storage quota exceeded, attempting cleanup');
      // Attempt to clean up old entries (keep only last 50 sellers)
      const allData = getAllData();
      const sellerIds = Object.keys(allData);
      if (sellerIds.length > 50) {
        const toKeep = sellerIds.slice(-50);
        const cleanedData: CallModeQuickButtonStorageData = {};
        toKeep.forEach(id => {
          cleanedData[id] = allData[id];
        });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedData));
          console.log('[callModeQuickButtonStorage] Cleaned up old entries');
        } catch (retryError) {
          console.error('[callModeQuickButtonStorage] Cleanup failed, falling back to memory:', retryError);
          inMemoryStorage = data;
        }
      } else {
        // If cleanup didn't help, fall back to memory
        inMemoryStorage = data;
      }
    } else {
      console.error('[callModeQuickButtonStorage] Failed to save data:', error);
      inMemoryStorage = data;
    }
  }
}

/**
 * Get button states for a specific seller
 * @param sellerId - Unique identifier for the seller
 * @returns Map of button IDs to their persisted state
 */
export function getSellerButtonStates(sellerId: string): Map<string, 'persisted'> {
  if (!sellerId) {
    console.warn('[callModeQuickButtonStorage] Invalid seller ID, returning empty map');
    return new Map();
  }

  const allData = getAllData();
  const sellerData = allData[sellerId];

  if (!sellerData) {
    return new Map();
  }

  const result = new Map<string, 'persisted'>();
  Object.entries(sellerData).forEach(([buttonId, state]) => {
    result.set(buttonId, state.state);
  });

  return result;
}

/**
 * Set button states for a specific seller
 * @param sellerId - Unique identifier for the seller
 * @param states - Map of button IDs to their persisted state
 */
export function setSellerButtonStates(
  sellerId: string,
  states: Map<string, 'persisted'>
): void {
  if (!sellerId) {
    console.warn('[callModeQuickButtonStorage] Invalid seller ID, cannot save states');
    return;
  }

  const allData = getAllData();
  const sellerData: { [buttonId: string]: CallModeButtonState } = {};

  states.forEach((state, buttonId) => {
    sellerData[buttonId] = {
      disabledAt: new Date().toISOString(),
      state: 'persisted',
    };
  });

  allData[sellerId] = sellerData;
  saveAllData(allData);
}

/**
 * Set a single button state for a specific seller
 * @param sellerId - Unique identifier for the seller
 * @param buttonId - Unique identifier for the button
 */
export function setButtonState(sellerId: string, buttonId: string): void {
  if (!sellerId || !buttonId) {
    console.warn('[callModeQuickButtonStorage] Invalid seller ID or button ID, cannot save state');
    return;
  }

  const allData = getAllData();
  
  if (!allData[sellerId]) {
    allData[sellerId] = {};
  }

  allData[sellerId][buttonId] = {
    disabledAt: new Date().toISOString(),
    state: 'persisted',
  };

  saveAllData(allData);
}

/**
 * Remove a single button state for a specific seller
 * @param sellerId - Unique identifier for the seller
 * @param buttonId - Unique identifier for the button
 */
export function removeButtonState(sellerId: string, buttonId: string): void {
  if (!sellerId || !buttonId) {
    console.warn('[callModeQuickButtonStorage] Invalid seller ID or button ID, cannot remove state');
    return;
  }

  const allData = getAllData();
  
  if (allData[sellerId]) {
    delete allData[sellerId][buttonId];
    
    // Clean up empty seller entries
    if (Object.keys(allData[sellerId]).length === 0) {
      delete allData[sellerId];
    }
    
    saveAllData(allData);
  }
}

/**
 * Clear all button states for a specific seller
 * @param sellerId - Unique identifier for the seller
 */
export function clearSellerStates(sellerId: string): void {
  if (!sellerId) {
    console.warn('[callModeQuickButtonStorage] Invalid seller ID, cannot clear states');
    return;
  }

  const allData = getAllData();
  delete allData[sellerId];
  saveAllData(allData);
}

/**
 * Clear all data from storage
 */
export function clearAll(): void {
  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[callModeQuickButtonStorage] Failed to clear storage:', error);
    }
  }
  inMemoryStorage = {};
}

/**
 * Export for testing purposes
 */
export const _testing = {
  STORAGE_KEY,
  isLocalStorageAvailable,
  getAllData,
  saveAllData,
};
