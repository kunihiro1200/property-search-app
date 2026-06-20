import { BaseRepository } from '../repositories/BaseRepository';
import { ActivityLog } from '../types';
import { CacheHelper, CACHE_TTL } from '../utils/cache';

export interface LogFilter {
  employeeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  activityType?: string;
  sellerId?: string;
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
   * 活動ログを記録
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
   * ログを取得（フィルタ対応）
   */
  async getLogs(filter: LogFilter): Promise<ActivityLog[]> {
    let query = this.table('activity_logs').select('*');

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

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1000);

    if (error) {
      throw new Error(`Failed to get logs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * メール送信を記録
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
    const description = `物件情報メール送信: ${params.propertyNumbers.join(', ')}`;
    
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
   * 統計を取得
   */
  async getStatistics(dateFrom?: Date, dateTo?: Date): Promise<ActivityStatistics> {
    // キャッシュキーを生成
    const cacheKey = CacheHelper.generateKey(
      'statistics',
      dateFrom?.toISOString() || 'all',
      dateTo?.toISOString() || 'now'
    );

    // キャッシュをチェック
    const cached = await CacheHelper.get<ActivityStatistics>(cacheKey);
    if (cached) {
      console.log('✅ Cache hit for statistics');
      return cached;
    }

    // TODO: Supabase RPCまたはPostgREST集計機能を使用して実装
    // 現在は簡易実装
    const logs = await this.getLogs({
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
          employeeName: '', // TODO: 社員名を取得
          totalActivities: 0,
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

    // キャッシュに保存
    await CacheHelper.set(cacheKey, result, CACHE_TTL.STATISTICS);

    return result;
  }
}
