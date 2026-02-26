import { BaseRepository } from '../repositories/BaseRepository';
import { Activity, ActivityType, ActivityWithEmployee } from '../types';

export interface RecordActivityParams {
  sellerId: string;
  employeeId: string;
  type: ActivityType;
  content: string;
  result?: string;
  metadata?: Record<string, any>;
}

export interface RecordHearingParams {
  sellerId: string;
  employeeId: string;
  content: string;
  metadata?: Record<string, any>;
}

export class FollowUpService extends BaseRepository {
  /**
   * 追客活動を記録
   */
  async recordActivity(params: RecordActivityParams): Promise<Activity> {
    const { data: activity, error } = await this.table('activities')
      .insert({
        seller_id: params.sellerId,
        employee_id: params.employeeId,
        type: params.type,
        content: params.content,
        result: params.result,
        metadata: params.metadata || {},
      })
      .select()
      .single();

    if (error || !activity) {
      throw new Error(`Failed to record activity: ${error?.message}`);
    }

    return activity;
  }

  /**
   * 追客履歴を取得（時系列順、担当者情報を含む）
   */
  async getActivityHistory(sellerId: string): Promise<ActivityWithEmployee[]> {
    const { data: activities, error } = await this.table('activities')
      .select(`
        *,
        employees:employee_id (
          id,
          email,
          name
        )
      `)
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get activity history: ${error.message}`);
    }

    if (!activities) {
      return [];
    }

    // スネークケースからキャメルケースに変換し、employee情報を整形
    return activities.map((activity: any) => ({
      id: activity.id,
      sellerId: activity.seller_id,
      employeeId: activity.employee_id,
      type: activity.type,
      content: activity.content,
      result: activity.result,
      metadata: activity.metadata,
      createdAt: activity.created_at,
      employee: activity.employees ? {
        id: activity.employees.id,
        email: activity.employees.email,
        name: activity.employees.name,
      } : null,
    }));
  }

  /**
   * ヒアリング内容を記録
   */
  async recordHearing(params: RecordHearingParams): Promise<Activity> {
    return this.recordActivity({
      sellerId: params.sellerId,
      employeeId: params.employeeId,
      type: ActivityType.HEARING,
      content: params.content,
      metadata: params.metadata,
    });
  }

  /**
   * 次電日を設定
   */
  async setNextCallDate(sellerId: string, nextCallDate: Date): Promise<void> {
    const { error } = await this.table('sellers')
      .update({ next_call_date: nextCallDate.toISOString().split('T')[0] })
      .eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to set next call date: ${error.message}`);
    }
  }

  /**
   * 確度レベルを更新
   */
  async updateConfidence(
    sellerId: string,
    confidence: 'A' | 'B' | 'B_PRIME' | 'C' | 'D' | 'E' | 'DUPLICATE'
  ): Promise<void> {
    const { error } = await this.table('sellers')
      .update({ confidence })
      .eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to update confidence: ${error.message}`);
    }
  }

  /**
   * メール送信成功時の活動ログを自動記録
   */
  async recordEmailActivity(
    sellerId: string,
    employeeId: string,
    emailType: 'valuation' | 'follow_up',
    messageId: string
  ): Promise<Activity> {
    const content =
      emailType === 'valuation'
        ? '査定結果メールを送信しました'
        : 'フォローアップメールを送信しました';

    return this.recordActivity({
      sellerId,
      employeeId,
      type: ActivityType.EMAIL,
      content,
      result: 'success',
      metadata: {
        emailType,
        messageId,
      },
    });
  }

  /**
   * 不通フラグを設定
   */
  async markAsUnreachable(sellerId: string): Promise<void> {
    const { error } = await this.table('sellers')
      .update({
        is_unreachable: true,
        unreachable_since: new Date().toISOString(),
      })
      .eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to mark as unreachable: ${error.message}`);
    }
  }

  /**
   * 不通フラグをクリア
   */
  async clearUnreachable(sellerId: string): Promise<void> {
    const { error } = await this.table('sellers')
      .update({
        is_unreachable: false,
        unreachable_since: null,
      })
      .eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to clear unreachable: ${error.message}`);
    }
  }

  /**
   * 1番電話不通時2度目電話フラグを設定
   */
  async setSecondCallAfterUnreachable(sellerId: string, value: boolean): Promise<void> {
    const { error } = await this.table('sellers')
      .update({ second_call_after_unreachable: value })
      .eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to set second call flag: ${error.message}`);
    }
  }

  /**
   * 連絡方法を設定
   */
  async setContactMethod(
    sellerId: string,
    method: 'Email' | 'Smail' | '電話'
  ): Promise<void> {
    const { error } = await this.table('sellers')
      .update({ contact_method: method })
      .eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to set contact method: ${error.message}`);
    }
  }

  /**
   * 連絡取りやすい時間帯を設定
   */
  async setPreferredContactTime(sellerId: string, time: string): Promise<void> {
    const { error } = await this.table('sellers')
      .update({ preferred_contact_time: time })
      .eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to set preferred contact time: ${error.message}`);
    }
  }

  /**
   * 追客進捗情報を一括更新
   */
  async updateFollowUpProgress(
    sellerId: string,
    updates: {
      isUnreachable?: boolean;
      secondCallAfterUnreachable?: boolean;
      nextCallDate?: Date;
      confidence?: 'A' | 'B' | 'B_PRIME' | 'C' | 'D' | 'E' | 'DUPLICATE';
      contactMethod?: 'Email' | 'Smail' | '電話';
      preferredContactTime?: string;
    }
  ): Promise<void> {
    const updateData: any = {};

    if (updates.isUnreachable !== undefined) {
      updateData.is_unreachable = updates.isUnreachable;
      if (updates.isUnreachable) {
        updateData.unreachable_since = new Date().toISOString();
      } else {
        updateData.unreachable_since = null;
      }
    }

    if (updates.secondCallAfterUnreachable !== undefined) {
      updateData.second_call_after_unreachable = updates.secondCallAfterUnreachable;
    }

    if (updates.nextCallDate !== undefined) {
      updateData.next_call_date = updates.nextCallDate.toISOString().split('T')[0];
    }

    if (updates.confidence !== undefined) {
      updateData.confidence = updates.confidence;
    }

    if (updates.contactMethod !== undefined) {
      updateData.contact_method = updates.contactMethod;
    }

    if (updates.preferredContactTime !== undefined) {
      updateData.preferred_contact_time = updates.preferredContactTime;
    }

    if (Object.keys(updateData).length === 0) {
      return;
    }

    const { error } = await this.table('sellers').update(updateData).eq('id', sellerId);

    if (error) {
      throw new Error(`Failed to update follow-up progress: ${error.message}`);
    }
  }
}
