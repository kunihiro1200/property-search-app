/**
 * Field permissions configuration
 * Defines which fields can be edited and why they might be read-only
 */

export interface FieldPermissions {
  canEdit: boolean;
  reason?: string; // Why field is read-only (e.g., "System-managed field", "Requires admin role")
}

export interface FieldMetadata {
  name: string;
  type: FieldType;
  readOnly: boolean;
  validation?: ValidationRule[];
  permissions: FieldPermissions;
  label: string;
  placeholder?: string;
}

export type FieldType = 'text' | 'email' | 'phone' | 'date' | 'dropdown' | 'textarea' | 'number';

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'pattern';
  value?: any;
  message: string;
}

/**
 * Cache for field metadata lookups
 * Improves performance by avoiding repeated object lookups
 */
const fieldMetadataCache = new Map<string, FieldMetadata | undefined>();

/**
 * Clear the field metadata cache
 * Useful for testing or when field configuration changes
 */
export function clearFieldMetadataCache(): void {
  fieldMetadataCache.clear();
}

/**
 * Field permission configuration for buyer detail fields
 */
export const BUYER_FIELD_PERMISSIONS: Record<string, FieldMetadata> = {
  // Basic Info Section
  name: {
    name: 'name',
    type: 'text',
    readOnly: false,
    permissions: { canEdit: true },
    label: '名前',
    validation: [
      { type: 'required', message: '名前は必須です' },
      { type: 'maxLength', value: 100, message: '名前は100文字以内で入力してください' }
    ]
  },
  email: {
    name: 'email',
    type: 'email',
    readOnly: false,
    permissions: { canEdit: true },
    label: 'メールアドレス',
    validation: [
      { type: 'email', message: '有効なメールアドレスを入力してください' }
    ]
  },
  phone: {
    name: 'phone',
    type: 'phone',
    readOnly: false,
    permissions: { canEdit: true },
    label: '電話番号',
    validation: [
      { type: 'phone', message: '有効な電話番号を入力してください' }
    ]
  },
  address: {
    name: 'address',
    type: 'text',
    readOnly: false,
    permissions: { canEdit: true },
    label: '住所',
    validation: [
      { type: 'maxLength', value: 200, message: '住所は200文字以内で入力してください' }
    ]
  },
  budget: {
    name: 'budget',
    type: 'number',
    readOnly: false,
    permissions: { canEdit: true },
    label: '予算',
    placeholder: '例: 50000000'
  },
  propertyType: {
    name: 'propertyType',
    type: 'dropdown',
    readOnly: false,
    permissions: { canEdit: true },
    label: '物件タイプ'
  },
  preferredAreas: {
    name: 'preferredAreas',
    type: 'dropdown',
    readOnly: false,
    permissions: { canEdit: true },
    label: '希望エリア'
  },
  inquirySource: {
    name: 'inquirySource',
    type: 'dropdown',
    readOnly: false,
    permissions: { canEdit: true },
    label: '問い合わせ元'
  },
  
  // Viewing Info Section
  viewingNotes: {
    name: 'viewingNotes',
    type: 'textarea',
    readOnly: false,
    permissions: { canEdit: true },
    label: '内見メモ',
    placeholder: '内見時の詳細や印象を記録...'
  },
  viewingDates: {
    name: 'viewingDates',
    type: 'date',
    readOnly: false,
    permissions: { canEdit: true },
    label: '内見日'
  },
  viewingStatus: {
    name: 'viewingStatus',
    type: 'dropdown',
    readOnly: false,
    permissions: { canEdit: true },
    label: '内見ステータス'
  },
  latestStatus: {
    name: 'latestStatus',
    type: 'dropdown',
    readOnly: false,
    permissions: { canEdit: true },
    label: '最新ステータス'
  },
  
  // System-managed fields (read-only)
  id: {
    name: 'id',
    type: 'text',
    readOnly: true,
    permissions: { 
      canEdit: false, 
      reason: 'システム管理フィールド' 
    },
    label: 'ID'
  },
  createdAt: {
    name: 'createdAt',
    type: 'date',
    readOnly: true,
    permissions: { 
      canEdit: false, 
      reason: 'システム管理フィールド' 
    },
    label: '作成日時'
  },
  updatedAt: {
    name: 'updatedAt',
    type: 'date',
    readOnly: true,
    permissions: { 
      canEdit: false, 
      reason: 'システム管理フィールド' 
    },
    label: '更新日時'
  },
  lastModifiedBy: {
    name: 'lastModifiedBy',
    type: 'text',
    readOnly: true,
    permissions: { 
      canEdit: false, 
      reason: 'システム管理フィールド' 
    },
    label: '最終更新者'
  }
};

/**
 * Check if a field can be edited based on permissions
 */
export function canEditField(fieldName: string): boolean {
  const metadata = BUYER_FIELD_PERMISSIONS[fieldName];
  return metadata ? metadata.permissions.canEdit : false;
}

/**
 * Get the reason why a field is read-only
 */
export function getReadOnlyReason(fieldName: string): string | undefined {
  const metadata = BUYER_FIELD_PERMISSIONS[fieldName];
  return metadata?.permissions.reason;
}

/**
 * Get field metadata by field name
 * Uses caching to improve performance for repeated lookups
 */
export function getFieldMetadata(fieldName: string): FieldMetadata | undefined {
  // Check cache first
  if (fieldMetadataCache.has(fieldName)) {
    return fieldMetadataCache.get(fieldName);
  }
  
  // Lookup metadata
  const metadata = BUYER_FIELD_PERMISSIONS[fieldName];
  
  // Cache the result (including undefined for non-existent fields)
  fieldMetadataCache.set(fieldName, metadata);
  
  return metadata;
}
