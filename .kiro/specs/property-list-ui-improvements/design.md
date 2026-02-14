# 物件リストUI改善 - 設計書

## 1. 概要

物件リストページのUIを改善し、ユーザビリティを向上させる。

**対象システム**: 物件リスト（Property Management）のみ  
**影響範囲**: フロントエンドとバックエンド（値下げ通知ロジックのみ）

## 2. アーキテクチャ

### 2.1 システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                     物件リスト（Property Management）          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ フロントエンド                                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ - PropertyListingsPage.tsx                          │   │
│  │ - PublicSiteButtons.tsx (変更)                      │   │
│  │ - PropertySidebarStatus.tsx (変更)                  │   │
│  │ - PropertyListingDetailPage.tsx (新規: 即値下げ)    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ バックエンド                                          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ - ScheduledNotificationService.ts (変更)            │   │
│  │ - process-scheduled-notifications.ts (Cronジョブ)   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

⚠️ 公開物件サイト（Public Property Site）には影響を与えない
```

### 2.2 変更対象ファイル

**フロントエンド**:
- ✅ `frontend/src/components/PublicSiteButtons.tsx` - ヘッダーボタン
- ✅ `frontend/src/components/PropertySidebarStatus.tsx` - サイドバーカテゴリー
- ✅ `frontend/src/pages/PropertyListingDetailPage.tsx` - 即値下げボタン（新規）

**バックエンド**:
- ✅ `backend/src/services/ScheduledNotificationService.ts` - 値下げ通知ロジック
- ✅ `backend/api/cron/process-scheduled-notifications.ts` - Cronジョブ

**変更禁止ファイル**:
- ❌ `backend/api/index.ts` - 公開物件サイト専用
- ❌ `backend/api/src/services/PropertyListingService.ts` - 公開物件サイト専用
- ❌ `frontend/src/pages/PublicPropertyListPage.tsx` - 公開物件サイト専用

## 3. 詳細設計

### 3.1 即値下げボタンの追加

#### 3.1.1 UI設計

**配置場所**: 物件詳細ページ（PropertyListingDetailPage.tsx）の「予約値下げ」セクションの上

**UI構造**:
```
┌─────────────────────────────────────────┐
│ 即値下げ                          [▼]   │ ← 折りたたみ可能
├─────────────────────────────────────────┤
│                                         │
│  [Chat送信]                             │ ← クリックでGoogle Chatに遷移
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 予約値下げ                        [▼]   │ ← 既存の機能
├─────────────────────────────────────────┤
│ 予約済み                                │
│  02/14 9:00  テストです                 │
│                                         │
│ 予約日: [年/月/日]                      │
│ メッセージ: [入力欄]                    │
│  [予約値下げを設定]                     │
└─────────────────────────────────────────┘
```

#### 3.1.2 実装詳細

**コンポーネント**: `PropertyListingDetailPage.tsx`

**状態管理**:
```typescript
const [showInstantPriceReduction, setShowInstantPriceReduction] = useState(false);
```

**Google Chat URL**:
```typescript
const GOOGLE_CHAT_URL = 'https://chat.googleapis.com/v1/spaces/AAAAw9wyS-o/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=t6SJmZ8af-yyB38DZzAqGOKYI-DnIl6wYtVo-Lyskuk';
```

**実装コード**:
```typescript
// 即値下げセクション
<Accordion expanded={showInstantPriceReduction} onChange={() => setShowInstantPriceReduction(!showInstantPriceReduction)}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="h6">即値下げ</Typography>
  </AccordionSummary>
  <AccordionDetails>
    <Button
      variant="contained"
      color="primary"
      onClick={() => window.open(GOOGLE_CHAT_URL, '_blank')}
    >
      Chat送信
    </Button>
  </AccordionDetails>
