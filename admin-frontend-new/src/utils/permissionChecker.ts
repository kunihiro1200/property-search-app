/**
 * Permission checking utilities for inline editing
 */

import { FieldPermissions, getFieldMetadata } from '../types/fieldPermissions';

/**
 * Check if a user has permission to edit a specific field
 * This can be extended to include role-based checks
 */
export function checkFieldPermission(
  fieldName: string,
  userRole?: string
): FieldPermissions {
  const metadata = getFieldMetadata(fieldName);
  
  if (!metadata) {
    // Unknown field - default to editable
    return { canEdit: true };
  }

  // Check if field is system-managed (always read-only)
  if (metadata.readOnly) {
    return metadata.permissions;
  }

  // Future: Add role-based permission checks here
  // For example:
  // if (userRole === 'viewer') {
  //   return { canEdit: false, reason: '閲覧権限のみです' };
  // }

  return metadata.permissions;
}

/**
 * Check if any field in a list is editable
 */
export function hasEditableFields(fieldNames: string[]): boolean {
  return fieldNames.some(fieldName => {
    const permission = checkFieldPermission(fieldName);
    return permission.canEdit;
  });
}

/**
 * Filter fields to only include editable ones
 */
export function getEditableFields(fieldNames: string[]): string[] {
  return fieldNames.filter(fieldName => {
    const permission = checkFieldPermission(fieldName);
    return permission.canEdit;
  });
}

/**
 * Get all read-only fields from a list
 */
export function getReadOnlyFields(fieldNames: string[]): string[] {
  return fieldNames.filter(fieldName => {
    const permission = checkFieldPermission(fieldName);
    return !permission.canEdit;
  });
}

/**
 * Validate that a field can be edited before attempting save
 * Throws an error if field is read-only
 */
export function validateEditPermission(fieldName: string): void {
  const permission = checkFieldPermission(fieldName);
  
  if (!permission.canEdit) {
    throw new Error(
      `フィールド "${fieldName}" は編集できません: ${permission.reason || '権限がありません'}`
    );
  }
}

/**
 * Get a user-friendly message for why a field is read-only
 */
export function getReadOnlyMessage(fieldName: string): string {
  const permission = checkFieldPermission(fieldName);
  
  if (permission.canEdit) {
    return '';
  }
  
  return permission.reason || 'このフィールドは編集できません';
}
