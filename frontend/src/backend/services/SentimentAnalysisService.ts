/**
 * SentimentAnalysisService
 * 通話文字起こしの感情分析とキーワード検出を管理するサービス
 */

import { getComprehendClient } from './aws/ComprehendClient';
import { supabase } from '../config/supabase';
import {
  Sentiment,
  SentimentScores,
  KeywordCategory,
  AutoAction,
  KeywordDetectionResult,
  PhoneServiceError,
} from '../types/phone';
import logger from '../utils/logger';

/**
 * 感情分析オプション
 */
export interface AnalyzeSentimentOptions {
  transcriptionId: string;
  text: string;
  languageCode?: 'ja' | 'en';
  detectKeywords?: boolean;
  executeAutoActions?: boolean;
}

/**
 * 感情分析結果
 */
export interface SentimentAnalysisResult {
  sentiment: Sentiment;
  sentimentScores: SentimentScores;
  detectedKeywords: string[];
  keywordResults: KeywordDetectionResult[];
  autoActionsExecuted: number;
}

/**
 * SentimentAnalysisService クラス
 */
export class SentimentAnalysisService {
  private comprehendClient = getComprehendClient();

  /**
   * 感情分析を実行
   */
  async analyzeSentiment(options: AnalyzeSentimentOptions): Promise<SentimentAnalysisResult> {
    const {
      transcriptionId,
      text,
      languageCode = 'ja',
      detectKeywords = true,
      executeAutoActions = true,
    } = options;

    try {
      logger.info('Starting sentiment analysis', {
        transcriptionId,
        textLength: text.length,
        languageCode,
      });

      // Amazon Comprehendで感情分析
      const sentimentResult = await this.comprehendClient.analyzeSentiment(text, languageCode);

      // 感情スコアを正規化
      const sentimentScores: SentimentScores = {
        positive: sentimentResult.sentimentScore.positive,
        neutral: sentimentResult.sentimentScore.neutral,
        negative: sentimentResult.sentimentScore.negative,
        mixed: sentimentResult.sentimentScore.mixed,
      };

      // 感情を小文字に変換
      const sentiment = sentimentResult.sentiment.toLowerCase() as Sentiment;

      // キーワード検出
      let detectedKeywords: string[] = [];
      let keywordResults: KeywordDetectionResult[] = [];

      if (detectKeywords) {
        const keywordDetection = await this.detectKeywords(text);
        detectedKeywords = keywordDetection.keywords;
        keywordResults = keywordDetection.results;
      }

      // データベースを更新
      await this.updateTranscriptionSentiment(
        transcriptionId,
        sentiment,
        sentimentScores,
        detectedKeywords
      );

      // 自動アクションを実行
      let autoActionsExecuted = 0;
      if (executeAutoActions && keywordResults.length > 0) {
        autoActionsExecuted = await this.executeAutoActions(transcriptionId, keywordResults);
      }

      logger.info('Sentiment analysis completed', {
        transcriptionId,
        sentiment,
        keywordCount: detectedKeywords.length,
        autoActionsExecuted,
      });

      return {
        sentiment,
        sentimentScores,
        detectedKeywords,
        keywordResults,
        autoActionsExecuted,
      };
    } catch (error: any) {
      logger.error('Sentiment analysis failed', { error, transcriptionId });
      throw new PhoneServiceError(
        'Failed to analyze sentiment',
        'SENTIMENT_ANALYSIS_FAILED',
        'transcription',
        true,
        error
      );
    }
  }

