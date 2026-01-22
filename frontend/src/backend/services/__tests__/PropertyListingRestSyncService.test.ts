/**
 * PropertyListingRestSyncService Unit Tests
 * 
 * PropertyListingRestSyncServiceのユニットテスト
 */

import { PropertyListingRestSyncService } from '../PropertyListingRestSyncService';
import { SupabaseRestClient } from '../SupabaseRestClient';
import { PropertyListingSyncProcessor } from '../PropertyListingSyncProcessor';

// モックの設定
jest.mock('../SupabaseRestClient');
jest.mock('../PropertyListingSyncProcessor');
jest.mock('../GoogleSheetsClient');

describe('PropertyListingRestSyncService', () => {
  let service: PropertyListingRestSyncService;
  let mockRestClient: jest.Mocked<SupabaseRestClient>;
  let mockProcessor: jest.Mocked<PropertyListingSyncProcessor>;

  const mockConfig = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key',
    batchSize: 100,
    rateLimit: 10,
    retryAttempts: 3,
    retryDelay: 1000,
    maxRetryDelay: 16000,
    retryFactor: 2,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
    timeout: 30000,
  };

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // SupabaseRestClientのモック
    mockRestClient = {
      getClient: jest.fn().mockReturnValue({}),
      executeWithRetry: jest.fn(),
      checkHealth: jest.fn(),
      getCircuitBreakerState: jest.fn().mockReturnValue('closed'),
      resetCircuitBreaker: jest.fn(),
      reset: jest.fn(),
    } as any;

    (SupabaseRestClient as jest.MockedClass<typeof SupabaseRestClient>).mockImplementation(
      () => mockRestClient
    );

    // PropertyListingSyncProcessorのモック
    mockProcessor = {
      processBatch: jest.fn(),
      getQueueSize: jest.fn().mockResolvedValue(0),
      clearQueue: jest.fn(),
    } as any;

    (PropertyListingSyncProcessor as jest.MockedClass<typeof PropertyListingSyncProcessor>).mockImplementation(
      () => mockProcessor
    );

    // サービスを初期化
    service = new PropertyListingRestSyncService(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(SupabaseRestClient).toHaveBeenCalledWith({
        supabaseUrl: mockConfig.supabaseUrl,
        supabaseKey: mockConfig.supabaseKey,
        retryAttempts: mockConfig.retryAttempts,
        retryDelay: mockConfig.retryDelay,
        maxRetryDelay: mockConfig.maxRetryDelay,
        retryFactor: mockConfig.retryFactor,
        circuitBreakerThreshold: mockConfig.circuitBreakerThreshold,
        circuitBreakerTimeout: mockConfig.circuitBreakerTimeout,
        timeout: mockConfig.timeout,
      });

      expect(PropertyListingSyncProcessor).toHaveBeenCalledWith(
        {},
        {
          batchSize: mockConfig.batchSize,
          rateLimit: mockConfig.rateLimit,
          concurrency: undefined,
        }
      );
    });
  });

  describe('syncAll', () => {
    it('should throw error when Google Sheets client not configured', async () => {
      await expect(service.syncAll()).rejects.toThrow(
        'Google Sheets client not configured'
      );
    });

    it('should sync all listings successfully', async () => {
      // Google Sheets設定を追加
      const serviceWithSheets = new PropertyListingRestSyncService({
        ...mockConfig,
        googleSheets: {
          spreadsheetId: 'test-spreadsheet-id',
          sheetName: 'test-sheet',
        },
      });

      const mockListings = [
        { property_number: 'AA12345', name: 'Test Property 1' },
        { property_number: 'AA12346', name: 'Test Property 2' },
      ];

      const mockResult = {
        syncId: 'test-sync-id',
        status: 'completed' as const,
        startedAt: new Date(),
        completedAt: new Date(),
        stats: {
          total: 2,
          success: 2,
          failed: 0,
          skipped: 0,
        },
        errors: [],
      };

      mockRestClient.executeWithRetry.mockResolvedValue(mockListings);
      mockProcessor.processBatch.mockResolvedValue(mockResult);

      const result = await serviceWithSheets.syncAll();

      expect(mockRestClient.executeWithRetry).toHaveBeenCalled();
      expect(mockProcessor.processBatch).toHaveBeenCalledWith(
        mockListings,
        expect.any(String)
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle sync errors', async () => {
      const serviceWithSheets = new PropertyListingRestSyncService({
        ...mockConfig,
        googleSheets: {
          spreadsheetId: 'test-spreadsheet-id',
          sheetName: 'test-sheet',
        },
      });

      const error = new Error('Sync failed');
      mockRestClient.executeWithRetry.mockRejectedValue(error);

      await expect(serviceWithSheets.syncAll()).rejects.toThrow('Sync failed');
    });
  });

  describe('syncByNumbers', () => {
    it('should throw error when Google Sheets client not configured', async () => {
      await expect(service.syncByNumbers(['AA12345'])).rejects.toThrow(
        'Google Sheets client not configured'
      );
    });

    it('should sync specific listings successfully', async () => {
      const serviceWithSheets = new PropertyListingRestSyncService({
        ...mockConfig,
        googleSheets: {
          spreadsheetId: 'test-spreadsheet-id',
          sheetName: 'test-sheet',
        },
      });

      const numbers = ['AA12345', 'AA12346'];
      const mockListings = [
        { property_number: 'AA12345', name: 'Test Property 1' },
        { property_number: 'AA12346', name: 'Test Property 2' },
      ];

      const mockResult = {
        syncId: 'test-sync-id',
        status: 'completed' as const,
        startedAt: new Date(),
        completedAt: new Date(),
        stats: {
          total: 2,
          success: 2,
          failed: 0,
          skipped: 0,
        },
        errors: [],
      };

      mockRestClient.executeWithRetry.mockResolvedValue(mockListings);
      mockProcessor.processBatch.mockResolvedValue(mockResult);

      const result = await serviceWithSheets.syncByNumbers(numbers);

      expect(mockRestClient.executeWithRetry).toHaveBeenCalled();
      expect(mockProcessor.processBatch).toHaveBeenCalledWith(
        mockListings,
        expect.any(String)
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getSyncStatus', () => {
    it('should throw not implemented error', async () => {
      await expect(service.getSyncStatus('test-sync-id')).rejects.toThrow(
        'Not implemented yet'
      );
    });
  });

  describe('getHealth', () => {
    it('should return healthy status', async () => {
      mockRestClient.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 100,
        circuitBreakerState: 'closed',
      });

      const health = await service.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.errorRate).toBe(0);
      expect(health.avgSyncDuration).toBe(0);
      expect(health.queueSize).toBe(0);
      expect(health.circuitBreakerState).toBe('closed');
    });

    it('should return unhealthy status when connection fails', async () => {
      mockRestClient.checkHealth.mockResolvedValue({
        healthy: false,
        responseTime: 5000,
        error: 'Connection failed',
        circuitBreakerState: 'open',
      });

      const health = await service.getHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.circuitBreakerState).toBe('closed');
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker', () => {
      service.resetCircuitBreaker();

      expect(mockRestClient.resetCircuitBreaker).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset client and processor', () => {
      service.reset();

      expect(mockRestClient.reset).toHaveBeenCalled();
      expect(mockProcessor.clearQueue).toHaveBeenCalled();
    });
  });
});