</Accordion>
```

### 3.2 ヘッダーボタンの整理

#### 3.2.1 現在の実装

**ファイル**: `frontend/src/components/PublicSiteButtons.tsx`

**現在のボタン**:
1. 「一般向け公開サイト」 - `https://property-site-frontend-kappa.vercel.app/public/properties`
2. 「管理者向け公開サイト」 - `/public/properties?canHide=true`

**問題**: 「公開物件サイト」ボタンが存在しない（既に削除済み）

#### 3.2.2 変更内容

**変更なし** - 既に正しい実装になっている

### 3.3 サイドバーカテゴリーの順序変更

#### 3.3.1 現在の実装

**ファイル**: `frontend/src/components/PropertySidebarStatus.tsx`

**現在の優先順位**:
```typescript
const STATUS_PRIORITY: Record<string, number> = {
  '値下げ未完了': 0, // 最優先
  '未報告': 1,
  '未完了': 2,
  // ...
};
```

#### 3.3.2 変更内容

**新しい優先順位**:
```typescript
const STATUS_PRIORITY: Record<string, number> = {
  // '値下げ未完了'は削除（動的に追加される）
  '未報告': 1,
  '未完了': 2,
  '非公開予定（確認後）': 3,
  // ...
};
```

**ステータスリストの構築**:
```typescript
const statusList = useMemo(() => {
  const list = [{ key: 'all', label: 'すべて', count: statusCounts.all }];
  
  // 「値下げ未完了」を「すべて」の次に追加
  if (statusCounts['値下げ未完了'] > 0) {
    list.push({ key: '値下げ未完了', label: '値下げ未完了', count: statusCounts['値下げ未完了'] });
  }
  
  // 他のステータスを優先順位順にソート
  const sortedStatuses = Object.entries(statusCounts)
    .filter(([key]) => key !== 'all' && key !== '' && key !== '値下げ未完了')
    .sort((a, b) => {
      const priorityA = STATUS_PRIORITY[a[0]] || 999;
      const priorityB = STATUS_PRIORITY[b[0]] || 999;
      return priorityA - priorityB;
    });
  
  sortedStatuses.forEach(([key, count]) => {
    list.push({ key, label: key, count });
  });
  
  return list;
}, [statusCounts]);
```

### 3.4 値下げ通知の送信タイミング修正

#### 3.4.1 現在の実装

**ファイル**: `backend/src/services/ScheduledNotificationService.ts`

**現在のロジック**:
```typescript
async processScheduledNotifications(): Promise<number> {
  // 現在時刻を過ぎた未送信の通知を取得
  const { data: notifications, error } = await this.supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString()) // ← 現在時刻を過ぎたもの
    .order('scheduled_at', { ascending: true });
  
  // ...
}
```

**Cronジョブ**: `backend/api/cron/process-scheduled-notifications.ts`
- 実行頻度: 1分ごと（`* * * * *`）
- 設定ファイル: `backend/vercel.json`

#### 3.4.2 問題点

**物件BB14の例**:
- 予約日時: 2026年2月14日 9:00（東京時間）
- scheduled_at: `2026-02-14T09:00:00+09:00`
- 現在時刻: 2026年2月14日 9:05（東京時間）
- 期待: 9:00に送信される
- 実際: 送信されていない

**原因の仮説**:
1. Cronジョブが実行されていない
2. scheduled_atの時刻が正しく保存されていない
3. タイムゾーンの問題（UTCと東京時間の変換）

#### 3.4.3 修正内容

**修正1: タイムゾーンの明示化**

```typescript
// 東京時間の9:00に送信するようにスケジュール
const scheduledDateTime = new Date(`${scheduledDate}T09:00:00+09:00`);

// ISO文字列に変換（UTCに変換される）
const scheduledAtISO = scheduledDateTime.toISOString();
// 例: "2026-02-14T00:00:00.000Z" (UTC)
```

**修正2: Cronジョブのログ強化**

