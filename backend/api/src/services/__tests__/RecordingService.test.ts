/**
 * RecordingService Unit Tests
 */

// Supabaseクライアントのモック
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn().mockReturnThis();
const mockSupabaseInsert = jest.fn().mockReturnThis();
const mockSupabaseUpdate = jest.fn().mockReturnThis();
const mockSupabaseDelete = jest.fn().mockReturnThis();
const mockSupabaseEq = jest.fn().mockReturnThis();
const mockSupabaseLt = jest.fn().mockReturnThis();
const mockSupabaseSingle = jest.fn();

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      delete: mockSupabaseDelete,
      eq: mockSupabaseEq,
      lt: mockSupabaseLt,
      single: mockSupabaseSingle,
    }),
  },
}));

// AWS S3 Clientのモック
const mockGetPresignedUrl = jest.fn();
const mockUploadFile = jest.fn();
const mockDownloadFile = jest.fn();
const mockDeleteFile = jest.fn();
const mockFileExists = jest.fn();

jest.mock('../aws/S3Client', () => ({
  getS3Client: jest.fn(() => ({
    getPresignedUrl: mockGetPresignedUrl,
    uploadFile: mockUploadFile,
    downloadFile: mockDownloadFile,
    deleteFile: mockDeleteFile,
    fileExists: mockFileExists,
  })),
}));

// Logger のモック
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

