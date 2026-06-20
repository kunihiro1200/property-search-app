/**
 * CallLogService
 * 通話ログのCRUD操作とActivity Log統合を管理するサービス
 */

import { supabase } from '../config/supabase';
import {
  CallLog,
  CallLogWithDetails,
  CallDirection,
  CallStatus,
  GetCallLogsRequest,
  GetCallLogsResponse,
  GetCallStatisticsRequest,
  GetCallStatisticsResponse,
  UserCallStatistics,
  PhoneServiceError,
} from '../types/phone';
import logger from '../utils/logger';

/**
 * CallLogService クラス
 */
export class CallLogService {
  /**
   * 通話ログを作成
   */
  async createCallLog(data: {
    sellerId: string;
    userId: string | null;
    direction: CallDirection;
    phoneNumber: string;
    callStatus: CallStatus;
    startedAt: Date;
    endedAt?: Date | null;
    durationSeconds?: number | null;
    contactId?: string | null;
    instanceId?: string | null;
    queueId?: string | null;
    agentId?: string | null;
  }): Promise<CallLog> {
    try {
      const { data: callLog, error } = await supabase
        .from('call_logs')
        .insert({
          seller_id: data.sellerId,
          user_id: data.userId,
          direction: data.direction,
          phone_number: data.phoneNumber,
          call_status: data.callStatus,
          started_at: data.startedAt.toISOString(),
          ended_at: data.endedAt?.toISOString() || null,
          duration_seconds: data.durationSeconds || null,
          contact_id: data.contactId || null,
          instance_id: data.instanceId || null,
          queue_id: data.queueId || null,
          agent_id: data.agentId || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('Call log created', {
        callLogId: callLog.id,
        sellerId: data.sellerId,
        direction: data.direction,
      });

      return callLog;
    } catch (error: any) {
      logger.error('Failed to create call log', { error, data });
      throw new PhoneServiceError(
        'Failed to create call log',
        'CREATE_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * 通話ログを更新
   */
  async updateCallLog(
    callLogId: string,
    updates: {
      callStatus?: CallStatus;
      endedAt?: Date;
      durationSeconds?: number;
      contactId?: string;
      instanceId?: string;
      queueId?: string;
      agentId?: string;
    }
  ): Promise<CallLog> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.callStatus) updateData.call_status = updates.callStatus;
      if (updates.endedAt) updateData.ended_at = updates.endedAt.toISOString();
      if (updates.durationSeconds !== undefined)
        updateData.duration_seconds = updates.durationSeconds;
      if (updates.contactId) updateData.contact_id = updates.contactId;
      if (updates.instanceId) updateData.instance_id = updates.instanceId;
      if (updates.queueId) updateData.queue_id = updates.queueId;
      if (updates.agentId) updateData.agent_id = updates.agentId;

      const { data: callLog, error } = await supabase
        .from('call_logs')
        .update(updateData)
        .eq('id', callLogId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info('Call log updated', { callLogId, updates });

      return callLog;
    } catch (error: any) {
      logger.error('Failed to update call log', { error, callLogId, updates });
      throw new PhoneServiceError(
        'Failed to update call log',
        'UPDATE_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * 通話ログをIDで取得
   */
  async getCallLogById(callLogId: string): Promise<CallLogWithDetails | null> {
    try {
      const { data: callLog, error } = await supabase
        .from('call_logs')
        .select(
          `
          *,
          transcription:call_transcriptions(*),
          recording:call_recordings(*)
        `
        )
        .eq('id', callLogId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // 売主情報を取得
      const { data: seller } = await supabase
        .from('sellers')
        .select('seller_number, name1, name2')
        .eq('id', callLog.seller_id)
        .single();

      // ユーザー情報を取得
      let userName: string | undefined;
      if (callLog.user_id) {
        const { data: user } = await supabase
          .from('employees')
          .select('name')
          .eq('id', callLog.user_id)
          .single();
        userName = user?.name;
      }

      return {
        ...callLog,
        seller_name: seller ? `${seller.name1} ${seller.name2}`.trim() : undefined,
        seller_number: seller?.seller_number,
        user_name: userName,
      };
    } catch (error: any) {
      logger.error('Failed to get call log', { error, callLogId });
      throw new PhoneServiceError(
        'Failed to get call log',
        'GET_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * 通話ログ一覧を取得
   */
  async getCallLogs(request: GetCallLogsRequest): Promise<GetCallLogsResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        sellerId,
        userId,
        direction,
        status,
        startDate,
        endDate,
        sortBy = 'started_at',
        sortOrder = 'desc',
      } = request;

      const offset = (page - 1) * limit;

      // クエリを構築
      let query = supabase
        .from('call_logs')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // フィルタを適用
      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (direction) {
        query = query.eq('direction', direction);
      }
      if (status) {
        query = query.eq('call_status', status);
      }
      if (startDate) {
        query = query.gte('started_at', startDate);
      }
      if (endDate) {
        query = query.lte('started_at', endDate);
      }

      // ページネーション
      query = query.range(offset, offset + limit - 1);

      const { data: callLogs, error, count } = await query;

      if (error) {
        throw error;
      }

      // 詳細情報を追加
      const callLogsWithDetails = await Promise.all(
        (callLogs || []).map(async (callLog) => {
          // 売主情報
          const { data: seller } = await supabase
            .from('sellers')
            .select('seller_number, name1, name2')
            .eq('id', callLog.seller_id)
            .single();

          // ユーザー情報
          let userName: string | undefined;
          if (callLog.user_id) {
            const { data: user } = await supabase
              .from('employees')
              .select('name')
              .eq('id', callLog.user_id)
              .single();
            userName = user?.name;
          }

          // 文字起こし情報
          const { data: transcription } = await supabase
            .from('call_transcriptions')
            .select('*')
            .eq('call_log_id', callLog.id)
            .single();

          // 録音情報
          const { data: recording } = await supabase
            .from('call_recordings')
            .select('*')
            .eq('call_log_id', callLog.id)
            .single();

          return {
            ...callLog,
            seller_name: seller ? `${seller.name1} ${seller.name2}`.trim() : undefined,
            seller_number: seller?.seller_number,
            user_name: userName,
            transcription: transcription || undefined,
            recording: recording || undefined,
          };
        })
      );

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        calls: callLogsWithDetails,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get call logs', { error, request });
      throw new PhoneServiceError(
        'Failed to get call logs',
        'LIST_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * 売主の通話ログを取得
   */
  async getCallLogsBySeller(
    sellerId: string,
    limit: number = 10
  ): Promise<CallLogWithDetails[]> {
    const response = await this.getCallLogs({
      sellerId,
      limit,
      sortBy: 'started_at',
      sortOrder: 'desc',
    });

    return response.calls;
  }

  /**
   * 通話統計を取得
   */
  async getCallStatistics(request: GetCallStatisticsRequest): Promise<GetCallStatisticsResponse> {
    try {
      const { startDate, endDate, userId, direction } = request;

      // 基本クエリ
      let query = supabase
        .from('call_logs')
        .select('*')
        .gte('started_at', startDate)
        .lte('started_at', endDate);

      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (direction) {
        query = query.eq('direction', direction);
      }

      const { data: callLogs, error } = await query;

      if (error) {
        throw error;
      }

      if (!callLogs || callLogs.length === 0) {
        return {
          totalCalls: 0,
          inboundCalls: 0,
          outboundCalls: 0,
          averageDurationSeconds: 0,
          totalDurationSeconds: 0,
          callsByStatus: {
            completed: 0,
            missed: 0,
            failed: 0,
            busy: 0,
            no_answer: 0,
          },
          callsByUser: [],
          sentimentDistribution: {
            positive: 0,
            neutral: 0,
            negative: 0,
            mixed: 0,
          },
          topKeywords: [],
        };
      }

      // 基本統計
      const totalCalls = callLogs.length;
      const inboundCalls = callLogs.filter((log) => log.direction === 'inbound').length;
      const outboundCalls = callLogs.filter((log) => log.direction === 'outbound').length;

      const totalDurationSeconds = callLogs.reduce(
        (sum, log) => sum + (log.duration_seconds || 0),
        0
      );
      const averageDurationSeconds =
        totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0;

      // ステータス別集計
      const callsByStatus: Record<CallStatus, number> = {
        completed: 0,
        missed: 0,
        failed: 0,
        busy: 0,
        no_answer: 0,
      };

      callLogs.forEach((log) => {
        callsByStatus[log.call_status as CallStatus]++;
      });

      // ユーザー別集計
      const userStats: Record<string, { count: number; totalDuration: number; name?: string }> =
        {};

      callLogs.forEach((log) => {
        if (log.user_id) {
          if (!userStats[log.user_id]) {
            userStats[log.user_id] = { count: 0, totalDuration: 0 };
          }
          userStats[log.user_id].count++;
          userStats[log.user_id].totalDuration += log.duration_seconds || 0;
        }
      });

      // ユーザー名を取得
      const userIds = Object.keys(userStats);
      const { data: users } = await supabase
        .from('employees')
        .select('id, name')
        .in('id', userIds);

      const callsByUser: UserCallStatistics[] = userIds.map((userId) => {
        const stats = userStats[userId];
        const user = users?.find((u) => u.id === userId);
        return {
          userId,
          userName: user?.name || 'Unknown',
          callCount: stats.count,
          averageDuration: Math.round(stats.totalDuration / stats.count),
          totalDuration: stats.totalDuration,
        };
      });

      // 感情分析統計
      const callLogIds = callLogs.map((log) => log.id);
      const { data: transcriptions } = await supabase
        .from('call_transcriptions')
        .select('sentiment, detected_keywords')
        .in('call_log_id', callLogIds)
        .not('sentiment', 'is', null);

      const sentimentDistribution: Record<string, number> = {
        positive: 0,
        neutral: 0,
        negative: 0,
        mixed: 0,
      };

      const keywordCounts: Record<string, number> = {};

      (transcriptions || []).forEach((t) => {
        if (t.sentiment) {
          sentimentDistribution[t.sentiment]++;
        }
        if (t.detected_keywords && Array.isArray(t.detected_keywords)) {
          t.detected_keywords.forEach((keyword: string) => {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
          });
        }
      });

      const topKeywords = Object.entries(keywordCounts)
        .map(([keyword, count]) => ({ keyword, count, category: null }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalCalls,
        inboundCalls,
        outboundCalls,
        averageDurationSeconds,
        totalDurationSeconds,
        callsByStatus,
        callsByUser,
        sentimentDistribution: sentimentDistribution as any,
        topKeywords,
      };
    } catch (error: any) {
      logger.error('Failed to get call statistics', { error, request });
      throw new PhoneServiceError(
        'Failed to get call statistics',
        'STATISTICS_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * Activity Logに通話ログを記録
   */
  async createActivityLog(callLog: CallLog, transcriptionText?: string): Promise<void> {
    try {
      // 通話の説明を生成
      const direction = callLog.direction === 'inbound' ? '着信' : '発信';
      const duration = callLog.duration_seconds
        ? `${Math.floor(callLog.duration_seconds / 60)}分${callLog.duration_seconds % 60}秒`
        : '不明';

      let description = `📞 ${direction}通話 (${duration})`;

      if (transcriptionText) {
        // 文字起こしの最初の100文字を追加
        const preview = transcriptionText.substring(0, 100);
        description += `\n\n${preview}${transcriptionText.length > 100 ? '...' : ''}`;
      }

      // Activity Logを作成
      const { error } = await supabase.from('activity_logs').insert({
        seller_id: callLog.seller_id,
        user_id: callLog.user_id,
        activity_type: 'phone_call',
        description,
        metadata: {
          call_log_id: callLog.id,
          direction: callLog.direction,
          phone_number: callLog.phone_number,
          duration_seconds: callLog.duration_seconds,
          call_status: callLog.call_status,
          contact_id: callLog.contact_id,
        },
        created_at: callLog.started_at,
      });

      if (error) {
        throw error;
      }

      logger.info('Activity log created for call', {
        callLogId: callLog.id,
        sellerId: callLog.seller_id,
      });
    } catch (error: any) {
      logger.error('Failed to create activity log', { error, callLogId: callLog.id });
      // Activity Log作成失敗は致命的ではないので、エラーをログに記録するのみ
    }
  }

  /**
   * 通話ログを削除
   */
  async deleteCallLog(callLogId: string): Promise<void> {
    try {
      const { error } = await supabase.from('call_logs').delete().eq('id', callLogId);

      if (error) {
        throw error;
      }

      logger.info('Call log deleted', { callLogId });
    } catch (error: any) {
      logger.error('Failed to delete call log', { error, callLogId });
      throw new PhoneServiceError(
        'Failed to delete call log',
        'DELETE_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * 古い通話ログをアーカイブ
   */
  async archiveOldCallLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data: oldLogs, error: selectError } = await supabase
        .from('call_logs')
        .select('id')
        .lt('started_at', cutoffDate.toISOString());

      if (selectError) {
        throw selectError;
      }

      if (!oldLogs || oldLogs.length === 0) {
        return 0;
      }

      const { error: deleteError } = await supabase
        .from('call_logs')
        .delete()
        .lt('started_at', cutoffDate.toISOString());

      if (deleteError) {
        throw deleteError;
      }

      logger.info('Old call logs archived', {
        count: oldLogs.length,
        cutoffDate: cutoffDate.toISOString(),
      });

      return oldLogs.length;
    } catch (error: any) {
      logger.error('Failed to archive old call logs', { error, daysToKeep });
      throw new PhoneServiceError(
        'Failed to archive old call logs',
        'ARCHIVE_FAILED',
        'call',
        false,
        error
      );
    }
  }
}

// シングルトンインスタンス
let callLogServiceInstance: CallLogService | null = null;

/**
 * CallLogServiceのシングルトンインスタンスを取得
 */
export function getCallLogService(): CallLogService {
  if (!callLogServiceInstance) {
    callLogServiceInstance = new CallLogService();
  }
  return callLogServiceInstance;
}

export default CallLogService;
