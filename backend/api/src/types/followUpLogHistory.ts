/**
 * 売主追客ログ履歴データの型定義
 */

/**
 * 追客ログ履歴エントリー
 */
export interface FollowUpLogHistoryEntry {
  // コアフィールド
  date: Date;                          // 日付
  followUpLogId: string;               // 追客ログID
  sellerNumber: string;                // 売主番号
  comment: string;                     // コメント
  
  // 担当者フィールド
  assigneeFirstHalf: string;           // 担当者（前半）
  assigneeSecondHalf: string;          // 担当者（後半）
  assigneeAll: string;                 // 担当者（全）
  assigneeHalf: string;                // 担当者（半）
  
  // ステータスフィールド
  firstHalfCompleted: boolean;         // 前半完了
  secondHalfCompleted: boolean;        // 後半完了
  secondCallDueToNoAnswer: boolean;    // 不在による2回目架電
}

/**
 * カラムマッピング設定
 */
export interface FollowUpLogColumnMapping {
  date: string;
  followUpLogId: string;
  sellerNumber: string;
  comment: string;
  assigneeFirstHalf: string;
  assigneeSecondHalf: string;
  assigneeAll: string;
  assigneeHalf: string;
  firstHalfCompleted: string;
  secondHalfCompleted: string;
  secondCallDueToNoAnswer: string;
}

/**
 * スプレッドシート設定
 */
export interface FollowUpLogSpreadsheetConfig {
  spreadsheetId: string;
  sheetName: string;
  columnMapping: FollowUpLogColumnMapping;
}
