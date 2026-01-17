# 実装ガイド

## このドキュメントについて

このガイドは、売主リスト管理システムの実装を段階的に進めるための実践的な手引きです。requirements.md、design.md、tasks.mdと併せて使用してください。

## クイックスタート

### 最初の1週間で実装すべきもの（MVP Phase 0）

**目標：** 基本的な売主登録と表示ができる最小限のシステム

```
Week 1 Priority Tasks:
├── Day 1-2: 環境構築
│   ├── PostgreSQL + Supabaseセットアップ
│   ├── Express.js + React プロジェクト作成
│   └── 基本的なCI/CD設定
├── Day 3-4: 認証とデータベース
│   ├── Supabase認証実装
│   ├── sellersテーブル作成（最小限のフィールド）
│   └── 暗号化ユーティリティ実装
└── Day 5: 基本CRUD
    ├── 売主作成API
    ├── 売主一覧API
    └── 簡単なフロントエンド画面
```

### Phase別実装ロードマップ

```
Phase 0 (MVP - 1週間)
  ↓ 基本的な売主管理ができる
Phase 1 (基盤 - 2週間)
  ↓ 認証、暗号化、売主番号生成が完成
Phase 2 (コア機能 - 3週間)
  ↓ 査定、重複検出、活動ログが完成
Phase 3 (外部連携 - 3週間)
  ↓ Gmail、Calendar、Chat、Sheets連携が完成
Phase 4 (完成 - 2週間)
  ↓ パフォーマンス最適化、テスト、ドキュメント
```

## Phase 0: MVP（最小実行可能製品）

### 目標
- 売主の基本情報を登録・表示できる
- 認証ができる
- 個人情報が暗号化される

### 実装範囲

#### データベーススキーマ（最小限）
```sql
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_number VARCHAR(10) UNIQUE NOT NULL,
  name_encrypted TEXT NOT NULL,
  phone_encrypted TEXT NOT NULL,
  email_encrypted TEXT,
  property_address TEXT,
  property_type VARCHAR(20),
  status VARCHAR(30) DEFAULT '新規',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'employee',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### API エンドポイント（最小限）
```typescript
// 認証
POST /api/auth/login
POST /api/auth/logout

// 売主
POST /api/sellers          // 作成
GET  /api/sellers          // 一覧（ページネーション）
GET  /api/sellers/:id      // 詳細
PUT  /api/sellers/:id      // 更新
```

#### フロントエンド画面（最小限）
```
/login              - ログイン画面
/sellers            - 売主一覧画面
/sellers/new        - 新規登録画面
/sellers/:id        - 売主詳細画面
```

### 実装手順

#### Step 1: 環境構築（Day 1）

```bash
# バックエンド
cd backend
npm init -y
npm install express typescript @types/express @types/node
npm install @supabase/supabase-js dotenv
npm install bcrypt jsonwebtoken
npm install --save-dev ts-node nodemon jest @types/jest

# フロントエンド
cd frontend
npm create vite@latest . -- --template react-ts
npm install zustand axios react-router-dom
```

**環境変数設定（.env）：**
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# 暗号化
ENCRYPTION_KEY=your_32_byte_encryption_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=development
```

#### Step 2: 暗号化ユーティリティ実装（Day 1）

```typescript
// backend/src/utils/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**テスト：**
```typescript
// backend/src/utils/__tests__/encryption.test.ts
import { encrypt, decrypt } from '../encryption';

describe('Encryption', () => {
  it('暗号化と復号化は可逆的である', () => {
    const original = '山田太郎';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    
    expect(decrypted).toBe(original);
    expect(encrypted).not.toBe(original);
  });
});
```

#### Step 3: Supabase認証実装（Day 2）

```typescript
// backend/src/services/AuthService.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class AuthService {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }
  
  async signOut(accessToken: string) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
  
  async getUser(accessToken: string) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) throw error;
    return data.user;
  }
}
```

**認証ミドルウェア：**
```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

const authService = new AuthService();

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: '認証が必要です' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const user = await authService.getUser(token);
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: '認証に失敗しました' });
  }
}
```

#### Step 4: 売主番号生成サービス（Day 2）

```typescript
// backend/src/services/SellerNumberService.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class SellerNumberService {
  async generateNext(): Promise<string> {
    // 最新の売主番号を取得
    const { data, error } = await supabase
      .from('sellers')
      .select('seller_number')
      .order('seller_number', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }
    
    let nextNumber = 1;
    if (data) {
      const currentNumber = parseInt(data.seller_number.substring(2));
      nextNumber = currentNumber + 1;
    }
    
    return `AA${nextNumber.toString().padStart(5, '0')}`;
  }
  
  validate(sellerNumber: string): boolean {
    return /^AA[0-9]{5}$/.test(sellerNumber);
  }
}
```

#### Step 5: 売主サービス実装（Day 3）

```typescript
// backend/src/services/SellerService.ts
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '../utils/encryption';
import { SellerNumberService } from './SellerNumberService';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sellerNumberService = new SellerNumberService();

export class SellerService {
  async createSeller(data: CreateSellerInput): Promise<Seller> {
    // 売主番号を生成
    const sellerNumber = await sellerNumberService.generateNext();
    
    // 個人情報を暗号化
    const encryptedData = {
      seller_number: sellerNumber,
      name_encrypted: encrypt(data.name),
      phone_encrypted: encrypt(data.phone),
      email_encrypted: data.email ? encrypt(data.email) : null,
      property_address: data.propertyAddress,
      property_type: data.propertyType,
      status: '新規'
    };
    
    const { data: seller, error } = await supabase
      .from('sellers')
      .insert(encryptedData)
      .select()
      .single();
    
    if (error) throw error;
    
    return this.decryptSeller(seller);
  }
  
