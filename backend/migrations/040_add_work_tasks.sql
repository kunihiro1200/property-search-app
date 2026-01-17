-- Migration: 040_add_work_tasks
-- Description: 業務依頼スプレッドシートのデータを格納するwork_tasksテーブルを作成
-- Created: 2024-12-11

-- work_tasksテーブルの作成
CREATE TABLE IF NOT EXISTS work_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_number VARCHAR(20) UNIQUE NOT NULL,
  
  -- 物件基本情報 (1-5)
  property_address TEXT,                    -- 物件所在
  seller_name TEXT,                         -- 売主
  spreadsheet_url TEXT,                     -- スプシURL
  sales_assignee TEXT,                      -- 営業担当
  
  -- 媒介契約関連 (6-10)
  mediation_type TEXT,                      -- 媒介形態
  mediation_deadline DATE,                  -- 媒介作成締め日
  mediation_completed TEXT,                 -- 媒介作成完了
  mediation_creator TEXT,                   -- 媒介作成者
  mediation_notes TEXT,                     -- 媒介備考
  
  -- サイト登録関連 (11-36)
  site_registration_deadline DATE,          -- サイト登録締め日
  site_registration_request_date DATE,      -- サイト登録依頼日
  site_registration_due_date DATE,          -- サイト登録納期予定日
  site_registration_confirm_request_date DATE, -- サイト登録確認依頼日
  site_registration_confirmed TEXT,         -- サイト登録確認
  site_registration_confirmer TEXT,         -- サイト登録確認者
  email_distribution TEXT,                  -- メール配信
  pre_distribution_check TEXT,              -- 配信前確認
  distribution_date DATE,                   -- 配信日
  distribution_assignee TEXT,               -- 配信担当
  pre_publish_check TEXT,                   -- 公開前確認
  publish_scheduled_date DATE,              -- 公開予定日
  cadastral_map_url TEXT,                   -- 字図、地積測量図URL
  floor_plan_no_notification TEXT,          -- 間取り図格納連絡不要
  floor_plan TEXT,                          -- 間取図
  floor_plan_request_date DATE,             -- 間取図依頼日
  floor_plan_due_date DATE,                 -- 間取図完了予定
  floor_plan_completed_date DATE,           -- 間取図完了日
  floor_plan_confirmer TEXT,                -- 間取図確認者
  floor_plan_revision_count INTEGER,        -- 間取図修正回数
  contract_input_deadline DATE,             -- 重説・契約書入力納期
  panorama TEXT,                            -- パノラマ
  panorama_completed TEXT,                  -- パノラマ完了
  employee_contract_creation TEXT,          -- 社員が契約書作成
  attachment_completed TEXT,                -- 添付資料完了
  site_notes TEXT,                          -- サイト備考

  -- 売買契約関連 (37-48)
  sales_contract_deadline DATE,             -- 売買契約締め日
  sales_contract_assignee TEXT,             -- 売買契約担当
  sales_contract_confirmed TEXT,            -- 売買契約確認
  binding_scheduled_date DATE,              -- 製本予定日
  binding_completed TEXT,                   -- 製本完了
  settlement_date DATE,                     -- 決済日
  sales_contract_notes TEXT,                -- 売買契約備考
  ledger_created TEXT,                      -- 台帳作成済み
  on_hold TEXT,                             -- 保留
  attachment_printed TEXT,                  -- 添付資料印刷
  
  -- 決済・手数料関連 (47-65)
  brokerage_fee_seller NUMERIC,             -- 仲介手数料（売）
  brokerage_fee_buyer NUMERIC,              -- 仲介手数料（買）
  seller_payment_method TEXT,               -- 売・支払方法
  buyer_payment_method TEXT,                -- 買・支払方法
  payment_confirmed_seller TEXT,            -- 入金確認（売）
  payment_confirmed_buyer TEXT,             -- 入金確認（買）
  standard_brokerage_fee_seller NUMERIC,    -- 通常仲介手数料（売）
  standard_brokerage_fee_buyer NUMERIC,     -- 通常仲介手数料（買）
  discount_reason TEXT,                     -- 減額理由
  discount_reason_other TEXT,               -- 減額理由他
  referral_flyer_given TEXT,                -- 紹介チラシ渡し
  review_registered TEXT,                   -- 口コミ登録
  other_comments TEXT,                      -- 他コメント
  sales_price NUMERIC,                      -- 売買価格
  campaign TEXT,                            -- キャンペーン
  settlement_completed_chat TEXT,           -- 決済完了チャット
  settlement_scheduled_month TEXT,          -- 決済予定月
  property_assignee_chat TEXT,              -- 物件担当チャット
  accounting_confirmed TEXT,                -- 経理確認済み
  
  -- 契約・融資関連 (66-67)
  contract_type TEXT,                       -- 契約形態
  loan_approval_scheduled_date DATE,        -- 融資承認予定日
  
  -- チャット・連絡関連 (68-71)
  kunihiro_chat TEXT,                       -- 国広とチャット
  yamamoto_chat TEXT,                       -- 山本へチャット送信
  ura_chat TEXT,                            -- 裏へチャット送信
  kadoi_chat TEXT,                          -- 角井へチャット送信
  
  -- 仲介業者・司法書士 (72-75)
  broker TEXT,                              -- 仲介業者
  broker_contact TEXT,                      -- 仲介業者担当連絡先
  judicial_scrivener TEXT,                  -- 司法書士
  judicial_scrivener_contact TEXT,          -- 司法書士連絡先
  
  -- 口コミ・その他 (76-128)
  review_count_field TEXT,                  -- 口コミカウント用
  site_registration_requester TEXT,         -- サイト登録依頼先
  site_registration_requestor TEXT,         -- サイト登録依頼者
  hirose_request TEXT,                      -- 広瀬さんへ依頼
  property_list_row_added TEXT,             -- 物件一覧に行追加
  property_file TEXT,                       -- 物件ファイル
  site_registration_comment TEXT,           -- コメント（サイト登録）
  sales_contract_comment TEXT,              -- コメント（売買契約）
  hirose_request_sales TEXT,                -- 広瀬さんへ依頼（売買契約関連）
  cw_request_email_site TEXT,               -- CWの方へ依頼メール（サイト登録）
  cw_request_email_floor_plan TEXT,         -- CWの方へ依頼メール（間取り、区画図）
  floor_plan_comment TEXT,                  -- コメント（間取図関係）
  cw_request_email_2f_above TEXT,           -- CWの方へ依頼メール（2階以上）
  site_registration_ok_comment TEXT,        -- サイト登録確認OKコメント
  floor_plan_ok_comment TEXT,               -- 間取図確認OK/修正コメント
  site_registration_ok_sent TEXT,           -- サイト登録確認OK送信
  floor_plan_ok_sent TEXT,                  -- 間取図確認OK送信
  storage_url TEXT,                         -- 格納先URL
  cadastral_map_sales_input TEXT,           -- 地籍測量図・字図（営業入力）
  road_dimensions TEXT,                     -- 道路寸法
  property_type TEXT,                       -- 種別
  floor_plan_stored_email TEXT,             -- 間取図格納済み連絡メール
  attachment_prep_deadline DATE,            -- 添付資料準備納期
  sales_contract_admin TEXT,                -- 事務担当（売買契約）
  cw_inspection_site TEXT,                  -- CW検収（サイト登録）
  cw_inspection_plan_300 TEXT,              -- CW検収（図面300円）
  cw_inspection_plan_500 TEXT,              -- CW検収（図面500円）
  site_registration_ok_hirose TEXT,         -- サイト登録確認OK廣瀬さん
  registration_completed_chat_hirose TEXT,  -- 登録完了チャット（廣瀬）
  work_completed_chat_hirose TEXT,          -- 作業完了チャット（廣瀬）
  registration_completed_comment TEXT,      -- 登録完了コメント
  work_completed_comment TEXT,              -- 作業完了コメント
  cw_request_sales TEXT,                    -- CWへ依頼（売買契約関連）
  hirose_completed_chat_sales TEXT,         -- 廣瀬さんへ完了チャット（売買関連）
  cw_completed_email_sales TEXT,            -- CWへ完了メール（売買関連）
  hirose_floor_plan_stored_comment TEXT,    -- 廣瀬さんへ間取り図格納コメント
  completed_comment_sales TEXT,             -- 完了コメント（売買関連）
  invoice_stamped TEXT,                     -- 請求書に押印
  pre_publish_distributed TEXT,             -- 公開前配信済み
  review_seller TEXT,                       -- 口コミ(売主)
  review_buyer TEXT,                        -- 口コミ(買主)
  review_count INTEGER,                     -- 口コミ取得数
  wall_core_area_input TEXT,                -- 壁芯面積入力
  general_mediation_no_distribution TEXT,   -- 一般媒介のため配信不要、即公開
  cadastral_map_field TEXT,                 -- 地積測量図、字図
  single_listing TEXT,                      -- 1社掲載
  single_listing_input_confirmed TEXT,      -- 1社掲載入力確認
  direction_symbol TEXT,                    -- 方位記号
  address_display_confirmed TEXT,           -- 住居表示確認
  work_content TEXT,                        -- 作業内容
  sales_inspection TEXT,                    -- 売買関係検収
  pre_request_check TEXT,                   -- 依頼前に確認
  cw_person TEXT,                           -- CWの方
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_work_tasks_property_number ON work_tasks(property_number);
CREATE INDEX IF NOT EXISTS idx_work_tasks_settlement_date ON work_tasks(settlement_date);
CREATE INDEX IF NOT EXISTS idx_work_tasks_sales_contract_deadline ON work_tasks(sales_contract_deadline);
CREATE INDEX IF NOT EXISTS idx_work_tasks_mediation_deadline ON work_tasks(mediation_deadline);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_work_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_work_tasks_updated_at ON work_tasks;
CREATE TRIGGER trigger_work_tasks_updated_at
  BEFORE UPDATE ON work_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_work_tasks_updated_at();

-- コメント
COMMENT ON TABLE work_tasks IS '業務依頼スプレッドシートのデータを格納するテーブル';
COMMENT ON COLUMN work_tasks.property_number IS '物件番号（売主番号と同一、sellersテーブルとのリンクキー）';
