/**
 * 買主ステータス算出ロジック
 * 
 * AppSheetのIFSロジックと同一の優先順位でステータスを算出します。
 * 条件は上から順に評価し、最初に一致した条件のステータスを返します。
 */

import {
  isToday,
  isTomorrow,
  getDayOfWeek,
  isPast,
  isDaysFromToday,
  isTodayOrPast,
  isWithinDaysAgo,
  isAfterOrEqual,
  getTodayDayOfWeek,
} from '../utils/dateHelpers';
import {
  isBlank,
  isNotBlank,
  contains,
  notContains,
  equals,
  notEquals,
  and,
  or,
  not,
} from '../utils/fieldHelpers';

/**
 * 買主データ型定義
 */
export interface BuyerData {
  // 基本情報
  buyer_number: string;
  name: string;
  phone_number?: string | null;
  email?: string | null;
  
  // 日付フィールド
  reception_date?: Date | string | null;
  latest_viewing_date?: Date | string | null;
  next_call_date?: Date | string | null;
  
  // ステータスフィールド
  follow_up_assignee?: string | null;
  latest_status?: string | null;
  inquiry_confidence?: string | null;
  
  // 問い合わせ関連
  inquiry_email_phone?: string | null;
  inquiry_email_reply?: string | null;
  three_calls_confirmed?: string | null;
  broker_inquiry?: string | null;
  inquiry_source?: string | null;
  
  // 内覧関連
  viewing_result_follow_up?: string | null;
  viewing_unconfirmed?: string | null;
  viewing_type_general?: string | null;
  post_viewing_seller_contact?: string | null;
  notification_sender?: string | null;
  
  // アンケート関連
  valuation_survey?: string | null;
  valuation_survey_confirmed?: string | null;
  broker_survey?: string | null;
  
  // その他
  day_of_week?: string | null;
  pinrich?: string | null;
  email_confirmation?: string | null;
  email_confirmation_assignee?: string | null;
  viewing_promotion_not_needed?: string | null;
  viewing_promotion_sender?: string | null;
  past_buyer_list?: string | null;
  price?: string | null;
}

/**
 * ステータス算出結果
 */
export interface StatusResult {
  status: string; // ステータス文字列（空文字列の場合は該当なし）
  priority: number; // 条件の優先順位（1-35、0は該当なし）
  matchedCondition: string; // マッチした条件の説明
}

/**
 * 買主のステータスを算出
 * AppSheetのIFSロジックと同一の条件順序で評価
 * 
 * @param buyer 買主データ
 * @returns ステータス算出結果
 */
