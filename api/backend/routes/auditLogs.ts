import express from 'express';
import { AuditLogService, AuditLogFilter } from '../services/AuditLogService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/audit-logs
 * Get audit logs with optional filtering
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      fieldName,
      userId,
      startDate,
      endDate,
      limit = '100',
      offset = '0',
    } = req.query;

    const filter: AuditLogFilter = {};

    if (entityType) {
      filter.entityType = entityType as 'buyer' | 'seller' | 'property';
    }

    if (entityId) {
      filter.entityId = entityId as string;
    }

    if (fieldName) {
      filter.fieldName = fieldName as string;
    }

    if (userId) {
      filter.userId = userId as string;
    }

    if (startDate) {
      filter.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filter.endDate = new Date(endDate as string);
    }

    const logs = await AuditLogService.getAuditLogs(
      filter,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/audit-logs/entity/:entityType/:entityId
 * Get audit logs for a specific entity
 */
router.get('/entity/:entityType/:entityId', authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = '50' } = req.query;

    if (!['buyer', 'seller', 'property'].includes(entityType)) {
      return res.status(400).json({
        error: 'Invalid entity type',
        message: 'Entity type must be buyer, seller, or property',
      });
    }

    const logs = await AuditLogService.getEntityAuditLogs(
      entityType as 'buyer' | 'seller' | 'property',
      entityId,
      parseInt(limit as string, 10)
    );

    res.json(logs);
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch entity audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/audit-logs/field/:entityType/:entityId/:fieldName
 * Get audit logs for a specific field
 */
router.get('/field/:entityType/:entityId/:fieldName', authenticate, async (req, res) => {
  try {
    const { entityType, entityId, fieldName } = req.params;
    const { limit = '20' } = req.query;

    if (!['buyer', 'seller', 'property'].includes(entityType)) {
      return res.status(400).json({
        error: 'Invalid entity type',
        message: 'Entity type must be buyer, seller, or property',
      });
    }

    const logs = await AuditLogService.getFieldAuditLogs(
      entityType as 'buyer' | 'seller' | 'property',
      entityId,
      fieldName,
      parseInt(limit as string, 10)
    );

    res.json(logs);
  } catch (error) {
    console.error('Error fetching field audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch field audit logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
