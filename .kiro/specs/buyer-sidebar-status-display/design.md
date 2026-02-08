# Design Document

## Overview

買主リストのサイドバーに「カテゴリ > ステータス表示」機能を実装します。この機能は、AppSheetで使用されているIFSロジックと同一の優先順位で買主のステータスを算出し、サイドバーに表示します。

### 主要な設計決定

1. **ステータス算出はバックエンドで実行**: パフォーマンスとセキュリティのため
2. **既存のbuyersテーブルを使用**: 新しいカラムは追加しない
3. **AppSheetとの完全互換性**: IFSロジックの条件順序を厳密に再現
4. **既存サイドバーの完全置き換え**: 新しいステータスベースのカテゴリーに統一

## Architecture

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  BuyerList Component                                  │   │
│  │  ├─ Sidebar (Status Categories)                       │   │
│  │  │  └─ Status Filter Buttons                         │   │
│  │  └─ Buyer List Table                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  BuyerService                                         │   │
│  │  ├─ calculateBuyerStatus()                           │   │
│  │  │  └─ IFS Logic Implementation (27 conditions)      │   │
│  │  ├─ getBuyersWithStatus()                            │   │
│  │  └─ getStatusCategories()                            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  BuyerStatusCalculator (Pure Function)               │   │
│  │  ├─ evaluateCondition1() ... evaluateCondition27()   │   │
│  │  ├─ dateHelpers (isToday, isTomorrow, etc.)          │   │
│  │  └─ fieldHelpers (isBlank, contains, etc.)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ SQL
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase/PostgreSQL)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  buyers table (existing schema)                       │   │
│  │  - All fields from migration 042                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. BuyerStatusCalculator (Backend)

純粋関数として実装し、テスト容易性を確保します。

```typescript
/**
 * 買主のステータスを算出する純粋関数
 * AppSheetのIFSロジックと同一の条件順序で評価
 */
interface BuyerData {
  // 基本情報
  buyer_number: string;
  name: string;
  phone_number: string | null;
  email: string | null;
  
  // 日付フィールド
  reception_date: Date | null;
  latest_viewing_date: Date | null;
  next_call_date: Date | null;
  
  // ステータスフィールド
  follow_up_assignee: string | null;
  latest_status: string | null;
  inquiry_confidence: string | null;
  
  // 問い合わせ関連
  inquiry_email_phone: string | null;
  inquiry_email_reply: string | null;
  three_calls_confirmed: string | null;
  broker_inquiry: string | null;
  
  // 内覧関連
  viewing_result_follow_up: string | null;
  viewing_unconfirmed: string | null;
  viewing_type_general: string | null;
  post_viewing_seller_contact: string | null;
  notification_sender: string | null;
  
  // アンケート関連
  valuation_survey: string | null;
  valuation_survey_confirmed: string | null;
  broker_survey: string | null;
  
  // その他
  day_of_week: string | null;
  pinrich: string | null;
  email_confirmation: string | null;
  email_confirmation_assignee: string | null;
  viewing_promotion_not_needed: string | null;
  viewing_promotion_sender: string | null;
  past_buyer_list: string | null;
  inquiry_source: string | null;
  price: string | null;
}

interface StatusResult {
  status: string;  // ステータス文字列（空文字列の場合は該当なし）
  priority: number;  // 条件の優先順位（1-27、0は該当なし）
  matchedCondition: string;  // マッチした条件の説明
}

function calculateBuyerStatus(buyer: BuyerData): StatusResult;
```

### 2. BuyerService (Backend)

データベースアクセスとビジネスロジックを担当します。

```typescript
class BuyerService {
  /**
   * 全買主のステータスを算出して返す
   */
  async getBuyersWithStatus(filters?: BuyerFilters): Promise<BuyerWithStatus[]>;
  
  /**
   * ステータスカテゴリーの一覧と件数を返す
   */
  async getStatusCategories(): Promise<StatusCategory[]>;
  
  /**
   * 特定のステータスに該当する買主を返す
   */
  async getBuyersByStatus(status: string): Promise<Buyer[]>;
}

interface BuyerWithStatus extends Buyer {
  calculated_status: string;
  status_priority: number;
}

interface StatusCategory {
  status: string;
  count: number;
  color: string;  // UI表示用の色
}
```

### 3. Frontend Components

```typescript
// BuyerList.tsx
interface BuyerListProps {
  // 既存のprops
}

// 新しいサイドバーコンポーネント
interface BuyerStatusSidebarProps {
  categories: StatusCategory[];
  selectedStatus: string | null;
  onStatusSelect: (status: string | null) => void;
}

function BuyerStatusSidebar(props: BuyerStatusSidebarProps): JSX.Element;
```

## Data Models

### AppSheetカラム名 → データベースカラム名マッピング

