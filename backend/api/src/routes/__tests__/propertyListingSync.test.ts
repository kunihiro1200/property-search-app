import request from 'supertest';
import express from 'express';
import propertyListingSyncRouter from '../propertyListingSync';

// Mock the PropertyListingRestSyncService
jest.mock('../../services/PropertyListingRestSyncService');
jest.mock('@supabase/supabase-js');

describe('Property Listing Sync Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/property-listing-sync', propertyListingSyncRouter);

    // Set required environment variables
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/property-listing-sync/manual', () => {
    it('should trigger manual sync for all properties', async () => {
      const response = await request(app)
        .post('/api/property-listing-sync/manual')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('syncId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('startedAt');
    });

    it('should trigger selective sync for specific properties', async () => {
      const response = await request(app)
        .post('/api/property-listing-sync/manual')
        .send({
          propertyNumbers: ['AA12345', 'AA12346']
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('syncId');
    });

    it('should handle sync errors', async () => {
      // Mock sync service to throw error
      const { PropertyListingRestSyncService } = require('../../services/PropertyListingRestSyncService');
      PropertyListingRestSyncService.prototype.syncAll = jest.fn().mockRejectedValue(
        new Error('Sync failed')
      );

      const response = await request(app)
        .post('/api/property-listing-sync/manual')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/property-listing-sync/status/:syncId', () => {
    it('should get sync status', async () => {
      const mockStatus = {
        syncId: 'test-sync-id',
        status: 'in_progress',
        startedAt: '2025-01-10T00:00:00Z',
        stats: {
          total: 100,
          success: 50,
          failed: 0,
          skipped: 0
        }
      };

      const { PropertyListingRestSyncService } = require('../../services/PropertyListingRestSyncService');
      PropertyListingRestSyncService.prototype.getSyncStatus = jest.fn().mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/property-listing-sync/status/test-sync-id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStatus);
    });

    it('should handle errors when getting status', async () => {
      const { PropertyListingRestSyncService } = require('../../services/PropertyListingRestSyncService');
      PropertyListingRestSyncService.prototype.getSyncStatus = jest.fn().mockRejectedValue(
        new Error('Status not found')
      );

      const response = await request(app)
        .get('/api/property-listing-sync/status/invalid-id');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/property-listing-sync/health', () => {
    it('should get health status', async () => {
      const mockHealth = {
        status: 'healthy',
        lastSync: '2025-01-10T00:00:00Z',
        errorRate: 0.01,
        avgSyncDuration: 180,
        queueSize: 0,
        circuitBreakerState: 'closed',
        recentErrors: 0
      };

      const { PropertyListingRestSyncService } = require('../../services/PropertyListingRestSyncService');
      PropertyListingRestSyncService.prototype.getHealth = jest.fn().mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/property-listing-sync/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHealth);
    });
  });

  describe('GET /api/property-listing-sync/history', () => {
    it('should get sync history with default limit', async () => {
      const mockHistory = [
        {
          id: 'sync-1',
          sync_type: 'manual',
          status: 'completed',
          started_at: '2025-01-10T00:00:00Z'
        },
        {
          id: 'sync-2',
          sync_type: 'scheduled',
          status: 'completed',
          started_at: '2025-01-09T00:00:00Z'
        }
      ];

      const { PropertyListingRestSyncService } = require('../../services/PropertyListingRestSyncService');
      PropertyListingRestSyncService.prototype.getRecentSyncs = jest.fn().mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/property-listing-sync/history');

      expect(response.status).toBe(200);
      expect(response.body.syncs).toEqual(mockHistory);
      expect(response.body.count).toBe(2);
    });

    it('should get sync history with custom limit', async () => {
      const { PropertyListingRestSyncService } = require('../../services/PropertyListingRestSyncService');
      PropertyListingRestSyncService.prototype.getRecentSyncs = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/property-listing-sync/history?limit=5');

      expect(response.status).toBe(200);
      expect(PropertyListingRestSyncService.prototype.getRecentSyncs).toHaveBeenCalledWith(5);
    });
  });

  describe('GET /api/property-listing-sync/statistics', () => {
    it('should get sync statistics', async () => {
      const mockStats = {
        errorRate: 0.05,
        avgDuration: 240,
        totalSyncs: 100,
        successfulSyncs: 95,
        failedSyncs: 5,
        partialSyncs: 0
      };

      const { PropertyListingRestSyncService } = require('../../services/PropertyListingRestSyncService');
      PropertyListingRestSyncService.prototype.getStatistics = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/property-listing-sync/statistics');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockStats);
    });
  });

  describe('GET /api/property-listing-sync/errors/:syncId', () => {
    it('should get sync errors', async () => {
      const mockErrors = [
        {
          id: 'error-1',
          sync_id: 'test-sync-id',
          property_number: 'AA12345',
          error_type: 'validation',
          error_message: 'Invalid data',
          retry_count: 2,
          created_at: '2025-01-10T00:00:00Z'
        }
      ];

      const { PropertyListingRestSyncService } = require('../../services/PropertyListingRestSyncService');
      PropertyListingRestSyncService.prototype.getSyncErrors = jest.fn().mockResolvedValue(mockErrors);

      const response = await request(app)
        .get('/api/property-listing-sync/errors/test-sync-id');

      expect(response.status).toBe(200);
      expect(response.body.errors).toEqual(mockErrors);
      expect(response.body.count).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should handle missing Supabase configuration', async () => {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Reload the router to pick up missing env vars
      jest.resetModules();
      const newRouter = require('../propertyListingSync').default;
      const newApp = express();
      newApp.use(express.json());
      newApp.use('/api/property-listing-sync', newRouter);

      const response = await request(newApp)
        .post('/api/property-listing-sync/manual')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Sync service not configured');
    });
  });
});