import { RecordingService } from '../RecordingService';
import { PhoneServiceError } from '../../types/phone';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('RecordingService', () => {
  let service: RecordingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RecordingService();
  });

  describe('基本的なインスタンス化', () => {
    it('RecordingServiceのインスタンスを作成できる', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RecordingService);
    });
  });

  describe('公開メソッドの存在確認', () => {
    it('createRecordingメソッドが存在する', () => {
      expect(typeof service.createRecording).toBe('function');
    });

    it('getRecordingByIdメソッドが存在する', () => {
      expect(typeof service.getRecordingById).toBe('function');
    });

    it('getRecordingByCallLogIdメソッドが存在する', () => {
      expect(typeof service.getRecordingByCallLogId).toBe('function');
    });

    it('getPresignedUrlメソッドが存在する', () => {
      expect(typeof service.getPresignedUrl).toBe('function');
    });

    it('recordAccessメソッドが存在する', () => {
      expect(typeof service.recordAccess).toBe('function');
    });

    it('uploadRecordingメソッドが存在する', () => {
      expect(typeof service.uploadRecording).toBe('function');
    });

    it('downloadRecordingメソッドが存在する', () => {
      expect(typeof service.downloadRecording).toBe('function');
    });

    it('deleteRecordingメソッドが存在する', () => {
      expect(typeof service.deleteRecording).toBe('function');
    });

    it('archiveRecordingメソッドが存在する', () => {
      expect(typeof service.archiveRecording).toBe('function');
    });

    it('deleteOldRecordingsメソッドが存在する', () => {
      expect(typeof service.deleteOldRecordings).toBe('function');
    });

    it('recordingExistsメソッドが存在する', () => {
      expect(typeof service.recordingExists).toBe('function');
    });

    it('updateRecordingMetadataメソッドが存在する', () => {
      expect(typeof service.updateRecordingMetadata).toBe('function');
    });

    it('getRecordingStatisticsメソッドが存在する', () => {
      expect(typeof service.getRecordingStatistics).toBe('function');
    });
  });

  describe('createRecording', () => {
    const validData = {
      callLogId: 'call-log-123',
      s3Bucket: 'test-bucket',
      s3Key: 'recordings/test.mp3',
      durationSeconds: 120,
      fileSizeBytes: 1024000,
      format: 'mp3',
    };

    it('正常に録音レコードを作成できる', async () => {
      const mockRecording = {
        id: 'recording-123',
        ...validData,
        created_at: new Date().toISOString(),
      };

      mockSupabaseSingle.mockResolvedValue({
        data: mockRecording,
        error: null,
      });

      const result = await service.createRecording(validData);

      expect(result).toEqual(mockRecording);
      expect(mockSupabaseInsert).toHaveBeenCalled();
    });

    it('データベースエラーの場合はPhoneServiceErrorをスローする', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(service.createRecording(validData)).rejects.toThrow(
        PhoneServiceError
      );
    });
  });

  describe('getRecordingById', () => {
    it('存在する録音を取得できる', async () => {
      const mockRecording = {
        id: 'recording-123',
        call_log_id: 'call-log-123',
        s3_bucket: 'test-bucket',
        s3_key: 'recordings/test.mp3',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: mockRecording,
        error: null,
      });

      const result = await service.getRecordingById('recording-123');

      expect(result).toEqual(mockRecording);
      expect(mockSupabaseEq).toHaveBeenCalledWith('id', 'recording-123');
    });

    it('存在しない録音の場合はnullを返す', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await service.getRecordingById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getRecordingByCallLogId', () => {
    it('通話ログIDで録音を取得できる', async () => {
      const mockRecording = {
        id: 'recording-123',
        call_log_id: 'call-log-123',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: mockRecording,
        error: null,
      });

      const result = await service.getRecordingByCallLogId('call-log-123');

      expect(result).toEqual(mockRecording);
      expect(mockSupabaseEq).toHaveBeenCalledWith('call_log_id', 'call-log-123');
    });
  });

  describe('getPresignedUrl', () => {
    it('正常にPresigned URLを生成できる', async () => {
      const mockRecording = {
        id: 'recording-123',
        s3_bucket: 'test-bucket',
        s3_key: 'recordings/test.mp3',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: mockRecording,
        error: null,
      });

      mockGetPresignedUrl.mockResolvedValue('https://s3.amazonaws.com/presigned-url');

      const result = await service.getPresignedUrl('recording-123', 3600);

      expect(result).toBe('https://s3.amazonaws.com/presigned-url');
      expect(mockGetPresignedUrl).toHaveBeenCalledWith(
        'test-bucket',
        'recordings/test.mp3',
        3600
      );
    });

    it('録音が存在しない場合はエラーをスローする', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(service.getPresignedUrl('non-existent')).rejects.toThrow(
        PhoneServiceError
      );
    });
  });

  describe('recordAccess', () => {
    it('正常にアクセスログを記録できる', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        service.recordAccess('recording-123', 'user-456')
      ).resolves.not.toThrow();

      expect(mockSupabaseInsert).toHaveBeenCalled();
    });
  });

  describe('uploadRecording', () => {
    it('正常に録音ファイルをアップロードできる', async () => {
      const mockBuffer = Buffer.from('test audio data');

      mockUploadFile.mockResolvedValue({
        bucket: 'test-bucket',
        key: 'recordings/test.mp3',
      });

      const result = await service.uploadRecording(
        'call-log-123',
        mockBuffer,
        'mp3'
      );

      expect(result).toHaveProperty('bucket', 'test-bucket');
      expect(result).toHaveProperty('key');
      expect(mockUploadFile).toHaveBeenCalled();
    });

    it('AWS APIエラーの場合はPhoneServiceErrorをスローする', async () => {
      mockUploadFile.mockRejectedValue(new Error('AWS API Error'));

      await expect(
        service.uploadRecording('call-log-123', Buffer.from('test'), 'mp3')
      ).rejects.toThrow(PhoneServiceError);
    });
  });

  describe('deleteRecording', () => {
    it('正常に録音を削除できる', async () => {
      const mockRecording = {
        id: 'recording-123',
        s3_bucket: 'test-bucket',
        s3_key: 'recordings/test.mp3',
      };

      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockRecording,
        error: null,
      });

      mockDeleteFile.mockResolvedValue({});

      mockSupabaseSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(service.deleteRecording('recording-123')).resolves.not.toThrow();

      expect(mockDeleteFile).toHaveBeenCalledWith('test-bucket', 'recordings/test.mp3');
      expect(mockSupabaseDelete).toHaveBeenCalled();
    });
  });

  describe('deleteOldRecordings', () => {
    it('古い録音を正しく削除できる', async () => {
      const mockOldRecordings = [
        {
          id: 'recording-1',
          s3_bucket: 'test-bucket',
          s3_key: 'recordings/old1.mp3',
        },
        {
          id: 'recording-2',
          s3_bucket: 'test-bucket',
          s3_key: 'recordings/old2.mp3',
        },
      ];

      mockSupabaseSingle.mockResolvedValueOnce({
        data: mockOldRecordings,
        error: null,
      });

      mockDeleteFile.mockResolvedValue({});

      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.deleteOldRecordings(90);

      expect(result).toBe(2);
      expect(mockDeleteFile).toHaveBeenCalledTimes(2);
      expect(mockSupabaseLt).toHaveBeenCalled();
    });

    it('古い録音がない場合は0を返す', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.deleteOldRecordings(90);

      expect(result).toBe(0);
    });
  });

  describe('recordingExists', () => {
    it('録音が存在する場合はtrueを返す', async () => {
      mockFileExists.mockResolvedValue(true);

      const result = await service.recordingExists('test-bucket', 'recordings/test.mp3');

      expect(result).toBe(true);
      expect(mockFileExists).toHaveBeenCalledWith('test-bucket', 'recordings/test.mp3');
    });

    it('録音が存在しない場合はfalseを返す', async () => {
      mockFileExists.mockResolvedValue(false);

      const result = await service.recordingExists('test-bucket', 'recordings/test.mp3');

      expect(result).toBe(false);
    });
  });

  describe('getRecordingStatistics', () => {
    it('録音統計を正しく計算できる', async () => {
      const mockRecordings = [
        { id: 'rec-1', file_size_bytes: 1000000, duration_seconds: 120 },
        { id: 'rec-2', file_size_bytes: 2000000, duration_seconds: 180 },
      ];

      mockSupabaseSingle.mockResolvedValue({
        data: mockRecordings,
        error: null,
      });

      const result = await service.getRecordingStatistics();

      expect(result).toHaveProperty('totalRecordings', 2);
      expect(result).toHaveProperty('totalSizeBytes', 3000000);
      expect(result).toHaveProperty('totalDurationSeconds', 300);
      expect(result).toHaveProperty('averageSizeBytes', 1500000);
      expect(result).toHaveProperty('averageDurationSeconds', 150);
    });

    it('録音がない場合はゼロ統計を返す', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.getRecordingStatistics();

      expect(result.totalRecordings).toBe(0);
      expect(result.averageSizeBytes).toBe(0);
    });
  });
});
