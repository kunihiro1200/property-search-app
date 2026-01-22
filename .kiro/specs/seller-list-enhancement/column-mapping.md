# 売主リスト カラム定義と実装マッピング

## 現状分析

### 既存のカラム（sellersテーブル）
- id (UUID)
- name (暗号化)
- address (暗号化)
- phone_number (暗号化)
- email (暗号化)
- status
- motivation
- assigned_to
- next_call_date
- created_at
- updated_at

### 既存の関連テーブル
- properties（物件情報）
- valuations（査定結果）
- activities（活動履歴）
- appointments（訪問予約）

---

## 新規追加が必要なカラム

### 基本情報
| カラム名 | 説明 | データ型 | 実装場所 | 優先度 |
|---------|------|---------|---------|--------|
| seller_number | 売主番号（AA + 数字） | VARCHAR(50) UNIQUE | sellers | 高 |
| inquiry_source | 査定サイト（ウ、L等） | VARCHAR(50) | sellers | 高 |
| inquiry_year | 反響年 | INTEGER | sellers | 高 |
| inquiry_date | 反響日付 | DATE | sellers | 高 |
| inquiry_datetime | 反響詳細日時 | TIMESTAMP | sellers | 中 |
| property_type_short | 種別（戸、土、マ等） | VARCHAR(10) | properties | 高 |
| occupancy_status | 状況（居、空、賃、古有、更） | VARCHAR(20) | properties | 中 |
| floor_plan | 間取り | VARCHAR(50) | properties | 中 |
| requester_address | 依頼者住所（物件所在と異なる場合） | TEXT | sellers | 低 |

### 連絡・対応履歴
| カラム名 | 説明 | データ型 | 実装場所 | 優先度 |
|---------|------|---------|---------|--------|
| email_sent_date | E/日付（査定メール送信日） | DATE | activities | 高 |
| mail_sent_date | 郵/日付（査定書郵送日） | DATE | activities | 高 |
| is_unreachable | 不通フラグ | BOOLEAN | sellers | 高 |
| first_caller_initials | 一番TEL（イニシャル） | VARCHAR(10) | sellers | 高 |
| first_call_unreachable | 1番電話不通時2度目電話 | BOOLEAN | sellers | 中 |
| contact_method | 連絡方法（Email, Smail, 電話） | VARCHAR(20) | sellers | 中 |
| preferred_contact_time | 連絡取りやすい日、時間帯 | TEXT | sellers | 低 |

### 訪問査定関連
| カラム名 | 説明 | データ型 | 実装場所 | 優先度 |
|---------|------|---------|---------|--------|
| visit_acquired_date | 訪問取得日 | DATE | appointments | 高 |
| visit_date | 訪問日 | DATE | appointments | 高 |
| visit_time | 訪問時間 | TIME | appointments | 中 |
| visit_day_of_week | 曜日 | VARCHAR(10) | appointments | 低 |
| visit_person_initials | 営担（訪問する人） | VARCHAR(10) | appointments | 高 |
| visit_acquirer | 訪問査定取得者 | UUID | appointments | 高 |
| visit_notes | 訪問時注意点 | TEXT | appointments | 中 |
| post_visit_valuation_min | 訪問後_査定額1 | BIGINT | valuations | 高 |

### 査定関連
| カラム名 | 説明 | データ型 | 実装場所 | 優先度 |
|---------|------|---------|---------|--------|
| confidence_level | 確度 | VARCHAR(20) | sellers | 高 |
| valuation_method | 査定方法（机上メール、郵送、不通） | VARCHAR(50) | valuations | 中 |
| valuation_person | 査定担当 | UUID | valuations | 中 |
| phone_person | 電話担当（任意） | UUID | sellers | 低 |
| valuation_reason | 査定理由 | TEXT | sellers | 中 |
| valuation_url | 査定書URL | TEXT | valuations | 中 |
| site_url | サイトURL | TEXT | sellers | 低 |
| registered_companies_count | 送信社数 | INTEGER | sellers | 低 |

### 競合・契約関連
| カラム名 | 説明 | データ型 | 実装場所 | 優先度 |
|---------|------|---------|---------|--------|
| competitor_name | 競合名 | VARCHAR(200) | sellers | 高 |
| competitor_reason | 理由（他決、専任） | VARCHAR(200) | sellers | 高 |
| contract_date | 契約年月 | DATE | sellers | 高 |
| exclusive_reason | 専任・他決要因 | TEXT | sellers | 中 |
| lost_countermeasure | 他決対策 | TEXT | sellers | 中 |
| exclusive_script | 専任とれた文言 | TEXT | sellers | 低 |
| meeting_status | 専任他決打合せ（未、完了） | VARCHAR(20) | sellers | 中 |

