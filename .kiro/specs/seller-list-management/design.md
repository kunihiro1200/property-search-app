# 設計書

## 概要

### システムの目的

本システムは、不動産売買専門の仲介業者向けの売主リスト管理システムです。無料査定依頼を行った売主の情報を一元管理し、以下の機能を提供します：

- 売主情報の登録と管理（100以上のフィールド）
- 物件の自動査定エンジン
- 追客活動の記録と管理（電話、Gmail、SMS）
- 訪問査定予約とGoogleカレンダー連携
- 社員の活動ログ自動記録
- 重複チェック機能
- 競合情報管理
- Pinrich配信管理
- 除外管理
- Google Chat通知連携
- スプレッドシート同期（手動更新・自動更新）

### スコープ

**含まれるもの：**
- 売主情報の完全なCRUD操作
- 物件情報の管理と自動査定
- Google OAuth 2.0による認証
- Gmail API連携（査定メール送信、追客メール送信）
- Google Calendar API連携（訪問査定予約）
- Google Chat API連携（通知送信）
- 活動ログの自動記録
- 重複検出アルゴリズム
- 検索・フィルタリング機能
- ページネーション（1ページ50件）
- スプレッドシート同期（手動・自動）
- データ鮮度管理とキャッシング

**含まれないもの：**
- 買主管理機能（別システム）
- 契約書作成機能
- 決済管理機能
- 物件公開サイト機能
- モバイルアプリ

### 主要な制約

- **パフォーマンス要件：** 1万件以上のデータで初期表示3秒以内、検索1秒以内
- **セキュリティ要件：** 個人情報の暗号化、Google OAuth 2.0認証必須
- **スケーラビリティ要件：** 毎日約10件の新規査定依頼、既存1万件以上のデータ
- **データ鮮度要件：** キャッシュデータが5分以上古い場合は自動更新
- **ブラウザ対応：** Chrome、Edge、Safari最新版
- **API制限：** Gmail API、Google Calendar API、Google Chat APIの利用制限に準拠

## アーキテクチャ

### システムアーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                        フロントエンド                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ React UI     │  │ State管理    │  │ API Client   │      │
│  │ Components   │  │ (Zustand)    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        バックエンド                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Express.js   │  │ 認証         │  │ ビジネス     │      │
│  │ REST API     │  │ Middleware   │  │ ロジック     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ 査定エンジン │  │ 重複検出     │  │ 同期サービス │      │
│  │              │  │ サービス     │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ PostgreSQL   │    │ Redis Cache  │    │ Google APIs  │
│ Database     │    │              │    │ - Gmail      │
│              │    │              │    │ - Calendar   │
│              │    │              │    │ - Chat       │
│              │    │              │    │ - Sheets     │
└──────────────┘    └──────────────┘    └──────────────┘
```

### コンポーネント概要

#### フロントエンド層
- **React UI Components:** 売主リスト、売主詳細、検索・フィルター、活動ログ表示
- **State管理 (Zustand):** グローバル状態管理、キャッシュ管理
- **API Client:** バックエンドAPIとの通信、エラーハンドリング

#### バックエンド層
- **Express.js REST API:** RESTful APIエンドポイント
- **認証Middleware:** Google OAuth 2.0認証、セッション管理
- **ビジネスロジック層:** 売主管理、物件管理、活動ログ管理
- **査定エンジン:** 物件の自動査定計算
- **重複検出サービス:** 電話番号・メールアドレスによる重複チェック
- **同期サービス:** スプレッドシート同期（手動・自動）、データ鮮度管理

#### データ層
- **PostgreSQL:** 売主データ、物件データ、活動ログ、社員情報
- **Redis Cache:** 頻繁にアクセスされるデータのキャッシュ、セッション管理
- **Google APIs:** Gmail、Calendar、Chat、Sheets連携

## コンポーネントとインターフェース

### 1. 認証サービス (AuthService)

**責務：**
- Google OAuth 2.0による認証
- セッション管理
- アクセストークンの管理

**主要メソッド：**
```typescript
interface AuthService {
  // Google OAuth 2.0認証URLを生成
  generateAuthUrl(): string;
  
  // 認証コードからトークンを取得
  exchangeCodeForTokens(code: string): Promise<AuthTokens>;
  
  // セッションを作成
  createSession(userId: string, tokens: AuthTokens): Promise<Session>;
  
  // セッションを検証
  validateSession(sessionId: string): Promise<Session | null>;
  
  // セッションを無効化
  invalidateSession(sessionId: string): Promise<void>;
  
  // トークンをリフレッシュ
  refreshAccessToken(refreshToken: string): Promise<AuthTokens>;
}
```

### 2. 売主サービス (SellerService)

**責務：**
- 売主情報のCRUD操作
- 売主番号の自動生成
- 個人情報の暗号化・復号化
- 検索・フィルタリング

**主要メソッド：**
```typescript
interface SellerService {
  // 売主を作成（売主番号自動生成）
  createSeller(data: CreateSellerInput): Promise<Seller>;
  
