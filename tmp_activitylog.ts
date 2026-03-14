import { BaseRepository } from '../repositories/BaseRepository';
import { ActivityLog } from '../types';
import { CacheHelper, CACHE_TTL } from '../utils/cache';

export interface LogFilter {
  employeeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  activityType?: string;
  sellerId?: string;
  targetType?: string;
  targetId?: string;
}

export interface ActivityStatistics {
  employeeStats: {
    employeeId: string;
    employeeName: string;
    totalActivities: number;
    byType: Record<string, number>;
  }[];
  totalActivities: number;
  period: {
    from: Date;
    to: Date;
  };
}

export class ActivityLogService extends BaseRepository {
  /**
   * 豢ｻ蜍輔Ο繧ｰ繧定ｨ倬鹸
   */
  async logActivity(log: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await this.table('activity_logs').insert({
      employee_id: log.employeeId,
      action: log.action,
      target_type: log.targetType,
      target_id: log.targetId,
      metadata: log.metadata || {},
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
    });

    if (error) {
      throw new Error(`Failed to log activity: ${error.message}`);
    }
  }

  /**
   * 繝ｭ繧ｰ繧貞叙蠕暦ｼ医ヵ繧｣繝ｫ繧ｿ蟇ｾ蠢懶ｼ・   */
  async getLogs(filter: LogFilter): Promise<ActivityLog[]> {
    let query = this.table('activity_logs')
      .select(`
        *,
        employee:employee_id (
          id,
          name,
          initials,
          email
        )
      `);

    if (filter.employeeId) {
      query = query.eq('employee_id', filter.employeeId);
    }

    if (filter.dateFrom) {
      query = query.gte('created_at', filter.dateFrom.toISOString());
    }

    if (filter.dateTo) {
      query = query.lte('created_at', filter.dateTo.toISOString());
    }

    if (filter.activityType) {
      query = query.eq('action', filter.activityType);
    }

    if (filter.sellerId) {
      query = query.eq('target_id', filter.sellerId).eq('target_type', 'seller');
    }

    // target_type縺ｨtarget_id縺ｮ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ繧定ｿｽ蜉
    if (filter.targetType) {
      query = query.eq('target_type', filter.targetType);
    }

    if (filter.targetId) {
      query = query.eq('target_id', filter.targetId);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);

    if (error) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 繝｡繝ｼ繝ｫ騾∽ｿ｡繧定ｨ倬鹸
   */
  async logEmail(params: {
    buyerId?: string;
    sellerId?: string;
    propertyNumbers: string[];
    recipientEmail: string;
    subject: string;
    senderEmail: string;
    preViewingNotes?: string;
    createdBy: string;
  }): Promise<void> {
    const description = `迚ｩ莉ｶ諠・ｱ繝｡繝ｼ繝ｫ騾∽ｿ｡: ${params.propertyNumbers.join(', ')}`;
    
    await this.logActivity({
      employeeId: params.createdBy,
      action: 'email',
      targetType: params.buyerId ? 'buyer' : 'seller',
      targetId: params.buyerId || params.sellerId || '',
      metadata: {
        property_numbers: params.propertyNumbers,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        sender_email: params.senderEmail,
        email_type: 'inquiry_response',
        pre_viewing_notes: params.preViewingNotes,
      },
      ipAddress: '',
      userAgent: '',
    });
  }

  /**
   * 邨ｱ險医ｒ蜿門ｾ・   */
  async getStatistics(dateFrom?: Date, dateTo?: Date): Promise<ActivityStatistics> {
    // 繧ｭ繝｣繝・す繝･繧ｭ繝ｼ繧堤函謌・    const cacheKey = CacheHelper.generateKey(
      'statistics',
      dateFrom?.toISOString() || 'all',
      dateTo?.toISOString() || 'now'
    );

    // 繧ｭ繝｣繝・す繝･繧偵メ繧ｧ繝・け
    const cached = await CacheHelper.get<ActivityStatistics>(cacheKey);
    if (cached) {
      console.log('笨・Cache hit for statistics');
      return cached;
    }

    // TODO: Supabase RPC縺ｾ縺溘・PostgREST髮・ｨ域ｩ溯・繧剃ｽｿ逕ｨ縺励※螳溯｣・    // 迴ｾ蝨ｨ縺ｯ邁｡譏灘ｮ溯｣・    const logs = await this.getLogs({
      dateFrom,
      dateTo,
    });

    const employeeMap = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        totalActivities: number;
        byType: Record<string, number>;
      }
    >();

    for (const log of logs) {
      if (!employeeMap.has(log.employeeId)) {
        employeeMap.set(log.employeeId, {
          employeeId: log.employeeId,
          employeeName: '', // TODO: 遉ｾ蜩｡蜷阪ｒ蜿門ｾ・          totalActivities: 0,
          byType: {},
        });
      }

      const employee = employeeMap.get(log.employeeId)!;
      employee.totalActivities += 1;
      employee.byType[log.action] = (employee.byType[log.action] || 0) + 1;
    }

    const employeeStats = Array.from(employeeMap.values());
    const totalActivities = employeeStats.reduce((sum, e) => sum + e.totalActivities, 0);

    const result = {
      employeeStats,
      totalActivities,
      period: {
        from: dateFrom || new Date(0),
        to: dateTo || new Date(),
      },
    };

    // 繧ｭ繝｣繝・す繝･縺ｫ菫晏ｭ・    await CacheHelper.set(cacheKey, result, CACHE_TTL.STATISTICS);

    return result;
  }
}