### Pinrich・除外関連
| カラム名 | 説明 | データ型 | 実装場所 | 優先度 |
|---------|------|---------|---------|--------|
| pinrich_status | Pinrich状況 | VARCHAR(50) | sellers | 低 |
| exclusion_date | 除外日 | DATE | sellers | 中 |
| exclusion_action | 除外日にすること | VARCHAR(100) | sellers | 中 |
| exclusion_site_url | 除外サイトURL | TEXT | sellers | 低 |
| exclusion_criteria | 除外基準 | TEXT | sellers | 低 |

### 物件詳細情報
| カラム名 | 説明 | データ型 | 実装場所 | 優先度 |
|---------|------|---------|---------|--------|
| land_area_company | 土地（当社調べ） | DECIMAL | properties | 中 |
| building_area_company | 建物（当社調べ） | DECIMAL | properties | 中 |
| structure_type | 構造（木造、軽量鉄骨等） | VARCHAR(50) | properties | 中 |
| fixed_asset_tax_value | 固定資産税路線価 | BIGINT | properties | 低 |
| land_unit_price | 土地坪単価（修正） | DECIMAL | properties | 低 |
| property_location_ieul | 物件所在地（ウのマンション） | TEXT | properties | 低 |

### その他・管理用
| カラム名 | 説明 | データ型 | 実装場所 | 優先度 |
|---------|------|---------|---------|--------|
| cancel_notice_person | キャンセル案内担当 | UUID | sellers | 低 |
| property_introduction | 物件紹介 | TEXT | properties | 中 |
| alternative_mail_address | 上記以外の郵送先住所 | TEXT | sellers | 低 |
| sales_plan | 販売計画 | TEXT | sellers | 低 |
| duplicate_confirmed | 要ダブり確認 | BOOLEAN | sellers | 高 |
| customer_referrer | お客様紹介者 | VARCHAR(200) | sellers | 低 |

---

## 新規テーブルが必要な機能

### 1. 過去履歴テーブル (seller_history)
電話番号やメールアドレスで重複チェックした際の過去情報表示用

```sql
CREATE TABLE seller_history (
    id UUID PRIMARY KEY,
    current_seller_id UUID REFERENCES sellers(id),
    past_seller_id UUID REFERENCES sellers(id),
    past_property_info JSONB,
    past_owner_info JSONB,
    match_type VARCHAR(20), -- 'phone' or 'email'
    created_at TIMESTAMP
);
```

### 2. Google Chat通知設定テーブル (chat_notifications)
各種通知の送信履歴と設定

```sql
CREATE TABLE chat_notifications (
    id UUID PRIMARY KEY,
    seller_id UUID REFERENCES sellers(id),
    notification_type VARCHAR(50), -- 'exclusive', 'lost_after_visit', 'lost_before_visit', 'general_contract', 'property_intro'
    sent_by UUID REFERENCES employees(id),
    sent_at TIMESTAMP,
    message_content TEXT
);
```

### 3. コピー機能用の参照テーブル
売主・買主コピー機能のための中間テーブル（必要に応じて）

---

## 実装の優先順位

### フェーズ1: 基本情報の拡張（優先度：高）
- 売主番号の自動生成
- 反響情報（年、日付、サイト）
- 不通フラグと一番TEL
- 確度レベル
- 重複チェック機能

### フェーズ2: 訪問査定機能の強化（優先度：高）
- 訪問取得日・訪問日の管理
- 営担・訪問査定取得者の記録
- 訪問時注意点のGoogleカレンダー連携

### フェーズ3: 競合・契約管理（優先度：高）
- 競合名・理由の記録
- 契約日の管理
- Google Chat通知機能

### フェーズ4: 査定機能の拡張（優先度：中）
- 査定方法の選択
- 査定担当者の記録
- 査定書URL管理

### フェーズ5: その他機能（優先度：低）
- Pinrich連携
- 除外管理
- 売主・買主コピー機能
- 各種メール送信機能

---

## 次のステップ

1. ✅ 現状のスキーマ確認（完了）
2. ⏭️ フェーズ1の要件定義作成
3. ⏭️ データベースマイグレーション計画
4. ⏭️ API設計
5. ⏭️ フロントエンド設計
