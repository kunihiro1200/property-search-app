/**
 * 買主ステータス定義
 * 
 * AppSheetのIFSロジックと同一の優先順位でステータスを定義します。
 * 優先順位が小さいほど優先度が高く、最初に一致した条件のステータスが採用されます。
 */

export interface StatusDefinition {
  priority: number;
  status: string;
  description: string;
  color: string;
}

export const STATUS_DEFINITIONS: StatusDefinition[] = [
  // Priority 1
  {
    priority: 1,
    status: '査定アンケート回答あり',
    description: '査定アンケートに回答があり、確認が未完了',
    color: '#ff0000', // 赤
  },
  
  // Priority 2
  {
    priority: 2,
    status: '業者問合せあり',
    description: '業者向けアンケートが未回答',
    color: '#ff6600', // オレンジ
  },
  
  // Priority 3
  {
    priority: 3,
    status: '内覧日前日',
    description: '内覧日の前日（木曜日は2日前）',
    color: '#ffcc00', // 黄色
  },
  
  // Priority 4
  {
    priority: 4,
    status: '内覧未確定',
    description: '内覧日が未確定',
    color: '#ff9900', // オレンジ
  },
  
  // Priority 5
  {
    priority: 5,
    status: '一般媒介_内覧後売主連絡未',
    description: '一般媒介で内覧後の売主連絡が未完了',
    color: '#ff3300', // 赤オレンジ
  },
  
  // Priority 6 (動的に生成: ⑯当日TEL（担当者名）)
  {
    priority: 6,
    status: '⑯当日TEL',
    description: '次電日が当日以前',
    color: '#cc0000', // 濃い赤
  },
  
  // Priority 7
  {
    priority: 7,
    status: '問合メール未対応',
    description: '問い合わせメールへの対応が未完了',
    color: '#ff6666', // ピンク
  },
  
  // Priority 8
  {
    priority: 8,
    status: '3回架電未',
    description: '3回架電が未完了',
    color: '#ff9999', // 薄いピンク
  },
  
  // Priority 9-15: 担当者別内覧後未入力
  {
    priority: 9,
    status: 'Y_内覧後未入力',
    description: '担当Y: 内覧後の入力が未完了',
    color: '#9999ff', // 薄い青
  },
  {
    priority: 10,
    status: '生_内覧後未入力',
    description: '担当生: 内覧後の入力が未完了',
    color: '#9999ff',
  },
  {
    priority: 11,
    status: 'U_内覧後未入力',
    description: '担当U: 内覧後の入力が未完了',
    color: '#9999ff',
  },
  {
    priority: 12,
    status: '久_内覧後未入力',
    description: '担当久: 内覧後の入力が未完了',
    color: '#9999ff',
  },
  {
    priority: 13,
    status: 'K_内覧後未入力',
    description: '担当K: 内覧後の入力が未完了',
    color: '#9999ff',
  },
  {
    priority: 14,
    status: 'I_内覧後未入力',
    description: '担当I: 内覧後の入力が未完了',
    color: '#9999ff',
  },
  {
    priority: 15,
    status: 'R_内覧後未入力',
    description: '担当R: 内覧後の入力が未完了',
    color: '#9999ff',
  },
  
  // Priority 16-22: 担当者別次電日空欄
  {
    priority: 16,
    status: '担当(Y)次電日空欄',
    description: '担当Y: 次電日が空欄',
    color: '#ccccff', // 非常に薄い青
  },
  {
    priority: 17,
    status: '担当(久)次電日空欄',
    description: '担当久: 次電日が空欄',
    color: '#ccccff',
  },
  {
    priority: 18,
    status: '担当(U)次電日空欄',
    description: '担当U: 次電日が空欄',
    color: '#ccccff',
  },
  {
    priority: 19,
    status: '担当(R)次電日空欄',
    description: '担当R: 次電日が空欄',
    color: '#ccccff',
  },
  {
    priority: 20,
    status: '担当(K)次電日空欄',
    description: '担当K: 次電日が空欄',
    color: '#ccccff',
  },
  {
    priority: 21,
    status: '担当(I)次電日空欄',
    description: '担当I: 次電日が空欄',
    color: '#ccccff',
  },
  {
    priority: 22,
    status: '担当(生)次電日空欄',
    description: '担当生: 次電日が空欄',
    color: '#ccccff',
  },
  
  // Priority 23-30: 担当者別
  {
    priority: 23,
    status: '担当(Y)',
    description: '担当Y',
    color: '#66ccff', // 水色
  },
  {
    priority: 24,
    status: '担当(W)',
    description: '担当W',
    color: '#66ccff',
  },
  {
    priority: 25,
    status: '担当(U)',
    description: '担当U',
    color: '#66ccff',
  },
  {
    priority: 26,
    status: '担当(生)',
    description: '担当生',
    color: '#66ccff',
  },
  {
    priority: 27,
    status: '担当(K)',
    description: '担当K',
    color: '#66ccff',
  },
  {
    priority: 28,
    status: '担当(久)',
    description: '担当久',
    color: '#66ccff',
  },
  {
    priority: 29,
    status: '担当(I)',
    description: '担当I',
    color: '#66ccff',
  },
  {
    priority: 30,
    status: '担当(R)',
    description: '担当R',
    color: '#66ccff',
  },
  
  // Priority 31
  {
    priority: 31,
    status: 'ピンリッチ未登録',
    description: 'ピンリッチに未登録',
    color: '#99ccff', // 薄い水色
  },
  
  // Priority 32
  {
    priority: 32,
    status: '内覧促進メール（Pinrich)',
    description: '内覧促進メール送信対象（Pinrich）',
    color: '#66ff66', // 緑
  },
  
  // Priority 33
  {
    priority: 33,
    status: '要内覧促進客',
    description: '内覧促進が必要な顧客',
    color: '#99ff99', // 薄い緑
  },
  
  // Priority 34
  {
    priority: 34,
    status: '買付有り、物件不適合の内覧促進客',
    description: '買付有りだが物件不適合の内覧促進対象',
    color: '#ccffcc', // 非常に薄い緑
  },
  
  // Priority 35
  {
    priority: 35,
    status: 'メアド確認必要',
    description: 'メールアドレスの確認が必要',
    color: '#ffff66', // 黄色
  },
  
  // Priority 0 (fallback)
  {
    priority: 0,
    status: '',
    description: '該当なし',
    color: '#cccccc', // グレー
  },
];

/**
 * ステータスの色を取得
 * @param status ステータス文字列
 * @returns 色コード
 */
export function getStatusColor(status: string): string {
  const definition = STATUS_DEFINITIONS.find(d => d.status === status);
  return definition?.color || '#cccccc';
}

/**
 * ステータスの説明を取得
 * @param status ステータス文字列
 * @returns 説明文
 */
export function getStatusDescription(status: string): string {
  const definition = STATUS_DEFINITIONS.find(d => d.status === status);
  return definition?.description || '該当なし';
}

/**
 * ステータスの優先順位を取得
 * @param status ステータス文字列
 * @returns 優先順位（数値が小さいほど優先度が高い）
 */
export function getStatusPriority(status: string): number {
  const definition = STATUS_DEFINITIONS.find(d => d.status === status);
  return definition?.priority || 0;
}
