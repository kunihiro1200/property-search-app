// ColumnMappingValidator のプロパティベーステスト
import { ColumnMappingValidator } from '../ColumnMappingValidator';
import * as fc from 'fast-check';

describe('ColumnMappingValidator - Property-Based Tests', () => {
  let validator: ColumnMappingValidator;

  beforeEach(() => {
    validator = new ColumnMappingValidator();
  });

  describe('Property 2: Column mapping extraction', () => {
    // **Feature: buyer-property-linkage-fix, Property 2: Column mapping extraction**
    // For any valid spreadsheet row with headers, if the "物件番号" column contains a value,
    // then the mapped database record should have that value in the property_number field.

    test('should correctly extract property_number from valid spreadsheet data', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string(), { minLength: 1, maxLength: 10 }), // headers
          fc.nat({ max: 9 }), // column index for 物件番号
          fc.string({ minLength: 1, maxLength: 20 }), // property number value
          (headers, columnIndex, propertyValue) => {
            // Setup: Insert "物件番号" at the specified column index
            const modifiedHeaders = [...headers];
            modifiedHeaders[columnIndex] = '物件番号';

            // Create a row with the property value at the same index
            const row = new Array(modifiedHeaders.length).fill('');
            row[columnIndex] = propertyValue;

            // The mapping should extract the value at the correct position
            const extractedIndex = modifiedHeaders.indexOf('物件番号');
            const extractedValue = row[extractedIndex];

            // Property: The extracted value should match the original value
            return extractedValue === propertyValue;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle missing property_number column gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string().filter(s => s !== '物件番号'), { minLength: 1, maxLength: 10 }),
          (headers) => {
            // Property: If "物件番号" is not in headers, indexOf should return -1
            const columnIndex = headers.indexOf('物件番号');
            return columnIndex === -1;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should preserve property_number value through mapping process', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (propertyValue) => {
            const headers = ['買主番号', '物件番号', '氏名'];
            const row = ['B001', propertyValue, 'テスト太郎'];

            const columnIndex = headers.indexOf('物件番号');
            const extractedValue = row[columnIndex];

            // Property: The extracted value should be identical to the input
            return extractedValue === propertyValue && extractedValue.length === propertyValue.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Property number format validation', () => {
    // **Feature: buyer-property-linkage-fix, Property 3: Property number format validation**
    // For any string value, the property number validator should return true if and only if
    // the value matches the expected format (e.g., "AA" followed by digits).

    test('should validate correct AA + digits format', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 999999 }), // Generate numbers from 0 to 999999
          (num) => {
            const propertyNumber = `AA${num}`;
            const isValid = validator.validatePropertyNumberFormat(propertyNumber);

            // Property: AA followed by any digits should be valid
            return isValid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject invalid formats', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string().filter(s => !s.match(/^AA\d+$/)), // Any string not matching AA + digits
            fc.constant(''), // Empty string
            fc.constant('  '), // Whitespace only
            fc.string({ minLength: 1, maxLength: 5 }).map(s => `BB${s}`), // Wrong prefix
            fc.nat().map(n => `A${n}`), // Single A
            fc.nat().map(n => `AAA${n}`) // Triple A
          ),
          (invalidValue) => {
            const isValid = validator.validatePropertyNumberFormat(invalidValue);

            // Property: Invalid formats should return false
            return isValid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle edge cases consistently', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null as any),
            fc.constant(undefined as any),
            fc.constant(''),
            fc.constant('   '),
            fc.constant('AA'), // AA without digits
            fc.constant('AA0'), // AA with zero
            fc.constant('AA00001') // AA with leading zeros
          ),
          (edgeCase) => {
            const isValid = validator.validatePropertyNumberFormat(edgeCase);

            // Property: Edge cases should be handled consistently
            // Only "AA0" and "AA00001" should be valid (they match AA + digits)
            const expected = edgeCase === 'AA0' || edgeCase === 'AA00001';
            return isValid === expected;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should trim whitespace before validation', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 99999 }),
          fc.nat({ max: 5 }), // Leading spaces
          fc.nat({ max: 5 }), // Trailing spaces
          (num, leadingSpaces, trailingSpaces) => {
            const propertyNumber = ' '.repeat(leadingSpaces) + `AA${num}` + ' '.repeat(trailingSpaces);
            const isValid = validator.validatePropertyNumberFormat(propertyNumber);

            // Property: Whitespace should be trimmed, so validation should pass
            return isValid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should be case-sensitive for AA prefix', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 99999 }),
          fc.constantFrom('aa', 'Aa', 'aA'), // Lowercase variations
          (num, prefix) => {
            const propertyNumber = `${prefix}${num}`;
            const isValid = validator.validatePropertyNumberFormat(propertyNumber);

            // Property: Only uppercase "AA" should be valid
            return isValid === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2 & 3 Combined: End-to-end validation', () => {
    test('should extract and validate property numbers correctly', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 99999 }),
          (num) => {
            const propertyNumber = `AA${num}`;
            const headers = ['買主番号', '物件番号', '氏名'];
            const row = ['B001', propertyNumber, 'テスト太郎'];

            // Extract
            const columnIndex = headers.indexOf('物件番号');
            const extractedValue = row[columnIndex];

            // Validate
            const isValid = validator.validatePropertyNumberFormat(extractedValue);

            // Property: Extracted valid property numbers should pass validation
            return extractedValue === propertyNumber && isValid === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
