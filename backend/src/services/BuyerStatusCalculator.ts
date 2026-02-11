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
  viewing_survey_result?: string | null; // 内覧アンケート結果v
  viewing_survey_confirmed?: string | null; // 内覧アンケート確認
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
  priority: number; // 条件の優先順位（1-37、0は該当なし）
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
    // Priority 1: 内覧日アンケート回答あり
    // AND(ISNOTBLANK([内覧アンケート結果v]),ISBLANK([内覧アンケート確認]))
    if (
      and(
        isNotBlank(buyer.viewing_survey_result),
        isBlank(buyer.viewing_survey_confirmed)
      )
    ) {
      return {
        status: '内覧日アンケート回答あり',
        priority: 1,
        matchedCondition: '内覧アンケート結果vが入力済みで、内覧アンケート確認が空欄',
      };
    }
    
    // Priority 2: 査定アンケート回答あり
    // AND(ISNOTBLANK([査定アンケート]),ISBLANK([査定アンケート確認]))
    if (
      and(
        isNotBlank(buyer.valuation_survey),
        isBlank(buyer.valuation_survey_confirmed)
      )
    ) {
      return {
        status: '査定アンケート回答あり',
        priority: 2,
        matchedCondition: '査定アンケートが入力済みで、査定アンケート確認が空欄',
      };
    }
    
    // Priority 3: 業者問合せあり
    // [業者向けアンケート] = "未"
    if (equals(buyer.broker_survey, '未')) {
      return {
        status: '業者問合せあり',
        priority: 3,
        matchedCondition: '業者向けアンケート = 未',
      };
    }
    
    // Priority 4: 内覧日前日
    // OR(
    //   AND([曜日] = "木曜日",[●内覧日(最新）] = TODAY() + 2,ISBLANK([通知送信者]),[業者問合せ] <> "業者問合せ"),
    //   AND([曜日] <> "木曜日",[●内覧日(最新）] = TODAY() + 1,ISBLANK([通知送信者]),[業者問合せ] <> "業者問合せ")
    // )
    if (
      or(
        and(
          equals(buyer.day_of_week, '木曜日'),
          isDaysFromToday(buyer.latest_viewing_date, 2),
          isBlank(buyer.notification_sender),
          notEquals(buyer.broker_inquiry, '業者問合せ')
        ),
        and(
          notEquals(buyer.day_of_week, '木曜日'),
          isTomorrow(buyer.latest_viewing_date),
          isBlank(buyer.notification_sender),
          notEquals(buyer.broker_inquiry, '業者問合せ')
        )
      )
    ) {
      return {
        status: '内覧日前日',
        priority: 4,
        matchedCondition: '内覧日の前日（木曜日は2日前）で通知未送信',
      };
    }
    
    // Priority 5: 内覧未確定
    // [内覧未確定] = "未確定"
    if (equals(buyer.viewing_unconfirmed, '未確定')) {
      return {
        status: '内覧未確定',
        priority: 5,
        matchedCondition: '内覧未確定 = 未確定',
      };
    }
    
    // Priority 6: 一般媒介_内覧後売主連絡未
    // OR(
    //   AND([●内覧日(最新）] >= DATE("2025/8/1"),[●内覧日(最新）] < TODAY(),ISBLANK([★内覧結果・後続対応]),ISNOTBLANK([内覧形態_一般媒介])),
    //   [内覧後売主連絡] = "未"
    // )
    if (
      or(
        and(
          isAfterOrEqual(buyer.latest_viewing_date, '2025-08-01'),
          isPast(buyer.latest_viewing_date),
          isBlank(buyer.viewing_result_follow_up),
          isNotBlank(buyer.viewing_type_general)
        ),
        equals(buyer.post_viewing_seller_contact, '未')
      )
    ) {
      return {
        status: '一般媒介_内覧後売主連絡未',
        priority: 6,
        matchedCondition: '一般媒介で内覧後の売主連絡が未完了',
      };
    }
    
    // Priority 7: ⑯当日TEL
    // AND(ISNOTBLANK([後続担当]),ISNOTBLANK([★次電日]),[★次電日] <= TODAY())
    if (
      and(
        isNotBlank(buyer.follow_up_assignee),
        isNotBlank(buyer.next_call_date),
        isTodayOrPast(buyer.next_call_date)
      )
    ) {
      const assignee = buyer.follow_up_assignee || '';
      return {
        status: `⑯当日TEL（${assignee}）`,
        priority: 7,
        matchedCondition: '次電日が当日以前で後続担当が設定されている',
      };
    }
    
    // Priority 8: 問合メール未対応
    // 「不要」を選択した場合は、このカテゴリーから除外
    // OR(
    //   [【問合メール】電話対応] = "未",
    //   [【問合メール】メール返信] = "未"
    // )
    // ただし、[【問合メール】電話対応] = "不要" の場合は除外
    if (
      and(
        notEquals(buyer.inquiry_email_phone, '不要'),
        or(
          equals(buyer.inquiry_email_phone, '未'),
          equals(buyer.inquiry_email_reply, '未')
        )
      )
    ) {
      return {
        status: '問合メール未対応',
        priority: 8,
        matchedCondition: '問い合わせメールへの対応が未完了',
      };
    }
    
    // Priority 9: 3回架電未
    // AND([3回架電確認済み] = "3回架電未",OR([【問合メール】電話対応] = "不通",[【問合メール】電話対応] = "未"))
    if (
      and(
        equals(buyer.three_calls_confirmed, '3回架電未'),
        or(
          equals(buyer.inquiry_email_phone, '不通'),
          equals(buyer.inquiry_email_phone, '未')
        )
      )
    ) {
      return {
        status: '3回架電未',
        priority: 9,
        matchedCondition: '3回架電が未完了',
      };
    }
    
    // Priority 10: Y_内覧後未入力
    // AND([後続担当] = "Y",ISBLANK([業者問合せ]),OR(ISBLANK([★内覧結果・後続対応]),ISBLANK([★最新状況])),ISNOTBLANK([●内覧日(最新）]),[●内覧日(最新）] < TODAY())
    if (
      and(
        equals(buyer.follow_up_assignee, 'Y'),
        isBlank(buyer.broker_inquiry),
        or(
          isBlank(buyer.viewing_result_follow_up),
          isBlank(buyer.latest_status)
        ),
        isNotBlank(buyer.latest_viewing_date),
        isPast(buyer.latest_viewing_date)
      )
    ) {
      return {
        status: 'Y_内覧後未入力',
        priority: 10,
        matchedCondition: '担当Y: 内覧後の入力が未完了',
      };
    }
    
    // Priority 11: 生_内覧後未入力
    // AND([後続担当] = "生",ISBLANK([★最新状況]),ISNOTBLANK([●内覧日(最新）]),[●内覧日(最新）] < TODAY())
    if (
      and(
        equals(buyer.follow_up_assignee, '生'),
        isBlank(buyer.latest_status),
        isNotBlank(buyer.latest_viewing_date),
        isPast(buyer.latest_viewing_date)
      )
    ) {
      return {
        status: '生_内覧後未入力',
        priority: 11,
        matchedCondition: '担当生: 内覧後の入力が未完了',
      };
    }
    
    // Priority 12: U_内覧後未入力
    // AND([後続担当] = "U",ISBLANK([業者問合せ]),OR(ISBLANK([★内覧結果・後続対応]),ISBLANK([★最新状況])),ISNOTBLANK([●内覧日(最新）]),[●内覧日(最新）] < TODAY())
    if (
      and(
        equals(buyer.follow_up_assignee, 'U'),
        isBlank(buyer.broker_inquiry),
        or(
          isBlank(buyer.viewing_result_follow_up),
          isBlank(buyer.latest_status)
        ),
        isNotBlank(buyer.latest_viewing_date),
        isPast(buyer.latest_viewing_date)
      )
    ) {
      return {
        status: 'U_内覧後未入力',
        priority: 12,
        matchedCondition: '担当U: 内覧後の入力が未完了',
      };
    }
    
    // Priority 13: 久_内覧後未入力
    // AND([後続担当] = "久",ISBLANK([業者問合せ]),OR(ISBLANK([★内覧結果・後続対応]),ISBLANK([★最新状況])),ISNOTBLANK([●内覧日(最新）]),[●内覧日(最新）] < TODAY())
    if (
      and(
        equals(buyer.follow_up_assignee, '久'),
        isBlank(buyer.broker_inquiry),
        or(
          isBlank(buyer.viewing_result_follow_up),
          isBlank(buyer.latest_status)
        ),
        isNotBlank(buyer.latest_viewing_date),
        isPast(buyer.latest_viewing_date)
      )
    ) {
      return {
        status: '久_内覧後未入力',
        priority: 13,
        matchedCondition: '担当久: 内覧後の入力が未完了',
      };
    }
    
    // Priority 14: K_内覧後未入力
    // AND([後続担当] = "K",ISBLANK([業者問合せ]),OR(ISBLANK([★内覧結果・後続対応]),ISBLANK([★最新状況])),ISNOTBLANK([●内覧日(最新）]),[●内覧日(最新）] < TODAY())
    if (
      and(
        equals(buyer.follow_up_assignee, 'K'),
        isBlank(buyer.broker_inquiry),
        or(
          isBlank(buyer.viewing_result_follow_up),
          isBlank(buyer.latest_status)
        ),
        isNotBlank(buyer.latest_viewing_date),
        isPast(buyer.latest_viewing_date)
      )
    ) {
      return {
        status: 'K_内覧後未入力',
        priority: 14,
        matchedCondition: '担当K: 内覧後の入力が未完了',
      };
    }
    
    // Priority 15: I_内覧後未入力
    // AND([後続担当] = "I",ISBLANK([業者問合せ]),OR(ISBLANK([★内覧結果・後続対応]),ISBLANK([★最新状況])),ISNOTBLANK([●内覧日(最新）]),[●内覧日(最新）] < TODAY())
    if (
      and(
        equals(buyer.follow_up_assignee, 'I'),
        isBlank(buyer.broker_inquiry),
        or(
          isBlank(buyer.viewing_result_follow_up),
          isBlank(buyer.latest_status)
        ),
        isNotBlank(buyer.latest_viewing_date),
        isPast(buyer.latest_viewing_date)
      )
    ) {
      return {
        status: 'I_内覧後未入力',
        priority: 15,
        matchedCondition: '担当I: 内覧後の入力が未完了',
      };
    }
    
    // Priority 16: R_内覧後未入力
    // AND([後続担当] = "R",ISBLANK([業者問合せ]),OR(ISBLANK([★内覧結果・後続対応]),ISBLANK([★最新状況])),ISNOTBLANK([●内覧日(最新）]),[●内覧日(最新）] < TODAY())
    if (
      and(
        equals(buyer.follow_up_assignee, 'R'),
        isBlank(buyer.broker_inquiry),
        or(
          isBlank(buyer.viewing_result_follow_up),
          isBlank(buyer.latest_status)
        ),
        isNotBlank(buyer.latest_viewing_date),
        isPast(buyer.latest_viewing_date)
      )
    ) {
      return {
        status: 'R_内覧後未入力',
        priority: 16,
        matchedCondition: '担当R: 内覧後の入力が未完了',
      };
    }
    
    // Priority 17-37: 他の条件は calculateBuyerStatusComplete で評価
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
 * Priority 17-37の条件評価
 */

