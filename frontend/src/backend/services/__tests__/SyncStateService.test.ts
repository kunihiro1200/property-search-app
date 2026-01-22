import { SyncStateService, SyncRecord } from '../SyncStateService';
import { SupabaseClient } from '@supabase/supabase-js';

describe('SyncStateService', () => {
  let service: SyncStateService;
  let mockSupabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn()
    } as any;

    service = new SyncStateService(mockSupabase);
  });

  describe('createSync', () => {
    it('should create a new sync record', async () => {
      const mockSyncId = 'test-sync-id';
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockSyncId },
            error: null
          })
        })
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert
      });

      const syncId = await service.createSync('manual', { test: 'metadata' });

      expect(syncId).toBe(mockSyncId);
      expect(mockSupabase.from).toHaveBeenCalledWith('property_listing_sync_state');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_type: 'manual',
          status: 'queued',
          metadata: { test: 'metadata' }
        })
      );
    });

    it('should throw error if insert fails', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' }
            })
          })
        })
      });

      await expect(service.createSync('manual')).rejects.toThrow('Failed to create sync record');
    });
  });

  describe('updateSync', () => {
    it('should update sync record', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        update: mockUpdate
      });

      await service.updateSync('test-id', { status: 'in_progress' });

      expect(mockSupabase.from).toHaveBeenCalledWith('property_listing_sync_state');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress'
        })
      );
    });

    it('should throw error if update fails', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' }
          })
        })
      });

      await expect(service.updateSync('test-id', { status: 'failed' })).rejects.toThrow(
        'Failed to update sync record'
      );
    });
  });

  describe('startSync', () => {
    it('should mark sync as started', async () => {
      const updateSpy = jest.spyOn(service, 'updateSync').mockResolvedValue();

      await service.startSync('test-id', 100);

      expect(updateSpy).toHaveBeenCalledWith('test-id', {
        status: 'in_progress',
        total_items: 100,
        started_at: expect.any(String)
      });
    });
  });

  describe('completeSync', () => {
    it('should mark sync as completed when no failures', async () => {
      const updateSpy = jest.spyOn(service, 'updateSync').mockResolvedValue();

      await service.completeSync('test-id', {
        success: 100,
        failed: 0,
        skipped: 0
      });

      expect(updateSpy).toHaveBeenCalledWith('test-id', {
        status: 'completed',
        success_count: 100,
        failed_count: 0,
        skipped_count: 0,
        completed_at: expect.any(String)
      });
    });

    it('should mark sync as partial when there are failures', async () => {
      const updateSpy = jest.spyOn(service, 'updateSync').mockResolvedValue();

      await service.completeSync('test-id', {
        success: 95,
        failed: 5,
        skipped: 0
      });

      expect(updateSpy).toHaveBeenCalledWith('test-id', {
        status: 'partial',
        success_count: 95,
        failed_count: 5,
        skipped_count: 0,
        completed_at: expect.any(String)
      });
    });
  });

  describe('failSync', () => {
    it('should mark sync as failed with error details', async () => {
      const updateSpy = jest.spyOn(service, 'updateSync').mockResolvedValue();
      const testError = new Error('Test error');

      await service.failSync('test-id', testError);

      expect(updateSpy).toHaveBeenCalledWith('test-id', {
        status: 'failed',
        error_details: {
          message: 'Test error',
          stack: expect.any(String),
          timestamp: expect.any(String)
        },
        completed_at: expect.any(String)
      });
    });
  });

  describe('recordError', () => {
    it('should record sync error', async () => {
      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        insert: mockInsert
      });

      const testError = new Error('Validation error');
      await service.recordError('test-sync-id', 'AA12345', testError, 2);

      expect(mockSupabase.from).toHaveBeenCalledWith('property_listing_sync_errors');
      expect(mockInsert).toHaveBeenCalledWith({
        sync_id: 'test-sync-id',
        property_number: 'AA12345',
        error_type: 'validation',
        error_message: 'Validation error',
        error_stack: expect.any(String),
        retry_count: 2
      });
    });

    it('should not throw if error recording fails', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' }
        })
      });

      const testError = new Error('Test error');
      await expect(service.recordError('test-id', 'AA12345', testError)).resolves.not.toThrow();
    });
  });

  describe('getSync', () => {
    it('should get sync record by ID', async () => {
      const mockSync: SyncRecord = {
        id: 'test-id',
        sync_type: 'manual',
        status: 'completed',
        started_at: '2025-01-10T00:00:00Z',
        completed_at: '2025-01-10T00:05:00Z',
        total_items: 100,
        success_count: 100,
        failed_count: 0,
        skipped_count: 0,
        created_at: '2025-01-10T00:00:00Z',
        updated_at: '2025-01-10T00:05:00Z'
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSync,
              error: null
            })
          })
        })
      });

      const result = await service.getSync('test-id');

      expect(result).toEqual(mockSync);
      expect(mockSupabase.from).toHaveBeenCalledWith('property_listing_sync_state');
    });

    it('should throw error if sync not found', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      });

      await expect(service.getSync('test-id')).rejects.toThrow('Failed to get sync record');
    });
  });

  describe('getLastSync', () => {
    it('should get last sync record', async () => {
      const mockSync: SyncRecord = {
        id: 'test-id',
        sync_type: 'scheduled',
        status: 'completed',
        started_at: '2025-01-10T00:00:00Z',
        completed_at: '2025-01-10T00:05:00Z',
        total_items: 100,
        success_count: 100,
        failed_count: 0,
        skipped_count: 0,
        created_at: '2025-01-10T00:00:00Z',
        updated_at: '2025-01-10T00:05:00Z'
      };

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockSync,
                error: null
              })
            })
          })
        })
      });

      const result = await service.getLastSync();

      expect(result).toEqual(mockSync);
    });

    it('should return null if no syncs exist', async () => {
      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' }
              })
            })
          })
        })
      });

      const result = await service.getLastSync();

      expect(result).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should calculate sync statistics', async () => {
      const mockSyncs = [
        {
          status: 'completed',
          started_at: '2025-01-10T00:00:00Z',
          completed_at: '2025-01-10T00:05:00Z'
        },
        {
          status: 'completed',
          started_at: '2025-01-10T01:00:00Z',
          completed_at: '2025-01-10T01:03:00Z'
        },
        {
          status: 'failed',
          started_at: '2025-01-10T02:00:00Z',
          completed_at: '2025-01-10T02:01:00Z'
        },
        {
          status: 'partial',
          started_at: '2025-01-10T03:00:00Z',
          completed_at: '2025-01-10T03:04:00Z'
        }
      ];

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: mockSyncs,
            error: null
          })
        })
      });

      const stats = await service.getStatistics();

      expect(stats.totalSyncs).toBe(4);
      expect(stats.successfulSyncs).toBe(2);
      expect(stats.failedSyncs).toBe(1);
      expect(stats.partialSyncs).toBe(1);
      expect(stats.errorRate).toBe(0.25); // 1 failed out of 4
      expect(stats.avgDuration).toBeGreaterThan(0);
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when error rate is low', async () => {
      jest.spyOn(service, 'getStatistics').mockResolvedValue({
        errorRate: 0.01,
        avgDuration: 180,
        totalSyncs: 100,
        successfulSyncs: 99,
        failedSyncs: 1,
        partialSyncs: 0
      });

      jest.spyOn(service, 'getLastSync').mockResolvedValue({
        id: 'test-id',
        sync_type: 'scheduled',
        status: 'completed',
        started_at: '2025-01-10T00:00:00Z',
        completed_at: '2025-01-10T00:03:00Z',
        total_items: 100,
        success_count: 100,
        failed_count: 0,
        skipped_count: 0,
        created_at: '2025-01-10T00:00:00Z',
        updated_at: '2025-01-10T00:03:00Z'
      });

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const health = await service.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.errorRate).toBe(0.01);
      expect(health.avgSyncDuration).toBe(180);
    });

    it('should return degraded status when error rate is moderate', async () => {
      jest.spyOn(service, 'getStatistics').mockResolvedValue({
        errorRate: 0.07,
        avgDuration: 180,
        totalSyncs: 100,
        successfulSyncs: 93,
        failedSyncs: 7,
        partialSyncs: 0
      });

      jest.spyOn(service, 'getLastSync').mockResolvedValue(null);

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: new Array(25).fill({}),
            error: null
          })
        })
      });

      const health = await service.getHealth();

      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status when error rate is high', async () => {
      jest.spyOn(service, 'getStatistics').mockResolvedValue({
        errorRate: 0.15,
        avgDuration: 180,
        totalSyncs: 100,
        successfulSyncs: 85,
        failedSyncs: 15,
        partialSyncs: 0
      });

      jest.spyOn(service, 'getLastSync').mockResolvedValue(null);

      mockSupabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      const health = await service.getHealth();

      expect(health.status).toBe('unhealthy');
    });
  });

  describe('error categorization', () => {
    it('should categorize validation errors', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from = jest.fn().mockReturnValue({ insert: mockInsert });

      await service.recordError('test-id', 'AA12345', new Error('Invalid data format'));

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'validation'
        })
      );
    });

    it('should categorize network errors', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from = jest.fn().mockReturnValue({ insert: mockInsert });

      await service.recordError('test-id', 'AA12345', new Error('Network timeout'));

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'network'
        })
      );
    });

    it('should categorize rate limit errors', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from = jest.fn().mockReturnValue({ insert: mockInsert });

      await service.recordError('test-id', 'AA12345', new Error('Rate limit exceeded'));

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'rate_limit'
        })
      );
    });
  });
});
