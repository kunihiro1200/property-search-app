# 要件定義書

## はじめに

公開物件サイトの問い合わせフォームから送信された情報を、Googleスプレッドシート「買主リスト」に自動転記する機能を実装します。これにより、問い合わせ情報を手動で転記する手間を削減し、迅速な顧客対応を実現します。

## 用語集

- **System**: 公開物件サイトの問い合わせ処理システム
- **Inquiry_Form**: 公開物件サイトの詳細画面にある「この物件についてお問い合わせ」フォーム
- **Buyer_Sheet**: Googleスプレッドシート「買主リスト」（ID: 1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY）
- **Property_Inquiry**: property_inquiriesテーブルに保存される問い合わせデータ
- **Buyer_Number**: 買主リストのE列に記録される一意の買主番号
- **Inquiry_Source**: 問い合わせ元を示す値（AL列）
- **Property_Listing**: property_listingsテーブルの物件データ

## 要件

### 要件1: 問い合わせデータの転記

**ユーザーストーリー:** 営業担当者として、公開物件サイトから送信された問い合わせ情報が自動的に買主リストに転記されることで、迅速に顧客対応を開始したい。

#### 受入基準

1. WHEN ユーザーがInquiry_Formを送信し、Property_Inquiryが作成されたとき、THEN THE System SHALL Buyer_Sheetに新しい行を追加する
2. WHEN Buyer_Sheetへの転記が成功したとき、THEN THE System SHALL Property_Inquiryのsheet_sync_statusを'synced'に更新する
3. WHEN Buyer_Sheetへの転記が失敗したとき、THEN THE System SHALL Property_Inquiryのsheet_sync_statusを'failed'に更新し、エラー内容をsheet_sync_error_messageに記録する
4. WHEN 転記処理中にエラーが発生したとき、THEN THE System SHALL 問い合わせフォームの送信自体は成功として扱い、バックグラウンドで再試行する

### 要件2: フィールドマッピング

**ユーザーストーリー:** システム管理者として、問い合わせフォームの各フィールドが買主リストの正しい列に転記されることで、データの整合性を保ちたい。

#### 受入基準

1. WHEN Property_Inquiryを転記するとき、THEN THE System SHALL nameフィールドをBuyer_SheetのG列（氏名・会社名）に書き込む
2. WHEN Property_Inquiryを転記するとき、THEN THE System SHALL emailフィールドをBuyer_SheetのAK列（メールアドレス）に書き込む
3. WHEN Property_Inquiryを転記するとき、THEN THE System SHALL phoneフィールドからハイフンを除去し、Buyer_SheetのAJ列（電話番号）に書き込む
4. WHEN Property_Inquiryを転記するとき、THEN THE System SHALL messageフィールドをBuyer_SheetのM列（問合時ヒアリング）に書き込む
5. WHEN Property_Inquiryを転記するとき、THEN THE System SHALL 物件の公開状態に基づいてInquiry_SourceをBuyer_SheetのAL列（問合せ元）に書き込む
6. WHEN Property_Inquiryを転記するとき、THEN THE System SHALL Property_Listingのproperty_numberをBuyer_SheetのAT列（物件番号）に書き込む

### 要件3: 買主番号の自動採番

**ユーザーストーリー:** システム管理者として、買主番号が重複せず、連番で自動採番されることで、買主の一意性を保証したい。

#### 受入基準

1. WHEN 新しい問い合わせを転記するとき、THEN THE System SHALL Buyer_SheetのE列（買主番号）から数値のみを抽出し、最大値を取得する
2. WHEN 最大値を取得したとき、THEN THE System SHALL その値に1を加算した値を新しいBuyer_Numberとして設定する
3. WHEN E列に数値が存在しないとき、THEN THE System SHALL 1を初期値として設定する
4. WHEN E列に数値でない値（テキスト）が含まれているとき、THEN THE System SHALL それらを無視して数値のみを対象とする

