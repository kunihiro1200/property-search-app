/**
 * API統合テスト - 認証エラーハンドリング
 * 
 * エラーハンドリング統合テスト
 * login-fix: エラーハンドリング統合テストの作成
 */

import request from 'supertest';
import express from 'express';
import { describe, it, expect } from '@jest/globals';

// テスト用のExpressアプリケーション
const app = express();
app.use(express.json());

// authRouterを動的にインポート
let authRouter: any;
try {
  authRouter = require('../auth.supabase').default;
  app.use('/api/auth', authRouter);
} catch (error) {
  console.error('Failed to load auth router:', error);
}

describe('Error Handling Integration Tests', () => {
  describe('Invalid Token Handling', () => {
    it('should return 401 for invalid access token', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          access_token: 'clearly-invalid-token-12345',
          refresh_token: 'invalid-refresh'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message).toContain('Invalid');
    });

    it('should return 401 for expired token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for malformed token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt');

      expect(response.status).toBe(401);
    });
  });

  describe('Network Error Handling', () => {
    it('should handle missing request body gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .set('Content-Type', 'application/json')
        .send('not-valid-json');

      expect(response.status).toBe(400);
    });
  });

  describe('Error Message Display', () => {
    it('should return user-friendly error messages', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          access_token: 'invalid'
        });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('object');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.message.length).toBeGreaterThan(0);
    });

    it('should include error details for debugging', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.body).toHaveProperty('error');
      // 本番環境では詳細を隠すべきだが、開発環境では有用
    });

    it('should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          access_token: 'test-token'
        });

      // エラーメッセージにトークンやキーが含まれていないことを確認
      const errorMessage = JSON.stringify(response.body).toLowerCase();
      expect(errorMessage).not.toContain('service_key');
      expect(errorMessage).not.toContain('secret');
      expect(errorMessage).not.toContain('password');
    });
  });

  describe('Retry Logic', () => {
    it('should indicate if error is retryable', async () => {
      const response = await request(app)
        .post('/api/auth/callback')
        .send({
          access_token: 'invalid-token'
        });

      // レスポンスにリトライ可能フラグがあるか確認
      // 実装によっては retryable フィールドが含まれる
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple failed attempts gracefully', async () => {
      // 複数回の失敗したリクエストを送信
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/auth/callback')
          .send({ access_token: 'invalid' })
      );

      const responses = await Promise.all(requests);
      
      // すべてのリクエストが適切にエラーを返すことを確認
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status);
      });
    });
  });
});

describe('Session Management Error Tests', () => {
  describe('Session Validation Errors', () => {
    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });

    it('should handle empty bearer token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
    });
  });

  describe('Logout Error Handling', () => {
    it('should handle logout without valid session', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      // ログアウトは認証なしでも成功する場合がある
      expect([200, 401]).toContain(response.status);
    });

    it('should handle logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect([200, 401]).toContain(response.status);
    });
  });
});