  // 売主を取得
  getSeller(sellerId: string): Promise<Seller>;
  
  // 売主を更新
  updateSeller(sellerId: string, data: UpdateSellerInput): Promise<Seller>;
  
  // 売主を削除（論理削除）
  deleteSeller(sellerId: string): Promise<void>;
  
  // 売主リストを取得（ページネーション、フィルタリング）
  listSellers(params: ListSellersParams): Promise<PaginatedSellers>;
  
  // 売主を検索
  searchSellers(query: string): Promise<Seller[]>;
  
  // 次の売主番号を生成
  generateSellerNumber(): Promise<string>;
}
```

### 3. 売主番号サービス (SellerNumberService)

**責務：**
- 売主番号の生成（AA + 5桁数字）
- 番号の重複チェック
- 番号の採番管理

**主要メソッド：**
```typescript
interface SellerNumberService {
  // 次の売主番号を生成
  generateNext(): Promise<string>;
  
  // 売主番号の存在チェック
  exists(sellerNumber: string): Promise<boolean>;
  
  // 売主番号のフォーマット検証
  validate(sellerNumber: string): boolean;
  
  // 売主番号から数値部分を抽出
  extractNumber(sellerNumber: string): number;
}
```

### 4. 重複検出サービス (DuplicateDetectionService)

**責務：**
- 電話番号による重複検出
- メールアドレスによる重複検出
- 重複売主の情報取得

**主要メソッド：**
```typescript
interface DuplicateDetectionService {
  // 電話番号で重複をチェック
  checkByPhone(phone: string): Promise<DuplicateCheckResult>;
  
  // メールアドレスで重複をチェック
  checkByEmail(email: string): Promise<DuplicateCheckResult>;
  
  // 重複売主の詳細情報を取得
  getDuplicateDetails(sellerId: string): Promise<SellerDetails>;
  
  // 売主情報をコピー
  copySeller(sourceId: string, targetId: string): Promise<void>;
}
```

### 5. 査定エンジン (ValuationEngine)

**責務：**
- 物件の自動査定計算
- 査定額の算出（査定額1、2、3）
- 査定履歴の管理

**主要メソッド：**
```typescript
interface ValuationEngine {
  // 物件を査定
  calculateValuation(property: PropertyData): Promise<ValuationResult>;
  
  // 戸建て・土地の査定
  calculateDetachedHouseValuation(property: PropertyData): Promise<ValuationResult>;
  
  // マンションの査定（手入力）
  setManualValuation(propertyId: string, values: ManualValuation): Promise<void>;
  
  // 査定履歴を取得
  getValuationHistory(propertyId: string): Promise<ValuationHistory[]>;
  
  // 査定額の妥当性チェック
  validateValuation(valuation: ValuationResult): ValidationResult;
}
```

### 6. 活動ログサービス (ActivityLogService)

**責務：**
- 追客活動の記録（電話、メール、SMS）
- 活動ログの取得
- 活動統計の集計

**主要メソッド：**
```typescript
interface ActivityLogService {
  // 活動ログを記録
  logActivity(activity: ActivityInput): Promise<ActivityLog>;
  
  // 電話活動を記録
  logPhoneCall(data: PhoneCallData): Promise<ActivityLog>;
  
  // メール活動を記録
  logEmail(data: EmailData): Promise<ActivityLog>;
  
  // SMS活動を記録
  logSMS(data: SMSData): Promise<ActivityLog>;
  
  // 売主の活動ログを取得
  getSellerActivityLogs(sellerId: string): Promise<ActivityLog[]>;
  
  // 社員の活動統計を取得
  getEmployeeStatistics(employeeId: string, period: DateRange): Promise<Statistics>;
}
```

### 7. メールサービス (EmailService)

**責務：**
- Gmail APIを使用したメール送信
- 査定メールの自動生成
- メールテンプレート管理

**主要メソッド：**
```typescript
interface EmailService {
  // 査定メールを送信
  sendValuationEmail(sellerId: string, template: EmailTemplate): Promise<void>;
  
  // 追客メールを送信
  sendFollowUpEmail(sellerId: string, content: EmailContent): Promise<void>;
  
  // メールテンプレートを取得
  getTemplate(templateId: string): Promise<EmailTemplate>;
  
  // メールを自動生成
  generateEmail(sellerId: string, templateId: string): Promise<GeneratedEmail>;
}
```

### 8. カレンダーサービス (CalendarService)

**責務：**
- Google Calendar APIを使用したイベント管理
- 訪問査定予約の登録
- カレンダーイベントの削除

**主要メソッド：**
```typescript
interface CalendarService {
  // カレンダーイベントを作成
  createEvent(event: CalendarEventInput): Promise<CalendarEvent>;
  