### 要件4: 問合せ元の判定

**ユーザーストーリー:** 営業担当者として、問い合わせがどの公開状態の物件から来たのかを把握することで、適切な対応方針を決定したい。

#### 受入基準

1. WHEN Property_Listingのsite_displayがtrueのとき、THEN THE System SHALL Inquiry_Sourceを「公開中・いふう独自サイト」に設定する
2. WHEN Property_Listingのsite_displayがfalseかつathome_public_folder_idが存在するとき、THEN THE System SHALL Inquiry_Sourceを「公開前・いふう独自サイト」に設定する
3. WHEN Property_Listingのsite_displayがfalseかつathome_public_folder_idが存在しないとき、THEN THE System SHALL Inquiry_Sourceを「非公開・いふう独自サイト」に設定する

### 要件5: 電話番号の正規化

**ユーザーストーリー:** システム管理者として、電話番号が統一されたフォーマットで保存されることで、データの検索性と一貫性を保ちたい。

#### 受入基準

1. WHEN phoneフィールドにハイフンが含まれているとき、THEN THE System SHALL すべてのハイフンを除去する
2. WHEN phoneフィールドに全角数字が含まれているとき、THEN THE System SHALL 半角数字に変換する
3. WHEN phoneフィールドに空白文字が含まれているとき、THEN THE System SHALL すべての空白文字を除去する
4. WHEN phoneフィールドに括弧が含まれているとき、THEN THE System SHALL 括弧を除去する

### 要件6: 再試行メカニズム

**ユーザーストーリー:** システム管理者として、一時的なネットワークエラーやAPI制限によって転記が失敗した場合でも、自動的に再試行されることで、データの欠損を防ぎたい。

#### 受入基準

1. WHEN Buyer_Sheetへの転記が失敗したとき、THEN THE System SHALL 最大3回まで再試行する
2. WHEN 再試行するとき、THEN THE System SHALL 指数バックオフ（1秒、2秒、4秒）の待機時間を設定する
3. WHEN 3回の再試行後も失敗したとき、THEN THE System SHALL sheet_sync_statusを'failed'に設定し、管理者に通知する
4. WHEN Google Sheets APIのレート制限エラー（429）が発生したとき、THEN THE System SHALL Retry-Afterヘッダーに従って待機時間を調整する

### 要件7: データ整合性の保証

**ユーザーストーリー:** システム管理者として、同じ問い合わせが重複して転記されないことで、買主リストの正確性を保ちたい。

#### 受入基準

1. WHEN Property_Inquiryのsheet_sync_statusが'synced'のとき、THEN THE System SHALL 再度転記処理を実行しない
2. WHEN 転記処理が進行中（'pending'）のとき、THEN THE System SHALL 同じProperty_Inquiryに対する重複した転記処理を開始しない
3. WHEN Buyer_Sheetへの書き込みが成功したとき、THEN THE System SHALL Property_Inquiryのsheet_row_numberに転記先の行番号を記録する
4. WHEN 転記処理を開始するとき、THEN THE System SHALL Property_Inquiryのsheet_synced_atに現在時刻を記録する

### 要件8: エラーハンドリングとロギング

**ユーザーストーリー:** システム管理者として、転記処理のエラーが詳細にログに記録されることで、問題の原因を迅速に特定し、解決したい。

#### 受入基準

1. WHEN 転記処理でエラーが発生したとき、THEN THE System SHALL エラーの種類、メッセージ、スタックトレースをログに記録する
2. WHEN Google Sheets APIからエラーレスポンスを受け取ったとき、THEN THE System SHALL APIのエラーコードとメッセージをsheet_sync_error_messageに記録する
3. WHEN 買主番号の採番に失敗したとき、THEN THE System SHALL エラー内容をログに記録し、デフォルト値として最大値+1を使用する
4. WHEN 転記処理が成功したとき、THEN THE System SHALL 転記先の行番号と転記時刻をログに記録する
