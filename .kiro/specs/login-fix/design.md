# ログイン機能修正 - Design Document

## Overview

売主リスト管理システムのログイン機能が正しく動作していない問題を修正します。現在、Supabase Authを使用したGoogleログインが実装されていますが、認証フローが完全に完了していません。

本設計では、既存のSupabase Auth実装を活用しながら、認証フローの問題点を特定し、修正します。

## Architecture

### 現在のアーキテクチャ

```
[ユーザー] 
    ↓ クリック
[LoginPage] 
    ↓ loginWithGoogle()
[Supabase Auth Client] 
    ↓ signInWithOAuth()
[Google OAuth] 
    ↓ リダイレクト
[/auth/callback] 
    ↓ handleAuthCallback()
[Backend /auth/callback] 
    ↓ getOrCreateEmployee()
[Database]
```

### 問題点

1. **リダイレクトURI設定**: Supabase Authのリダイレクト設定が正しく構成されていない可能性
2. **セッション管理**: フロントエンドでのセッション取得タイミングの問題
3. **エラーハンドリング**: 認証失敗時のエラー処理が不十分
4. **ログ出力**: デバッグ用のログが多すぎて本番環境に不適切

## Components and Interfaces

### 1. Frontend Components

#### LoginPage.tsx
- Googleログインボタンの表示
- エラーメッセージの表示
- ログイン処理の開始

#### AuthCallbackPage.tsx (新規作成)
- OAuth認証後のコールバック処理専用ページ
- セッション取得とバックエンド連携
- 認証完了後のリダイレクト

#### authStore.ts
- 認証状態の管理
- ログイン/ログアウト処理
- セッション検証

### 2. Backend Components

#### auth.supabase.ts
- `/auth/callback`: トークン検証と社員レコード作成
- `/auth/me`: 現在のユーザー情報取得
- `/auth/logout`: ログアウト処理
- `/auth/refresh`: トークンリフレッシュ

#### AuthService.supabase.ts
- `getOrCreateEmployee()`: 社員レコードの取得または作成
- `validateSession()`: セッション検証
- `logout()`: ログアウト処理

### 3. Configuration

#### Supabase Configuration
- **URL**: `https://fzcuexscuwhoywcicdqq.supabase.co`
- **Anon Key**: 環境変数から取得
- **Redirect URI**: `${FRONTEND_URL}/auth/callback`

#### Environment Variables
- `VITE_SUPABASE_URL`: Supabase URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key
- `VITE_API_URL`: Backend API URL
- `SUPABASE_URL`: Backend Supabase URL
- `SUPABASE_SERVICE_KEY`: Backend Service Role Key

## Data Models

### Employee
```typescript
interface Employee {
  id: string;
  supabase_user_id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  initials: string;
  created_at: string;
  updated_at: string;
}
```

