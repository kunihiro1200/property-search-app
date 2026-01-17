# Design Document

## Overview

通話モードページのクイックボタン無効化機能は、買主詳細ページで実装された機能を拡張し、保存ボタンとの連携を追加します。ユーザーがクイックボタンをクリックした後、保存ボタンを押すことで、そのボタンが半永久的に無効化されます。この機能により、重複アクションを防ぎ、完了したタスクを視覚的に追跡できます。

## Architecture

### コンポーネント構成

```
CallModePage
├── useCallModeQuickButtonState (Hook)
│   ├── 状態管理（pending/persisted）
│   ├── localStorage連携
│   └── 保存ボタン連携
├── callModeQuickButtonStorage (Utility)
│   ├── localStorage操作
│   ├── エラーハンドリング
│   └── メモリフォールバック
└── QuickButtons
    ├── 視覚的フィードバック
    └── クリックハンドラー
```

### 状態フロー

```
1. ユーザーがクイックボタンをクリック
   ↓
2. pending状態に設定（まだlocalStorageには保存しない）
   ↓
3. ユーザーが保存ボタンをクリック
   ↓
4. pending状態をlocalStorageに永続化
   ↓
5. ボタンが永久的にグレーアウト
```

## Components and Interfaces

### 1. useCallModeQuickButtonState Hook

```typescript
interface CallModeQuickButtonState {
  // ボタンの無効化状態（pending: 保存待ち, persisted: 永続化済み）
  disabledButtons: Map<string, 'pending' | 'persisted'>;
  
  // ボタンをクリックしたときに呼ぶ（pending状態にする）
  handleQuickButtonClick: (buttonId: string) => void;
  
  // 保存ボタンをクリックしたときに呼ぶ（pending→persistedに変換）
  handleSave: () => void;
  
  // ボタンが無効化されているかチェック
  isButtonDisabled: (buttonId: string) => boolean;
  
  // ボタンの状態を取得（pending or persisted）
  getButtonState: (buttonId: string) => 'pending' | 'persisted' | null;
}

function useCallModeQuickButtonState(sellerId: string): CallModeQuickButtonState;
```

### 2. callModeQuickButtonStorage Utility

```typescript
interface CallModeQuickButtonStorageData {
  [sellerId: string]: {
    [buttonId: string]: {
      disabledAt: string; // ISO timestamp
      state: 'persisted';
    };
  };
}

const callModeQuickButtonStorage = {
  // 売主のボタン状態を取得
  getSellerButtonStates(sellerId: string): Map<string, 'persisted'>,
  
  // 売主のボタン状態を保存
  setSellerButtonStates(sellerId: string, states: Map<string, 'persisted'>): void,
  
  // 特定のボタン状態を保存
  setButtonState(sellerId: string, buttonId: string): void,
  
  // 特定のボタン状態を削除
  removeButtonState(sellerId: string, buttonId: string): void,
  
  // 売主の全ボタン状態を削除
  clearSellerStates(sellerId: string): void,
  
  // 全データをクリア
  clearAll(): void,
};
```

### 3. CallModePage Integration

```typescript
// CallModePage.tsx
const CallModePage = () => {
  const { sellerId } = useParams();
  const {
    disabledButtons,
    handleQuickButtonClick,
    handleSave,
    isButtonDisabled,
    getButtonState,
  } = useCallModeQuickButtonState(sellerId);
  
  const handleQuickAction = (buttonId: string, action: () => void) => {
    if (isButtonDisabled(buttonId)) {
      return; // 無効化されている場合は何もしない
    }
    
    // アクションを実行
    action();
    
    // pending状態に設定
    handleQuickButtonClick(buttonId);
  };
  
  const handleSaveClick = async () => {
    try {
      // 既存の保存処理
      await saveSellerData();
      
      // ボタン状態を永続化
      handleSave();
      
      toast.success('保存しました');
    } catch (error) {
      toast.error('保存に失敗しました');
    }
  };
  
  return (
    <div>
      <button
        onClick={() => handleQuickAction('send-sms', sendSMS)}
        disabled={isButtonDisabled('send-sms')}
        className={getButtonState('send-sms') === 'pending' ? 'pending' : ''}
        style={{
          opacity: isButtonDisabled('send-sms') ? 0.5 : 1,
          cursor: isButtonDisabled('send-sms') ? 'not-allowed' : 'pointer',
        }}
        title={isButtonDisabled('send-sms') ? '使用済み' : ''}
      >
        SMS送信
      </button>
      
      <button onClick={handleSaveClick}>
        保存
      </button>
    </div>
  );
};
```