```typescript
const APPSHEET_TO_DB_MAPPING = {
  // 基本情報
  '買主番号': 'buyer_number',
  '●氏名・会社名': 'name',
  '●電話番号': 'phone_number',
  '●メアド': 'email',
  
  // 日付
  '受付日': 'reception_date',
  '●内覧日(最新）': 'latest_viewing_date',
  '★次電日': 'next_call_date',
  
  // 担当者
  '後続担当': 'follow_up_assignee',
  '初動担当': 'initial_assignee',
  
  // ステータス
  '★最新状況': 'latest_status',
  '●問合時確度': 'inquiry_confidence',
  
  // 問い合わせ
  '【問合メール】電話対応': 'inquiry_email_phone',
  '【問合メール】メール返信': 'inquiry_email_reply',
  '3回架電確認済み': 'three_calls_confirmed',
  '業者問合せ': 'broker_inquiry',
  '●問合せ元': 'inquiry_source',
  
  // 内覧
  '★内覧結果・後続対応': 'viewing_result_follow_up',
  '内覧未確定': 'viewing_unconfirmed',
  '内覧形態_一般媒介': 'viewing_type_general',
  '内覧後売主連絡': 'post_viewing_seller_contact',
  '通知送信者': 'notification_sender',
  
  // アンケート
  '査定アンケート': 'valuation_survey',
  '査定アンケート確認': 'valuation_survey_confirmed',
  '業者向けアンケート': 'broker_survey',
  
  // その他
  '曜日': 'day_of_week',
  'Pinrich': 'pinrich',
  'メアド確認': 'email_confirmation',
  'メアド確認メール担当': 'email_confirmation_assignee',
  '内覧促進メール不要': 'viewing_promotion_not_needed',
  '内覧促進メール送信者': 'viewing_promotion_sender',
  '過去買主リスト': 'past_buyer_list',
  '価格': 'price',
};
```

### ステータス一覧（優先順位順）

```typescript
const STATUS_DEFINITIONS = [
  // Priority 1
  {
    priority: 1,
    status: '査定アンケート回答あり',
    description: '査定アンケートに回答があり、確認が未完了',
    color: '#ff0000',  // 赤
  },
  // Priority 2
  {
    priority: 2,
    status: '業者問合せあり',
    description: '業者向けアンケートが未回答',
    color: '#ff6600',  // オレンジ
  },
  // Priority 3
  {
    priority: 3,
    status: '内覧日前日',
    description: '内覧日の前日（木曜日は2日前）',
    color: '#ffcc00',  // 黄色
  },
  // Priority 4
  {
    priority: 4,
    status: '内覧未確定',
    description: '内覧日が未確定',
    color: '#ff9900',  // オレンジ
  },
  // Priority 5
  {
    priority: 5,
    status: '一般媒介_内覧後売主連絡未',
    description: '一般媒介で内覧後の売主連絡が未完了',
    color: '#ff3300',  // 赤オレンジ
  },
  // Priority 6
  {
    priority: 6,
    status: '⑯当日TEL（X）',  // Xは担当者名
    description: '次電日が当日以前',
    color: '#cc0000',  // 濃い赤
  },
  // Priority 7
  {
    priority: 7,
    status: '問合メール未対応',
    description: '問い合わせメールへの対応が未完了',
    color: '#ff6666',  // ピンク
  },
  // Priority 8
  {
    priority: 8,
    status: '3回架電未',
    description: '3回架電が未完了',
    color: '#ff9999',  // 薄いピンク
  },
  // Priority 9-14: 担当者別内覧後未入力
  {
    priority: 9,
    status: 'Y_内覧後未入力',
    description: '担当Y: 内覧後の入力が未完了',
    color: '#9999ff',  // 薄い青
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
    color: '#ccccff',  // 非常に薄い青
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
    color: '#66ccff',  // 水色
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
    color: '#99ccff',  // 薄い水色
  },
  // Priority 32
  {
    priority: 32,
    status: '内覧促進メール（Pinrich)',
    description: '内覧促進メール送信対象（Pinrich）',
    color: '#66ff66',  // 緑
  },
  // Priority 33
  {
    priority: 33,
    status: '要内覧促進客',
    description: '内覧促進が必要な顧客',
    color: '#99ff99',  // 薄い緑
  },
  // Priority 34
  {
    priority: 34,
    status: '買付有り、物件不適合の内覧促進客',
    description: '買付有りだが物件不適合の内覧促進対象',
    color: '#ccffcc',  // 非常に薄い緑
  },
  // Priority 35
  {
    priority: 35,
    status: 'メアド確認必要',
    description: 'メールアドレスの確認が必要',
    color: '#ffff66',  // 黄色
  },
  // Priority 36 (fallback)
  {
    priority: 0,
    status: '',
    description: '該当なし',
    color: '#cccccc',  // グレー
  },
];
```

## Correctness Properties

*プロパティとは、システムの全ての有効な実行において真であるべき特性や振る舞いです。プロパティは、人間が読める仕様と機械が検証可能な正確性保証の橋渡しとなります。*

## Correctness Properties (邯壹″)

### Property 1: 譚｡莉ｶ蛻､螳壹・蜆ｪ蜈磯・ｽ堺ｿ晁ｨｼ

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲∬､・焚縺ｮ譚｡莉ｶ縺ｫ荳閾ｴ縺吶ｋ蝣ｴ蜷医∵怙繧ょ━蜈磯・ｽ阪・鬮倥＞譚｡莉ｶ縺ｮ繧ｹ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 1.2**

