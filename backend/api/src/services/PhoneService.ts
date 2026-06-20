/**
 * Phone Service
 * 電話発信・着信機能を管理するサービス
 */

import { createClient } from '@supabase/supabase-js';
import { getConnectClient } from './aws/ConnectClient';
import { getAWSConfig } from '../config/aws';
import {
  CallLog,
  CallDirection,
  CallStatus,
  StartCallOptions,
  EndCallOptions,
  OutboundCallResponse,
  CallError,
  PhoneServiceError,
} from '../types/phone';
import logger from '../utils/logger';
import { addTranscriptionJob } from '../jobs/transcriptionWorker';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * PhoneService クラス
 */
export class PhoneService {
  /**
   * 発信を開始
   */
  async startOutboundCall(options: StartCallOptions): Promise<OutboundCallResponse> {
    const { sellerId, phoneNumber, userId, attributes } = options;

    try {
      logger.info('Starting outbound call', { sellerId, phoneNumber, userId });

      // 1. 電話番号のバリデーション
      this.validatePhoneNumber(phoneNumber);

      // 2. Sellerの存在確認
      await this.validateSeller(sellerId);

      // 3. AWS設定を取得
      const awsConfig = getAWSConfig();

      // 4. Amazon Connectで発信
      const connectClient = getConnectClient();
      const connectResponse = await connectClient.startOutboundCall({
        instanceId: awsConfig.connect.instanceId,
        contactFlowId: awsConfig.connect.contactFlowId || 'default-flow-id',
        destinationPhoneNumber: phoneNumber,
        sourcePhoneNumber: awsConfig.connect.phoneNumber,
        attributes: {
          sellerId,
          userId,
          ...attributes,
        },
      });

      // 5. 通話ログをデータベースに作成
      const startedAt = new Date();
      const callLog = await this.createCallLog({
        seller_id: sellerId,
        user_id: userId,
        direction: 'outbound',
        phone_number: phoneNumber,
        call_status: 'completed', // 初期状態（後で更新）
        started_at: startedAt,
        ended_at: null,
        duration_seconds: null,
        contact_id: connectResponse.contactId,
        instance_id: awsConfig.connect.instanceId,
        queue_id: null,
        agent_id: userId,
      });

      // 6. Activity Logに記録
      await this.createActivityLog({
        seller_id: sellerId,
        user_id: userId,
        activity_type: 'call',
        description: `発信: ${phoneNumber}`,
        metadata: {
          call_log_id: callLog.id,
          contact_id: connectResponse.contactId,
          direction: 'outbound',
        },
      });

      logger.info('Outbound call started successfully', {
        callLogId: callLog.id,
        contactId: connectResponse.contactId,
      });

      return {
        callLogId: callLog.id,
        contactId: connectResponse.contactId,
        status: 'initiated',
        startedAt: startedAt.toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to start outbound call', { error, options });

      if (error instanceof CallError) {
        throw error;
      }

      throw new PhoneServiceError(
        'Failed to start outbound call',
        'OUTBOUND_CALL_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * 通話を終了
   */
  async endCall(options: EndCallOptions): Promise<void> {
    const { callLogId, endedAt, durationSeconds, status } = options;

    try {
      logger.info('Ending call', { callLogId, status, durationSeconds });

      // 1. 通話ログを更新
      const { error } = await supabase
        .from('call_logs')
        .update({
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
          call_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', callLogId);

      if (error) {
        throw new Error(`Failed to update call log: ${error.message}`);
      }

      // 2. Amazon Connectで通話を終了（必要に応じて）
      const callLog = await this.getCallLog(callLogId);
      if (callLog && callLog.contact_id && callLog.instance_id) {
        const connectClient = getConnectClient();
        await connectClient.endCall(callLog.contact_id, callLog.instance_id);
      }

      // 3. 録音ファイルが存在する場合、文字起こしジョブをキューに追加
      const { data: recording } = await supabase
        .from('call_recordings')
        .select('*')
        .eq('call_log_id', callLogId)
        .single();

      if (recording && recording.s3_bucket && recording.s3_key) {
        logger.info('Adding transcription job to queue', { callLogId, recordingId: recording.id });
        
        try {
          await addTranscriptionJob(
            callLogId,
            recording.s3_bucket,
            recording.s3_key,
            'ja-JP'
          );
          logger.info('Transcription job added successfully', { callLogId });
        } catch (transcriptionError) {
          // Log error but don't fail the call end operation
          logger.error('Failed to add transcription job (non-critical)', {
            error: transcriptionError,
            callLogId,
          });
        }
      } else {
        logger.warn('No recording found for call, skipping transcription', { callLogId });
      }

      logger.info('Call ended successfully', { callLogId });
    } catch (error: any) {
      logger.error('Failed to end call', { error, options });
      throw new PhoneServiceError(
        'Failed to end call',
        'END_CALL_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * 通話ログを取得
   */
  async getCallLog(callLogId: string): Promise<CallLog | null> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', callLogId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get call log: ${error.message}`);
      }

      return data as CallLog;
    } catch (error: any) {
      logger.error('Failed to get call log', { error, callLogId });
      throw new PhoneServiceError(
        'Failed to get call log',
        'GET_CALL_LOG_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * Seller IDで通話ログを取得
   */
  async getCallLogsBySeller(
    sellerId: string,
    options?: {
      limit?: number;
      offset?: number;
      direction?: CallDirection;
      status?: CallStatus;
    }
  ): Promise<CallLog[]> {
    try {
      let query = supabase
        .from('call_logs')
        .select('*')
        .eq('seller_id', sellerId)
        .order('started_at', { ascending: false });

      if (options?.direction) {
        query = query.eq('direction', options.direction);
      }

      if (options?.status) {
        query = query.eq('call_status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get call logs: ${error.message}`);
      }

      return (data as CallLog[]) || [];
    } catch (error: any) {
      logger.error('Failed to get call logs by seller', { error, sellerId });
      throw new PhoneServiceError(
        'Failed to get call logs',
        'GET_CALL_LOGS_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * 通話ログを作成
   */
  async createCallLog(callLogData: Omit<CallLog, 'id' | 'created_at' | 'updated_at'>): Promise<CallLog> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .insert({
          ...callLogData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create call log: ${error.message}`);
      }

      return data as CallLog;
    } catch (error: any) {
      logger.error('Failed to create call log', { error, callLogData });
      throw new PhoneServiceError(
        'Failed to create call log',
        'CREATE_CALL_LOG_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * Activity Logを作成
   */
  private async createActivityLog(activityData: {
    seller_id: string;
    user_id: string | null;
    activity_type: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('activity_logs').insert({
        ...activityData,
        created_at: new Date().toISOString(),
      });

      if (error) {
        logger.warn('Failed to create activity log', { error, activityData });
        // Activity Log作成失敗は致命的ではないので、エラーをスローしない
      }
    } catch (error: any) {
      logger.warn('Failed to create activity log', { error, activityData });
    }
  }

  /**
   * 電話番号のバリデーション
   */
  private validatePhoneNumber(phoneNumber: string): void {
    // 日本の電話番号形式をチェック
    const phoneRegex = /^(\+81|0)[0-9]{9,10}$/;
    
    if (!phoneNumber) {
      throw new CallError('Phone number is required', 'PHONE_NUMBER_REQUIRED', false);
    }

    // ハイフンを削除
    const cleanedNumber = phoneNumber.replace(/-/g, '');

    if (!phoneRegex.test(cleanedNumber)) {
      throw new CallError(
        'Invalid phone number format. Expected Japanese phone number format.',
        'INVALID_PHONE_NUMBER',
        false
      );
    }
  }

  /**
   * Sellerの存在確認
   */
  private async validateSeller(sellerId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('id')
        .eq('id', sellerId)
        .single();

      if (error || !data) {
        throw new CallError(
          `Seller not found: ${sellerId}`,
          'SELLER_NOT_FOUND',
          false
        );
      }
    } catch (error: any) {
      if (error instanceof CallError) {
        throw error;
      }
      logger.error('Failed to validate seller', { error, sellerId });
      throw new PhoneServiceError(
        'Failed to validate seller',
        'SELLER_VALIDATION_FAILED',
        'validation',
        false,
        error
      );
    }
  }

  /**
   * 着信を処理（Webhook用）
   */
  async handleInboundCall(options: {
    contactId: string;
    phoneNumber: string;
    timestamp: string;
    eventType: 'call_started' | 'call_ended' | 'call_connected';
    instanceId?: string;
    queueId?: string;
    agentId?: string;
  }): Promise<{
    callLogId: string;
    sellerId: string | null;
    matched: boolean;
  }> {
    const { contactId, phoneNumber, timestamp, eventType, instanceId, queueId, agentId } = options;

    try {
      logger.info('Handling inbound call', { contactId, phoneNumber, eventType });

      // 1. 電話番号でSellerを検索
      const seller = await this.findSellerByPhoneNumber(phoneNumber);

      if (!seller) {
        logger.warn('No seller found for phone number', { phoneNumber });
      }

      // 2. イベントタイプに応じて処理
      if (eventType === 'call_started') {
        // 通話開始時：通話ログを作成
        const callLog = await this.createCallLog({
          seller_id: seller?.id || null,
          user_id: agentId || null,
          direction: 'inbound',
          phone_number: phoneNumber,
          call_status: 'completed', // 初期状態（後で更新）
          started_at: new Date(timestamp),
          ended_at: null,
          duration_seconds: null,
          contact_id: contactId,
          instance_id: instanceId || null,
          queue_id: queueId || null,
          agent_id: agentId || null,
        });

        // Activity Logに記録
        if (seller) {
          await this.createActivityLog({
            seller_id: seller.id,
            user_id: agentId || null,
            activity_type: 'call',
            description: `着信: ${phoneNumber}`,
            metadata: {
              call_log_id: callLog.id,
              contact_id: contactId,
              direction: 'inbound',
            },
          });
        }

        logger.info('Inbound call started', {
          callLogId: callLog.id,
          sellerId: seller?.id,
          matched: !!seller,
        });

        return {
          callLogId: callLog.id,
          sellerId: seller?.id || null,
          matched: !!seller,
        };
      } else if (eventType === 'call_ended') {
        // 通話終了時：通話ログを更新
        const callLog = await this.findCallLogByContactId(contactId);

        if (callLog) {
          const endedAt = new Date(timestamp);
          const durationSeconds = Math.floor(
            (endedAt.getTime() - new Date(callLog.started_at).getTime()) / 1000
          );

          await this.endCall({
            callLogId: callLog.id,
            endedAt,
            durationSeconds,
            status: 'completed',
          });

          logger.info('Inbound call ended', {
            callLogId: callLog.id,
            durationSeconds,
          });

          return {
            callLogId: callLog.id,
            sellerId: callLog.seller_id,
            matched: !!callLog.seller_id,
          };
        } else {
          logger.warn('Call log not found for contact ID', { contactId });
          throw new CallError('Call log not found', 'CALL_LOG_NOT_FOUND', false);
        }
      } else if (eventType === 'call_connected') {
        // 通話接続時：ログを更新（必要に応じて）
        const callLog = await this.findCallLogByContactId(contactId);

        if (callLog) {
          logger.info('Inbound call connected', {
            callLogId: callLog.id,
            agentId,
          });

          // エージェント情報を更新
          if (agentId && !callLog.agent_id) {
            await supabase
              .from('call_logs')
              .update({
                agent_id: agentId,
                user_id: agentId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', callLog.id);
          }

          return {
            callLogId: callLog.id,
            sellerId: callLog.seller_id,
            matched: !!callLog.seller_id,
          };
        } else {
          logger.warn('Call log not found for contact ID', { contactId });
          throw new CallError('Call log not found', 'CALL_LOG_NOT_FOUND', false);
        }
      }

      throw new CallError('Unknown event type', 'UNKNOWN_EVENT_TYPE', false);
    } catch (error: any) {
      logger.error('Failed to handle inbound call', { error, options });

      if (error instanceof CallError) {
        throw error;
      }

      throw new PhoneServiceError(
        'Failed to handle inbound call',
        'INBOUND_CALL_FAILED',
        'call',
        false,
        error
      );
    }
  }

  /**
   * 電話番号でSellerを検索
   */
  private async findSellerByPhoneNumber(phoneNumber: string): Promise<{ id: string; name: string } | null> {
    try {
      // ハイフンを削除して正規化
      const cleanedNumber = phoneNumber.replace(/-/g, '');

      // 複数のフィールドで検索（phone1, phone2, phone3）
      const { data, error } = await supabase
        .from('sellers')
        .select('id, name')
        .or(`phone1.eq.${cleanedNumber},phone2.eq.${cleanedNumber},phone3.eq.${cleanedNumber}`)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new Error(`Failed to find seller: ${error.message}`);
      }

      return data as { id: string; name: string };
    } catch (error: any) {
      logger.error('Failed to find seller by phone number', { error, phoneNumber });
      return null; // エラーの場合はnullを返す（致命的ではない）
    }
  }

  /**
   * Contact IDで通話ログを検索
   */
  private async findCallLogByContactId(contactId: string): Promise<CallLog | null> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('contact_id', contactId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to find call log: ${error.message}`);
      }

      return data as CallLog;
    } catch (error: any) {
      logger.error('Failed to find call log by contact ID', { error, contactId });
      return null;
    }
  }

  /**
   * 通話統計を取得
   */
  async getCallStatistics(options: {
    sellerId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalCalls: number;
    inboundCalls: number;
    outboundCalls: number;
    averageDuration: number;
    totalDuration: number;
  }> {
    try {
      let query = supabase.from('call_logs').select('*');

      if (options.sellerId) {
        query = query.eq('seller_id', options.sellerId);
      }

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.startDate) {
        query = query.gte('started_at', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('started_at', options.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get call statistics: ${error.message}`);
      }

      const calls = (data as CallLog[]) || [];
      const totalCalls = calls.length;
      const inboundCalls = calls.filter(c => c.direction === 'inbound').length;
      const outboundCalls = calls.filter(c => c.direction === 'outbound').length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
      const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

      return {
        totalCalls,
        inboundCalls,
        outboundCalls,
        averageDuration,
        totalDuration,
      };
    } catch (error: any) {
      logger.error('Failed to get call statistics', { error, options });
      throw new PhoneServiceError(
        'Failed to get call statistics',
        'GET_STATISTICS_FAILED',
        'call',
        false,
        error
      );
    }
  }
}

// シングルトンインスタンス
let phoneServiceInstance: PhoneService | null = null;

/**
 * PhoneServiceのシングルトンインスタンスを取得
 */
export function getPhoneService(): PhoneService {
  if (!phoneServiceInstance) {
    phoneServiceInstance = new PhoneService();
  }
  return phoneServiceInstance;
}

export default PhoneService;