export function calculateBuyerStatus(buyer: BuyerData): StatusResult {
  try {
    // Priority 1: 査定アンケート回答あり
    if (
      and(
        isNotBlank(buyer.valuation_survey),
        isBlank(buyer.valuation_survey_confirmed)
      )
    ) {
      return {
        status: '査定アンケート回答あり',
        priority: 1,
        matchedCondition: '査定アンケート回答あり',
      };
    }
    
    // Priority 2: 業者問合せあり
    if (equals(buyer.broker_survey, '未')) {
      return {
        status: '業者問合せあり',
        priority: 2,
        matchedCondition: '業者向けアンケート = 未',
      };
    }
    
    // Priority 3: 内覧日前日
    if (
      and(
        isNotBlank(buyer.latest_viewing_date),
        or(
          and(
            isTomorrow(buyer.latest_viewing_date),
            not(equals(getDayOfWeek(buyer.latest_viewing_date), '木曜日'))
          ),
          and(
            isDaysFromToday(buyer.latest_viewing_date, 2),
            equals(getDayOfWeek(buyer.latest_viewing_date), '木曜日')
          )
        )
      )
    ) {
      return {
        status: '内覧日前日',
        priority: 3,
        matchedCondition: '内覧日の前日（木曜日は2日前）',
      };
    }
    
    // Priority 4: 内覧未確定
    if (equals(buyer.viewing_unconfirmed, '未確定')) {
      return {
        status: '内覧未確定',
        priority: 4,
        matchedCondition: '内覧が未確定',
      };
    }
    
    // Priority 5: 一般媒介_内覧後売主連絡未
    if (
      and(
        equals(buyer.viewing_type_general, '一般媒介'),
        isNotBlank(buyer.latest_viewing_date),
        isPast(buyer.latest_viewing_date),
        isBlank(buyer.post_viewing_seller_contact)
      )
    ) {
      return {
        status: '一般媒介_内覧後売主連絡未',
        priority: 5,
        matchedCondition: '一般媒介で内覧後の売主連絡が未完了',
      };
    }
    
    // Priority 6: ⑯当日TEL
    if (
      and(
        isNotBlank(buyer.next_call_date),
        isTodayOrPast(buyer.next_call_date),
        isNotBlank(buyer.follow_up_assignee)
      )
    ) {
      const assignee = buyer.follow_up_assignee || '';
      return {
        status: `⑯当日TEL（${assignee}）`,
        priority: 6,
        matchedCondition: '次電日が当日以前',
      };
    }
    
    // Priority 7: 問合メール未対応
    if (
      and(
        equals(buyer.inquiry_email_phone, '未'),
        equals(buyer.inquiry_email_reply, '未')
      )
    ) {
      return {
        status: '問合メール未対応',
        priority: 7,
        matchedCondition: '問い合わせメールへの対応が未完了',
      };
    }
    
    // Priority 8: 3回架電未
    if (
      and(
        isBlank(buyer.three_calls_confirmed),
        isBlank(buyer.latest_viewing_date),
        isBlank(buyer.follow_up_assignee),
        isBlank(buyer.latest_status),
        isBlank(buyer.broker_inquiry)
      )
    ) {
      return {
        status: '3回架電未',
        priority: 8,
        matchedCondition: '3回架電が未完了',
      };
    }
    
    // Priority 9-15: 担当者別内覧後未入力
    const viewingPostInputConditions = [
      { assignee: 'Y', priority: 9, status: 'Y_内覧後未入力' },
      { assignee: '生', priority: 10, status: '生_内覧後未入力' },
      { assignee: 'U', priority: 11, status: 'U_内覧後未入力' },
      { assignee: '久', priority: 12, status: '久_内覧後未入力' },
      { assignee: 'K', priority: 13, status: 'K_内覧後未入力' },
      { assignee: 'I', priority: 14, status: 'I_内覧後未入力' },
      { assignee: 'R', priority: 15, status: 'R_内覧後未入力' },
    ];
    
    for (const condition of viewingPostInputConditions) {
      if (
        and(
          equals(buyer.follow_up_assignee, condition.assignee),
          isNotBlank(buyer.latest_viewing_date),
          isPast(buyer.latest_viewing_date),
          isBlank(buyer.viewing_result_follow_up)
        )
      ) {
        return {
          status: condition.status,
          priority: condition.priority,
          matchedCondition: `担当${condition.assignee}: 内覧後の入力が未完了`,
        };
      }
    }
    
    // Priority 16-35: 他の条件は calculateBuyerStatusComplete で評価
    return calculateBuyerStatusComplete(buyer);
  } catch (error) {
    console.error('[calculateBuyerStatus] Error:', error);
    return {
      status: '',
      priority: 0,
      matchedCondition: 'エラー',
    };
  }
}

/**
 * Priority 16-35の条件評価を追加
 */

/**
 * 買主のステータスを算出（完全版）
 * Priority 16-35の条件を評価
 * 
 * @param buyer 買主データ
 * @returns ステータス算出結果
 */
