// **Feature: buyer-property-linkage-fix, Property 7: Multiple property number parsing**
import * as fc from 'fast-check';
import { MultiplePropertyNumberParser } from '../MultiplePropertyNumberParser';

describe('MultiplePropertyNumberParser', () => {
  describe('parse', () => {
    it('should parse single property number', () => {
      const result = MultiplePropertyNumberParser.parse('AA6381');
      expect(result).toEqual(['AA6381']);
    });

    it('should parse comma-separated property numbers', () => {
      const result = MultiplePropertyNumberParser.parse('AA6381,AA1234,AA5678');
      expect(result).toEqual(['AA6381', 'AA1234', 'AA5678']);
    });

    it('should parse space-separated property numbers', () => {
      const result = MultiplePropertyNumberParser.parse('AA6381 AA1234 AA5678');
      expect(result).toEqual(['AA6381', 'AA1234', 'AA5678']);
    });

    it('should parse mixed delimiter property numbers', () => {
      const result = MultiplePropertyNumberParser.parse('AA6381, AA1234; AA5678\nAA9999');
      expect(result).toEqual(['AA6381', 'AA1234', 'AA5678', 'AA9999']);
    });

    it('should filter out invalid property numbers', () => {
      const result = MultiplePropertyNumberParser.parse('AA6381, BB1234, AA5678, invalid');
      expect(result).toEqual(['AA6381', 'AA5678']);
    });

    it('should handle null and undefined', () => {
      expect(MultiplePropertyNumberParser.parse(null)).toEqual([]);
      expect(MultiplePropertyNumberParser.parse(undefined)).toEqual([]);
      expect(MultiplePropertyNumberParser.parse('')).toEqual([]);
    });

    it('should trim whitespace', () => {
      const result = MultiplePropertyNumberParser.parse('  AA6381  ,  AA1234  ');
      expect(result).toEqual(['AA6381', 'AA1234']);
    });
  });

  describe('isValid', () => {
    it('should validate correct property numbers', () => {
      expect(MultiplePropertyNumberParser.isValid('AA6381')).toBe(true);
      expect(MultiplePropertyNumberParser.isValid('AA1')).toBe(true);
      expect(MultiplePropertyNumberParser.isValid('AA123456')).toBe(true);
    });

    it('should reject invalid property numbers', () => {
      expect(MultiplePropertyNumberParser.isValid('BB6381')).toBe(false);
      expect(MultiplePropertyNumberParser.isValid('AA')).toBe(false);
      expect(MultiplePropertyNumberParser.isValid('6381')).toBe(false);
      expect(MultiplePropertyNumberParser.isValid('AA6381X')).toBe(false);
      expect(MultiplePropertyNumberParser.isValid('')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(MultiplePropertyNumberParser.isValid(null as any)).toBe(false);
      expect(MultiplePropertyNumberParser.isValid(undefined as any)).toBe(false);
    });
  });

  describe('Property 7: Multiple property number parsing', () => {
    // **Feature: buyer-property-linkage-fix, Property 7: Multiple property number parsing**
    // For any string containing comma-separated or delimited property numbers,
    // the parser should extract all individual property numbers correctly
    it('should correctly parse all valid property numbers from delimited string', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 99999 }), { minLength: 1, maxLength: 10 }),
          fc.constantFrom(',', ' ', ';', '\n', ', ', ' , '),
          (numbers, delimiter) => {
            // Generate property numbers
            const propertyNumbers = numbers.map(n => `AA${n}`);
            const input = propertyNumbers.join(delimiter);
            
            // Parse
            const result = MultiplePropertyNumberParser.parse(input);
            
            // All parsed results should be valid property numbers
            const allValid = result.every(pn => /^AA\d+$/.test(pn));
            
            // All original property numbers should be in the result
            const allIncluded = propertyNumbers.every(pn => result.includes(pn));
            
            // Result should not contain duplicates (unless input had duplicates)
            const uniqueInput = [...new Set(propertyNumbers)];
            const uniqueResult = [...new Set(result)];
            const noDuplicatesAdded = uniqueResult.length === result.length || 
                                       uniqueInput.length < propertyNumbers.length;
            
            return allValid && allIncluded && noDuplicatesAdded;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter out invalid property numbers while preserving valid ones', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 99999 }), { minLength: 1, maxLength: 5 }),
          fc.array(fc.string({ minLength: 2, maxLength: 10 }), { minLength: 0, maxLength: 3 }),
          (validNumbers, invalidStrings) => {
            // Generate valid property numbers
            const validPropertyNumbers = validNumbers.map(n => `AA${n}`);
            
            // Mix valid and invalid
            const mixed = [...validPropertyNumbers, ...invalidStrings];
            const input = mixed.join(', ');
            
            // Parse
            const result = MultiplePropertyNumberParser.parse(input);
            
            // All results should be valid
            const allValid = result.every(pn => /^AA\d+$/.test(pn));
            
            // All valid inputs should be in result
            const allValidIncluded = validPropertyNumbers.every(pn => result.includes(pn));
            
            // No invalid inputs should be in result
            const noInvalidIncluded = result.every(pn => validPropertyNumbers.includes(pn));
            
            return allValid && allValidIncluded && noInvalidIncluded;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty and whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\n\n', '\t\t', '  ,  ,  '),
          (input) => {
            const result = MultiplePropertyNumberParser.parse(input);
            return result.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
