/**
 * 暗号化サービス プロパティベーステスト
 * Feature: seller-list-management
 * Property 2: 個人情報暗号化ラウンドトリップ
 * 検証: 要件 1.3
 */

import * as fc from 'fast-check';
import { encrypt, decrypt, encryptFields, decryptFields } from '../encryption';

describe('Encryption Service - Property-Based Tests', () => {
  describe('Property 2: Personal Information Encryption Round-Trip', () => {
    it('should decrypt to original value after encryption', () => {
      // Feature: seller-list-management, Property 2: Personal Information Encryption Round-Trip
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          (originalText) => {
            const encrypted = encrypt(originalText);
            const decrypted = decrypt(encrypted);
            
            // 暗号化後に復号化すると元の値に戻る
            expect(decrypted).toBe(originalText);
            
            // 暗号化されたデータは元のデータと異なる
            if (originalText.length > 0) {
              expect(encrypted).not.toBe(originalText);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty strings', () => {
      fc.assert(
        fc.property(fc.constant(''), (emptyString) => {
          const encrypted = encrypt(emptyString);
          const decrypted = decrypt(encrypted);
          
          expect(decrypted).toBe(emptyString);
        }),
        { numRuns: 10 }
      );
    });

    it('should handle Japanese characters', () => {
      fc.assert(
        fc.property(
          fc.stringOf(
            fc.constantFrom(...'あいうえおかきくけこさしすせそたちつてと'.split('')),
            { minLength: 1, maxLength: 50 }
          ),
          (japaneseText) => {
            const encrypted = encrypt(japaneseText);
            const decrypted = decrypt(encrypted);
            
            expect(decrypted).toBe(japaneseText);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters', () => {
      fc.assert(
        fc.property(
          fc.stringOf(
            fc.constantFrom(...'!@#$%^&*()_+-=[]{}|;:,.<>?/~`'.split('')),
            { minLength: 1, maxLength: 50 }
          ),
          (specialText) => {
            const encrypted = encrypt(specialText);
            const decrypted = decrypt(encrypted);
            
            expect(decrypted).toBe(specialText);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle phone numbers', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom('090', '080', '070'),
            fc.integer({ min: 1000, max: 9999 }),
            fc.integer({ min: 1000, max: 9999 })
          ).map(([prefix, mid, last]) => `${prefix}-${mid}-${last}`),
          (phoneNumber) => {
            const encrypted = encrypt(phoneNumber);
            const decrypted = decrypt(encrypted);
            
            expect(decrypted).toBe(phoneNumber);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle email addresses', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 3, maxLength: 10 }),
            fc.constantFrom('gmail.com', 'yahoo.co.jp', 'example.com')
          ).map(([local, domain]) => `${local}@${domain}`),
          (email) => {
            const encrypted = encrypt(email);
            const decrypted = decrypt(encrypted);
            
            expect(decrypted).toBe(email);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle addresses', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom('東京都', '大阪府', '神奈川県'),
            fc.constantFrom('中央区', '港区', '新宿区'),
            fc.integer({ min: 1, max: 9 }),
            fc.integer({ min: 1, max: 30 }),
            fc.integer({ min: 1, max: 20 })
          ).map(([pref, city, chome, banchi, go]) => 
            `${pref}${city}${chome}-${banchi}-${go}`
          ),
          (address) => {
            const encrypted = encrypt(address);
            const decrypted = decrypt(encrypted);
            
            expect(decrypted).toBe(address);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('encryptFields and decryptFields', () => {
    it('should encrypt and decrypt multiple fields', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            email: fc.string({ minLength: 5, maxLength: 50 }),
            address: fc.string({ minLength: 10, maxLength: 100 }),
            publicField: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          (data) => {
            const fieldsToEncrypt: (keyof typeof data)[] = ['name', 'phone', 'email', 'address'];
            
            // 暗号化
            const encrypted = encryptFields(data, fieldsToEncrypt);
            
            // 暗号化されたフィールドは元の値と異なる
            fieldsToEncrypt.forEach(field => {
              if (data[field].length > 0) {
                expect(encrypted[field]).not.toBe(data[field]);
              }
            });
            
            // 暗号化されていないフィールドは変わらない
            expect(encrypted.publicField).toBe(data.publicField);
            
            // 復号化
            const decrypted = decryptFields(encrypted, fieldsToEncrypt);
            
            // すべてのフィールドが元の値に戻る
            expect(decrypted).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle partial field encryption', () => {
      fc.assert(
        fc.property(
          fc.record({
            field1: fc.string({ minLength: 1, maxLength: 20 }),
            field2: fc.string({ minLength: 1, maxLength: 20 }),
            field3: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          (data) => {
            // field1とfield2のみ暗号化
            const fieldsToEncrypt: (keyof typeof data)[] = ['field1', 'field2'];
            
            const encrypted = encryptFields(data, fieldsToEncrypt);
            const decrypted = decryptFields(encrypted, fieldsToEncrypt);
            
            // 暗号化したフィールドは元に戻る
            expect(decrypted.field1).toBe(data.field1);
            expect(decrypted.field2).toBe(data.field2);
            
            // 暗号化していないフィールドは変わらない
            expect(encrypted.field3).toBe(data.field3);
            expect(decrypted.field3).toBe(data.field3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Encryption properties', () => {
    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 50 }),
          (text) => {
            const encrypted1 = encrypt(text);
            const encrypted2 = encrypt(text);
            
            // 同じ平文でも異なる暗号文が生成される（IVがランダムなため）
            expect(encrypted1).not.toBe(encrypted2);
            
            // しかし両方とも正しく復号化できる
            expect(decrypt(encrypted1)).toBe(text);
            expect(decrypt(encrypted2)).toBe(text);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle very long strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 500, maxLength: 1000 }),
          (longText) => {
            const encrypted = encrypt(longText);
            const decrypted = decrypt(encrypted);
            
            expect(decrypted).toBe(longText);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
