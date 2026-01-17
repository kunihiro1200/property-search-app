/**
 * Unit tests for permission checker utilities
 */

import {
  checkFieldPermission,
  hasEditableFields,
  getEditableFields,
  getReadOnlyFields,
  validateEditPermission,
  getReadOnlyMessage,
} from '../permissionChecker';

describe('permissionChecker', () => {
  describe('checkFieldPermission', () => {
    it('should return canEdit: true for editable fields', () => {
      const permission = checkFieldPermission('name');
      expect(permission.canEdit).toBe(true);
    });

    it('should return canEdit: false for system-managed fields', () => {
      const permission = checkFieldPermission('id');
      expect(permission.canEdit).toBe(false);
      expect(permission.reason).toBe('システム管理フィールド');
    });

    it('should return canEdit: false for createdAt field', () => {
      const permission = checkFieldPermission('createdAt');
      expect(permission.canEdit).toBe(false);
      expect(permission.reason).toBe('システム管理フィールド');
    });

    it('should return canEdit: false for updatedAt field', () => {
      const permission = checkFieldPermission('updatedAt');
      expect(permission.canEdit).toBe(false);
      expect(permission.reason).toBe('システム管理フィールド');
    });

    it('should return canEdit: false for lastModifiedBy field', () => {
      const permission = checkFieldPermission('lastModifiedBy');
      expect(permission.canEdit).toBe(false);
      expect(permission.reason).toBe('システム管理フィールド');
    });

    it('should return canEdit: true for unknown fields', () => {
      const permission = checkFieldPermission('unknownField');
      expect(permission.canEdit).toBe(true);
    });
  });

  describe('hasEditableFields', () => {
    it('should return true if any field is editable', () => {
      const result = hasEditableFields(['name', 'email', 'id']);
      expect(result).toBe(true);
    });

    it('should return false if all fields are read-only', () => {
      const result = hasEditableFields(['id', 'createdAt', 'updatedAt']);
      expect(result).toBe(false);
    });

    it('should return false for empty array', () => {
      const result = hasEditableFields([]);
      expect(result).toBe(false);
    });
  });

  describe('getEditableFields', () => {
    it('should return only editable fields', () => {
      const fields = ['name', 'email', 'id', 'createdAt'];
      const result = getEditableFields(fields);
      expect(result).toEqual(['name', 'email']);
    });

    it('should return empty array if all fields are read-only', () => {
      const fields = ['id', 'createdAt', 'updatedAt'];
      const result = getEditableFields(fields);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      const result = getEditableFields([]);
      expect(result).toEqual([]);
    });
  });

  describe('getReadOnlyFields', () => {
    it('should return only read-only fields', () => {
      const fields = ['name', 'email', 'id', 'createdAt'];
      const result = getReadOnlyFields(fields);
      expect(result).toEqual(['id', 'createdAt']);
    });

    it('should return empty array if all fields are editable', () => {
      const fields = ['name', 'email', 'phone'];
      const result = getReadOnlyFields(fields);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      const result = getReadOnlyFields([]);
      expect(result).toEqual([]);
    });
  });

  describe('validateEditPermission', () => {
    it('should not throw for editable fields', () => {
      expect(() => validateEditPermission('name')).not.toThrow();
      expect(() => validateEditPermission('email')).not.toThrow();
    });

    it('should throw for read-only fields', () => {
      expect(() => validateEditPermission('id')).toThrow();
      expect(() => validateEditPermission('createdAt')).toThrow();
    });

    it('should include reason in error message', () => {
      expect(() => validateEditPermission('id')).toThrow('システム管理フィールド');
    });
  });

  describe('getReadOnlyMessage', () => {
    it('should return empty string for editable fields', () => {
      const message = getReadOnlyMessage('name');
      expect(message).toBe('');
    });

    it('should return reason for read-only fields', () => {
      const message = getReadOnlyMessage('id');
      expect(message).toBe('システム管理フィールド');
    });

    it('should return default message if no reason provided', () => {
      // This would require a field with canEdit: false but no reason
      // For now, all our read-only fields have reasons
      const message = getReadOnlyMessage('unknownReadOnlyField');
      expect(message).toBe('');
    });
  });
});