### Property 2: 蜈ｨ譚｡莉ｶ縺ｮ豁｣遒ｺ縺ｪ螳溯｣・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲、ppSheet縺ｮIFS繝ｭ繧ｸ繝・け縺ｮ27蛟九・譚｡莉ｶ縺ｮ縺・★繧後°縺ｫ荳閾ｴ縺吶ｋ蝣ｴ蜷医∝ｯｾ蠢懊☆繧九せ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 1.1, 1.4**

### Property 3: 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ蜍穂ｽ・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲∝・縺ｦ縺ｮ譚｡莉ｶ縺ｫ荳閾ｴ縺励↑縺・ｴ蜷医∫ｩｺ譁・ｭ怜・縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 1.3**

### Property 4: 繧ｫ繝ｩ繝繝槭ャ繝斐Φ繧ｰ縺ｮ豁｣遒ｺ諤ｧ

*For any* AppSheet繧ｫ繝ｩ繝蜷阪∝ｯｾ蠢懊☆繧九ョ繝ｼ繧ｿ繝吶・繧ｹ繧ｫ繝ｩ繝蜷阪′豁｣縺励￥繝槭ャ繝斐Φ繧ｰ縺輔ｌ繧九∋縺阪〒縺ゅｋ

**Validates: Requirements 1.5**

### Property 5: 蜀・ｦｧ譌･蜑肴律蛻､螳夲ｼ域惠譖懈律・・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縺ｧ譖懈律縺梧惠譖懈律縺九▽蜀・ｦｧ譌･縺・譌･蠕後・蝣ｴ蜷医√悟・隕ｧ譌･蜑肴律縲阪せ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ・井ｻ悶・鬮伜━蜈亥ｺｦ譚｡莉ｶ縺ｫ荳閾ｴ縺励↑縺・ｴ蜷茨ｼ・

**Validates: Requirements 2.1**

### Property 6: 蜀・ｦｧ譌･蜑肴律蛻､螳夲ｼ域惠譖懈律莉･螟厄ｼ・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縺ｧ譖懈律縺梧惠譖懈律莉･螟悶°縺､蜀・ｦｧ譌･縺・譌･蠕後・蝣ｴ蜷医√悟・隕ｧ譌･蜑肴律縲阪せ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ・井ｻ悶・鬮伜━蜈亥ｺｦ譚｡莉ｶ縺ｫ荳閾ｴ縺励↑縺・ｴ蜷茨ｼ・

**Validates: Requirements 2.2**

### Property 7: 蜀・ｦｧ蠕梧悴蜈･蜉帛愛螳・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縺ｧ蜀・ｦｧ譌･縺碁℃蜴ｻ縺九▽蠢・ｦ√↑繝輔ぅ繝ｼ繝ｫ繝峨′譛ｪ蜈･蜉帙・蝣ｴ蜷医・←蛻・↑縲悟・隕ｧ蠕梧悴蜈･蜉帙阪せ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 2.3**

### Property 8: 蠖捺律TEL蛻､螳・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縺ｧ谺｡髮ｻ譌･縺悟ｽ捺律莉･蜑阪・蝣ｴ蜷医√娯賊蠖捺律TEL・域球蠖楢・錐・峨阪せ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ・井ｻ悶・鬮伜━蜈亥ｺｦ譚｡莉ｶ縺ｫ荳閾ｴ縺励↑縺・ｴ蜷茨ｼ・

**Validates: Requirements 2.4**

### Property 9: 蜀・ｦｧ菫・ｲ繝｡繝ｼ繝ｫ蛻､螳・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縺ｧ蜿嶺ｻ俶律縺檎音螳夂ｯ・峇蜀・°縺､譚｡莉ｶ繧呈ｺ縺溘☆蝣ｴ蜷医・←蛻・↑縲悟・隕ｧ菫・ｲ繝｡繝ｼ繝ｫ縲咲ｳｻ繧ｹ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 2.5**

### Property 10: 諡・ｽ楢・挨繧ｹ繝・・繧ｿ繧ｹ

*For any* 雋ｷ荳ｻ繝・・繧ｿ縺ｧ蠕檎ｶ壽球蠖薙′Y/W/U/逕・K/荵・I/R縺ｮ縺・★繧後°縺ｮ蝣ｴ蜷医√梧球蠖・X)縲榊ｽ｢蠑上・繧ｹ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ・井ｻ悶・鬮伜━蜈亥ｺｦ譚｡莉ｶ縺ｫ荳閾ｴ縺励↑縺・ｴ蜷茨ｼ・

**Validates: Requirements 3.1**

### Property 11: 諡・ｽ楢・挨谺｡髮ｻ譌･遨ｺ谺・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縺ｧ蠕檎ｶ壽球蠖薙′Y/荵・U/R/K/I/逕溘°縺､谺｡髮ｻ譌･縺檎ｩｺ谺・°縺､譛譁ｰ迥ｶ豕√′A/B縺ｮ蝣ｴ蜷医√梧球蠖・X)谺｡髮ｻ譌･遨ｺ谺・阪せ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 3.2**

