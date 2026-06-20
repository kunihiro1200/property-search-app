/**
 * InquiryHistories API エンドポイント ユニットテスト
 * 
 * 各エンドポイントの正常系・異常系をテスト
 */

import request from 'supertest';
import express from 'express';
import { InquiryHistoryService } from '../../services/InquiryHistoryService';
import inquiryHistoryRoutes, { setInquiryHistoryService, resetInquiryHistoryService } from '../inquiryHistories';

// 認証ミドルウェアをモック化
jest.mock('../../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use('/api', inquiryHistoryRoutes);

describe('InquiryHistories API Endpoints', () => {
  let mockInquiryHistoryService: jest.Mocked<InquiryHistoryService>;

  beforeEach(() => {
    // モックサービスを作成
    mockInquiryHistoryService = {
      getInquiryHistories: jest.fn(),
      createInquiryHistory: jest.fn(),
      updateInquiryHistory: jest.fn(),
      updateCurrentStatus: jest.fn(),
      deleteInquiryHistory: jest.fn(),
    } as any;

    // モックサービスを注入
    setInquiryHistoryService(mockInquiryHistoryService);
  });

  afterEach(() => {
    resetInquiryHistoryService();
    jest.clearAllMocks();
  });

  describe('GET /api/sellers/:sellerId/inquiry-history', () => {
    it('正常系: 問合せ履歴を取得できる', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      const mockInquiryHistories = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          sellerId,
          inquiryDate: new Date('2025-01-15'),
          inquirySite: 'ウ',
          inquiryReason: '売却検討',
          isCurrentStatus: true,
          notes: 'テストメモ',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockInquiryHistoryService.getInquiryHistories.mockResolvedValue(mockInquiryHistories);

      const response = await request(app)
        .get(`/api/sellers/${sellerId}/inquiry-history`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].sellerId).toBe(sellerId);
      expect(mockInquiryHistoryService.getInquiryHistories).toHaveBeenCalledWith(sellerId);
    });

    it('異常系: 無効なsellerId形式でエラーを返す', async () => {
      const response = await request(app)
        .get('/api/sellers/invalid-uuid/inquiry-history')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('異常系: サービスエラー時に500を返す', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      mockInquiryHistoryService.getInquiryHistories.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/sellers/${sellerId}/inquiry-history`)
        .expect(500);

      expect(response.body.error.code).toBe('GET_INQUIRY_HISTORIES_ERROR');
    });
  });

  describe('POST /api/sellers/:sellerId/inquiry-history', () => {
    it('正常系: 問合せ履歴を作成できる', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      const newInquiryHistory = {
        inquiryDate: '2025-01-15',
        inquirySite: 'ウ',
        inquiryReason: '売却検討',
        isCurrentStatus: true,
        notes: 'テストメモ',
      };

      const mockCreatedInquiryHistory = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        sellerId,
        inquiryDate: new Date(newInquiryHistory.inquiryDate),
        inquirySite: newInquiryHistory.inquirySite,
        inquiryReason: newInquiryHistory.inquiryReason,
        isCurrentStatus: newInquiryHistory.isCurrentStatus,
        notes: newInquiryHistory.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockInquiryHistoryService.createInquiryHistory.mockResolvedValue(mockCreatedInquiryHistory);

      const response = await request(app)
        .post(`/api/sellers/${sellerId}/inquiry-history`)
        .send(newInquiryHistory)
        .expect(201);

      expect(response.body.sellerId).toBe(sellerId);
      expect(response.body.inquirySite).toBe(newInquiryHistory.inquirySite);
      expect(mockInquiryHistoryService.createInquiryHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId,
          inquirySite: newInquiryHistory.inquirySite,
          inquiryReason: newInquiryHistory.inquiryReason,
          isCurrentStatus: newInquiryHistory.isCurrentStatus,
          notes: newInquiryHistory.notes,
        })
      );
    });

    it('異常系: 必須フィールドが欠けている場合エラーを返す', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {
        inquirySite: 'ウ',
        // inquiryDate が欠けている
      };

      const response = await request(app)
        .post(`/api/sellers/${sellerId}/inquiry-history`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('異常系: 無効な日付形式でエラーを返す', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidData = {
        inquiryDate: 'invalid-date',
        inquirySite: 'ウ',
      };

      const response = await request(app)
        .post(`/api/sellers/${sellerId}/inquiry-history`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/inquiry-history/:id', () => {
    it('正常系: 問合せ履歴を更新できる', async () => {
      const inquiryHistoryId = '123e4567-e89b-12d3-a456-426614174001';
      const updateData = {
        inquirySite: 'L',
        inquiryReason: '更新された理由',
      };

      const mockUpdatedInquiryHistory = {
        id: inquiryHistoryId,
        sellerId: '123e4567-e89b-12d3-a456-426614174000',
        inquiryDate: new Date('2025-01-15'),
        inquirySite: updateData.inquirySite,
        inquiryReason: updateData.inquiryReason,
        isCurrentStatus: true,
        notes: 'テストメモ',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockInquiryHistoryService.updateInquiryHistory.mockResolvedValue(mockUpdatedInquiryHistory);

      const response = await request(app)
        .put(`/api/inquiry-history/${inquiryHistoryId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.inquirySite).toBe(updateData.inquirySite);
      expect(response.body.inquiryReason).toBe(updateData.inquiryReason);
      expect(mockInquiryHistoryService.updateInquiryHistory).toHaveBeenCalledWith(
        inquiryHistoryId,
        expect.objectContaining({
          inquirySite: updateData.inquirySite,
          inquiryReason: updateData.inquiryReason,
        })
      );
    });

    it('異常系: 無効なID形式でエラーを返す', async () => {
      const response = await request(app)
        .put('/api/inquiry-history/invalid-uuid')
        .send({ inquirySite: 'L' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/sellers/:sellerId/inquiry-history/:id/current-status', () => {
    it('正常系: is_current_statusを更新できる', async () => {
      const sellerId = '123e4567-e89b-12d3-a456-426614174000';
      const inquiryHistoryId = '123e4567-e89b-12d3-a456-426614174001';

      mockInquiryHistoryService.updateCurrentStatus.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/sellers/${sellerId}/inquiry-history/${inquiryHistoryId}/current-status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockInquiryHistoryService.updateCurrentStatus).toHaveBeenCalledWith(sellerId, inquiryHistoryId);
    });

    it('異常系: 無効なsellerId形式でエラーを返す', async () => {
      const inquiryHistoryId = '123e4567-e89b-12d3-a456-426614174001';

      const response = await request(app)
        .put(`/api/sellers/invalid-uuid/inquiry-history/${inquiryHistoryId}/current-status`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/inquiry-history/:id', () => {
    it('正常系: 問合せ履歴を削除できる', async () => {
      const inquiryHistoryId = '123e4567-e89b-12d3-a456-426614174001';

      mockInquiryHistoryService.deleteInquiryHistory.mockResolvedValue(undefined);

      await request(app)
        .delete(`/api/inquiry-history/${inquiryHistoryId}`)
        .expect(204);

      expect(mockInquiryHistoryService.deleteInquiryHistory).toHaveBeenCalledWith(inquiryHistoryId);
    });

    it('異常系: 無効なID形式でエラーを返す', async () => {
      const response = await request(app)
        .delete('/api/inquiry-history/invalid-uuid')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