  // 訪問査定予約を登録
  scheduleVisit(visit: VisitSchedule): Promise<CalendarEvent>;
  
  // カレンダーイベントを更新
  updateEvent(eventId: string, updates: CalendarEventUpdate): Promise<CalendarEvent>;
  
  // カレンダーイベントを削除
  deleteEvent(eventId: string): Promise<void>;
  
  // 社員のカレンダーイベントを取得
  getEmployeeEvents(employeeId: string, dateRange: DateRange): Promise<CalendarEvent[]>;
}
```

### 9. Google Chatサービス (ChatNotificationService)

**責務：**
- Google Chat APIを使用した通知送信
- 通知メッセージの生成

**主要メソッド：**
```typescript
interface ChatNotificationService {
  // 一般媒介通知を送信
  sendGeneralMediation(sellerId: string): Promise<void>;
  
  // 専任取得通知を送信
  sendExclusiveContract(sellerId: string): Promise<void>;
  
  // 他決共有通知を送信（営業のみ）
  sendCompetitorWin(sellerId: string, visited: boolean): Promise<void>;
  
  // 物件紹介通知を送信
  sendPropertyIntroduction(sellerId: string, message: string): Promise<void>;
}
```

### 10. スプレッドシート同期サービス (SpreadsheetSyncService)

**責務：**
- Google Sheets APIを使用したデータ同期
- 手動更新の実行
- 自動更新の実行
- データ鮮度管理

**主要メソッド：**
```typescript
interface SpreadsheetSyncService {
  // 手動でスプレッドシートから最新データを取得
  manualSync(): Promise<SyncResult>;
  
  // 自動でデータ鮮度をチェックし、必要に応じて同期
  autoSync(): Promise<SyncResult>;
  
  // キャッシュデータの鮮度をチェック
  checkDataFreshness(): Promise<DataFreshnessStatus>;
  
  // スプレッドシートからデータを取得
  fetchFromSpreadsheet(): Promise<SpreadsheetData>;
  
  // データベースを更新
  updateDatabase(data: SpreadsheetData): Promise<void>;
}
```

## データモデル

### 1. 売主 (Sellers)

```sql
CREATE TABLE sellers (
  -- 基本情報
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_number VARCHAR(10) UNIQUE NOT NULL, -- AA + 5桁数字
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 個人情報（暗号化）
  name_encrypted TEXT NOT NULL,
  address_encrypted TEXT,
  phone_encrypted TEXT NOT NULL,
  email_encrypted TEXT,
  
  -- 物件情報
  property_type VARCHAR(20), -- 戸建て、土地、マンション
  property_address TEXT,
  land_area DECIMAL(10, 2),
  building_area DECIMAL(10, 2),
  land_area_verified DECIMAL(10, 2), -- 当社調べ
  building_area_verified DECIMAL(10, 2), -- 当社調べ
  structure VARCHAR(20), -- 木造、軽量鉄骨、鉄骨、他
  building_age INTEGER,
  seller_situation VARCHAR(20), -- 居住中、空き家、賃貸中、古屋あり、更地
  
  -- 査定情報
  valuation_1 DECIMAL(12, 2),
  valuation_2 DECIMAL(12, 2),
  valuation_3 DECIMAL(12, 2),
  valuation_after_visit_1 DECIMAL(12, 2),
  valuation_url TEXT,
  fixed_asset_tax_value DECIMAL(12, 2),
  
  -- 反響情報
  inquiry_site VARCHAR(10), -- サイト略称
  inquiry_year INTEGER,
  inquiry_date DATE,
  inquiry_datetime TIMESTAMP,
  inquiry_reason TEXT,
  site_url TEXT,
  
  -- 追客情報
  confidence_level VARCHAR(10), -- A, B, B', C, D, E, ダブり
  next_call_date DATE,
  unreachable BOOLEAN DEFAULT FALSE,
  second_call_unreachable BOOLEAN DEFAULT FALSE,
  contact_method VARCHAR(10), -- Email, Smail, 電話
  preferred_contact_time TEXT,
  
  -- 訪問査定情報
  visit_acquired_date DATE,
  visit_date DATE,
  visit_time TIME,
  visit_day_of_week VARCHAR(10),
  visit_assignee_id UUID REFERENCES employees(id),
  visit_notes TEXT,
  visit_acquirer_id UUID REFERENCES employees(id),
  
  -- 査定書送付情報
  email_sent_date DATE,
  mail_sent_date DATE,
  mail_status VARCHAR(10), -- 未、済
  valuation_method VARCHAR(30), -- 机上査定（メール）、机上査定（郵送）、机上査定（不通）
  alternative_address TEXT,
  
  -- 担当者情報
  valuation_assignee_id UUID REFERENCES employees(id),
  phone_assignee_id UUID REFERENCES employees(id),
  first_caller_initial VARCHAR(5),
  first_caller_id UUID REFERENCES employees(id),
  
  -- ステータス情報
  status VARCHAR(30), -- 新規、追客中、訪問査定予定、専任媒介、一般媒介、専任媒介他決、追客他決、追客不要他決、専任他決、等
  
  -- 競合情報
  competitor_name TEXT,
  competitor_factors TEXT[], -- 複数選択可能
  competitor_countermeasure TEXT,
  contract_year_month VARCHAR(7), -- YYYY-MM
  exclusive_competitor_meeting VARCHAR(10), -- 未、完了
  
  -- Pinrich情報
  pinrich_status VARCHAR(20), -- 配信中、クローズ
  registered_companies_count INTEGER,
  
  -- 除外情報
  exclusion_site_url TEXT,
  exclusion_criteria TEXT,
  exclusion_date DATE,
  exclusion_action VARCHAR(30), -- 不通であれば除外、何もせずに除外
  
  -- キャンセル案内情報
  cancellation_assignee_id UUID REFERENCES employees(id),
  cancellation_notes TEXT,
  price_loss_list_entered BOOLEAN DEFAULT FALSE,
  exclusive_contract_script TEXT,
  company_introduction TEXT,
  
  -- 買主連携情報
  buyer_id UUID REFERENCES buyers(id),
  purchase_info TEXT,
  
  -- イエウール専用
  ieul_mansion_address TEXT, -- ウのマンションとは別明記分
  
  -- 重複チェック
  duplicate_check_required BOOLEAN DEFAULT FALSE,
  
  -- 論理削除
  deleted_at TIMESTAMP,
  
  -- インデックス
  CONSTRAINT seller_number_format CHECK (seller_number ~ '^AA[0-9]{5}$')
);