### Property 12: 諡・ｽ楢・挨蜀・ｦｧ蠕梧悴蜈･蜉・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縺ｧ蠕檎ｶ壽球蠖薙′Y/逕・U/荵・K/I/R縺九▽蜀・ｦｧ蠕梧悴蜈･蜉帙・蝣ｴ蜷医√傾_蜀・ｦｧ蠕梧悴蜈･蜉帙阪せ繝・・繧ｿ繧ｹ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 3.3**

### Property 13: 諡・ｽ楢・う繝九す繝｣繝ｫ縺ｮ豁｣遒ｺ縺ｪ蛻､螳・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲∵球蠖楢・う繝九す繝｣繝ｫ縺ｮ螟ｧ譁・ｭ怜ｰ乗枚蟄励′豁｣遒ｺ縺ｫ蛻､螳壹＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 3.4**

### Property 14: AND譚｡莉ｶ縺ｮ隧穂ｾ｡

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲、ND譚｡莉ｶ縺ｮ蜈ｨ縺ｦ縺ｮ譚｡莉ｶ縺檎悄縺ｮ蝣ｴ蜷医・縺ｿ縲√◎縺ｮ譚｡莉ｶ縺檎悄縺ｨ蛻､螳壹＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 4.1**

### Property 15: OR譚｡莉ｶ縺ｮ隧穂ｾ｡

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲＾R譚｡莉ｶ縺ｮ縺・★繧後°縺ｮ譚｡莉ｶ縺檎悄縺ｮ蝣ｴ蜷医√◎縺ｮ譚｡莉ｶ縺檎悄縺ｨ蛻､螳壹＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 4.2**

### Property 16: ISBLANK譚｡莉ｶ縺ｮ隧穂ｾ｡

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲¨ULL縲∫ｩｺ譁・ｭ怜・縲「ndefined縺ｮ繝輔ぅ繝ｼ繝ｫ繝峨・遨ｺ縺ｨ蛻､螳壹＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 4.3**

### Property 17: ISNOTBLANK譚｡莉ｶ縺ｮ隧穂ｾ｡

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲∝､縺悟ｭ伜惠縺吶ｋ繝輔ぅ繝ｼ繝ｫ繝峨・髱樒ｩｺ縺ｨ蛻､螳壹＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 4.4**

### Property 18: CONTAINS譚｡莉ｶ縺ｮ隧穂ｾ｡

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲，ONTAINS譚｡莉ｶ縺ｯ驛ｨ蛻・ｸ閾ｴ縺ｧ蛻､螳壹＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 4.5**

### Property 19: 繧ｹ繝・・繧ｿ繧ｹ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ

*For any* 繧ｹ繝・・繧ｿ繧ｹ縲√◎縺ｮ繧ｹ繝・・繧ｿ繧ｹ縺ｧ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ縺励◆蝣ｴ蜷医∬ｩｲ蠖薙☆繧玖ｲｷ荳ｻ縺ｮ縺ｿ縺瑚ｿ斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 5.6**

### Property 20: 繧ｭ繝｣繝・す繝･縺ｮ蜍穂ｽ・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲∝酔縺倥ョ繝ｼ繧ｿ繧・蝗槫叙蠕励＠縺溷ｴ蜷医・蝗樒岼縺ｯ繧ｭ繝｣繝・す繝･縺九ｉ蜿門ｾ励＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 6.2**

### Property 21: 繧ｭ繝｣繝・す繝･縺ｮ辟｡蜉ｹ蛹・

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲√ョ繝ｼ繧ｿ譖ｴ譁ｰ蠕後↓繧ｭ繝｣繝・す繝･縺檎┌蜉ｹ蛹悶＆繧後∵眠縺励＞繝・・繧ｿ縺悟叙蠕励＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 6.3**

### Property 22: 繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ菫晁ｨｼ

*For any* 1000莉ｶ縺ｮ雋ｷ荳ｻ繝・・繧ｿ縲√せ繝・・繧ｿ繧ｹ邂怜・縺・遘剃ｻ･蜀・↓螳御ｺ・☆繧九∋縺阪〒縺ゅｋ

**Validates: Requirements 6.4**

### Property 23: 繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ縺ｮ險倬鹸

*For any* 繧ｹ繝・・繧ｿ繧ｹ邂怜・繧ｨ繝ｩ繝ｼ縲√お繝ｩ繝ｼ縺後Ο繧ｰ縺ｫ險倬鹸縺輔ｌ繧九∋縺阪〒縺ゅｋ

**Validates: Requirements 6.5**

### Property 24: 繝槭ャ繝斐Φ繧ｰ繧ｨ繝ｩ繝ｼ縺ｮ繝ｭ繧ｰ險倬鹸

*For any* 繧ｫ繝ｩ繝繝槭ャ繝斐Φ繧ｰ繧ｨ繝ｩ繝ｼ縲√お繝ｩ繝ｼ縺後Ο繧ｰ縺ｫ險倬鹸縺輔ｌ繧九∋縺阪〒縺ゅｋ

