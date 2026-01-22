import { encrypt, decrypt, encryptFields, decryptFields } from '../encryption';

describe('Encryption Utility', () => {
  // 環境変数の設定
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32); // 32文字のキー
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'Hello, World!';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(originalText);
      expect(decrypted).toBe(originalText);
    });

    it('should return empty string for empty input', () => {
      expect(encrypt('')).toBe('');
      expect(decrypt('')).toBe('');
    });

    it('should handle Japanese characters', () => {
      const originalText = 'こんにちは、世界！';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should produce different encrypted values for same input', () => {
      const originalText = 'Test';
      const encrypted1 = encrypt(originalText);
      const encrypted2 = encrypt(originalText);

      // IVがランダムなので、同じ入力でも異なる暗号化結果になる
      expect(encrypted1).not.toBe(encrypted2);
      
      // しかし、どちらも正しく復号化できる
      expect(decrypt(encrypted1)).toBe(originalText);
      expect(decrypt(encrypted2)).toBe(originalText);
    });

    it('should handle plaintext gracefully in decrypt', () => {
      const plaintext = 'This is plaintext';
      const result = decrypt(plaintext);
      
      // 平文として扱われる
      expect(result).toBe(plaintext);
    });
  });

  describe('encryptFields and decryptFields', () => {
    it('should encrypt specified fields in an object', () => {
      const data = {
        name: '山田太郎',
        address: '東京都渋谷区',
        phone: '090-1234-5678',
        email: 'test@example.com',
        status: '追客中'
      };

      const encrypted = encryptFields(data, ['name', 'address', 'phone', 'email']);

      expect(encrypted.name).not.toBe(data.name);
      expect(encrypted.address).not.toBe(data.address);
      expect(encrypted.phone).not.toBe(data.phone);
      expect(encrypted.email).not.toBe(data.email);
      expect(encrypted.status).toBe(data.status); // 暗号化対象外
    });

    it('should decrypt specified fields in an object', () => {
      const data = {
        name: '山田太郎',
        address: '東京都渋谷区',
        phone: '090-1234-5678',
        email: 'test@example.com',
        status: '追客中'
      };

      const encrypted = encryptFields(data, ['name', 'address', 'phone', 'email']);
      const decrypted = decryptFields(encrypted, ['name', 'address', 'phone', 'email']);

      expect(decrypted.name).toBe(data.name);
      expect(decrypted.address).toBe(data.address);
      expect(decrypted.phone).toBe(data.phone);
      expect(decrypted.email).toBe(data.email);
      expect(decrypted.status).toBe(data.status);
    });

    it('should handle null and undefined fields', () => {
      const data = {
        name: '山田太郎',
        address: null as any,
        phone: undefined as any,
        email: 'test@example.com'
      };

      const encrypted = encryptFields(data, ['name', 'address', 'phone', 'email']);
      
      expect(encrypted.name).not.toBe(data.name);
      expect(encrypted.address).toBeNull();
      expect(encrypted.phone).toBeUndefined();
      expect(encrypted.email).not.toBe(data.email);
    });
  });

  describe('Property 9: Personal Information Encryption', () => {
    /**
     * プロパティ 9: 個人情報の暗号化
     * 
     * 任意の売主レコードに対して、データベースに保存される際、
     * 名前、住所、電話番号、メールアドレスは暗号化されていなければならない
     * 
     * 検証要件: 要件1.3
     */
    it('should encrypt all personal information fields for any seller record', () => {
      // 様々な売主レコードのテストケース
      const sellerRecords = [
        {
          name: '山田太郎',
          address: '東京都渋谷区1-2-3',
          phone: '090-1234-5678',
          email: 'yamada@example.com'
        },
        {
          name: 'John Doe',
          address: '123 Main St, New York',
          phone: '+1-555-1234',
          email: 'john@example.com'
        },
        {
          name: '김철수',
          address: '서울특별시 강남구',
          phone: '010-1234-5678',
          email: 'kim@example.com'
        },
        {
          name: '李明',
          address: '北京市朝阳区',
          phone: '138-1234-5678',
          email: 'li@example.com'
        }
      ];

      const personalInfoFields = ['name', 'address', 'phone', 'email'] as const;

      sellerRecords.forEach((record) => {
        // 暗号化
        const encrypted = encryptFields(record, [...personalInfoFields]);

        // 全ての個人情報フィールドが暗号化されていることを確認
        personalInfoFields.forEach((field) => {
          expect(encrypted[field as keyof typeof record]).not.toBe(
            record[field as keyof typeof record]
          );
          expect(encrypted[field as keyof typeof record]).toBeTruthy();
        });

        // 復号化して元のデータと一致することを確認
        const decrypted = decryptFields(encrypted, [...personalInfoFields]);
        personalInfoFields.forEach((field) => {
          expect(decrypted[field as keyof typeof record]).toBe(
            record[field as keyof typeof record]
          );
        });
      });
    });

    it('should maintain data integrity after encryption and decryption', () => {
      // ランダムな売主データを生成
      const generateRandomSeller = () => ({
        name: `テスト${Math.random().toString(36).substring(7)}`,
        address: `住所${Math.random().toString(36).substring(7)}`,
        phone: `090-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`,
        email: `test${Math.random().toString(36).substring(7)}@example.com`
      });

      // 複数のランダムなレコードでテスト
      for (let i = 0; i < 10; i++) {
        const original = generateRandomSeller();
        const encrypted = encryptFields(original, ['name', 'address', 'phone', 'email']);
        const decrypted = decryptFields(encrypted, ['name', 'address', 'phone', 'email']);

        expect(decrypted).toEqual(original);
      }
    });

    it('should ensure encrypted data is not readable', () => {
      const sensitiveData = {
        name: '山田太郎',
        address: '東京都渋谷区1-2-3 マンション101',
        phone: '090-1234-5678',
        email: 'yamada.taro@example.com'
      };

      const encrypted = encryptFields(sensitiveData, ['name', 'address', 'phone', 'email']);

      // 暗号化されたデータに元のデータが含まれていないことを確認
      Object.keys(sensitiveData).forEach((key) => {
        const originalValue = sensitiveData[key as keyof typeof sensitiveData];
        const encryptedValue = encrypted[key as keyof typeof encrypted];
        
        // 暗号化された値に元の値が含まれていないことを確認
        expect(encryptedValue).not.toContain(originalValue);
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error if ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('Failed to encrypt data');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error if ENCRYPTION_KEY has wrong length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short';

      expect(() => encrypt('test')).toThrow('Failed to encrypt data');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});