CREATE INDEX idx_sellers_seller_number ON sellers(seller_number);
CREATE INDEX idx_sellers_phone_encrypted ON sellers(phone_encrypted);
CREATE INDEX idx_sellers_email_encrypted ON sellers(email_encrypted);
CREATE INDEX idx_sellers_status ON sellers(status);
CREATE INDEX idx_sellers_next_call_date ON sellers(next_call_date);
CREATE INDEX idx_sellers_created_at ON sellers(created_at DESC);
CREATE INDEX idx_sellers_deleted_at ON sellers(deleted_at) WHERE deleted_at IS NULL;
```

### 2. 社員 (Employees)

```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  initial VARCHAR(5),
  role VARCHAR(20) DEFAULT 'employee', -- admin, employee
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_google_id ON employees(google_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_active ON employees(active);
```

### 3. 活動ログ (Activity_Logs)

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  activity_type VARCHAR(20) NOT NULL, -- phone, email, sms
  activity_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 電話活動
  call_duration INTEGER, -- 秒
  call_result VARCHAR(50), -- 応答、不通、留守電、等
  call_notes TEXT,
  
  -- メール活動
  email_subject TEXT,
  email_body TEXT,
  email_sent_at TIMESTAMP,
  
  -- SMS活動
  sms_message TEXT,
  sms_sent_at TIMESTAMP,
  
  -- 共通
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_seller_id ON activity_logs(seller_id);
CREATE INDEX idx_activity_logs_employee_id ON activity_logs(employee_id);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_activity_date ON activity_logs(activity_date DESC);
```

### 4. セッション (Sessions)

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_employee_id ON sessions(employee_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### 5. 査定履歴 (Valuation_History)

```sql
CREATE TABLE valuation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  valuation_1 DECIMAL(12, 2),
  valuation_2 DECIMAL(12, 2),
  valuation_3 DECIMAL(12, 2),
  calculation_method TEXT,
  calculated_by UUID REFERENCES employees(id),
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_valuation_history_seller_id ON valuation_history(seller_id);
CREATE INDEX idx_valuation_history_calculated_at ON valuation_history(calculated_at DESC);
```

### 6. 同期ログ (Sync_Logs)

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(20) NOT NULL, -- manual, auto
  sync_status VARCHAR(20) NOT NULL, -- success, failure, in_progress
  records_synced INTEGER,
  error_message TEXT,
  triggered_by UUID REFERENCES employees(id),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX idx_sync_logs_sync_status ON sync_logs(sync_status);
CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at DESC);
```

### 7. データ鮮度管理 (Data_Freshness)

```sql
CREATE TABLE data_freshness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type VARCHAR(50) NOT NULL UNIQUE, -- sellers, properties, etc.
  last_synced_at TIMESTAMP NOT NULL,
  next_sync_at TIMESTAMP,
  sync_interval_minutes INTEGER DEFAULT 5,
  is_stale BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_data_freshness_data_type ON data_freshness(data_type);
CREATE INDEX idx_data_freshness_last_synced_at ON data_freshness(last_synced_at);
```

### エンティティ関係図

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  Employees  │◄────────│   Sellers   │────────►│   Buyers    │
│             │ 1     * │             │ *     1 │             │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                        
       │ 1                     │ 1                      
       │                       │                        
       │ *                     │ *                      
┌─────────────┐         ┌─────────────┐                
│  Sessions   │         │ Activity    │                
│             │         │    Logs     │                
└─────────────┘         └─────────────┘                
                               │                        
                               │ 1                      
                               │                        
                               │ *                      
                        ┌─────────────┐                
                        │ Valuation   │                
                        │  History    │                
                        └─────────────┘                
```


## 正確性プロパティ

本セクションでは、システムが満たすべき正確性プロパティを定義します。各プロパティは対応する要件を参照しています。

### P1: 売主番号の一意性と形式

**プロパティ：** 全ての売主番号は「AA」で始まる5桁の数字を含み、システム内で一意でなければならない

**検証方法：**
- 売主番号生成時に既存番号との重複チェックを実行
- データベース制約（UNIQUE制約）で一意性を保証
- 正規表現 `^AA[0-9]{5}$` で形式を検証

**対応要件：** 要件11

**テストケース：**
```typescript
// Property-based test
property('売主番号は常にAA+5桁の数字形式である', 
  forAll(sellerNumberGenerator, (number) => {
    return /^AA[0-9]{5}$/.test(number);
  })
);

property('生成された売主番号は常に一意である',
  forAll(array(sellerNumberGenerator, { minLength: 100 }), (numbers) => {
    const uniqueNumbers = new Set(numbers);
    return uniqueNumbers.size === numbers.length;
  })
);
```

### P2: 個人情報の暗号化

**プロパティ：** 売主の個人情報（名前、住所、電話番号、メールアドレス）は常に暗号化されて保存され、復号化時に元のデータと一致しなければならない

**検証方法：**
- データベース保存前に暗号化処理を実行
- 取得時に復号化処理を実行
- 暗号化→復号化の往復で元のデータと一致することを検証

**対応要件：** 要件1

**テストケース：**
```typescript
property('暗号化と復号化は可逆的である',
  forAll(string(), (originalData) => {
    const encrypted = encrypt(originalData);
    const decrypted = decrypt(encrypted);
    return decrypted === originalData;
  })
);

property('暗号化されたデータは元のデータと異なる',
  forAll(string({ minLength: 1 }), (originalData) => {
    const encrypted = encrypt(originalData);
    return encrypted !== originalData;
  })
);
```

### P3: 重複検出の正確性

**プロパティ：** 同じ電話番号またはメールアドレスを持つ売主が存在する場合、システムは必ず重複を検出しなければならない

**検証方法：**
- 電話番号での完全一致検索
- メールアドレスでの完全一致検索
- 重複が検出された場合、過去の売主情報を返す

**対応要件：** 要件12

**テストケース：**
```typescript
property('同じ電話番号は常に重複として検出される',
  forAll(phoneNumber(), async (phone) => {
    await createSeller({ phone });
    const duplicate = await checkDuplicateByPhone(phone);
    return duplicate.isDuplicate === true;
  })
);

property('異なる電話番号は重複として検出されない',
  forAll(phoneNumber(), phoneNumber(), async (phone1, phone2) => {
    if (phone1 === phone2) return true;
    await createSeller({ phone: phone1 });
    const duplicate = await checkDuplicateByPhone(phone2);
    return duplicate.isDuplicate === false;
  })
);
```

### P4: 査定額の妥当性

**プロパティ：** 査定額1 ≤ 査定額2 ≤ 査定額3 の関係が常に成立しなければならない

**検証方法：**
- 査定額計算後に大小関係を検証
- 異常値（極端に高い、または低い）の場合は警告を表示

**対応要件：** 要件2、要件15

**テストケース：**
```typescript
property('査定額は昇順である',
  forAll(propertyData(), (property) => {
    const valuation = calculateValuation(property);
    return valuation.amount1 <= valuation.amount2 && 
           valuation.amount2 <= valuation.amount3;
  })
);

property('査定額は正の数である',
  forAll(propertyData(), (property) => {
    const valuation = calculateValuation(property);
    return valuation.amount1 > 0 && 
           valuation.amount2 > 0 && 
           valuation.amount3 > 0;
  })
);
```

### P5: 活動ログの完全性

**プロパティ：** 全ての追客活動（電話、メール、SMS）は必ず活動ログに記録され、実行社員と日時が自動記録されなければならない

**検証方法：**
- 活動実行時に自動的にログを作成
- ログには必ず employee_id と activity_date が含まれる
- ログは時系列順に取得可能

**対応要件：** 要件4、要件8

**テストケース：**
```typescript
property('全ての活動は必ずログに記録される',
  forAll(activityData(), async (activity) => {
    await logActivity(activity);
    const logs = await getActivityLogs(activity.sellerId);
    return logs.some(log => 
      log.activityType === activity.type &&
      log.employeeId === activity.employeeId
    );
  })
);

property('活動ログは時系列順である',
  forAll(array(activityData()), async (activities) => {
    for (const activity of activities) {
      await logActivity(activity);
    }
    const logs = await getActivityLogs(activities[0].sellerId);
    return isSortedDescending(logs.map(l => l.activityDate));
  })
);
```

### P6: カレンダー同期の一貫性

**プロパティ：** 訪問査定予約が確定した場合、必ずGoogleカレンダーにイベントが作成され、キャンセル時には削除されなければならない

**検証方法：**
- 予約確定時にカレンダーAPIを呼び出し
- イベント作成成功時にステータスを「訪問査定予定」に更新
- キャンセル時にカレンダーからイベントを削除

**対応要件：** 要件6

**テストケース：**
```typescript
property('訪問査定予約はカレンダーに反映される',
  forAll(visitSchedule(), async (visit) => {
    const event = await scheduleVisit(visit);
    const calendarEvent = await getCalendarEvent(event.id);
    return calendarEvent !== null;
  })
);

property('訪問査定キャンセルはカレンダーから削除される',
  forAll(visitSchedule(), async (visit) => {
    const event = await scheduleVisit(visit);
    await cancelVisit(event.id);
    const calendarEvent = await getCalendarEvent(event.id);
    return calendarEvent === null;
  })
);
```

### P7: 検索パフォーマンス

**プロパティ：** 1万件以上のデータが存在する場合でも、検索は1秒以内に結果を返さなければならない

**検証方法：**
- 検索実行時間を計測
- データベースクエリの実行計画を確認
- 適切なインデックスが使用されていることを確認

**対応要件：** 要件10

**テストケース：**
```typescript
property('検索は1秒以内に完了する',
  forAll(searchQuery(), async (query) => {
    const startTime = Date.now();
    await searchSellers(query);
    const endTime = Date.now();
    return (endTime - startTime) < 1000;
  })
);
```

### P8: ページネーションの正確性

**プロパティ：** ページネーションで取得されるデータは重複せず、全てのデータが少なくとも1回は取得可能でなければならない

**検証方法：**
- 全ページを取得し、重複をチェック
- 全データ件数とページネーション取得件数が一致することを確認

**対応要件：** 要件9

**テストケース：**
```typescript
property('ページネーションでデータが重複しない',
  forAll(integer({ min: 1, max: 100 }), async (totalPages) => {
    const allIds = new Set();
    for (let page = 1; page <= totalPages; page++) {
      const result = await listSellers({ page, pageSize: 50 });
      result.data.forEach(seller => allIds.add(seller.id));
    }
    const totalCount = await countSellers();
    return allIds.size === totalCount;
  })
);
```

### P9: データ鮮度管理

**プロパティ：** キャッシュデータが5分以上古い場合、システムは自動的にスプレッドシートから最新データを取得しなければならない

**検証方法：**
- データ鮮度をチェック
- 5分以上経過している場合は自動同期を実行
- 同期後にデータ鮮度を更新

**対応要件：** 要件30

**テストケース：**
```typescript
property('古いキャッシュは自動更新される',
  forAll(integer({ min: 6, max: 60 }), async (minutesOld) => {
    // キャッシュを古くする
    await setDataFreshness('sellers', Date.now() - minutesOld * 60 * 1000);
    
    // 自動同期を実行
    await autoSync();
    
    // データ鮮度が更新されていることを確認
    const freshness = await getDataFreshness('sellers');
    const ageMinutes = (Date.now() - freshness.lastSyncedAt) / 60000;
    return ageMinutes < 1;
  })
);
```

### P10: 競合情報の必須入力

**プロパティ：** ステータスが「専任媒介他決」「追客他決」「追客不要他決」「専任他決」「一般」のいずれかの場合、競合名、専任・他決要因、他決対策、契約年月、専任他決打合せの全てが入力されていなければ保存できない

**検証方法：**
- ステータス更新時に競合情報の入力チェック
- 必須項目が未入力の場合はエラーを返す

**対応要件：** 要件20

**テストケース：**
```typescript
property('競合情報が必須のステータスでは全項目が入力されている',
  forAll(competitorRequiredStatus(), competitorInfo(), async (status, info) => {
    const seller = { status, ...info };
    if (info.competitorName && info.factors && info.countermeasure && 
        info.contractYearMonth && info.meetingStatus) {
      // 全項目入力済み → 保存成功
      const result = await updateSeller(seller);
      return result.success === true;
    } else {
      // 未入力項目あり → 保存失敗
      try {
        await updateSeller(seller);
        return false; // エラーが発生しなかった場合は失敗
      } catch (error) {
        return error.code === 'MISSING_REQUIRED_FIELDS';
      }
    }
  })
);
```

## エラーハンドリング

### 1. 認証エラー

**シナリオ：**
- Google OAuth 2.0認証失敗
- セッション期限切れ
- 無効なアクセストークン

**ハンドリング：**
```typescript
class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// 認証ミドルウェア
async function authMiddleware(req, res, next) {
  try {
    const session = await validateSession(req.sessionId);
    if (!session) {
      throw new AuthenticationError('セッションが無効です', 'INVALID_SESSION');
    }
    req.user = session.employee;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: error.message,
        code: error.code,
        redirectTo: '/login'
      });
    }
    next(error);
  }
}
```

### 2. データ検証エラー

**シナリオ：**
- 売主番号の形式が不正
- 必須項目の未入力
- 査定額の異常値

**ハンドリング：**
```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateSellerNumber(sellerNumber: string) {
  if (!/^AA[0-9]{5}$/.test(sellerNumber)) {
    throw new ValidationError(
      '売主番号はAA+5桁の数字形式である必要があります',
      'seller_number',
      'INVALID_FORMAT'
    );
  }
}

function validateValuation(valuation: ValuationResult) {
  if (valuation.amount1 > valuation.amount2 || 
      valuation.amount2 > valuation.amount3) {
    throw new ValidationError(
      '査定額は昇順である必要があります',
      'valuation',
      'INVALID_ORDER'
    );
  }
  
  if (valuation.amount1 < 0 || valuation.amount3 > 1000000000) {
    throw new ValidationError(
      '査定額が異常値です',
      'valuation',
      'ABNORMAL_VALUE'
    );
  }
}
```

### 3. 外部API連携エラー

**シナリオ：**
- Gmail API送信失敗
- Google Calendar API接続エラー
- Google Sheets API取得失敗

**ハンドリング：**
```typescript
class ExternalAPIError extends Error {
  constructor(
    message: string,
    public service: string,
    public originalError: any
  ) {
    super(message);
    this.name = 'ExternalAPIError';
  }
}

async function sendEmailWithRetry(emailData: EmailData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await gmailAPI.send(emailData);
    } catch (error) {
      if (attempt === maxRetries) {
        throw new ExternalAPIError(
          'メール送信に失敗しました',
          'Gmail',
          error
        );
      }
      // 指数バックオフで再試行
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }
}
```

### 4. データベースエラー

**シナリオ：**
- 接続エラー
- クエリタイムアウト
- 制約違反

**ハンドリング：**
```typescript
class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

async function executeQuery(query: string, params: any[]) {
  try {
    return await db.query(query, params);
  } catch (error) {
    if (error.code === '23505') { // UNIQUE制約違反
      throw new DatabaseError(
        'データが既に存在します',
        'DUPLICATE_KEY',
        error
      );
    }
    if (error.code === '23503') { // 外部キー制約違反
      throw new DatabaseError(
        '参照先のデータが存在しません',
        'FOREIGN_KEY_VIOLATION',
        error
      );
    }
    throw new DatabaseError(
      'データベースエラーが発生しました',
      'UNKNOWN',
      error
    );
  }
}
```

### 5. 同期エラー

**シナリオ：**
- スプレッドシート接続失敗
- データ形式の不一致
- 同期中のタイムアウト

**ハンドリング：**
```typescript
class SyncError extends Error {
  constructor(
    message: string,
    public syncType: 'manual' | 'auto',
    public originalError: any
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

async function syncWithSpreadsheet(syncType: 'manual' | 'auto') {
  try {
    const data = await fetchFromSpreadsheet();
    await updateDatabase(data);
    await logSyncSuccess(syncType, data.length);
  } catch (error) {
    await logSyncFailure(syncType, error);
    
    if (syncType === 'manual') {
      // 手動同期の場合はユーザーにエラーを表示
      throw new SyncError(
        'スプレッドシートからのデータ取得に失敗しました',
        syncType,
        error
      );
    } else {
      // 自動同期の場合はログに記録し、既存キャッシュを継続使用
      console.error('Auto sync failed:', error);
      // エラーを投げずに継続
    }
  }
}
```

## テスト戦略

### 1. ユニットテスト

**対象：**
- 個別のサービスクラス
- ユーティリティ関数
- バリデーション関数

**ツール：** Jest

**カバレッジ目標：** 80%以上

**例：**
```typescript
describe('SellerNumberService', () => {
  describe('generateNext', () => {
    it('AA00001形式の売主番号を生成する', async () => {
      const number = await sellerNumberService.generateNext();
      expect(number).toMatch(/^AA[0-9]{5}$/);
    });
    
    it('既存番号と重複しない番号を生成する', async () => {
      await createSeller({ sellerNumber: 'AA00001' });
      const number = await sellerNumberService.generateNext();
      expect(number).not.toBe('AA00001');
    });
  });
  
  describe('validate', () => {
    it('正しい形式の売主番号を受け入れる', () => {
      expect(sellerNumberService.validate('AA00001')).toBe(true);
      expect(sellerNumberService.validate('AA99999')).toBe(true);
    });
    
    it('不正な形式の売主番号を拒否する', () => {
      expect(sellerNumberService.validate('AA0001')).toBe(false);
      expect(sellerNumberService.validate('AB00001')).toBe(false);
      expect(sellerNumberService.validate('AA0000A')).toBe(false);
    });
  });
});
```

### 2. プロパティベーステスト

**対象：**
- 正確性プロパティの検証
- エッジケースの自動発見

**ツール：** fast-check

**例：**
```typescript
import fc from 'fast-check';

describe('Property-based tests', () => {
  it('暗号化と復号化は可逆的である', () => {
    fc.assert(
      fc.property(fc.string(), (data) => {
        const encrypted = encrypt(data);
        const decrypted = decrypt(encrypted);
        return decrypted === data;
      })
    );
  });
  
  it('査定額は常に昇順である', () => {
    fc.assert(
      fc.property(propertyDataArbitrary(), (property) => {
        const valuation = calculateValuation(property);
        return valuation.amount1 <= valuation.amount2 &&
               valuation.amount2 <= valuation.amount3;
      })
    );
  });
});
```

### 3. 統合テスト

**対象：**
- API エンドポイント
- データベース連携
- 外部API連携

**ツール：** Jest + Supertest

**例：**
```typescript
describe('Sellers API', () => {
  describe('POST /api/sellers', () => {
    it('新規売主を作成する', async () => {
      const response = await request(app)
        .post('/api/sellers')
        .send({
          name: '山田太郎',
          phone: '090-1234-5678',
          propertyType: '戸建て'
        })
        .expect(201);
      
      expect(response.body.sellerNumber).toMatch(/^AA[0-9]{5}$/);
      expect(response.body.name).toBe('山田太郎');
    });
    
    it('重複する電話番号の場合は警告を返す', async () => {
      await createSeller({ phone: '090-1234-5678' });
      
      const response = await request(app)
        .post('/api/sellers')
        .send({
          name: '佐藤花子',
          phone: '090-1234-5678',
          propertyType: 'マンション'
        })
        .expect(201);
      
      expect(response.body.duplicateCheckRequired).toBe(true);
    });
  });
});
```

### 4. E2Eテスト

**対象：**
- ユーザーシナリオ全体
- ブラウザ操作

**ツール：** Playwright

**例：**
```typescript
test('売主登録から査定メール送信までの流れ', async ({ page }) => {
  // ログイン
  await page.goto('/login');
  await page.click('button:has-text("Googleでログイン")');
  
  // 新規売主登録
  await page.goto('/sellers/new');
  await page.fill('input[name="name"]', '山田太郎');
  await page.fill('input[name="phone"]', '090-1234-5678');
  await page.selectOption('select[name="propertyType"]', '戸建て');
  await page.click('button:has-text("登録")');
  
  // 査定額が自動計算されることを確認
  await expect(page.locator('text=査定額1')).toBeVisible();
  
  // 査定メール送信
  await page.click('button:has-text("査定メール送信")');
  await expect(page.locator('text=メールを送信しました')).toBeVisible();
  
  // 活動ログに記録されることを確認
  await page.goto('/activity-logs');
  await expect(page.locator('text=査定メール送信')).toBeVisible();
});
```

### 5. パフォーマンステスト

**対象：**
- 大量データでの検索速度
- ページネーション速度
- 同期処理速度

**ツール：** k6

**例：**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95%のリクエストが1秒以内
  },
};