  async getSeller(id: string): Promise<Seller> {
    const { data, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return this.decryptSeller(data);
  }
  
  async listSellers(params: ListSellersParams): Promise<PaginatedSellers> {
    const { page = 1, pageSize = 50 } = params;
    const offset = (page - 1) * pageSize;
    
    const { data, error, count } = await supabase
      .from('sellers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (error) throw error;
    
    return {
      data: data.map(s => this.decryptSeller(s)),
      total: count || 0,
      page,
      pageSize
    };
  }
  
  private decryptSeller(seller: any): Seller {
    return {
      ...seller,
      name: decrypt(seller.name_encrypted),
      phone: decrypt(seller.phone_encrypted),
      email: seller.email_encrypted ? decrypt(seller.email_encrypted) : null
    };
  }
}
```

#### Step 6: API エンドポイント実装（Day 4）

```typescript
// backend/src/routes/sellers.ts
import { Router } from 'express';
import { SellerService } from '../services/SellerService';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const sellerService = new SellerService();

// 全てのエンドポイントに認証を要求
router.use(authMiddleware);

// 売主作成
router.post('/', async (req, res) => {
  try {
    const seller = await sellerService.createSeller(req.body);
    res.status(201).json(seller);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 売主一覧
router.get('/', async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await sellerService.listSellers({
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 50
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 売主詳細
router.get('/:id', async (req, res) => {
  try {
    const seller = await sellerService.getSeller(req.params.id);
    res.json(seller);
  } catch (error) {
    res.status(404).json({ error: '売主が見つかりません' });
  }
});

export default router;
```

#### Step 7: フロントエンド実装（Day 5）

**状態管理（Zustand）：**
```typescript
// frontend/src/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  
  login: async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  }
}));
```

**売主一覧画面：**
```typescript
// frontend/src/pages/SellersPage.tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

export function SellersPage() {
  const [sellers, setSellers] = useState([]);
  const [page, setPage] = useState(1);
  const token = useAuthStore(state => state.token);
  
  useEffect(() => {
    fetchSellers();
  }, [page]);
  
  async function fetchSellers() {
    const response = await fetch(`/api/sellers?page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setSellers(data.data);
  }
  
  return (
    <div>
      <h1>売主一覧</h1>
      <table>
        <thead>
          <tr>
            <th>売主番号</th>
            <th>氏名</th>
            <th>電話番号</th>
            <th>物件種別</th>
            <th>ステータス</th>
          </tr>
        </thead>
        <tbody>
          {sellers.map(seller => (
            <tr key={seller.id}>
              <td>{seller.sellerNumber}</td>
              <td>{seller.name}</td>
              <td>{seller.phone}</td>
              <td>{seller.propertyType}</td>
              <td>{seller.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div>
        <button onClick={() => setPage(p => Math.max(1, p - 1))}>前へ</button>
        <span>ページ {page}</span>
        <button onClick={() => setPage(p => p + 1)}>次へ</button>
      </div>
    </div>
  );
}
```

### MVP完成チェックリスト

- [ ] ログインができる
- [ ] 売主を新規登録できる
- [ ] 売主番号が自動生成される（AA00001形式）
- [ ] 個人情報が暗号化されて保存される
- [ ] 売主一覧が表示される
- [ ] ページネーションが動作する
- [ ] 売主詳細が表示される
- [ ] 基本的なエラーハンドリングが実装されている

### 次のステップ

MVP完成後、以下のいずれかを選択：

1. **Phase 1に進む：** 認証強化、重複検出、査定機能を追加
2. **ユーザーフィードバック収集：** 実際に使ってもらい、改善点を洗い出す
3. **テスト追加：** ユニットテスト、統合テストを追加して品質を向上

## Phase 1: 基盤強化（2週間）

### 目標
- 認証が強化される（セッション管理、トークンリフレッシュ）
- 重複検出が実装される
- 査定機能が実装される
- 活動ログが記録される

### 実装範囲

#### 追加テーブル
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  activity_type VARCHAR(20) NOT NULL,
  activity_date TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE valuation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  valuation_1 DECIMAL(12, 2),
  valuation_2 DECIMAL(12, 2),
  valuation_3 DECIMAL(12, 2),
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### 追加API エンドポイント
```typescript
// 重複検出
GET  /api/sellers/check-duplicate?phone=xxx
GET  /api/sellers/check-duplicate?email=xxx

// 査定
POST /api/valuations
GET  /api/valuations/:sellerId

// 活動ログ
POST /api/activity-logs
GET  /api/activity-logs?sellerId=xxx
```

### 実装の詳細はtasks.mdを参照

## Phase 2-4の実装ガイドは別途作成予定

---

## トラブルシューティング

### よくある問題と解決策

#### 問題1: 暗号化キーのエラー
```
Error: Invalid key length
```

**解決策：**
```bash
# 32バイトのランダムキーを生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 問題2: Supabase接続エラー
```
Error: Invalid Supabase URL
```

**解決策：**
- Supabaseダッシュボードで正しいURLとキーを確認
- `.env`ファイルが正しく読み込まれているか確認

#### 問題3: CORS エラー
```
Access to fetch at 'http://localhost:3000/api/sellers' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**解決策：**
```typescript
// backend/src/index.ts
import cors from 'cors';

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

## 参考リソース

- [Supabase Documentation](https://supabase.com/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Router Documentation](https://reactrouter.com/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
