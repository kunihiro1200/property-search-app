/**
 * Property Type Utilities
 * 
 * Handles conversion between abbreviated and full property type names
 */

// Mapping from abbreviated Japanese to full Japanese names
export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  // Abbreviated forms (from spreadsheet)
  '戸': '戸建て',
  'マ': 'マンション',
  '土': '土地',
  '収': '収益物件',
  
  // English forms (legacy)
  'detached_house': '戸建て',
  'apartment': 'マンション',
  'land': '土地',
  'income': '収益物件',
  'commercial': '商業用',
  
  // Full Japanese forms (for compatibility)
  '戸建': '戸建て',
  '戸建て': '戸建て',
  'マンション': 'マンション',
  '土地': '土地',
  '収益物件': '収益物件',
  '商業用': '商業用',
};

/**
 * Convert property type to display label
 * Handles abbreviated forms, English forms, and full Japanese forms
 */
export function getPropertyTypeLabel(propertyType: string | null | undefined): string {
  if (!propertyType) {
    return '未設定';
  }
  
  return PROPERTY_TYPE_LABELS[propertyType] || propertyType;
}

/**
 * Convert display label back to abbreviated form for database storage
 */
export function getPropertyTypeValue(label: string): string {
  const reverseMap: Record<string, string> = {
    '戸建て': '戸',
    'マンション': 'マ',
    '土地': '土',
    '収益物件': '収',
    '商業用': 'commercial',
  };
  
  return reverseMap[label] || label;
}

/**
 * Check if property type is apartment/mansion
 */
export function isApartment(propertyType: string | null | undefined): boolean {
  if (!propertyType) return false;
  return propertyType === 'マ' || propertyType === 'apartment' || propertyType === 'マンション';
}

/**
 * Check if property type is detached house
 */
export function isDetachedHouse(propertyType: string | null | undefined): boolean {
  if (!propertyType) return false;
  return propertyType === '戸' || propertyType === 'detached_house' || propertyType === '戸建' || propertyType === '戸建て';
}

/**
 * Check if property type is land
 */
export function isLand(propertyType: string | null | undefined): boolean {
  if (!propertyType) return false;
  return propertyType === '土' || propertyType === 'land' || propertyType === '土地';
}

/**
 * Check if property type is income property
 */
export function isIncome(propertyType: string | null | undefined): boolean {
  if (!propertyType) return false;
  return propertyType === '収' || propertyType === 'income' || propertyType === '収益物件';
}
