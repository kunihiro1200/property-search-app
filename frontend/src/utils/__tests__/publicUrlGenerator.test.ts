import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generatePublicPropertyUrl,
  isPublicProperty,
  truncateUrl,
  isValidUUID,
} from '../publicUrlGenerator';

describe('publicUrlGenerator', () => {
  const originalEnv = import.meta.env.VITE_APP_URL;
  const testPropertyId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    // 環境変数をクリア
    delete (import.meta.env as any).VITE_APP_URL;
  });

  afterEach(() => {
    // 環境変数を復元
    if (originalEnv) {
      (import.meta.env as any).VITE_APP_URL = originalEnv;
    }
  });

  describe('generatePublicPropertyUrl', () => {
    it('専任・公開中の物件のURLを生成', () => {
      const url = generatePublicPropertyUrl(testPropertyId, '専任・公開中');
      expect(url).toContain(`/public/properties/${testPropertyId}`);
    });

    it('一般・公開中の物件のURLを生成', () => {
      const url = generatePublicPropertyUrl(testPropertyId, '一般・公開中');
      expect(url).toContain(`/public/properties/${testPropertyId}`);
    });

    it('非公開物件はnullを返す', () => {
      const url = generatePublicPropertyUrl(testPropertyId, '契約済');
      expect(url).toBeNull();
    });

    it('公開前物件はnullを返す', () => {
      const url = generatePublicPropertyUrl(testPropertyId, '公開前');
      expect(url).toBeNull();
    });

    it('atbb_statusがnullの場合はnullを返す', () => {
      const url = generatePublicPropertyUrl(testPropertyId, null);
      expect(url).toBeNull();
    });

    it('環境変数が設定されている場合はそれを使用', () => {
      (import.meta.env as any).VITE_APP_URL = 'https://example.com';
      const url = generatePublicPropertyUrl(testPropertyId, '専任・公開中');
      expect(url).toBe(`https://example.com/public/properties/${testPropertyId}`);
    });
  });

  describe('isPublicProperty', () => {
    it('専任・公開中はtrueを返す', () => {
      expect(isPublicProperty('専任・公開中')).toBe(true);
    });

    it('一般・公開中はtrueを返す', () => {
      expect(isPublicProperty('一般・公開中')).toBe(true);
    });

    it('契約済はfalseを返す', () => {
      expect(isPublicProperty('契約済')).toBe(false);
    });

    it('公開前はfalseを返す', () => {
      expect(isPublicProperty('公開前')).toBe(false);
    });

    it('nullはfalseを返す', () => {
      expect(isPublicProperty(null)).toBe(false);
    });

    it('空文字列はfalseを返す', () => {
      expect(isPublicProperty('')).toBe(false);
    });
  });

  describe('truncateUrl', () => {
    it('短いURLはそのまま返す', () => {
      const url = 'https://example.com/short';
      expect(truncateUrl(url, 30)).toBe(url);
    });

    it('長いURLを短縮', () => {
      const url = 'https://example.com/public/properties/very-long-id-123456789';
      const truncated = truncateUrl(url, 30);
      expect(truncated).toMatch(/^\.\.\./);
      expect(truncated.length).toBeLessThanOrEqual(30);
    });

    it('末尾が表示される（物件IDが見える）', () => {
      const url = 'https://example.com/public/properties/abc-123';
      const truncated = truncateUrl(url, 30);
      expect(truncated).toContain('abc-123');
    });

    it('デフォルトの最大長は30文字', () => {
      const url = 'https://example.com/public/properties/very-long-id-123456789';
      const truncated = truncateUrl(url);
      expect(truncated.length).toBeLessThanOrEqual(30);
    });
  });

  describe('isValidUUID', () => {
    it('有効なUUIDはtrueを返す', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('無効なUUIDはfalseを返す', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
    });

    it('大文字小文字を区別しない', () => {
      expect(isValidUUID('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
    });
  });
});
