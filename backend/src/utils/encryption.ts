import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// 環境変数から暗号化キーを取得
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be exactly ${KEY_LENGTH} characters`);
  }
  
  return Buffer.from(key, 'utf-8');
};

/**
 * データを暗号化
 * @param text 暗号化するテキスト
 * @returns 暗号化されたデータ（Base64エンコード）
 */
export const encrypt = (text: string): string => {
  if (!text) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // iv + salt + tag + encrypted を結合してBase64エンコード
    const result = Buffer.concat([iv, salt, tag, Buffer.from(encrypted, 'hex')]);
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * データを復号化
 * @param encryptedData 暗号化されたデータ（Base64エンコード）または平文
 * @returns 復号化されたテキスト
 */
export const decrypt = (encryptedData: string): string => {
  if (!encryptedData) {
    return '';
  }

  try {
    const key = getEncryptionKey();
    const buffer = Buffer.from(encryptedData, 'base64');

    // 暗号化されたデータの最小長をチェック（IV + SALT + TAG = 96バイト）
    const minEncryptedLength = IV_LENGTH + SALT_LENGTH + TAG_LENGTH;
    if (buffer.length < minEncryptedLength) {
      // データが短すぎる場合は平文として扱う
      console.warn('Data appears to be plaintext, returning as-is');
      return encryptedData;
    }

    // iv, salt, tag, encrypted を分離
    const iv = buffer.subarray(0, IV_LENGTH);
    // salt は将来の拡張用に保存されているが、現在は使用していない
    // const salt = buffer.subarray(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
    const tag = buffer.subarray(
      IV_LENGTH + SALT_LENGTH,
      IV_LENGTH + SALT_LENGTH + TAG_LENGTH
    );
    const encrypted = buffer.subarray(IV_LENGTH + SALT_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // 復号化に失敗した場合は平文として扱う
    console.warn('Decryption failed, treating as plaintext:', error);
    return encryptedData;
  }
};

/**
 * 複数のフィールドを暗号化
 * @param data オブジェクト
 * @param fields 暗号化するフィールド名の配列
 * @returns 暗号化されたオブジェクト
 */
export const encryptFields = <T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T => {
  const result = { ...data };
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as any;
    }
  }
  
  return result;
};

/**
 * 複数のフィールドを復号化
 * @param data オブジェクト
 * @param fields 復号化するフィールド名の配列
 * @returns 復号化されたオブジェクト
 */
export const decryptFields = <T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T => {
  const result = { ...data };
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decrypt(result[field] as string) as any;
    }
  }
  
  return result;
};

/**
 * パスワードをハッシュ化（bcrypt使用）
 * @param password プレーンテキストのパスワード
 * @returns ハッシュ化されたパスワード
 */
export const hashPassword = async (password: string): Promise<string> => {
  const bcrypt = await import('bcrypt');
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * パスワードを検証
 * @param password プレーンテキストのパスワード
 * @param hash ハッシュ化されたパスワード
 * @returns 一致する場合true
 */
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
};