## Data Models

### LocalStorage Schema

```typescript
// Key: 'callModeQuickButtons'
{
  "seller-123": {
    "send-sms": {
      "disabledAt": "2024-01-15T10:30:00.000Z",
      "state": "persisted"
    },
    "send-email": {
      "disabledAt": "2024-01-15T10:35:00.000Z",
      "state": "persisted"
    }
  },
  "seller-456": {
    "send-sms": {
      "disabledAt": "2024-01-16T14:20:00.000Z",
      "state": "persisted"
    }
  }
}
```

### In-Memory State

```typescript
// Hook内部で管理
{
  disabledButtons: Map<string, 'pending' | 'persisted'> {
    'send-sms' => 'pending',      // 保存待ち
    'send-email' => 'persisted',  // 永続化済み
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Pending状態は保存後にのみ永続化される

*For any* quick button in pending state, clicking the save button should persist the disabled state to localStorage and change the state from pending to persisted.

**Validates: Requirements 5.2**

### Property 2: 保存なしでの離脱はpending状態を破棄する

*For any* quick button in pending state, navigating away without saving should discard the pending state and not persist it to localStorage.

**Validates: Requirements 5.3**

### Property 3: 売主ごとの状態独立性

*For any* two different seller IDs, disabling a button for one seller should not affect the button state for the other seller.

**Validates: Requirements 4.1, 4.2**

### Property 4: LocalStorage障害時のフォールバック

*For any* localStorage operation failure, the system should fall back to in-memory storage and continue functioning without crashing.

**Validates: Requirements 6.4**

### Property 5: 無効化ボタンのクリック防止

*For any* disabled button (pending or persisted), clicking the button should not trigger the associated action.

**Validates: Requirements 2.4**

### Property 6: 視覚的フィードバックの一貫性

*For any* disabled button, the visual styling (opacity, cursor, tooltip) should be consistently applied regardless of the disabled state (pending or persisted).

**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

### Property 7: 状態の復元

*For any* persisted button state in localStorage, reloading the page should restore the disabled state correctly.

**Validates: Requirements 3.2**

## Error Handling

### LocalStorage Errors

1. **Quota Exceeded**: 古いエントリを削除してスペースを確保
2. **Access Denied**: メモリフォールバックに切り替え
3. **Parse Error**: 破損したデータをクリアして再初期化

### Save Operation Errors

1. **Network Error**: pending状態を保持し、再試行を促す
2. **Validation Error**: pending状態を保持し、エラーメッセージを表示
3. **Server Error**: pending状態を保持し、再試行を促す

### Edge Cases

1. **Seller ID未定義**: 機能を無効化し、エラーログを記録
2. **同時保存**: 最後の保存操作を優先
3. **ブラウザ間の同期**: 各ブラウザで独立した状態を管理

## Testing Strategy

### Unit Tests

- `useCallModeQuickButtonState` hookの各関数をテスト
- `callModeQuickButtonStorage` utilityの各関数をテスト
- エラーハンドリングのテスト
- エッジケースのテスト

### Integration Tests

- クイックボタンクリック → 保存 → 状態永続化のフロー
- クイックボタンクリック → 離脱 → pending状態破棄のフロー
- ページリロード → 状態復元のフロー
- 複数売主間の状態独立性のテスト

### Property-Based Tests

各correctness propertyに対して、最低100回の反復テストを実行します。

- Property 1-7の各テストケース
- ランダムな売主ID、ボタンID、操作シーケンスでテスト
- localStorage障害のシミュレーション

## Performance Considerations

1. **Debouncing**: localStorage書き込みを300msデバウンス
2. **Batching**: 複数ボタンの状態更新を1回の書き込みにまとめる
3. **Lazy Loading**: ページロード時に非同期で状態を読み込む
4. **Memory Management**: 不要な状態データを定期的にクリーンアップ

## Migration from Buyer Detail Implementation

買主詳細ページの実装を再利用しつつ、以下の点を拡張：

1. **Pending状態の追加**: 保存前の一時的な無効化状態
2. **保存ボタン連携**: 保存時にpending→persistedに変換
3. **視覚的区別**: pending状態とpersisted状態を視覚的に区別（オプション）
4. **ストレージキーの変更**: `callModeQuickButtons`を使用

既存の`quickButtonStorage.ts`と`useQuickButtonState.ts`を参考に、通話モード専用の実装を作成します。
