/**
 * アラートサービス
 * メトリクスを監視し、閾値を超えた場合にアラートを発行
 */

import { supabase } from '../config/supabase';
import { SlackNotifier } from './SlackNotifier';
import { EmailNotifier } from './EmailNotifier';

interface AlertRule {
  id: string;
  name: string;
  metric_type: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  notification_channels: string[];
  enabled: boolean;
}

interface MetricValue {
  metric_type: string;
  value: number;
  timestamp: Date;
}

export class AlertService {
  private slackNotifier: SlackNotifier;
  private emailNotifier: EmailNotifier;

  constructor() {
    this.slackNotifier = new SlackNotifier();
    this.emailNotifier = new EmailNotifier();
  }

  /**
   * すべてのアラートルールをチェック
   */
  async checkAllAlerts(): Promise<void> {
    try {
      // 有効なアラートルールを取得
      const { data: rules, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('enabled', true);

      if (error) {
        console.error('アラートルール取得エラー:', error);
        return;
      }

      if (!rules || rules.length === 0) {
        console.log('有効なアラートルールがありません');
        return;
      }

      // 各ルールをチェック
      for (const rule of rules) {
        await this.checkRule(rule as AlertRule);
      }
    } catch (error) {
      console.error('アラートチェックエラー:', error);
    }
  }

  /**
   * 個別のアラートルールをチェック
   */
  private async checkRule(rule: AlertRule): Promise<void> {
    try {
      // 最新のメトリクス値を取得
      const metricValue = await this.getLatestMetricValue(rule.metric_type);

      if (!metricValue) {
        console.log(`メトリクスが見つかりません: ${rule.metric_type}`);
        return;
      }

      // 条件をチェック
      const isTriggered = this.evaluateCondition(
        metricValue.value,
        rule.condition,
        rule.threshold
      );

      if (isTriggered) {
        await this.triggerAlert(rule, metricValue);
      }
    } catch (error) {
      console.error(`アラートルールチェックエラー (${rule.name}):`, error);
    }
  }

  /**
   * 最新のメトリクス値を取得
   */
  private async getLatestMetricValue(metricType: string): Promise<MetricValue | null> {
    try {
      // 集計済みメトリクスから最新の時間単位データを取得
      const { data, error } = await supabase
        .from('sync_metrics_aggregated')
        .select('metric_type, avg_value, period_start')
        .eq('metric_type', metricType)
        .eq('aggregation_period', 'hourly')
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        metric_type: data.metric_type,
        value: data.avg_value,
        timestamp: new Date(data.period_start)
      };
    } catch (error) {
      console.error('メトリクス値取得エラー:', error);
      return null;
    }
  }

  /**
   * 条件を評価
   */
  private evaluateCondition(
    value: number,
    condition: string,
    threshold: number
  ): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * アラートをトリガー
   */
  private async triggerAlert(rule: AlertRule, metric: MetricValue): Promise<void> {
    try {
      // アラート履歴を記録
      const { data: alert, error } = await supabase
        .from('alert_history')
        .insert({
          rule_id: rule.id,
          triggered_at: new Date().toISOString(),
          metric_value: metric.value,
          severity: rule.severity,
          message: this.buildAlertMessage(rule, metric),
          resolved: false
        })
        .select()
        .single();

      if (error) {
        console.error('アラート履歴記録エラー:', error);
        return;
      }

      // 通知を送信
      await this.sendNotifications(rule, metric, alert.id);
    } catch (error) {
      console.error('アラートトリガーエラー:', error);
    }
  }

  /**
   * アラートメッセージを構築
   */
  private buildAlertMessage(rule: AlertRule, metric: MetricValue): string {
    const conditionText = this.getConditionText(rule.condition);
    return `アラート: ${rule.name}\n` +
           `メトリクス: ${rule.metric_type}\n` +
           `現在値: ${metric.value.toFixed(2)}\n` +
           `条件: ${conditionText} ${rule.threshold}\n` +
           `重要度: ${rule.severity}\n` +
           `時刻: ${metric.timestamp.toISOString()}`;
  }

  /**
   * 条件テキストを取得
   */
  private getConditionText(condition: string): string {
    switch (condition) {
      case 'greater_than':
        return '>';
      case 'less_than':
        return '<';
      case 'equals':
        return '=';
      default:
        return '?';
    }
  }

  /**
   * 通知を送信
   */
  private async sendNotifications(
    rule: AlertRule,
    metric: MetricValue,
    alertId: string
  ): Promise<void> {
    const message = this.buildAlertMessage(rule, metric);

    for (const channel of rule.notification_channels) {
      try {
        if (channel === 'slack') {
          await this.slackNotifier.sendAlert(message, rule.severity);
        } else if (channel === 'email') {
          await this.emailNotifier.sendAlert(message, rule.severity);
        }
      } catch (error) {
        console.error(`通知送信エラー (${channel}):`, error);
      }
    }
  }

  /**
   * アラートを解決済みにマーク
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alert_history')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        console.error('アラート解決エラー:', error);
      }
    } catch (error) {
      console.error('アラート解決エラー:', error);
    }
  }
}
