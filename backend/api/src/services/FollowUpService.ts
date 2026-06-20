import { BaseRepository } from '../repositories/BaseRepository';
import { Activity, ActivityType, ConfidenceLevel } from '../types';

export interface ActivityRecord {
  sellerId: string;
  type: ActivityType;
  content: string;
  result?: string;
  employeeId: string;
}

export interface HearingContent {
  content: string;
  employeeId: string;
}

export class FollowUpService extends BaseRepository {
  /**
   * 追客活動を記録
   */
  async recordActivity(activity: ActivityRecord): Promise<Activity> {
    const { data, error } = await this.table('activities')
      .insert({
        seller_id: activity.sellerId,
        employee_id: activity.employeeId,
        type: activity.type,
        content: activity.content,
        result: activity.result,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to record activity');
    }

    return data;
  }

  /**
   * 追客履歴を取得（時系列順）
   */
  async getActivityHistory(sellerId: string): Promise<Activity[]> {
    const { data, error } = await this.table('activities')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get activity history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 次電日を設定
   */
  async setNextCallDate(sellerId: string, date: Date): Promise<void> {
    const { error } = await this.table('sellers')
      .update({ next_call_date: date.toISOString().split('T')[0] })
      .eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to set next call date: ${error.message}`);
    }
  }

  /**
   * ヒアリング内容を記録
   */
  async recordHearing(
    sellerId: string,
    content: HearingContent
  ): Promise<Activity> {
    return this.recordActivity({
      sellerId,
      type: ActivityType.HEARING,
      content: content.content,
      employeeId: content.employeeId,
    });
  }

  /**
   * 確度を更新
   */
  async updateConfidence(
    sellerId: string,
    level: ConfidenceLevel
  ): Promise<void> {
    const { error } = await this.table('sellers')
      .update({ confidence: level })
      .eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to update confidence: ${error.message}`);
    }
  }
}