**Validates: Requirements 7.5**

### Property 25: 繧ｨ繝ｩ繝ｼ譎ゅ・繝・ヵ繧ｩ繝ｫ繝医せ繝・・繧ｿ繧ｹ

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲√せ繝・・繧ｿ繧ｹ邂怜・縺ｧ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医√ョ繝輔か繝ｫ繝医せ繝・・繧ｿ繧ｹ・育ｩｺ譁・ｭ怜・・峨′霑斐＆繧後ｋ縺ｹ縺阪〒縺ゅｋ

**Validates: Requirements 8.2**

### Property 26: 蠢・医ヵ繧｣繝ｼ繝ｫ繝画ｬ謳肴凾縺ｮ繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ

*For any* 雋ｷ荳ｻ繝・・繧ｿ縲∝ｿ・医ヵ繧｣繝ｼ繝ｫ繝峨′谺謳阪＠縺ｦ縺・ｋ蝣ｴ蜷医√お繝ｩ繝ｼ縺後Ο繧ｰ縺ｫ險倬鹸縺輔ｌ繧九∋縺阪〒縺ゅｋ

**Validates: Requirements 8.3**

### Property 27: 繧ｨ繝ｩ繝ｼ閠先ｧ

*For any* 繧ｨ繝ｩ繝ｼ縲√す繧ｹ繝・Β縺ｯ繧ｯ繝ｩ繝・す繝･縺帙★縺ｫ邯咏ｶ壼虚菴懊☆繧九∋縺阪〒縺ゅｋ

**Validates: Requirements 8.4**

### Property 28: 繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ縺ｮ繝ｭ繧ｰ險倬鹸

*For any* 繧ｨ繝ｩ繝ｼ縲√お繝ｩ繝ｼ隧ｳ邏ｰ縺碁幕逋ｺ閠・髄縺代Ο繧ｰ縺ｫ險倬鹸縺輔ｌ繧九∋縺阪〒縺ゅｋ

**Validates: Requirements 8.5**

## Error Handling

### 繧ｨ繝ｩ繝ｼ縺ｮ遞ｮ鬘槭→蟇ｾ蠢・

#### 1. 繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ

**逋ｺ逕滓擅莉ｶ**: Supabase縺ｸ縺ｮ謗･邯壹′螟ｱ謨励＠縺溷ｴ蜷・

**蟇ｾ蠢・*:
- 繝ｦ繝ｼ繧ｶ繝ｼ縺ｫ繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ: "繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆縲ゅ＠縺ｰ繧峨￥縺励※縺九ｉ蜀榊ｺｦ縺願ｩｦ縺励￥縺縺輔＞縲・
- 繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ繧偵Ο繧ｰ縺ｫ險倬鹸
- 繝ｪ繝医Λ繧､讖滓ｧ具ｼ域怙螟ｧ3蝗槭∵欠謨ｰ繝舌ャ繧ｯ繧ｪ繝包ｼ・

```typescript
async getBuyersWithStatus(): Promise<BuyerWithStatus[]> {
  try {
    const { data, error } = await this.supabase
      .from('buyers')
      .select('*');
    
    if (error) throw error;
    
    return data.map(buyer => ({
      ...buyer,
      calculated_status: calculateBuyerStatus(buyer).status,
    }));
  } catch (error) {
    logger.error('Failed to fetch buyers:', error);
    throw new DatabaseError('繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
  }
}
```

#### 2. 繧ｹ繝・・繧ｿ繧ｹ邂怜・繧ｨ繝ｩ繝ｼ

**逋ｺ逕滓擅莉ｶ**: calculateBuyerStatus髢｢謨ｰ蜀・〒繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷・

**蟇ｾ蠢・*:
- 繝・ヵ繧ｩ繝ｫ繝医せ繝・・繧ｿ繧ｹ・育ｩｺ譁・ｭ怜・・峨ｒ霑斐☆
- 繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ繧偵Ο繧ｰ縺ｫ險倬鹸
- 雋ｷ荳ｻ逡ｪ蜿ｷ縺ｨ繧ｨ繝ｩ繝ｼ蜀・ｮｹ繧定ｨ倬鹸

```typescript
function calculateBuyerStatus(buyer: BuyerData): StatusResult {
  try {
    // 譚｡莉ｶ蛻､螳壹Ο繧ｸ繝・け
    for (const condition of CONDITIONS) {
      if (evaluateCondition(condition, buyer)) {
        return {
          status: condition.status,
          priority: condition.priority,
          matchedCondition: condition.description,
        };
      }
    }
    
    return { status: '', priority: 0, matchedCondition: 'No match' };
  } catch (error) {
    logger.error(`Status calculation error for buyer ${buyer.buyer_number}:`, error);
    return { status: '', priority: 0, matchedCondition: 'Error' };
  }
}
```

#### 3. 蠢・医ヵ繧｣繝ｼ繝ｫ繝画ｬ謳阪お繝ｩ繝ｼ

**逋ｺ逕滓擅莉ｶ**: buyer_number縺ｪ縺ｩ縺ｮ蠢・医ヵ繧｣繝ｼ繝ｫ繝峨′谺謳阪＠縺ｦ縺・ｋ蝣ｴ蜷・

