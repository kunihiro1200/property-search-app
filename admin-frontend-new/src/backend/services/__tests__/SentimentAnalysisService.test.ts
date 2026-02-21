/**
 * SentimentAnalysisService Unit Tests
 */

// Supabaseクライアントのモック
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn().mockReturnThis();
const mockSupabaseInsert = jest.fn().mockReturnThis();
const mockSupabaseUpdate = jest.fn().mockReturnThis();
const mockSupabaseEq = jest.fn().mockReturnThis();
const mockSupabaseIn = jest.fn().mockReturnThis();
const mockSupabaseGte = jest.fn().mockReturnThis();
const mockSupabaseLte = jest.fn().mockReturnThis();
const mockSupabaseSingle = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      eq: mockSupabaseEq,
      in: mockSupabaseIn,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte,
      single: mockSupabaseSingle,
    }),
  },
}));

// AWS Comprehend Clientのモック
const mockDetectSentiment = jest.fn();
const mockDetectKeyPhrases = jest.fn();

jest.mock('../aws/ComprehendClient', () => ({
  getComprehendClient: jest.fn(() => ({
    detectSentiment: mockDetectSentiment,
    detectKeyPhrases: mockDetectKeyPhrases,
  })),
}));

// Logger のモック
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

import { SentimentAnalysisService } from '../SentimentAnalysisService';
import { PhoneServiceError } from '../../types/phone';

describe('SentimentAnalysisService', () => {
  let service: SentimentAnalysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SentimentAnalysisService();
  });

  describe('基本的なインスタンス化', () => {
    it('SentimentAnalysisServiceのインスタンスを作成できる', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(SentimentAnalysisService);
    });
  });

  describe('公開メソッドの存在確認', () => {
    it('analyzeSentimentメソッドが存在する', () => {
      expect(typeof service.analyzeSentiment).toBe('function');
    });

    it('detectKeywordsメソッドが存在する', () => {
      expect(typeof service.detectKeywords).toBe('function');
    });

    it('analyzeCallTranscriptionメソッドが存在する', () => {
      expect(typeof service.analyzeCallTranscription).toBe('function');
    });

    it('getSentimentTrendsメソッドが存在する', () => {
      expect(typeof service.getSentimentTrends).toBe('function');
    });

    it('getKeywordStatisticsメソッドが存在する', () => {
      expect(typeof service.getKeywordStatistics).toBe('function');
    });
  });

  describe('analyzeSentiment', () => {
    it('正常に感情分析を実行できる', async () => {
      mockDetectSentiment.mockResolvedValue({
        Sentiment: 'POSITIVE',
        SentimentScore: {
          Positive: 0.95,
          Negative: 0.02,
          Neutral: 0.02,
          Mixed: 0.01,
        },
      });

      const result = await service.analyzeSentiment('素晴らしい物件ですね！', 'ja');

      expect(result).toHaveProperty('sentiment', 'POSITIVE');
      expect(result).toHaveProperty('scores');
      expect(result.scores.positive).toBeGreaterThan(0.9);
      expect(mockDetectSentiment).toHaveBeenCalled();
    });

    it('AWS APIエラーの場合はPhoneServiceErrorをスローする', async () => {
      mockDetectSentiment.mockRejectedValue(new Error('AWS API Error'));

      await expect(service.analyzeSentiment('テキスト', 'ja')).rejects.toThrow(
        PhoneServiceError
      );
    });
  });

  describe('detectKeywords', () => {
    it('正常にキーワードを検出できる', async () => {
      mockDetectKeyPhrases.mockResolvedValue({
        KeyPhrases: [
          { Text: '購入', Score: 0.95 },
          { Text: '検討', Score: 0.88 },
          { Text: '価格', Score: 0.82 },
        ],
      });

      const result = await service.detectKeywords(
        '購入を検討しています。価格はいくらですか？',
        'ja'
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).toHaveProperty('score');
      expect(mockDetectKeyPhrases).toHaveBeenCalled();
    });

    it('キーワードが見つからない場合は空配列を返す', async () => {
      mockDetectKeyPhrases.mockResolvedValue({
        KeyPhrases: [],
      });

      const result = await service.detectKeywords('あ', 'ja');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('analyzeCallTranscription', () => {
    const callLogId = 'call-log-123';
    const transcriptionText = '素晴らしい物件ですね。購入を検討しています。';

    beforeEach(() => {
      mockDetectSentiment.mockResolvedValue({
        Sentiment: 'POSITIVE',
        SentimentScore: {
          Positive: 0.95,
          Negative: 0.02,
          Neutral: 0.02,
          Mixed: 0.01,
        },
      });

      mockDetectKeyPhrases.mockResolvedValue({
        KeyPhrases: [
          { Text: '購入', Score: 0.95 },
          { Text: '検討', Score: 0.88 },
        ],
      });

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: 'transcription-123',
          sentiment: 'positive',
          detected_keywords: ['購入', '検討'],
        },
        error: null,
      });
    });

    it('正常に文字起こしを分析できる', async () => {
      const result = await service.analyzeCallTranscription(
        callLogId,
        transcriptionText
      );

      expect(result).toHaveProperty('sentiment', 'positive');
      expect(result).toHaveProperty('detected_keywords');
      expect(Array.isArray(result.detected_keywords)).toBe(true);
      expect(mockDetectSentiment).toHaveBeenCalled();
      expect(mockDetectKeyPhrases).toHaveBeenCalled();
      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });

    it('空のテキストの場合はエラーをスローする', async () => {
      await expect(service.analyzeCallTranscription(callLogId, '')).rejects.toThrow();
    });
  });

  describe('getSentimentTrends', () => {
    it('感情分析のトレンドを取得できる', async () => {
      const mockTranscriptions = [
        { sentiment: 'positive', created_at: '2024-01-01' },
        { sentiment: 'neutral', created_at: '2024-01-02' },
        { sentiment: 'positive', created_at: '2024-01-03' },
      ];

      mockSupabaseSingle.mockResolvedValue({
        data: mockTranscriptions,
        error: null,
      });

      const result = await service.getSentimentTrends({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toHaveProperty('positive');
      expect(result).toHaveProperty('neutral');
      expect(result).toHaveProperty('negative');
      expect(result.positive).toBe(2);
      expect(result.neutral).toBe(1);
    });

    it('データがない場合はゼロ統計を返す', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getSentimentTrends({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result.positive).toBe(0);
      expect(result.neutral).toBe(0);
      expect(result.negative).toBe(0);
    });
  });

  describe('getKeywordStatistics', () => {
    it('キーワード統計を取得できる', async () => {
      const mockKeywords = [
        { keyword: '購入', count: 10, category: 'intent' },
        { keyword: '検討', count: 8, category: 'intent' },
        { keyword: '価格', count: 6, category: 'concern' },
      ];

      mockSupabaseSingle.mockResolvedValue({
        data: mockKeywords,
        error: null,
      });

      const result = await service.getKeywordStatistics({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('keyword');
      expect(result[0]).toHaveProperty('count');
    });
  });
});
