/**
 * API統合テスト - 通話API
 * 
 * 実際のデータベースを使用したエンドツーエンドのテスト
 * TASK-30: API統合テスト実装
 * 
 * 注: このテストは実際のデータベースとAWS環境が必要です
 * モック環境でのテストは、AWS_USE_MOCK=true を設定してください
 */

// 環境変数をモック（テスト実行前に設定）
process.env.AWS_USE_MOCK = 'true';
process.env.ENABLE_PHONE_INTEGRATION = 'true';

import request from 'supertest';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';

// テスト用のExpressアプリケーション
const app = express();
app.use(express.json());

// 認証ミドルウェアをモック化（テスト用）
app.use((req, _res, next) => {
  (req as any).employee = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'admin'
  };
  next();
});

// callsRouterを動的にインポート（コンパイルエラーを回避）
let callsRouter: any;
try {
  callsRouter = require('../calls').default;
  app.use('/api/calls', callsRouter);
} catch (error) {
  console.error('Failed to load calls router:', error);
}

// Supabaseクライアント（テスト用データベース）
// 環境変数が設定されていない場合はダミー値を使用
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'
);

describe('Calls API Integration Tests', () => {
  let testSellerId: string;
  let testCallLogId: string;
  let testUserId: string;

  // テストデータのセットアップ
  beforeAll(async () => {
    // テスト用のSellerを作成
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .insert({
        seller_number: 'TEST-API-001',
        name: 'テスト売主',
        phone_number: '+81-90-1234-5678',
        email: 'test-seller@example.com'
      })
      .select()
      .single();

    if (sellerError) {
      console.error('Failed to create test seller:', sellerError);
      throw sellerError;
    }

    testSellerId = seller.id;

    // テスト用のEmployeeを作成
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .insert({
        name: 'テスト担当者',
        email: 'test-employee@example.com',
        role: 'agent'
      })
      .select()
      .single();

    if (employeeError) {
      console.error('Failed to create test employee:', employeeError);
      throw employeeError;
    }

    testUserId = employee.id;
  });

  // テストデータのクリーンアップ
  afterAll(async () => {
    // テスト用の通話ログを削除（CASCADE削除）
    if (testCallLogId) {
      await supabase
        .from('call_logs')
        .delete()
        .eq('id', testCallLogId);
    }

    // テスト用のSellerを削除
    if (testSellerId) {
      await supabase
        .from('sellers')
        .delete()
        .eq('id', testSellerId);
    }

    // テスト用のEmployeeを削除
    if (testUserId) {
      await supabase
        .from('employees')
        .delete()
        .eq('id', testUserId);
    }
  });

  describe('POST /api/calls/outbound', () => {
    it('正常に発信を開始できる', async () => {
      const response = await request(app)
        .post('/api/calls/outbound')
        .send({
          sellerId: testSellerId,
          phoneNumber: '+81-90-1234-5678',
          userId: testUserId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('callLogId');
      expect(response.body.data).toHaveProperty('status');

      // 通話ログIDを保存（後続のテストで使用）
      testCallLogId = response.body.data.callLogId;

      // データベースに通話ログが作成されたことを確認
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', testCallLogId)
        .single();

      expect(callLog).toBeTruthy();
      expect(callLog.seller_id).toBe(testSellerId);
      expect(callLog.direction).toBe('outbound');
    });

    it('無効な電話番号の場合はエラーを返す', async () => {
      const response = await request(app)
        .post('/api/calls/outbound')
        .send({
          sellerId: testSellerId,
          phoneNumber: 'invalid-phone',
          userId: testUserId
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
      // エラーメッセージの形式が異なる可能性があるため、柔軟にチェック
      expect(response.body.error || response.body.message).toBeTruthy();
    });

    it('存在しないSellerの場合はエラーを返す', async () => {
      const response = await request(app)
        .post('/api/calls/outbound')
        .send({
          sellerId: '00000000-0000-0000-0000-000000000000',
          phoneNumber: '+81-90-1234-5678',
          userId: testUserId
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
      // エラーメッセージの形式が異なる可能性があるため、柔軟にチェック
      expect(response.body.error || response.body.message).toBeTruthy();
    });
  });

  describe('GET /api/calls/:callId', () => {
    it('通話ログの詳細を取得できる', async () => {
      const response = await request(app)
        .get(`/api/calls/${testCallLogId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testCallLogId);
      expect(response.body.data).toHaveProperty('seller_id', testSellerId);
      expect(response.body.data).toHaveProperty('direction', 'outbound');
    });

    it('存在しない通話ログの場合は404を返す', async () => {
      const response = await request(app)
        .get('/api/calls/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/calls', () => {
    it('通話ログ一覧を取得できる', async () => {
      const response = await request(app)
        .get('/api/calls')
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('calls');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.calls)).toBe(true);
    });

    it('Seller IDでフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/calls')
        .query({ sellerId: testSellerId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const calls = response.body.data.calls;
      expect(calls.length).toBeGreaterThan(0);
      calls.forEach((call: any) => {
        expect(call.seller_id).toBe(testSellerId);
      });
    });

    it('方向でフィルタリングできる', async () => {
      const response = await request(app)
        .get('/api/calls')
        .query({ direction: 'outbound' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const calls = response.body.data.calls;
      calls.forEach((call: any) => {
        expect(call.direction).toBe('outbound');
      });
    });
  });

  describe('POST /api/calls/:callId/end', () => {
    it('通話を終了できる', async () => {
      const response = await request(app)
        .post(`/api/calls/${testCallLogId}/end`)
        .send({
          durationSeconds: 120
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // データベースで通話が終了したことを確認
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', testCallLogId)
        .single();

      expect(callLog.ended_at).toBeTruthy();
      expect(callLog.duration_seconds).toBe(120);
      expect(callLog.call_status).toBe('completed');
    });
  });

  describe('GET /api/calls/statistics', () => {
    it('統計情報を取得できる', async () => {
      const response = await request(app)
        .get('/api/calls/statistics')
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalCalls');
      expect(response.body.data).toHaveProperty('inboundCalls');
      expect(response.body.data).toHaveProperty('outboundCalls');
      expect(response.body.data).toHaveProperty('averageDurationSeconds');
      expect(response.body.data).toHaveProperty('callsByStatus');
    });
  });

  describe('POST /api/calls/inbound/webhook', () => {
    it('着信Webhookを処理できる', async () => {
      const response = await request(app)
        .post('/api/calls/inbound/webhook')
        .send({
          contactId: 'test-contact-id-' + Date.now(),
          phoneNumber: '+81-90-1234-5678',
          timestamp: new Date().toISOString(),
          eventType: 'call_started'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('callLogId');
      expect(response.body.data).toHaveProperty('matched', true);
      expect(response.body.data).toHaveProperty('sellerId', testSellerId);
    });

    it('マッチしない電話番号の場合もログを作成する', async () => {
      const response = await request(app)
        .post('/api/calls/inbound/webhook')
        .send({
          contactId: 'test-contact-id-unknown-' + Date.now(),
          phoneNumber: '+81-90-9999-9999',
          timestamp: new Date().toISOString(),
          eventType: 'call_started'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('callLogId');
      expect(response.body.data).toHaveProperty('matched', false);
    });
  });
});
