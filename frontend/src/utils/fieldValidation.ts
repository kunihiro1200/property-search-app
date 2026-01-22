/**
 * Field validation utilities for inline editing
 * Provides validation functions for different field types
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max';
  value?: any;
  message: string;
}

/**
 * Email validation regex pattern
 * Validates standard email format: user@domain.tld
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone validation regex pattern
 * Supports various formats: (123) 456-7890, 123-456-7890, 1234567890, +1-123-456-7890
 */
const PHONE_PATTERN = /^[\d\s\-\(\)\+]+$/;

/**
 * Validates an email address
 * Empty values are allowed (not required)
 */
export function validateEmail(value: string): ValidationResult {
  // 空の値は有効とする（必須ではない）
  if (!value || value.trim() === '') {
    return { isValid: true };
  }

  // 値がある場合のみ形式チェックを実行
  if (!EMAIL_PATTERN.test(value.trim())) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  return { isValid: true };
}

/**
 * Validates a phone number
 * Empty values are allowed (not required)
 */
export function validatePhone(value: string): ValidationResult {
  // 空の値は有効とする（必須ではない）
  if (!value || value.trim() === '') {
    return { isValid: true };
  }

  const cleanedValue = value.trim();
  
  // 値がある場合のみ形式チェックを実行
  if (!PHONE_PATTERN.test(cleanedValue)) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number'
    };
  }

  // Check minimum length (at least 10 digits)
  const digitsOnly = cleanedValue.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      error: 'Phone number must contain at least 10 digits'
    };
  }

  return { isValid: true };
}

/**
 * Validates a required field
 */
export function validateRequired(value: any): ValidationResult {
  if (value === null || value === undefined) {
    return {
      isValid: false,
      error: 'This field is required'
    };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return {
      isValid: false,
      error: 'This field is required'
    };
  }

  if (Array.isArray(value) && value.length === 0) {
    return {
      isValid: false,
      error: 'This field is required'
    };
  }

  return { isValid: true };
}

/**
 * Validates minimum length
 */
export function validateMinLength(value: string, minLength: number): ValidationResult {
  if (!value) {
    return { isValid: true }; // Let required validation handle empty values
  }

  if (value.length < minLength) {
    return {
      isValid: false,
      error: `Must be at least ${minLength} characters`
    };
  }

  return { isValid: true };
}

/**
 * Validates maximum length
 */
export function validateMaxLength(value: string, maxLength: number): ValidationResult {
  if (!value) {
    return { isValid: true };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `Must be no more than ${maxLength} characters`
    };
  }

  return { isValid: true };
}

/**
 * Validates against a custom pattern
 */
export function validatePattern(value: string, pattern: RegExp, message: string): ValidationResult {
  if (!value) {
    return { isValid: true };
  }

  if (!pattern.test(value)) {
    return {
      isValid: false,
      error: message
    };
  }

  return { isValid: true };
}

/**
 * Validates minimum numeric value
 */
export function validateMin(value: number, min: number): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true };
  }

  if (value < min) {
    return {
      isValid: false,
      error: `Must be at least ${min}`
    };
  }

  return { isValid: true };
}

/**
 * Validates maximum numeric value
 */
export function validateMax(value: number, max: number): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true };
  }

  if (value > max) {
    return {
      isValid: false,
      error: `Must be no more than ${max}`
    };
  }

  return { isValid: true };
}

/**
 * Validates a field based on multiple validation rules
 */
export function validateField(value: any, rules: ValidationRule[]): ValidationResult {
  for (const rule of rules) {
    let result: ValidationResult;

    switch (rule.type) {
      case 'required':
        result = validateRequired(value);
        break;
      case 'email':
        result = validateEmail(value);
        break;
      case 'phone':
        result = validatePhone(value);
        break;
      case 'minLength':
        result = validateMinLength(value, rule.value);
        break;
      case 'maxLength':
        result = validateMaxLength(value, rule.value);
        break;
      case 'pattern':
        result = validatePattern(value, rule.value, rule.message);
        break;
      case 'min':
        result = validateMin(value, rule.value);
        break;
      case 'max':
        result = validateMax(value, rule.value);
        break;
      default:
        result = { isValid: true };
    }

    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
}

/**
 * Gets validation rules for a specific field type
 * Note: Required validation has been removed - all fields are optional
 */
export function getValidationRulesForFieldType(
  fieldType: string,
  fieldName: string
): ValidationRule[] {
  const rules: ValidationRule[] = [];

  switch (fieldType) {
    case 'email':
      // 形式バリデーションのみ（空の場合はスキップされる）
      rules.push({
        type: 'email',
        message: 'Please enter a valid email address'
      });
      break;

    case 'phone':
      // 形式バリデーションのみ（空の場合はスキップされる）
      rules.push({
        type: 'phone',
        message: 'Please enter a valid phone number'
      });
      break;

    case 'text':
      // nameフィールドの必須・最小文字数バリデーションを削除
      // すべてのテキストフィールドは任意入力
      break;

    case 'number':
      // Budget fields should be positive
      if (fieldName === 'budget') {
        rules.push({
          type: 'min',
          value: 0,
          message: 'Budget must be a positive number'
        });
      }
      break;

    case 'textarea':
      // Limit textarea length
      rules.push({
        type: 'maxLength',
        value: 5000,
        message: 'Text must be no more than 5000 characters'
      });
      break;
  }

  return rules;
}
