import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ValidationRule, validateField } from '../utils/fieldValidation';
import { validateEditPermission } from '../utils/permissionChecker';
import { ConflictInfo } from '../services/conflictDetectionService';
import api from '../services/api';

export interface UseInlineEditReturn<T = any> {
  isEditing: boolean;
  editValue: T;
  error: string | null;
  isSaving: boolean;
  saveSuccess: boolean;
  hasConflict: boolean;
  conflictInfo: ConflictInfo | null;
  startEdit: () => void;
  cancelEdit: () => void;
  updateValue: (value: T) => void;
  saveValue: () => Promise<void>;
  resolveConflict: (resolution: 'keep-mine' | 'keep-theirs') => Promise<void>;
  clearConflict: () => void;
}

export interface UseInlineEditOptions<T = any> {
  initialValue: T;
  onSave: (value: T) => Promise<void>;
  validation?: (value: T) => string | null;
  validationRules?: ValidationRule[];
  autoSaveDelay?: number; // Debounce delay in milliseconds (default: 300)
  enableOptimisticUpdate?: boolean; // Enable optimistic UI updates (default: true)
  fieldName?: string; // Field name for permission checking
  buyerId?: string; // Buyer ID for conflict detection
  enableConflictDetection?: boolean; // Enable conflict detection (default: true)
  onConflictDetected?: (conflict: ConflictInfo) => void; // Callback when conflict is detected
}

/**
 * Custom hook for managing inline edit state
 * 
 * Provides edit mode activation/deactivation, value tracking,
 * validation, auto-save functionality with debouncing, optimistic updates,
 * and conflict detection for concurrent edits.
 * 
 * @param options - Configuration options
 * @returns Edit state and control functions
 */
