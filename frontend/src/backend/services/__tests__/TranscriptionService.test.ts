/**
 * TranscriptionService Unit Tests
 */

// Supabaseクライアントのモック
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn().mockReturnThis();
const mockSupabaseInsert = jest.fn().mockReturnThis();
const mockSupabaseUpdate = jest.fn().mockReturnThis();
const mockSupabaseDelete = jest.fn().mockReturnThis();
const mockSupabaseEq = jest.fn().mockReturnThis();
const mockSupabaseSingle = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      delete: mockSupabaseDelete,
      eq: mockSupabaseEq,
      single: mockSupabaseSingle,
    }),
  },
}));

// AWS Transcribe Clientのモック
const mockStartTranscriptionJob = jest.fn();
const mockGetTranscriptionJob = jest.fn();
const mockDeleteTranscriptionJob = jest.fn();

jest.mock('../aws/TranscribeClient', () => ({
  getTranscribeClient: jest.fn(() => ({
    startTranscriptionJob: mockStartTranscriptionJob,
    getTranscriptionJob: mockGetTranscriptionJob,
    deleteTranscriptionJob: mockDeleteTranscriptionJob,
  })),
}));

// Logger のモック
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

import { TranscriptionService } from '../TranscriptionService';
import { PhoneServiceError } from '../../types/phone';

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TranscriptionService();
  });

  describe('基本的なインスタンス化', () => {
    it('TranscriptionServiceのインスタンスを作成できる', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TranscriptionService);
    });
  });

  describe('公開メソッドの存在確認', () => {
    it('startTranscriptionメソッドが存在する', () => {
      expect(typeof service.startTranscription).toBe('function');
    });

    it('checkTranscriptionStatusメソッドが存在する', () => {
      expect(typeof service.checkTranscriptionStatus).toBe('function');
    });

    it('getTranscriptionメソッドが存在する', () => {
      expect(typeof service.getTranscription).toBe('function');
    });

    it('deleteTranscriptionメソッドが存在する', () => {
      expect(typeof service.deleteTranscription).toBe('function');
    });
  });

  describe('startTranscription', () => {
    const validOptions = {
      callLogId: 'call-log-123',
      s3Bucket: 'test-bucket',
      s3Key: 'recordings/test.mp3',
      languageCode: 'ja-JP',
    };

    it('正常に文字起こしジョブを開始できる', async () => {
      mockStartTranscriptionJob.mockResolvedValue({
        TranscriptionJob: {
          TranscriptionJobName: 'job-123',
          TranscriptionJobStatus: 'IN_PROGRESS',
        },
      });

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: 'transcription-123',
          call_log_id: 'call-log-123',
          job_name: 'job-123',
          status: 'in_progress',
        },
        error: null,
      });

      const result = await service.startTranscription(validOptions);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('job_name', 'job-123');
      expect(result).toHaveProperty('status', 'in_progress');
      expect(mockStartTranscriptionJob).toHaveBeenCalled();
    });

    it('AWS APIエラーの場合はPhoneServiceErrorをスローする', async () => {
      mockStartTranscriptionJob.mockRejectedValue(new Error('AWS API Error'));

      await expect(service.startTranscription(validOptions)).rejects.toThrow(
        PhoneServiceError
      );
    });
  });

  describe('checkTranscriptionStatus', () => {
    it('文字起こしジョブのステータスを確認できる', async () => {
      mockGetTranscriptionJob.mockResolvedValue({
        TranscriptionJob: {
          TranscriptionJobName: 'job-123',
          TranscriptionJobStatus: 'COMPLETED',
          Transcript: {
            TranscriptFileUri: 'https://s3.amazonaws.com/transcript.json',
          },
        },
      });

      const result = await service.checkTranscriptionStatus('job-123');

      expect(result).toHaveProperty('status', 'COMPLETED');
      expect(result).toHaveProperty('transcriptFileUri');
      expect(mockGetTranscriptionJob).toHaveBeenCalledWith('job-123');
    });

    it('ジョブが見つからない場合はエラーをスローする', async () => {
      mockGetTranscriptionJob.mockRejectedValue(
        new Error('TranscriptionJobNotFound')
      );

      await expect(service.checkTranscriptionStatus('non-existent')).rejects.toThrow();
    });
  });

  describe('getTranscription', () => {
    it('存在する文字起こしを取得できる', async () => {
      const mockTranscription = {
        id: 'transcription-123',
        call_log_id: 'call-log-123',
        full_text: 'こんにちは、テストです。',
        segments: [],
      };

      mockSupabaseSingle.mockResolvedValue({
        data: mockTranscription,
        error: null,
      });

      const result = await service.getTranscription('call-log-123');

      expect(result).toEqual(mockTranscription);
      expect(mockSupabaseEq).toHaveBeenCalledWith('call_log_id', 'call-log-123');
    });

    it('存在しない文字起こしの場合はnullを返す', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await service.getTranscription('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('deleteTranscription', () => {
    it('正常に文字起こしを削除できる', async () => {
      // Transcription取得
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: 'transcription-123',
          job_name: 'job-123',
        },
        error: null,
      });

      // AWS Transcribeジョブ削除
      mockDeleteTranscriptionJob.mockResolvedValue({});

      // DB削除
      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.deleteTranscription('transcription-123')
      ).resolves.not.toThrow();

      expect(mockDeleteTranscriptionJob).toHaveBeenCalledWith('job-123');
      expect(mockSupabaseDelete).toHaveBeenCalled();
    });

    it('データベースエラーの場合はPhoneServiceErrorをスローする', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      await expect(service.deleteTranscription('transcription-123')).rejects.toThrow(
        PhoneServiceError
      );
    });
  });
});
