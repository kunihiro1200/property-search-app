import { Request, Response, NextFunction } from 'express';

/**
 * UUID v4 validation regex pattern
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Buyer number format validation regex pattern
 * Supports:
 * - Numeric format: "6647", "6648"
 * - BY_ prefix format: "BY_R1UikR1lpuf7x2" (from spreadsheet column 5)
 */
const BUYER_NUMBER_REGEX = /^(\d+|BY_[A-Za-z0-9_]+)$/;

/**
 * Validates if a string is a valid UUID v4
 * @param value - The string to validate
 * @returns true if valid UUID v4, false otherwise
 */
export function validateUUID(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_V4_REGEX.test(value.trim());
}

/**
 * Validates if a string is a valid buyer number
 * @param value - The string to validate
 * @returns true if valid buyer number, false otherwise
 */
export function validateBuyerNumber(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return BUYER_NUMBER_REGEX.test(value.trim());
}

/**
 * Validates if a string is either a valid UUID or buyer number
 * @param value - The string to validate
 * @returns true if valid UUID or buyer number, false otherwise
 */
export function validateBuyerId(value: string): boolean {
  return validateUUID(value) || validateBuyerNumber(value);
}

/**
 * Express middleware to validate UUID or buyer number in route parameters
 * @param paramName - The name of the parameter to validate (default: 'id')
 * @returns Express middleware function
 */
export function uuidValidationMiddleware(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName];

    if (!value) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Missing required parameter: ${paramName}`,
        code: 'MISSING_PARAMETER'
      });
    }

    if (!validateBuyerId(value)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid ${paramName} format. Expected UUID or buyer number.`,
        code: 'INVALID_FORMAT',
        details: {
          received: value,
          expected: 'UUID v4 format (e.g., 123e4567-e89b-12d3-a456-426614174000) or buyer number (e.g., 6647)'
        }
      });
    }

    next();
  };
}

/**
 * Express middleware to validate multiple UUID or buyer number parameters
 * @param paramNames - Array of parameter names to validate
 * @returns Express middleware function
 */
export function multiUuidValidationMiddleware(paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const invalidParams: string[] = [];

    for (const paramName of paramNames) {
      const value = req.params[paramName];
      
      if (!value) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `Missing required parameter: ${paramName}`,
          code: 'MISSING_PARAMETER'
        });
      }

      if (!validateBuyerId(value)) {
        invalidParams.push(paramName);
      }
    }

    if (invalidParams.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid format for parameters: ${invalidParams.join(', ')}`,
        code: 'INVALID_FORMAT',
        details: {
          invalidParameters: invalidParams,
          expected: 'UUID v4 format or buyer number'
        }
      });
    }

    next();
  };
}