/**
 * 買主のステータスを算出（完全版）
 * Priority 17-37の条件を評価
 * 
 * @param buyer 買主データ
 * @returns ステータス算出結果
 */
export function calculateBuyerStatusComplete(buyer: BuyerData): StatusResult {
  try {
    // Priority 1-16は既にcalculateBuyerStatus関数で評価済み
    // ここではPriority 17-37のみを評価
    
    // Priority 17-23: 担当者別次電日空欄
    // 共通条件: OR([★最新状況] = "A:この物件を気に入っている（こちらからの一押しが必要）",[★最新状況] = "B:1年以内に引っ越し希望だが、この物件ではない。駐車場の要件や、日当たり等が合わない。")
    const statusAorB = or(
      equals(buyer.latest_status, 'A:この物件を気に入っている（こちらからの一押しが必要）'),
      equals(buyer.latest_status, 'B:1年以内に引っ越し希望だが、この物件ではない。駐車場の要件や、日当たり等が合わない。')
    );
    
    // Priority 17: 担当(Y)次電日空欄
    // AND(OR([★最新状況] = "A:...",[★最新状況] = "B:..."),ISBLANK([★次電日]),[後続担当] = "Y")
    if (
      and(
        statusAorB,
        isBlank(buyer.next_call_date),
        equals(buyer.follow_up_assignee, 'Y')
      )
    ) {
      return {
        status: '担当(Y)次電日空欄',
        priority: 17,
        matchedCondition: '担当Y: 次電日が空欄',
      };
    }
    
    // Priority 18: 担当(久)次電日空欄
    // AND(OR([★最新状況] = "A:...",[★最新状況] = "B:..."),ISBLANK([業者問合せ]),ISBLANK([★次電日]),[後続担当] = "久")
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
        priority: 18,
        matchedCondition: '担当久: 次電日が空欄',
      };
    }
    
    // Priority 19: 担当(U)次電日空欄
    // AND(OR([★最新状況] = "A:...",[★最新状況] = "B:..."),ISBLANK([★次電日]),ISBLANK([業者問合せ]),[後続担当] = "U")
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
        priority: 19,
        matchedCondition: '担当U: 次電日が空欄',
      };
    }
    
    // Priority 20: 担当(R)次電日空欄
    // AND(OR([★最新状況] = "A:...",[★最新状況] = "B:..."),ISBLANK([★次電日]),ISBLANK([業者問合せ]),[後続担当] = "R")
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
        priority: 20,
        matchedCondition: '担当R: 次電日が空欄',
      };
    }
    
    // Priority 21: 担当(K)次電日空欄
    // AND(OR([★最新状況] = "A:...",[★最新状況] = "B:..."),ISBLANK([★次電日]),ISBLANK([業者問合せ]),[後続担当] = "K")
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
        priority: 21,
        matchedCondition: '担当K: 次電日が空欄',
      };
    }
    
    // Priority 22: 担当(I)次電日空欄
    // AND(OR([★最新状況] = "A:...",[★最新状況] = "B:..."),ISBLANK([★次電日]),ISBLANK([業者問合せ]),[後続担当] = "I")
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
        priority: 22,
        matchedCondition: '担当I: 次電日が空欄',
      };
    }
    
    // Priority 23: 担当(生)次電日空欄
    // AND(OR([★最新状況] = "A:...",[★最新状況] = "B:..."),ISBLANK([★次電日]),ISBLANK([業者問合せ]),[後続担当] = "生")
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
        priority: 23,
        matchedCondition: '担当生: 次電日が空欄',
      };
    }
    
    // Priority 24-31: 担当者別
    // [後続担当] = "Y"
    if (equals(buyer.follow_up_assignee, 'Y')) {
      return {
        status: '担当(Y)',
        priority: 24,
        matchedCondition: '担当Y',
      };
    }
    
    // [後続担当] = "W"
    if (equals(buyer.follow_up_assignee, 'W')) {
      return {
        status: '担当(W)',
        priority: 25,
        matchedCondition: '担当W',
      };
    }
    
    // [後続担当] = "U"
    if (equals(buyer.follow_up_assignee, 'U')) {
      return {
        status: '担当(U)',
        priority: 26,
        matchedCondition: '担当U',
      };
    }
    
    // [後続担当] = "生"
    if (equals(buyer.follow_up_assignee, '生')) {
      return {
        status: '担当(生)',
        priority: 27,
        matchedCondition: '担当生',
      };
    }
    
    // [後続担当] = "K"
    if (equals(buyer.follow_up_assignee, 'K')) {
      return {
        status: '担当(K)',
        priority: 28,
        matchedCondition: '担当K',
      };
    }
    
    // [後続担当] = "久"
    if (equals(buyer.follow_up_assignee, '久')) {
      return {
        status: '担当(久)',
        priority: 29,
        matchedCondition: '担当久',
      };
    }
    
    // [後続担当] = "I"
    if (equals(buyer.follow_up_assignee, 'I')) {
      return {
        status: '担当(I)',
        priority: 30,
        matchedCondition: '担当I',
      };
    }
    
    // [後続担当] = "R"
    if (equals(buyer.follow_up_assignee, 'R')) {
      return {
        status: '担当(R)',
        priority: 31,
        matchedCondition: '担当R',
      };
    }
    
    // Priority 32: ピンリッチ未登録
    // OR(AND(ISBLANK([Pinrich]),ISNOTBLANK([●メアド]),ISBLANK([業者問合せ])),AND([Pinrich] = "登録無し",ISNOTBLANK([●メアド]),ISBLANK([業者問合せ])))
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
        priority: 32,
        matchedCondition: 'ピンリッチに未登録',
      };
    }
    
    // Priority 33: 内覧促進メール（Pinrich)
    // AND(ISBLANK([価格]),[受付日] >= TODAY() - 14,[受付日] <= TODAY() - 7,ISBLANK([●内覧日(最新）]),ISBLANK([後続担当]),ISBLANK([★最新状況]),ISBLANK([業者問合せ]),[●問合せ元] <> "配信希望アンケート",ISBLANK([内覧促進メール不要]),ISBLANK([内覧促進メール送信者]))
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
        priority: 33,
        matchedCondition: '内覧促進メール送信対象（Pinrich）',
      };
    }
    
    // Priority 34: 要内覧促進客
    // AND([受付日] >= TODAY() - 14,[受付日] <= TODAY() - 4,ISBLANK([●内覧日(最新）]),ISBLANK([後続担当]),ISBLANK([★最新状況]),[内覧促進メール不要]<>"不要",ISBLANK([内覧促進メール送信者]),ISBLANK([業者問合せ]),[●問合せ元] <> "配信希望アンケート",NOT(CONTAINS([●問合せ元], "ピンリッチ")),NOT(CONTAINS([●問合せ元], "2件目以降紹介")),AND([●問合時確度] <> "e（買付物件の問合せ）",[●問合時確度] <> "d（資料送付不要、条件不適合など）",[●問合時確度] <> "b（内覧検討）"))
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
        not(contains(buyer.inquiry_source, '2件目以降紹介')),
        and(
          notEquals(buyer.inquiry_confidence, 'e（買付物件の問合せ）'),
          notEquals(buyer.inquiry_confidence, 'd（資料送付不要、条件不適合など）'),
          notEquals(buyer.inquiry_confidence, 'b（内覧検討）')
        )
      )
    ) {
      return {
        status: '要内覧促進客',
        priority: 34,
        matchedCondition: '内覧促進が必要な顧客',
      };
    }
    
    // Priority 35: 買付有り、物件不適合の内覧促進客
    // AND([受付日] >= TODAY() - 7,[受付日] <= TODAY() - 4,ISBLANK([●内覧日(最新）]),ISBLANK([後続担当]),ISBLANK([★最新状況]),ISBLANK([内覧促進メール送信者]),ISBLANK([内覧促進メール不要]),OR([●問合時確度] = "e（買付物件の問合せ）",[●問合時確度] = "d（資料送付不要、条件不適合など）"),[●問合時確度] <> "b（内覧検討）",ISBLANK([業者問合せ]),[●問合せ元] <> "配信希望アンケート")
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
        priority: 35,
        matchedCondition: '買付有りだが物件不適合の内覧促進対象',
      };
    }
    
    // Priority 36: メアド確認必要
    // AND(ISBLANK([●メアド]),NOT(CONTAINS([★最新状況], "買")),ISBLANK([後続担当]),[受付日] >= DATE("2023-01-01"),ISBLANK([業者問合せ]),ISBLANK([過去買主リスト]),ISBLANK([メアド確認メール担当]),[メアド確認] = "未確認",NOT(OR(CONTAINS([●問合時確度], "D"),CONTAINS([●問合時確度], "d"))),NOT(OR(CONTAINS([★最新状況], "D"),CONTAINS([★最新状況], "d"))))
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
        priority: 36,
        matchedCondition: 'メールアドレスの確認が必要',
      };
    }
    
    // Priority 37: 該当なし（TRUE,""）
    return {
      status: '',
      priority: 0,
      matchedCondition: '該当なし',
    };
  } catch (error) {
    console.error('[calculateBuyerStatusComplete] Error:', error);
    return {
      status: '',
      priority: 0,
      matchedCondition: 'エラー',
    };
  }
}