### Session
```typescript
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
    };
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: OAuth Redirect Success
*For any* valid Google OAuth consent approval, the system should successfully redirect back to the application with valid authentication tokens
**Validates: Requirements 1.2**

### Property 2: Employee Record Creation
*For any* successful OAuth authentication, the system should create or retrieve an employee record in the database
**Validates: Requirements 1.3**

### Property 3: Session Persistence
*For any* successful authentication, the system should store the session token in localStorage and maintain authentication state
**Validates: Requirements 1.4**

### Property 4: Error Message Display
*For any* authentication failure, the system should display a clear error message to the user
**Validates: Requirements 1.5, 2.1, 2.2**

### Property 5: Detailed Error Logging
*For any* authentication error, the system should log detailed error information to the console for debugging
**Validates: Requirements 2.1, 2.3, 2.4**

## Error Handling

### Frontend Error Handling

1. **OAuth Initiation Errors**
   - Supabase設定エラー
   - ネットワークエラー
   - ユーザーへのエラーメッセージ表示

2. **Callback Errors**
   - セッション取得失敗
   - バックエンドAPI呼び出し失敗
   - ログインページへリダイレクト

3. **Session Validation Errors**
   - 無効なトークン
   - 期限切れトークン
   - ログインページへリダイレクト

### Backend Error Handling

1. **Token Validation Errors**
   - 無効なトークン: 401 Unauthorized
   - トークン欠落: 400 Bad Request
   - 詳細なエラーログ出力

2. **Employee Creation Errors**
   - データベースエラー: 500 Internal Server Error
   - 重複エラー: 既存レコードを返す
   - エラーログ出力

3. **Session Errors**
   - Supabase API エラー: 500 Internal Server Error
   - エラーログ出力とリトライ可能フラグ

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

## Testing Strategy

### Unit Tests

1. **Frontend Unit Tests**
   - `authStore.loginWithGoogle()`: Supabase Auth呼び出しのテスト
   - `authStore.handleAuthCallback()`: コールバック処理のテスト
   - `authStore.checkAuth()`: セッション検証のテスト

2. **Backend Unit Tests**
   - `AuthService.getOrCreateEmployee()`: 社員レコード作成のテスト
   - `AuthService.validateSession()`: セッション検証のテスト
   - Token validation logic: トークン検証ロジックのテスト

### Integration Tests

1. **OAuth Flow Test**
   - ログインボタンクリック → OAuth画面表示
   - OAuth承認 → コールバック処理
   - 社員レコード作成 → ホームページリダイレクト

2. **Error Handling Test**
   - 無効なトークンでのコールバック
   - ネットワークエラー時の挙動
   - エラーメッセージの表示確認

3. **Session Management Test**
   - ログイン後のセッション永続化
   - ページリロード後のセッション復元
   - ログアウト後のセッションクリア

### Manual Testing Checklist

1. **正常系**
   - [ ] ログインボタンをクリックしてGoogle OAuth画面が表示される
   - [ ] Google アカウントを選択して承認する
   - [ ] 認証後にホームページにリダイレクトされる
   - [ ] ユーザー情報が正しく表示される

2. **異常系**
   - [ ] OAuth承認をキャンセルした場合のエラー表示
   - [ ] ネットワークエラー時のエラー表示
   - [ ] 無効なトークンでのエラー処理

3. **セッション管理**
   - [ ] ログイン後にページをリロードしてもログイン状態が維持される
   - [ ] ログアウト後にログインページにリダイレクトされる
   - [ ] トークン期限切れ後に再ログインが必要になる

## Implementation Notes

### Supabase Auth Configuration

1. **Redirect URLs**
   - Development: `http://localhost:5173/auth/callback`
   - Production: `https://your-domain.com/auth/callback`
   - Supabase Dashboardで設定が必要

2. **OAuth Providers**
   - Google OAuth設定
   - Client IDとClient Secretの設定
   - Authorized redirect URIsの設定

### Security Considerations

1. **Token Storage**
   - Access tokenはlocalStorageに保存
   - Refresh tokenもlocalStorageに保存
   - XSS対策のためのCSP設定

2. **CORS Configuration**
   - フロントエンドURLをCORS許可リストに追加
   - Credentialsを含むリクエストを許可

3. **Environment Variables**
   - 本番環境では環境変数を適切に設定
   - Anon Keyは公開可能だが、Service Keyは秘密に保つ

### Logging Strategy

1. **Development**
   - 詳細なログ出力（console.log）
   - エラースタックトレース

2. **Production**
   - エラーログのみ出力
   - センシティブ情報のマスキング
   - ログレベルの設定（ERROR, WARN, INFO）

## Deployment Considerations

### Pre-deployment Checklist

1. **Supabase Configuration**
   - [ ] Redirect URLsの設定確認
   - [ ] Google OAuth設定確認
   - [ ] RLS (Row Level Security) ポリシーの確認

2. **Environment Variables**
   - [ ] 本番環境の環境変数設定
   - [ ] Supabase URLとKeysの確認
   - [ ] Frontend URLの設定

3. **Database**
   - [ ] employeesテーブルの存在確認
   - [ ] 必要なインデックスの確認

### Post-deployment Verification

1. **Functional Testing**
   - [ ] ログイン機能の動作確認
   - [ ] エラーハンドリングの確認
   - [ ] セッション管理の確認

2. **Monitoring**
   - [ ] エラーログの監視
   - [ ] 認証成功率の監視
   - [ ] レスポンスタイムの監視
