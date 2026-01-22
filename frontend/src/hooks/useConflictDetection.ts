import { useState, useCallback, useRef } from 'react';
import { checkForConflict, getFieldTimestamp, ConflictInfo } from '../services/conflictDetectionService';

export interface UseConflictDetectionReturn {
  hasConflict: boolean;
  conflictInfo: ConflictInfo | null;
  checkConflict: (buyerId: string, fieldName: string, value: any) => Promise<boolean>;
  clearConflict: () => void;
  updateTimestamp: (buyerId: string, fieldName: string) => Promise<void>;
}

/**
 * Hook for detecting and managing edit conflicts
 * 
 * Tracks field timestamps and checks for concurrent edits before saving
 */
export function useConflictDetection(): UseConflictDetectionReturn {
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  
  // Store field timestamps for conflict detection
  const fieldTimestamps = useRef<Map<string, Date>>(new Map());

  /**
   * Update the stored timestamp for a field
   */
  const updateTimestamp = useCallback(async (buyerId: string, fieldName: string) => {
    const key = `${buyerId}:${fieldName}`;
    const timestamp = await getFieldTimestamp(buyerId, fieldName);
    fieldTimestamps.current.set(key, timestamp);
  }, []);

  /**
   * Check if there's a conflict before saving
   * 
   * @returns true if conflict detected, false otherwise
   */
  const checkConflict = useCallback(async (
    buyerId: string,
    fieldName: string,
    value: any
  ): Promise<boolean> => {
    const key = `${buyerId}:${fieldName}`;
    const lastKnownTimestamp = fieldTimestamps.current.get(key);

    if (!lastKnownTimestamp) {
      // No timestamp stored, fetch it now
      await updateTimestamp(buyerId, fieldName);
      return false;
    }

    const result = await checkForConflict(
      buyerId,
      fieldName,
      lastKnownTimestamp,
      value
    );

    if (result.hasConflict && result.conflict) {
      setHasConflict(true);
      setConflictInfo(result.conflict);
      return true;
    }

    return false;
  }, [updateTimestamp]);

  /**
   * Clear conflict state
   */
  const clearConflict = useCallback(() => {
    setHasConflict(false);
    setConflictInfo(null);
  }, []);

  return {
    hasConflict,
    conflictInfo,
    checkConflict,
    clearConflict,
    updateTimestamp,
  };
}