**蟇ｾ蠢・*:
- 繧ｨ繝ｩ繝ｼ繧偵Ο繧ｰ縺ｫ險倬鹸
- 繝・ヵ繧ｩ繝ｫ繝医せ繝・・繧ｿ繧ｹ繧定ｿ斐☆
- 蜃ｦ逅・ｒ邯咏ｶ・

```typescript
function validateBuyerData(buyer: any): buyer is BuyerData {
  if (!buyer.buyer_number) {
    logger.warn('Missing required field: buyer_number', { buyer });
    return false;
  }
  return true;
}
```

#### 4. 繧ｫ繝ｩ繝繝槭ャ繝斐Φ繧ｰ繧ｨ繝ｩ繝ｼ

**逋ｺ逕滓擅莉ｶ**: AppSheet繧ｫ繝ｩ繝蜷阪↓蟇ｾ蠢懊☆繧九ョ繝ｼ繧ｿ繝吶・繧ｹ繧ｫ繝ｩ繝縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷・

**蟇ｾ蠢・*:
- 繧ｨ繝ｩ繝ｼ繧偵Ο繧ｰ縺ｫ險倬鹸
- 繝・ヵ繧ｩ繝ｫ繝亥､・・ull・峨ｒ菴ｿ逕ｨ
- 蜃ｦ逅・ｒ邯咏ｶ・

```typescript
function mapAppSheetColumn(appSheetName: string): string | null {
  const dbColumn = APPSHEET_TO_DB_MAPPING[appSheetName];
  if (!dbColumn) {
    logger.warn(`Unknown AppSheet column: ${appSheetName}`);
    return null;
  }
  return dbColumn;
}
```

#### 5. 譌･莉倥ヱ繝ｼ繧ｹ繧ｨ繝ｩ繝ｼ

**逋ｺ逕滓擅莉ｶ**: 譌･莉倥ヵ繧｣繝ｼ繝ｫ繝峨・繝代・繧ｹ縺ｫ螟ｱ謨励＠縺溷ｴ蜷・

**蟇ｾ蠢・*:
- 繧ｨ繝ｩ繝ｼ繧偵Ο繧ｰ縺ｫ險倬鹸
- null縺ｨ縺励※謇ｱ縺・
- 蜃ｦ逅・ｒ邯咏ｶ・

```typescript
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      logger.warn(`Invalid date format: ${dateStr}`);
      return null;
    }
    return date;
  } catch (error) {
    logger.error(`Date parse error: ${dateStr}`, error);
    return null;
  }
}
```

### 繧ｨ繝ｩ繝ｼ繝ｭ繧ｰ縺ｮ蠖｢蠑・

```typescript
interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  context: {
    buyer_number?: string;
    function: string;
    error?: any;
  };
}

// 菴ｿ逕ｨ萓・
logger.error('Status calculation failed', {
  buyer_number: '6666',
  function: 'calculateBuyerStatus',
  error: error.message,
});
```

## Testing Strategy

### 繝・せ繝域ｧ区・

#### 1. Unit Tests・亥腰菴薙ユ繧ｹ繝茨ｼ・

**蟇ｾ雎｡**: 邏皮ｲ矩未謨ｰ・・alculateBuyerStatus縲∵律莉倥・繝ｫ繝代・縲√ヵ繧｣繝ｼ繝ｫ繝峨・繝ｫ繝代・・・

**繝・・繝ｫ**: Jest

**繧ｫ繝舌Ξ繝・ず逶ｮ讓・*: 90%莉･荳・

**繝・せ繝医こ繝ｼ繧ｹ萓・*:

```typescript
describe('calculateBuyerStatus', () => {
  describe('Priority 1: 譟ｻ螳壹い繝ｳ繧ｱ繝ｼ繝亥屓遲斐≠繧・, () => {
    it('should return "譟ｻ螳壹い繝ｳ繧ｱ繝ｼ繝亥屓遲斐≠繧・ when valuation_survey is not blank and valuation_survey_confirmed is blank', () => {
      const buyer: BuyerData = {
        buyer_number: 'TEST001',
        valuation_survey: '蝗樒ｭ泌・螳ｹ',
        valuation_survey_confirmed: null,
        // ... other fields
      };
      
      const result = calculateBuyerStatus(buyer);
      
      expect(result.status).toBe('譟ｻ螳壹い繝ｳ繧ｱ繝ｼ繝亥屓遲斐≠繧・);
      expect(result.priority).toBe(1);
    });
  });
  
  describe('Priority 2: 讌ｭ閠・撫蜷医○縺ゅｊ', () => {
    it('should return "讌ｭ閠・撫蜷医○縺ゅｊ" when broker_survey is "譛ｪ"', () => {
      const buyer: BuyerData = {
        buyer_number: 'TEST002',
        valuation_survey: null,
        broker_survey: '譛ｪ',
        // ... other fields
      };
      
      const result = calculateBuyerStatus(buyer);
      
      expect(result.status).toBe('讌ｭ閠・撫蜷医○縺ゅｊ');
      expect(result.priority).toBe(2);
    });
  });
  
  // ... 蜈ｨ27譚｡莉ｶ縺ｮ繝・せ繝医こ繝ｼ繧ｹ
});

describe('Date Helpers', () => {
  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });
    
    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });
  
  describe('isTomorrow', () => {
    it('should return true for tomorrow\'s date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isTomorrow(tomorrow)).toBe(true);
    });
  });
  
  describe('getDayOfWeek', () => {
    it('should return correct day of week in Japanese', () => {
      const thursday = new Date('2026-02-05'); // 譛ｨ譖懈律
      expect(getDayOfWeek(thursday)).toBe('譛ｨ譖懈律');
    });
  });
});

describe('Field Helpers', () => {
  describe('isBlank', () => {
    it('should return true for null', () => {
      expect(isBlank(null)).toBe(true);
    });
    
    it('should return true for empty string', () => {
      expect(isBlank('')).toBe(true);
    });
    
    it('should return true for undefined', () => {
      expect(isBlank(undefined)).toBe(true);
    });
    
    it('should return false for non-empty string', () => {
      expect(isBlank('value')).toBe(false);
    });
  });
  
  describe('contains', () => {
    it('should return true for partial match', () => {
      expect(contains('雋ｷ莉倡黄莉ｶ', '雋ｷ莉・)).toBe(true);
    });
    
    it('should return false for no match', () => {
      expect(contains('雋ｷ莉倡黄莉ｶ', '螢ｲ蜊ｴ')).toBe(false);
    });
  });
});
```

#### 2. Property-Based Tests・医・繝ｭ繝代ユ繧｣繝吶・繧ｹ繝・せ繝茨ｼ・

**蟇ｾ雎｡**: 繧ｹ繝・・繧ｿ繧ｹ邂怜・繝ｭ繧ｸ繝・け蜈ｨ菴・

**繝・・繝ｫ**: fast-check (TypeScript逕ｨ繝励Ο繝代ユ繧｣繝吶・繧ｹ繝・せ繝医Λ繧､繝悶Λ繝ｪ)

**螳溯｡悟屓謨ｰ**: 蜷・・繝ｭ繝代ユ繧｣100蝗樔ｻ･荳・

**繝・せ繝医こ繝ｼ繧ｹ萓・*:

```typescript
import fc from 'fast-check';

describe('Property-Based Tests', () => {
  // Property 1: 譚｡莉ｶ蛻､螳壹・蜆ｪ蜈磯・ｽ堺ｿ晁ｨｼ
  it('should return highest priority status when multiple conditions match', () => {
    fc.assert(
      fc.property(
        buyerDataArbitrary(),
        (buyer) => {
          const result = calculateBuyerStatus(buyer);
          
          // 蜈ｨ縺ｦ縺ｮ譚｡莉ｶ繧定ｩ穂ｾ｡
          const matchedConditions = CONDITIONS.filter(c => 
            evaluateCondition(c, buyer)
          );
          
          if (matchedConditions.length > 0) {
            // 譛繧ょ━蜈磯・ｽ阪・鬮倥＞譚｡莉ｶ縺瑚ｿ斐＆繧後ｋ縺ｹ縺・
            const highestPriority = Math.min(...matchedConditions.map(c => c.priority));
            expect(result.priority).toBe(highestPriority);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 2: 蜈ｨ譚｡莉ｶ縺ｮ豁｣遒ｺ縺ｪ螳溯｣・
  it('should match at least one condition or return empty string', () => {
    fc.assert(
      fc.property(
        buyerDataArbitrary(),
        (buyer) => {
          const result = calculateBuyerStatus(buyer);
          
          // 繧ｹ繝・・繧ｿ繧ｹ縺檎ｩｺ縺ｧ縺ｪ縺・ｴ蜷医√＞縺壹ｌ縺九・譚｡莉ｶ縺ｫ荳閾ｴ縺励※縺・ｋ縺ｹ縺・
          if (result.status !== '') {
            const matchedCondition = CONDITIONS.find(c => c.status === result.status);
            expect(matchedCondition).toBeDefined();
            expect(evaluateCondition(matchedCondition!, buyer)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 16: ISBLANK譚｡莉ｶ縺ｮ隧穂ｾ｡
  it('should treat null, empty string, and undefined as blank', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.constant(''), fc.constant(undefined)),
        (value) => {
          expect(isBlank(value)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Arbitrary・医Λ繝ｳ繝繝繝・・繧ｿ逕滓・蝎ｨ・・
function buyerDataArbitrary(): fc.Arbitrary<BuyerData> {
  return fc.record({
    buyer_number: fc.string({ minLength: 1, maxLength: 10 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    phone_number: fc.option(fc.string({ minLength: 10, maxLength: 11 })),
    email: fc.option(fc.emailAddress()),
    reception_date: fc.option(fc.date()),
    latest_viewing_date: fc.option(fc.date()),
    next_call_date: fc.option(fc.date()),
    follow_up_assignee: fc.option(fc.constantFrom('Y', 'W', 'U', '逕・, 'K', '荵・, 'I', 'R')),
    latest_status: fc.option(fc.string()),
    inquiry_confidence: fc.option(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'S', 'A+', 'S+')),
    // ... other fields
  });
}
```