export default function () {
  // 検索APIのパフォーマンステスト
  let response = http.get('http://localhost:3000/api/sellers?search=山田');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  sleep(1);
}
```

### テスト実行順序

1. **開発中：** ユニットテスト（継続的に実行）
2. **コミット前：** ユニットテスト + プロパティベーステスト
3. **プルリクエスト：** ユニットテスト + 統合テスト + E2Eテスト
4. **デプロイ前：** 全テスト + パフォーマンステスト
5. **本番環境：** スモークテスト + 監視

### テストデータ管理

**テストデータベース：**
- 開発環境とは別のテスト専用データベースを使用
- テスト実行前にデータベースをリセット
- シードデータを投入

**モックデータ：**
- 外部API（Gmail、Calendar、Chat、Sheets）はモック化
- テスト用のダミーデータジェネレーターを用意

**例：**
```typescript
// テストデータジェネレーター
function generateTestSeller(overrides = {}) {
  return {
    name: faker.name.fullName(),
    phone: faker.phone.number('090-####-####'),
    email: faker.internet.email(),
    propertyType: faker.helpers.arrayElement(['戸建て', '土地', 'マンション']),
    ...overrides
  };
}

// テストセットアップ
beforeEach(async () => {
  await db.query('TRUNCATE sellers CASCADE');
  await db.query('TRUNCATE employees CASCADE');
  await db.query('TRUNCATE activity_logs CASCADE');
});
```