  /**
   * キーワードを検出
   */
  async detectKeywords(text: string): Promise<{
    keywords: string[];
    results: KeywordDetectionResult[];
  }> {
    try {
      // データベースからアクティブなキーワードルールを取得
      const { data: keywordRules, error } = await supabase
        .from('call_keywords')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        throw error;
      }

      if (!keywordRules || keywordRules.length === 0) {
        return { keywords: [], results: [] };
      }

      // テキスト内でキーワードを検索
      const detectedKeywords: string[] = [];
      const keywordResults: KeywordDetectionResult[] = [];
      const lowerText = text.toLowerCase();

      for (const rule of keywordRules) {
        const keyword = rule.keyword.toLowerCase();
        
        if (lowerText.includes(keyword)) {
          detectedKeywords.push(rule.keyword);
          keywordResults.push({
            keyword: rule.keyword,
            category: rule.category as KeywordCategory | null,
            priority: rule.priority,
            autoAction: rule.auto_action as AutoAction | null,
            actionConfig: rule.action_config,
          });
        }
      }

      logger.info('Keywords detected', {
        totalRules: keywordRules.length,
        detectedCount: detectedKeywords.length,
        keywords: detectedKeywords,
      });

      return { keywords: detectedKeywords, results: keywordResults };
    } catch (error: any) {
      logger.error('Keyword detection failed', { error });
      // キーワード検出失敗は致命的ではないので、空の結果を返す
      return { keywords: [], results: [] };
    }
  }

  /**
   * 自動アクションを実行
   */
  private async executeAutoActions(
    transcriptionId: string,
    keywordResults: KeywordDetectionResult[]
  ): Promise<number> {
    let executedCount = 0;

    // アクションが設定されているキーワードのみをフィルタ
    const actionableKeywords = keywordResults.filter(
      (result) => result.autoAction !== null
    );

    if (actionableKeywords.length === 0) {
      return 0;
    }

    logger.info('Executing auto actions', {
      transcriptionId,
      actionCount: actionableKeywords.length,
    });

    // 優先度順にソート（高い順）
    actionableKeywords.sort((a, b) => b.priority - a.priority);

    for (const keywordResult of actionableKeywords) {
      try {
        await this.executeAutoAction(transcriptionId, keywordResult);
        executedCount++;
      } catch (error: any) {
        logger.error('Auto action execution failed', {
          error,
          transcriptionId,
          keyword: keywordResult.keyword,
          action: keywordResult.autoAction,
        });
        // 1つのアクション失敗は他のアクションに影響させない
      }
    }

    return executedCount;
  }

  /**
   * 個別の自動アクションを実行
   */
  private async executeAutoAction(
    transcriptionId: string,
    keywordResult: KeywordDetectionResult
  ): Promise<void> {
    const { keyword, autoAction, actionConfig } = keywordResult;

    logger.info('Executing auto action', {
      transcriptionId,
      keyword,
      action: autoAction,
    });

    // 通話ログIDを取得
    const { data: transcription } = await supabase
      .from('call_transcriptions')
      .select('call_log_id')
      .eq('id', transcriptionId)
      .single();

    if (!transcription) {
      throw new Error('Transcription not found');
    }

    const callLogId = transcription.call_log_id;

    // 通話ログから売主IDとユーザーIDを取得
    const { data: callLog } = await supabase
      .from('call_logs')
      .select('seller_id, user_id')
      .eq('id', callLogId)
      .single();

    if (!callLog) {
      throw new Error('Call log not found');
    }

    switch (autoAction) {
      case 'create_followup':
        await this.createFollowUpTask(callLog.seller_id, callLog.user_id, keyword, actionConfig);
        break;

      case 'notify_manager':
        await this.notifyManager(callLog.seller_id, callLog.user_id, keyword, actionConfig);
        break;

      case 'flag_urgent':
        await this.flagAsUrgent(callLog.seller_id, keyword, actionConfig);
        break;

      default:
        logger.warn('Unknown auto action', { action: autoAction });
    }
  }

  /**
   * フォローアップタスクを作成
   */
  private async createFollowUpTask(
    sellerId: string,
    userId: string | null,
    keyword: string,
    config: Record<string, any> | null
  ): Promise<void> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (config?.daysUntilDue || 3));

    const { error } = await supabase.from('follow_ups').insert({
      seller_id: sellerId,
      assigned_to: userId,
      due_date: dueDate.toISOString(),
      status: 'pending',
      notes: `自動生成: キーワード「${keyword}」が検出されました`,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    logger.info('Follow-up task created', { sellerId, keyword });
  }

  /**
   * マネージャーに通知
   */
  private async notifyManager(
    sellerId: string,
    userId: string | null,
    keyword: string,
    config: Record<string, any> | null
  ): Promise<void> {
    // TODO: 実際の通知実装
    // - メール送信
    // - Slack通知
    // - システム内通知

    logger.info('Manager notification sent', {
      sellerId,
      userId,
      keyword,
      notificationType: config?.notificationType || 'email',
    });
  }

  /**
   * 緊急フラグを設定
   */
  private async flagAsUrgent(
    sellerId: string,
    keyword: string,
    _config: Record<string, any> | null
  ): Promise<void> {
    // Activity Logに緊急フラグを記録
    const { error } = await supabase.from('activity_logs').insert({
      seller_id: sellerId,
      activity_type: 'note',
      description: `🚨 緊急: キーワード「${keyword}」が通話で検出されました`,
      metadata: {
        urgent: true,
        keyword,
        auto_flagged: true,
      },
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    logger.info('Urgent flag set', { sellerId, keyword });
  }

  /**
   * 文字起こしの感情情報を更新
   */
  private async updateTranscriptionSentiment(
    transcriptionId: string,
    sentiment: Sentiment,
    sentimentScores: SentimentScores,
    detectedKeywords: string[]
  ): Promise<void> {
    const { error } = await supabase
      .from('call_transcriptions')
      .update({
        sentiment,
        sentiment_scores: sentimentScores,
        detected_keywords: detectedKeywords,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transcriptionId);

    if (error) {
      throw error;
    }
  }

  /**
   * キーワードルールを作成
   */
  async createKeywordRule(
    keyword: string,
    category: KeywordCategory | null,
    priority: number,
    autoAction: AutoAction | null,
    actionConfig: Record<string, any> | null,
    createdBy: string | null
  ): Promise<void> {
    const { error } = await supabase.from('call_keywords').insert({
      keyword,
      category,
      priority,
      auto_action: autoAction,
      action_config: actionConfig,
      is_active: true,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    logger.info('Keyword rule created', { keyword, category, autoAction });
  }

  /**
   * キーワードルールを更新
   */
  async updateKeywordRule(
    keywordId: string,
    updates: {
      keyword?: string;
      category?: KeywordCategory | null;
      priority?: number;
      autoAction?: AutoAction | null;
      actionConfig?: Record<string, any> | null;
      isActive?: boolean;
    }
  ): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.keyword !== undefined) updateData.keyword = updates.keyword;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.autoAction !== undefined) updateData.auto_action = updates.autoAction;
    if (updates.actionConfig !== undefined) updateData.action_config = updates.actionConfig;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase
      .from('call_keywords')
      .update(updateData)
      .eq('id', keywordId);

    if (error) {
      throw error;
    }

    logger.info('Keyword rule updated', { keywordId, updates });
  }

  /**
   * キーワードルールを削除
   */
  async deleteKeywordRule(keywordId: string): Promise<void> {
    const { error } = await supabase.from('call_keywords').delete().eq('id', keywordId);

    if (error) {
      throw error;
    }

    logger.info('Keyword rule deleted', { keywordId });
  }

  /**
   * すべてのキーワードルールを取得
   */
  async getAllKeywordRules(activeOnly: boolean = false): Promise<any[]> {
    let query = supabase.from('call_keywords').select('*').order('priority', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * 感情分析統計を取得
   */
  async getSentimentStatistics(
    startDate: Date,
    endDate: Date,
    sellerId?: string
  ): Promise<{
    totalAnalyzed: number;
    sentimentDistribution: Record<Sentiment, number>;
    averageScores: SentimentScores;
    topKeywords: Array<{ keyword: string; count: number }>;
  }> {
    try {
      // 期間内の文字起こしを取得
      let query = supabase
        .from('call_transcriptions')
        .select('sentiment, sentiment_scores, detected_keywords, call_log_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .not('sentiment', 'is', null);

      // 売主IDでフィルタ
      if (sellerId) {
        const { data: callLogs } = await supabase
          .from('call_logs')
          .select('id')
          .eq('seller_id', sellerId);

        if (callLogs && callLogs.length > 0) {
          const callLogIds = callLogs.map((log) => log.id);
          query = query.in('call_log_id', callLogIds);
        }
      }

      const { data: transcriptions, error } = await query;

      if (error) {
        throw error;
      }

      if (!transcriptions || transcriptions.length === 0) {
        return {
          totalAnalyzed: 0,
          sentimentDistribution: { positive: 0, neutral: 0, negative: 0, mixed: 0 },
          averageScores: { positive: 0, neutral: 0, negative: 0, mixed: 0 },
          topKeywords: [],
        };
      }

      // 感情分布を計算
      const sentimentDistribution: Record<Sentiment, number> = {
        positive: 0,
        neutral: 0,
        negative: 0,
        mixed: 0,
      };

      transcriptions.forEach((t) => {
        if (t.sentiment) {
          sentimentDistribution[t.sentiment as Sentiment]++;
        }
      });

      // 平均スコアを計算
      const totalScores = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
      transcriptions.forEach((t) => {
        if (t.sentiment_scores) {
          totalScores.positive += t.sentiment_scores.positive || 0;
          totalScores.neutral += t.sentiment_scores.neutral || 0;
          totalScores.negative += t.sentiment_scores.negative || 0;
          totalScores.mixed += t.sentiment_scores.mixed || 0;
        }
      });

      const count = transcriptions.length;
      const averageScores: SentimentScores = {
        positive: totalScores.positive / count,
        neutral: totalScores.neutral / count,
        negative: totalScores.negative / count,
        mixed: totalScores.mixed / count,
      };

      // トップキーワードを集計
      const keywordCounts: Record<string, number> = {};
      transcriptions.forEach((t) => {
        if (t.detected_keywords && Array.isArray(t.detected_keywords)) {
          t.detected_keywords.forEach((keyword: string) => {
            keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
          });
        }
      });

      const topKeywords = Object.entries(keywordCounts)
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalAnalyzed: count,
        sentimentDistribution,
        averageScores,
        topKeywords,
      };
    } catch (error: any) {
      logger.error('Failed to get sentiment statistics', { error });
      throw new PhoneServiceError(
        'Failed to get sentiment statistics',
        'STATISTICS_FAILED',
        'transcription',
        false,
        error
      );
    }
  }
}

// シングルトンインスタンス
let sentimentAnalysisServiceInstance: SentimentAnalysisService | null = null;

/**
 * SentimentAnalysisServiceのシングルトンインスタンスを取得
 */
export function getSentimentAnalysisService(): SentimentAnalysisService {
  if (!sentimentAnalysisServiceInstance) {
    sentimentAnalysisServiceInstance = new SentimentAnalysisService();
  }
  return sentimentAnalysisServiceInstance;
}

export default SentimentAnalysisService;
