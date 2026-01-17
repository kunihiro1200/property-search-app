import { supabase } from '../config/supabase';

export interface AuditLogEntry {
  id?: string;
  entity_type: 'buyer' | 'seller' | 'property';
  entity_id: string;
  field_name: string;
  old_value: any;
  new_value: any;
  user_id: string;
  user_email: string;
  timestamp: Date;
  action: 'update' | 'create' | 'delete';
  sync_status?: 'synced' | 'pending' | 'failed';
}

export interface AuditLogFilter {
  entityType?: 'buyer' | 'seller' | 'property';
  entityId?: string;
  fieldName?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Service for managing audit trail logs
 * Tracks all changes to buyer, seller, and property data
 */
export class AuditLogService {
  /**
   * Log a field update
   */
  static async logFieldUpdate(
    entityType: 'buyer' | 'seller' | 'property',
    entityId: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
    userId: string,
    userEmail: string,
    syncStatus?: 'synced' | 'pending' | 'failed'
  ): Promise<void> {
    try {
      const entry: Omit<AuditLogEntry, 'id'> = {
        entity_type: entityType,
        entity_id: entityId,
        field_name: fieldName,
        old_value: this.serializeValue(oldValue),
        new_value: this.serializeValue(newValue),
        user_id: userId,
        user_email: userEmail,
        timestamp: new Date(),
        action: 'update',
        sync_status: syncStatus,
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(entry);

      if (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - audit logging should not break the main operation
      }
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw - audit logging should not break the main operation
    }
  }

  /**
   * Log entity creation
   */
  static async logEntityCreation(
    entityType: 'buyer' | 'seller' | 'property',
    entityId: string,
    initialData: any,
    userId: string,
    userEmail: string
  ): Promise<void> {
    try {
      const entry: Omit<AuditLogEntry, 'id'> = {
        entity_type: entityType,
        entity_id: entityId,
        field_name: '_entity_created',
        old_value: null,
        new_value: this.serializeValue(initialData),
        user_id: userId,
        user_email: userEmail,
        timestamp: new Date(),
        action: 'create',
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(entry);

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Log entity deletion
   */
  static async logEntityDeletion(
    entityType: 'buyer' | 'seller' | 'property',
    entityId: string,
    finalData: any,
    userId: string,
    userEmail: string
  ): Promise<void> {
    try {
      const entry: Omit<AuditLogEntry, 'id'> = {
        entity_type: entityType,
        entity_id: entityId,
        field_name: '_entity_deleted',
        old_value: this.serializeValue(finalData),
        new_value: null,
        user_id: userId,
        user_email: userEmail,
        timestamp: new Date(),
        action: 'delete',
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(entry);

      if (error) {
        console.error('Failed to create audit log:', error);
      }
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  /**
   * Get audit logs with optional filtering
   */
  static async getAuditLogs(
    filter: AuditLogFilter = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (filter.entityType) {
        query = query.eq('entity_type', filter.entityType);
      }

      if (filter.entityId) {
        query = query.eq('entity_id', filter.entityId);
      }

      if (filter.fieldName) {
        query = query.eq('field_name', filter.fieldName);
      }

      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }

      if (filter.startDate) {
        query = query.gte('timestamp', filter.startDate.toISOString());
      }

      if (filter.endDate) {
        query = query.lte('timestamp', filter.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(
    entityType: 'buyer' | 'seller' | 'property',
    entityId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    return this.getAuditLogs(
      { entityType, entityId },
      limit,
      0
    );
  }

  /**
   * Get audit logs for a specific field
   */
  static async getFieldAuditLogs(
    entityType: 'buyer' | 'seller' | 'property',
    entityId: string,
    fieldName: string,
    limit: number = 20
  ): Promise<AuditLogEntry[]> {
    return this.getAuditLogs(
      { entityType, entityId, fieldName },
      limit,
      0
    );
  }

  /**
   * Serialize value for storage
   * Handles complex types like objects and arrays
   */
  private static serializeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'object') {
      // Store objects and arrays as JSON
      return JSON.stringify(value);
    }

    return value;
  }
}