export function calculateBuyerStatusComplete(buyer: BuyerData): StatusResult {
  try {
    // Priority 1-15は既にcalculateBuyerStatus関数で評価済み
    // ここではPriority 16-35のみを評価
    
    // Priority 16-22: 担当者別次電日空欄
    const statusAorB = or(
      equals(buyer.latest_status, 'A:この物件を気に入っている（こちらからの一押しが必要）'),
      equals(buyer.latest_status, 'B:1年以内に引っ越し希望だが、この物件ではない。駐車場の要件や、日当たり等が合わない。')
    );
    
    // Priority 16: 担当(Y)次電日空欄
    if (
      and(
        statusAorB,
        isBlank(buyer.next_call_date),
        equals(buyer.follow_up_assignee, 'Y')
      )
    ) {
      return {
        status: '担当(Y)次電日空欄',
        priority: 16,
        matchedCondition: '担当Y: 次電日が空欄',
      };
    }
    
    // Priority 17: 担当(久)次電日空欄
    if (
      and(
        statusAorB,
        isBlank(buyer.broker_inquiry),
        isBlank(buyer.next_call_date),
        equals(buyer.follow_up_assignee, '久')
      )
    ) {
      return {
        status: '担当(久)次電日空欄',
        priority: 17,
        matchedCondition: '担当久: 次電日が空欄',
      };
    }
    
    // Priority 18: 担当(U)次電日空欄
    if (
      and(
        statusAorB,
        isBlank(buyer.next_call_date),
        isBlank(buyer.broker_inquiry),
        equals(buyer.follow_up_assignee, 'U')
      )
    ) {
      return {
        status: '担当(U)次電日空欄',
        priority: 18,
        matchedCondition: '担当U: 次電日が空欄',
      };
    }
    
    // Priority 19: 担当(R)次電日空欄
    if (
      and(
        statusAorB,
        isBlank(buyer.next_call_date),
        isBlank(buyer.broker_inquiry),
        equals(buyer.follow_up_assignee, 'R')
      )
    ) {
      return {
        status: '担当(R)次電日空欄',
        priority: 19,
        matchedCondition: '担当R: 次電日が空欄',
      };
    }
    
    // Priority 20: 担当(K)次電日空欄
    if (
      and(
        statusAorB,
        isBlank(buyer.next_call_date),
        isBlank(buyer.broker_inquiry),
        equals(buyer.follow_up_assignee, 'K')
      )
    ) {
      return {
        status: '担当(K)次電日空欄',
        priority: 20,
        matchedCondition: '担当K: 次電日が空欄',
      };
    }
    
    // Priority 21: 担当(I)次電日空欄
    if (
      and(
        statusAorB,
        isBlank(buyer.next_call_date),
        isBlank(buyer.broker_inquiry),
        equals(buyer.follow_up_assignee, 'I')
      )
    ) {
      return {
        status: '担当(I)次電日空欄',
        priority: 21,
        matchedCondition: '担当I: 次電日が空欄',
      };
    }
    
    // Priority 22: 担当(生)次電日空欄
    if (
      and(
        statusAorB,
        isBlank(buyer.next_call_date),
        isBlank(buyer.broker_inquiry),
        equals(buyer.follow_up_assignee, '生')
      )
    ) {
      return {
        status: '担当(生)次電日空欄',
        priority: 22,
        matchedCondition: '担当生: 次電日が空欄',
      };
    }
    
    // Priority 23-30: 担当者別
    if (equals(buyer.follow_up_assignee, 'Y')) {
      return {
        status: '担当(Y)',
        priority: 23,
        matchedCondition: '担当Y',
      };
    }
    
    if (equals(buyer.follow_up_assignee, 'W')) {
      return {
        status: '担当(W)',
        priority: 24,
        matchedCondition: '担当W',
      };
    }
    
    if (equals(buyer.follow_up_assignee, 'U')) {
      return {
        status: '担当(U)',
        priority: 25,
        matchedCondition: '担当U',
      };
    }
    
    if (equals(buyer.follow_up_assignee, '生')) {
      return {
        status: '担当(生)',
        priority: 26,
        matchedCondition: '担当生',
      };
    }
    
    if (equals(buyer.follow_up_assignee, 'K')) {
      return {
        status: '担当(K)',
        priority: 27,
        matchedCondition: '担当K',
      };
    }
    
    if (equals(buyer.follow_up_assignee, '久')) {
      return {
        status: '担当(久)',
        priority: 28,
        matchedCondition: '担当久',
      };
    }
    
    if (equals(buyer.follow_up_assignee, 'I')) {
      return {
        status: '担当(I)',
        priority: 29,
        matchedCondition: '担当I',
      };
    }
    
    if (equals(buyer.follow_up_assignee, 'R')) {
      return {
        status: '担当(R)',
        priority: 30,
        matchedCondition: '担当R',
      };
    }
    
    // Priority 31: ピンリッチ未登録
    if (
      or(
        and(
          isBlank(buyer.pinrich),
          isNotBlank(buyer.email),
          isBlank(buyer.broker_inquiry)
        ),
        and(
          equals(buyer.pinrich, '登録無し'),
          isNotBlank(buyer.email),
          isBlank(buyer.broker_inquiry)
        )
      )
    ) {
      return {
        status: 'ピンリッチ未登録',
        priority: 31,
        matchedCondition: 'ピンリッチに未登録',
      };
    }
    
    // Priority 32: 内覧促進メール（Pinrich）
    if (
      and(
        isBlank(buyer.price),
        isWithinDaysAgo(buyer.reception_date, 14, 7),
        isBlank(buyer.latest_viewing_date),
        isBlank(buyer.follow_up_assignee),
        isBlank(buyer.latest_status),
        isBlank(buyer.broker_inquiry),
        notEquals(buyer.inquiry_source, '配信希望アンケート'),
        isBlank(buyer.viewing_promotion_not_needed),
        isBlank(buyer.viewing_promotion_sender)
      )
    ) {
      return {
        status: '内覧促進メール（Pinrich)',
        priority: 32,
        matchedCondition: '内覧促進メール送信対象（Pinrich）',
      };
    }
    
    // Priority 33: 要内覧促進客
    if (
      and(
        isWithinDaysAgo(buyer.reception_date, 14, 4),
        isBlank(buyer.latest_viewing_date),
        isBlank(buyer.follow_up_assignee),
        isBlank(buyer.latest_status),
        notEquals(buyer.viewing_promotion_not_needed, '不要'),
        isBlank(buyer.viewing_promotion_sender),
        isBlank(buyer.broker_inquiry),
        notEquals(buyer.inquiry_source, '配信希望アンケート'),
        not(contains(buyer.inquiry_source, 'ピンリッチ')),
        and(
          notEquals(buyer.inquiry_confidence, 'e（買付物件の問合せ）'),
          notEquals(buyer.inquiry_confidence, 'd（資料送付不要、条件不適合など）'),
          notEquals(buyer.inquiry_confidence, 'b（内覧検討）')
        )
      )
    ) {
      return {
        status: '要内覧促進客',
        priority: 33,
        matchedCondition: '内覧促進が必要な顧客',
      };
    }
    
    // Priority 34: 買付有り、物件不適合の内覧促進客
    if (
      and(
        isWithinDaysAgo(buyer.reception_date, 7, 4),
        isBlank(buyer.latest_viewing_date),
        isBlank(buyer.follow_up_assignee),
        isBlank(buyer.latest_status),
        isBlank(buyer.viewing_promotion_sender),
        isBlank(buyer.viewing_promotion_not_needed),
        or(
          equals(buyer.inquiry_confidence, 'e（買付物件の問合せ）'),
          equals(buyer.inquiry_confidence, 'd（資料送付不要、条件不適合など）')
        ),
        notEquals(buyer.inquiry_confidence, 'b（内覧検討）'),
        isBlank(buyer.broker_inquiry),
        notEquals(buyer.inquiry_source, '配信希望アンケート')
      )
    ) {
      return {
        status: '買付有り、物件不適合の内覧促進客',
        priority: 34,
        matchedCondition: '買付有りだが物件不適合の内覧促進対象',
      };
    }
    
    // Priority 35: メアド確認必要
    if (
      and(
        isBlank(buyer.email),
        not(contains(buyer.latest_status, '買')),
        isBlank(buyer.follow_up_assignee),
        isAfterOrEqual(buyer.reception_date, '2023-01-01'),
        isBlank(buyer.broker_inquiry),
        isBlank(buyer.past_buyer_list),
        isBlank(buyer.email_confirmation_assignee),
        equals(buyer.email_confirmation, '未確認'),
        not(
          or(
            contains(buyer.inquiry_confidence, 'D'),
            contains(buyer.inquiry_confidence, 'd')
          )
        ),
        not(
          or(
            contains(buyer.latest_status, 'D'),
            contains(buyer.latest_status, 'd')
          )
        )
      )
    ) {
      return {
        status: 'メアド確認必要',
        priority: 35,
        matchedCondition: 'メールアドレスの確認が必要',
      };
    }
    
    // Fallback: 該当なし
    return {
      status: '',
      priority: 0,
      matchedCondition: '該当なし',
    };
  } catch (error) {
    console.error('Status calculation error:', error);
    return {
      status: '',
      priority: 0,
      matchedCondition: 'Error',
    };
  }
}