export function useInlineEdit<T = any>(
  options: UseInlineEditOptions<T>
): UseInlineEditReturn<T> {
  const { 
    initialValue, 
    onSave, 
    validation, 
    validationRules,
    enableOptimisticUpdate = true,
    fieldName,
    buyerId,
    enableConflictDetection = true,
    onConflictDetected,
  } = options;

  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);

  // Store original value to restore on cancel
  const originalValueRef = useRef<T>(initialValue);

  // Sync editValue with initialValue when not editing
  // This ensures the displayed value updates when parent state changes (e.g., quick input buttons)
  useEffect(() => {
    if (!isEditing && !isSaving) {
      setEditValue(initialValue);
      originalValueRef.current = initialValue;
    }
  }, [initialValue, isEditing, isSaving]);
  
  // Store field timestamp for conflict detection
  const fieldTimestampRef = useRef<Date>(new Date());
  
  // Debounce timer for auto-save
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Abort controller for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending save timers
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Abort any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Activate edit mode
   * Stores the current value as the original value for potential restoration
   * Records the current timestamp for conflict detection
   * Memoized to prevent unnecessary function recreations
   */
  const startEdit = useCallback(() => {
    originalValueRef.current = editValue;
    fieldTimestampRef.current = new Date();
    setIsEditing(true);
    setError(null);
    setSaveSuccess(false);
    setHasConflict(false);
    setConflictInfo(null);
  }, [editValue]);

  /**
   * Cancel edit and restore original value
   * Deactivates edit mode and clears any errors and conflicts
   * Cancels any pending save operations
   * Memoized to prevent unnecessary function recreations
   */
  const cancelEdit = useCallback(() => {
    // Clear pending save timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    
    // Abort in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setEditValue(originalValueRef.current);
    setIsEditing(false);
    setError(null);
    setSaveSuccess(false);
    setIsSaving(false);
    setHasConflict(false);
    setConflictInfo(null);
  }, []);

  /**
   * Update the edit value
   * Clears any existing errors when value changes
   * Memoized to prevent unnecessary function recreations
   */
  const updateValue = useCallback((value: T) => {
    setEditValue(value);
    setError(null);
    setSaveSuccess(false);
  }, []);

  /**
   * Save the current edit value
   * Validates the value, checks for conflicts, calls the onSave callback, and handles errors
   * Implements optimistic updates and request cancellation
   * Checks field permissions before saving
   */
  const saveValue = useCallback(async () => {
    // Clear any pending save timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    // Check field permissions if fieldName is provided
    if (fieldName) {
      try {
        validateEditPermission(fieldName);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Permission denied';
        setError(errorMessage);
        return;
      }
    }

    // Validate using validation rules if provided
    if (validationRules && validationRules.length > 0) {
      const validationResult = validateField(editValue, validationRules);
      if (!validationResult.isValid) {
        setError(validationResult.error || 'Validation failed');
        return;
      }
    }

    // Validate using custom validation function if provided
    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // Check for conflicts if enabled
    if (enableConflictDetection && buyerId && fieldName) {
      try {
        const response = await api.get(
          `/api/buyers/${buyerId}/conflict-check`,
          {
            params: {
              field: fieldName,
              timestamp: fieldTimestampRef.current.toISOString()
            }
          }
        );

        const data = response.data;
        
        if (data.hasConflict) {
          const conflict: ConflictInfo = {
            conflictingValue: data.conflictingValue,
            conflictingUser: data.conflictingUser,
            conflictingTimestamp: new Date(data.conflictingTimestamp),
            currentValue: editValue,
          };
          
          setHasConflict(true);
          setConflictInfo(conflict);
          
          // Call conflict callback if provided
          if (onConflictDetected) {
            onConflictDetected(conflict);
          }
          
          return; // Stop save operation
        }
      } catch (err) {
        console.error('Error checking for conflicts:', err);
        // Continue with save if conflict check fails
      }
    }

    // Abort any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Perform save operation
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    // Optimistic update: assume success and update original value
    if (enableOptimisticUpdate) {
      originalValueRef.current = editValue;
    }

    try {
      await onSave(editValue);
      
      // Update original value after successful save (if not already done optimistically)
      if (!enableOptimisticUpdate) {
        originalValueRef.current = editValue;
      }
      
      // Update timestamp after successful save
      fieldTimestampRef.current = new Date();
      
      setIsEditing(false);
      setSaveSuccess(true);
      
      // Clear success indicator after 2 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      // Revert optimistic update on error
      if (enableOptimisticUpdate) {
        setEditValue(originalValueRef.current);
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
      abortControllerRef.current = null;
    }
  }, [editValue, onSave, validation, validationRules, enableOptimisticUpdate, fieldName, buyerId, enableConflictDetection, onConflictDetected]);

  /**
   * Resolve a detected conflict
   * 
   * @param resolution - 'keep-mine' to keep user's changes, 'keep-theirs' to keep conflicting changes
   */
  const resolveConflict = useCallback(async (resolution: 'keep-mine' | 'keep-theirs') => {
    if (!conflictInfo) {
      return;
    }

    if (resolution === 'keep-theirs') {
      // Update to the conflicting value
      setEditValue(conflictInfo.conflictingValue as T);
      originalValueRef.current = conflictInfo.conflictingValue as T;
      fieldTimestampRef.current = conflictInfo.conflictingTimestamp;
    }
    // If 'keep-mine', we keep the current editValue

    // Clear conflict state
    setHasConflict(false);
    setConflictInfo(null);

    // Save the resolved value
    if (resolution === 'keep-mine') {
      // Force save without conflict check
      try {
        await saveValue();
      } catch (err) {
        console.error('Error saving resolved conflict:', err);
      }
    } else {
      // For 'keep-theirs', just close edit mode
      setIsEditing(false);
    }
  }, [conflictInfo, saveValue, enableConflictDetection]);

  /**
   * Clear conflict state
   * Memoized to prevent unnecessary function recreations
   */
  const clearConflict = useCallback(() => {
    setHasConflict(false);
    setConflictInfo(null);
  }, []);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    isEditing,
    editValue,
    error,
    isSaving,
    saveSuccess,
    hasConflict,
    conflictInfo,
    startEdit,
    cancelEdit,
    updateValue,
    saveValue,
    resolveConflict,
    clearConflict,
  }), [
    isEditing,
    editValue,
    error,
    isSaving,
    saveSuccess,
    hasConflict,
    conflictInfo,
    startEdit,
    cancelEdit,
    updateValue,
    saveValue,
    resolveConflict,
    clearConflict,
  ]);
}