#### 3. Integration Tests・育ｵｱ蜷医ユ繧ｹ繝茨ｼ・

**蟇ｾ雎｡**: BuyerService縲、PI繧ｨ繝ｳ繝峨・繧､繝ｳ繝・

**繝・・繝ｫ**: Jest + Supertest

**繝・せ繝医こ繝ｼ繧ｹ萓・*:

```typescript
describe('BuyerService Integration Tests', () => {
  let service: BuyerService;
  
  beforeEach(() => {
    service = new BuyerService();
  });
  
  it('should fetch buyers with calculated status', async () => {
    const buyers = await service.getBuyersWithStatus();
    
    expect(buyers).toBeInstanceOf(Array);
    buyers.forEach(buyer => {
      expect(buyer).toHaveProperty('calculated_status');
      expect(typeof buyer.calculated_status).toBe('string');
    });
  });
  
  it('should return status categories with counts', async () => {
    const categories = await service.getStatusCategories();
    
    expect(categories).toBeInstanceOf(Array);
    categories.forEach(category => {
      expect(category).toHaveProperty('status');
      expect(category).toHaveProperty('count');
      expect(category).toHaveProperty('color');
      expect(category.count).toBeGreaterThanOrEqual(0);
    });
  });
  
  it('should filter buyers by status', async () => {
    const status = '諡・ｽ・Y)';
    const buyers = await service.getBuyersByStatus(status);
    
    buyers.forEach(buyer => {
      const result = calculateBuyerStatus(buyer);
      expect(result.status).toBe(status);
    });
  });
});

describe('API Endpoint Tests', () => {
  it('GET /api/buyers should return buyers with status', async () => {
    const response = await request(app)
      .get('/api/buyers')
      .expect(200);
    
    expect(response.body).toBeInstanceOf(Array);
    response.body.forEach((buyer: any) => {
      expect(buyer).toHaveProperty('calculated_status');
    });
  });
  
  it('GET /api/buyers/status-categories should return categories', async () => {
    const response = await request(app)
      .get('/api/buyers/status-categories')
      .expect(200);
    
    expect(response.body).toBeInstanceOf(Array);
    response.body.forEach((category: any) => {
      expect(category).toHaveProperty('status');
      expect(category).toHaveProperty('count');
      expect(category).toHaveProperty('color');
    });
  });
});
```

#### 4. Performance Tests・医ヱ繝輔か繝ｼ繝槭Φ繧ｹ繝・せ繝茨ｼ・

**蟇ｾ雎｡**: 繧ｹ繝・・繧ｿ繧ｹ邂怜・縺ｮ蜃ｦ逅・凾髢・

**繝・・繝ｫ**: Jest + performance.now()

**繝・せ繝医こ繝ｼ繧ｹ萓・*:

```typescript
describe('Performance Tests', () => {
  it('should calculate status for 1000 buyers within 5 seconds', async () => {
    // 1000莉ｶ縺ｮ繝・せ繝医ョ繝ｼ繧ｿ繧堤函謌・
    const buyers = Array.from({ length: 1000 }, (_, i) => ({
      buyer_number: `TEST${i.toString().padStart(4, '0')}`,
      // ... other fields
    }));
    
    const startTime = performance.now();
    
    buyers.forEach(buyer => {
      calculateBuyerStatus(buyer);
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(5000); // 5遘剃ｻ･蜀・
  });
});
```

### 繝・せ繝亥ｮ溯｡後さ繝槭Φ繝・

```bash
# 蜈ｨ繝・せ繝亥ｮ溯｡・
npm test

# Unit tests縺ｮ縺ｿ
npm test -- --testPathPattern=unit

# Property-based tests縺ｮ縺ｿ
npm test -- --testPathPattern=property

# Integration tests縺ｮ縺ｿ
npm test -- --testPathPattern=integration

# 繧ｫ繝舌Ξ繝・ず繝ｬ繝昴・繝育函謌・
npm test -- --coverage

# Watch mode・磯幕逋ｺ譎ゑｼ・
npm test -- --watch
```

### 繝・せ繝医き繝舌Ξ繝・ず逶ｮ讓・

- **Unit Tests**: 90%莉･荳・
- **Property-Based Tests**: 蜈ｨ繝励Ο繝代ユ繧｣・・8蛟具ｼ峨ｒ螳溯｣・
- **Integration Tests**: 荳ｻ隕√↑API繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ｒ繧ｫ繝舌・
- **Performance Tests**: 1000莉ｶ/5遘偵・蝓ｺ貅悶ｒ貅縺溘☆

### CI/CD繝代う繝励Λ繧､繝ｳ

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --testPathPattern=unit
      
      - name: Run property-based tests
        run: npm test -- --testPathPattern=property
      
      - name: Run integration tests
        run: npm test -- --testPathPattern=integration
      
      - name: Generate coverage report
        run: npm test -- --coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v2
```