```typescript
export default async function handler(req: any, res: any) {
  console.log('[Cron] Starting scheduled notifications processing...');
  console.log('[Cron] Current time (UTC):', new Date().toISOString());
  console.log('[Cron] Current time (Tokyo):', new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
  
  const service = new ScheduledNotificationService();
  
  try {
    const processedCount = await service.processScheduledNotifications();
    
    console.log(`[Cron] Processed ${processedCount} notifications`);
    
    res.status(200).json({
      success: true,
      processed: processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**修正3: ScheduledNotificationServiceのログ強化**

```typescript
async processScheduledNotifications(): Promise<number> {
  try {
    const currentTime = new Date();
    console.log('[ScheduledNotificationService] Current time (UTC):', currentTime.toISOString());
    console.log('[ScheduledNotificationService] Current time (Tokyo):', currentTime.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    
    // 現在時刻を過ぎた未送信の通知を取得
    const { data: notifications, error } = await this.supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', currentTime.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('[ScheduledNotificationService] Failed to fetch notifications:', error);
      return 0;
    }

    if (!notifications || notifications.length === 0) {
      console.log('[ScheduledNotificationService] No notifications to process');
      return 0;
    }

    console.log(`[ScheduledNotificationService] Processing ${notifications.length} scheduled notifications`);
    console.log('[ScheduledNotificationService] Notifications:', notifications.map(n => ({
      id: n.id,
      property_number: n.property_number,
      scheduled_at: n.scheduled_at,
      scheduled_at_tokyo: new Date(n.scheduled_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    })));

    let processedCount = 0;

    for (const notification of notifications) {
      try {
        console.log(`[ScheduledNotificationService] Sending notification:`, {
          id: notification.id,
          property_number: notification.property_number,
          scheduled_at: notification.scheduled_at,
        });
        
        // チャットに送信
        await axios.post(notification.webhook_url, {
          text: notification.message,
        });

        // 送信成功を記録
        await this.supabase
          .from('scheduled_notifications')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        console.log(`[ScheduledNotificationService] Sent notification:`, {
          id: notification.id,
          propertyNumber: notification.property_number,
          assignee: notification.assignee,
        });

        processedCount++;
      } catch (error: any) {
        console.error(`[ScheduledNotificationService] Failed to send notification:`, {
          id: notification.id,
          error: error.message,
        });

        // 送信失敗を記録
        await this.supabase
          .from('scheduled_notifications')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', notification.id);
      }
    }

    return processedCount;
  } catch (error: any) {
    console.error('[ScheduledNotificationService] Error processing notifications:', error);
    return 0;
  }
}
```

## 4. データモデル

### 4.1 scheduled_notifications テーブル

**既存のスキーマ**:
```sql
CREATE TABLE scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_number TEXT NOT NULL,
  assignee TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL, -- 東京時間の9:00をUTCに変換して保存
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**変更なし** - 既存のスキーマで対応可能

## 5. API設計

### 5.1 既存のAPI

**変更なし** - 既存のAPIで対応可能

**エンドポイント**:
- `POST /api/chat-notifications/schedule-price-reduction/:propertyNumber` - 値下げ予約
- `GET /api/chat-notifications/pending-price-reductions` - 予約一覧取得
- `POST /api/chat-notifications/complete-price-reduction/:notificationId` - 予約完了

### 5.2 Cronジョブ

**エンドポイント**: `/api/cron/process-scheduled-notifications`
**実行頻度**: 1分ごと（`* * * * *`）
**認証**: `CRON_SECRET`環境変数

**変更内容**: ログの強化のみ

## 6. セキュリティ

### 6.1 Google Chat URL

**URL**: `https://chat.googleapis.com/v1/spaces/AAAAw9wyS-o/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=t6SJmZ8af-yyB38DZzAqGOKYI-DnIl6wYtVo-Lyskuk`

**セキュリティ上の懸念**:
- URLにAPIキーとトークンが含まれている
- フロントエンドのコードに直接埋め込まれる
- ソースコードを見れば誰でもアクセス可能

**推奨事項**:
1. **環境変数に移動**: フロントエンドの環境変数に移動
2. **バックエンド経由**: バックエンドAPIを経由してGoogle Chatに送信
3. **トークンの定期更新**: Google Chatのトークンを定期的に更新

**今回の実装**:
- ⚠️ 時間の制約により、URLを直接埋め込む
- 📝 将来的には環境変数に移動することを推奨

### 6.2 Cronジョブの認証

**現在の実装**:
```typescript
const authHeader = req.headers.authorization;
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  console.error('[Cron] Unauthorized access attempt');
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**変更なし** - 既存の認証で十分

## 7. パフォーマンス

### 7.1 フロントエンド

**影響**: なし
- 即値下げボタンの追加は軽量
- サイドバーカテゴリーの順序変更は計算量が同じ

### 7.2 バックエンド

**影響**: なし
- Cronジョブは1分ごとに実行（既存）
- ログの追加による影響は微小

## 8. テスト戦略

### 8.1 単体テスト

**対象**:
- `PropertySidebarStatus.tsx` - ステータスリストの順序
- `ScheduledNotificationService.ts` - 通知処理ロジック

**テストケース**:
1. 「すべて」が最上位に表示される
2. 「値下げ未完了」が「すべて」の下に表示される
3. scheduled_atが現在時刻を過ぎた通知が取得される
4. 通知が正しく送信される

### 8.2 統合テスト

**対象**:
- Cronジョブ → ScheduledNotificationService → Google Chat

**テストケース**:
1. 値下げ予約を作成
2. scheduled_atを過去の時刻に設定
3. Cronジョブを手動実行
4. Google Chatに通知が送信されることを確認

### 8.3 E2Eテスト

**対象**:
- 物件詳細ページ → 即値下げボタン → Google Chat

**テストケース**:
1. 物件詳細ページを開く
2. 「即値下げ」ボタンをクリック
3. 「Chat送信」ボタンが表示されることを確認
4. 「Chat送信」ボタンをクリック
5. Google Chatに遷移することを確認

## 9. デプロイ計画

### 9.1 デプロイ順序

1. **バックエンド**: ScheduledNotificationServiceの修正
2. **Cronジョブ**: ログの強化
3. **フロントエンド**: 即値下げボタン、サイドバーカテゴリー

### 9.2 ロールバック計画

**バックエンド**:
- Gitコミットを元に戻す
- Vercelで前のデプロイに切り替え

**フロントエンド**:
- Gitコミットを元に戻す
- 再ビルド・デプロイ

### 9.3 モニタリング

**Cronジョブのログ**:
- Vercel Dashboardで確認
- `/api/cron/process-scheduled-notifications`のログを監視

**通知の送信状況**:
- `scheduled_notifications`テーブルの`status`を確認
- `sent_at`が正しく記録されているか確認

## 10. リスク管理

### 10.1 高リスク

**リスク**: 値下げ通知が送信されない  
**対策**: ログを強化し、問題を早期発見  
**検証**: 手動でCronジョブを実行してテスト

### 10.2 中リスク

**リスク**: Google Chat URLが漏洩する  
**対策**: 将来的に環境変数に移動  
**検証**: セキュリティレビューを実施

### 10.3 低リスク

**リスク**: サイドバーカテゴリーの順序変更により、ユーザーが混乱する  
**対策**: 変更内容をユーザーに事前に通知  
**検証**: ユーザーフィードバックを収集

## 11. 参考資料

- `.kiro/steering/system-isolation-rule.md` - システム隔離ルール
- `.kiro/steering/backward-compatibility-rule.md` - 後方互換性ルール
- `backend/src/services/ScheduledNotificationService.ts` - 値下げ通知サービス
- `backend/api/cron/process-scheduled-notifications.ts` - Cronジョブ
- `frontend/src/components/PropertySidebarStatus.tsx` - サイドバーカテゴリー

---

**作成日**: 2026年2月14日  
**作成者**: Kiro AI  
**ステータス**: レビュー待ち
