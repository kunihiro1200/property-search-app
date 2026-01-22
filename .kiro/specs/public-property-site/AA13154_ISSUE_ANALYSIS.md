# AA13154 公開物件サイト表示問題 - 根本原因分析

## 問題の概要

物件番号 AA13154 が公開物件サイトに表示されない問題が発生しています。

## 根本原因

### 現在の実装の問題点

**バックエンド (`backend/src/services/PropertyListingService.ts`)**
```typescript
// 現在の実装（誤り）
async getPublicProperties(options) {
  let query = this.supabase
    .from('property_listings')
    .select('...')
    .eq('atbb_status', '専任・公開中');  // ❌ 「専任・公開中」のみを取得
  // ...
}
```

**問題点：**
- AA13154 の `atbb_status` は `'一般・公開中'` である
- 現在のコードは `atbb_status = '専任・公開中'` の物件のみを取得している
- そのため、AA13154 は公開物件一覧から除外されている

### 正しい要件

ユーザーからの説明によると、公開物件サイトは以下のように動作すべきです：

1. **すべての物件を表示する**
   - `property_listings` テーブルのすべての物件を表示
   - `atbb_status` の値に関係なく表示

2. **バッジ表示とアクセス制御**
   - `atbb_status` に「公開中」が含まれる物件（例：「専任・公開中」「一般・公開中」）
     - 通常通り表示（バッジなし）
     - 詳細ページへのリンクが有効
   
   - `atbb_status` に「公開前」が含まれる物件
     - 「公開前」バッジを表示
     - 詳細ページへのリンクが有効
   
   - `atbb_status` に「非公開（配信メールのみ）」が含まれる物件
     - 「配信限定」バッジを表示
     - 詳細ページへのリンクが有効
   
   - `atbb_status` に「非公開案件」が含まれる物件
     - 「成約済み」バッジを表示
     - 詳細ページへのリンクを無効化（クリック不可）
   
   - その他のすべての物件（例：「成約済み」「取下げ」など）
     - 画像の上に大きな「成約済み」バッジを表示
     - 詳細ページへのリンクを無効化（クリック不可）

## 修正が必要な箇所

### 1. バックエンド API

**ファイル:** `backend/src/services/PropertyListingService.ts`

**修正前:**
```typescript
async getPublicProperties(options) {
  let query = this.supabase
    .from('property_listings')
    .select('...')
    .eq('atbb_status', '専任・公開中');  // ❌ 削除
  // ...
}
```

**修正後:**
```typescript
async getPublicProperties(options) {
  let query = this.supabase
    .from('property_listings')
    .select('id, property_number, property_type, address, price, land_area, building_area, construction_year_month, image_url, storage_location, distribution_areas, atbb_status, created_at', { count: 'exact' });
    // ✅ atbb_status フィルターを削除 - すべての物件を取得
  
  // フィルタリング処理...
  
  // レスポンスに atbb_status とバッジ情報を含める
  const propertiesWithImages = await Promise.all(
    (data || []).map(async (property) => {
      // 画像取得処理...
      
      // バッジタイプを判定
      const badgeType = this.getBadgeType(property.atbb_status);
      const isClickable = this.isPropertyClickable(property.atbb_status);
      
      return { 
        ...property, 
        property_type: this.convertPropertyTypeToEnglish(property.property_type),
        atbb_status: property.atbb_status,  // ✅ atbb_status を含める
        badge_type: badgeType,  // ✅ バッジタイプを追加
        is_clickable: isClickable,  // ✅ クリック可能フラグを追加
        images 
      };
    })
  );
  // ...
}

// ✅ バッジタイプ判定メソッドを追加
private getBadgeType(atbbStatus: string | null): string {
  if (!atbbStatus) return 'sold';
  if (atbbStatus.includes('公開中')) return 'none';
  if (atbbStatus.includes('公開前')) return 'pre_release';
  if (atbbStatus.includes('非公開（配信メールのみ）')) return 'email_only';
  // "非公開案件" and all other cases return 'sold'
  return 'sold';
}

// ✅ クリック可能判定メソッドを追加
private isPropertyClickable(atbbStatus: string | null): boolean {
  if (!atbbStatus) return false;
  // Only "公開中", "公開前", and "非公開（配信メールのみ）" are clickable
  // "非公開案件" is NOT clickable
  return atbbStatus.includes('公開中') || 
         atbbStatus.includes('公開前') || 
         atbbStatus.includes('非公開（配信メールのみ）');
}
```

**修正前:**
```typescript
async getPublicPropertyById(id: string) {
  const { data, error } = await this.supabase
    .from('property_listings')
    .select('...')
    .eq('id', id)
    .eq('atbb_status', '専任・公開中')  // ❌ 削除
    .single();
  // ...
}
```

**修正後:**
```typescript
async getPublicPropertyById(id: string) {
  const { data, error } = await this.supabase
    .from('property_listings')
    .select('...')
    .eq('id', id)
    .single();
  
  if (error) {
    // エラー処理...
  }
  
  // ✅ クリック可能な物件のみ詳細ページを表示
  if (!this.isPropertyClickable(data.atbb_status)) {
    return null;  // 404 を返す
  }
  
  return {
    ...data,
    property_type: this.convertPropertyTypeToEnglish(data.property_type)
  };
}
```

### 2. フロントエンド - 物件カードコンポーネント

**ファイル:** `frontend/src/components/PublicPropertyCard.tsx`

**追加が必要な機能:**
1. `atbb_status` に基づいて適切なバッジを表示
   - 「公開中」を含む → バッジなし
   - 「公開前」を含む → 「公開前」バッジ
   - 「非公開（配信メールのみ）」を含む → 適切なバッジ
   - 「非公開案件」を含む → 適切なバッジ
   - その他 → 「成約済み」バッジ
2. クリック可能な物件のみカードをクリック可能にする

**修正例:**
```typescript
interface PublicPropertyCardProps {
  property: PublicProperty;
  animationDelay?: number;
}

const PublicPropertyCard: React.FC<PublicPropertyCardProps> = ({ 
  property, 
  animationDelay = 0 
}) => {
  const navigate = useNavigate();
  
  // ✅ バッジタイプとクリック可能性を判定
  const badgeType = getBadgeType(property.atbb_status);
  const isClickable = property.is_clickable ?? isPropertyClickable(property.atbb_status);

  const handleClick = () => {
    // ✅ クリック不可の物件はクリック不可
    if (!isClickable) {
      return;
    }
    navigate(`/public/properties/${property.id}`);
  };

  // バッジ表示用のコンポーネント
  const renderBadge = () => {
    if (badgeType === 'none') return null;
    
    const badgeConfig: Record<string, { text: string; color: string }> = {
      'sold': { text: '成約済み', color: 'rgba(0, 0, 0, 0.8)' },
      'pre_release': { text: '公開前', color: 'rgba(255, 152, 0, 0.9)' },
      'email_only': { text: '配信限定', color: 'rgba(33, 150, 243, 0.9)' },
    };
    
    const config = badgeConfig[badgeType];
    if (!config) return null;
    
    return (
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: config.color,
          color: 'white',
          padding: '16px 32px',
          fontSize: '32px',
          fontWeight: 'bold',
          borderRadius: '8px',
          zIndex: 10,
        }}
      >
        {config.text}
      </Box>
    );
  };

  return (
    <Card
      className={`property-card animate-fade-in-up ${!isClickable ? 'not-clickable' : ''}`}
      onClick={handleClick}
      style={{ 
        animationDelay: `${animationDelay}s`,
        cursor: isClickable ? 'pointer' : 'default',  // ✅ カーソルを変更
        opacity: !isClickable ? 0.7 : 1  // ✅ クリック不可物件は薄く表示
      }}
    >
      <Box className="property-card-image-container">
        <img
          src={thumbnailUrl}
          alt={`${property.display_address || property.address}の物件画像`}
          className="property-card-image"
          loading="lazy"
        />
        <Box className="property-card-image-overlay" />
        
        {/* ✅ バッジを表示 */}
        {renderBadge()}
        
        <Chip
          label={typeConfig.label}
          className="property-type-badge"
          sx={{
            bgcolor: typeConfig.bgColor,
            color: typeConfig.color,
            fontWeight: 600,
          }}
        />
      </Box>
      
      {/* 残りのコンテンツ... */}
    </Card>
  );
};

// ✅ ヘルパー関数
function getBadgeType(atbbStatus: string | null | undefined): string {
  if (!atbbStatus) return 'sold';
  if (atbbStatus.includes('公開中')) return 'none';
  if (atbbStatus.includes('公開前')) return 'pre_release';
  if (atbbStatus.includes('非公開（配信メールのみ）')) return 'email_only';
  // "非公開案件" and all other cases return 'sold'
  return 'sold';
}

function isPropertyClickable(atbbStatus: string | null | undefined): boolean {
  if (!atbbStatus) return false;
  // Only "公開中", "公開前", and "非公開（配信メールのみ）" are clickable
  // "非公開案件" is NOT clickable
  return atbbStatus.includes('公開中') || 
         atbbStatus.includes('公開前') || 
         atbbStatus.includes('非公開（配信メールのみ）');
}
```

### 3. TypeScript 型定義

**ファイル:** `frontend/src/types/publicProperty.ts`

**追加が必要なフィールド:**
```typescript
export interface PublicProperty {
  id: string;
  property_number: string;
  property_type: string;
  address: string;
  display_address?: string;
  price?: number;
  land_area?: number;
  building_area?: number;
  construction_year_month?: string;
  building_age?: number;
  floor_plan?: string;
  images?: string[];
  atbb_status: string;  // ✅ 追加
  badge_type?: string;  // ✅ 追加（'none' | 'pre_release' | 'email_only' | 'sold'）
  is_clickable?: boolean;  // ✅ 追加
  created_at: string;
}
```

## 検証方法

### 1. バックエンド API のテスト

```bash
# すべての物件を取得（AA13154 が含まれることを確認）
curl http://localhost:3000/api/public/properties

# AA13154 の atbb_status を確認
curl http://localhost:3000/api/public/properties | jq '.properties[] | select(.property_number == "AA13154")'
```

**期待される結果:**
```json
{
  "id": "...",
  "property_number": "AA13154",
  "atbb_status": "一般・公開中",
  "badge_type": "none",
  "is_clickable": true,
  ...
}
```

### 2. フロントエンドの確認

1. 公開物件サイトにアクセス: `http://localhost:5173/public/properties`
2. AA13154 が一覧に表示されることを確認
3. AA13154 にバッジが**表示されない**ことを確認（`atbb_status` に「公開中」が含まれるため）
4. AA13154 をクリックして詳細ページに遷移できることを確認

### 3. 各種バッジのテスト

異なる `atbb_status` を持つ物件が存在する場合：

**「公開前」物件:**
1. 一覧に表示されることを確認
2. 「公開前」バッジが表示されることを確認
3. クリックして詳細ページに遷移できることを確認

**「非公開（配信メールのみ）」物件:**
1. 一覧に表示されることを確認
2. 「配信限定」バッジが表示されることを確認
3. クリックして詳細ページに遷移できることを確認

**「非公開案件」物件:**
1. 一覧に表示されることを確認
2. 「成約済み」バッジが表示されることを確認
3. クリックしても詳細ページに遷移しないことを確認

**成約済み物件（例：`atbb_status = '成約済み'`）:**
1. 一覧に表示されることを確認
2. 「成約済み」バッジが表示されることを確認
3. クリックしても詳細ページに遷移しないことを確認

## まとめ

**問題の根本原因:**
- 現在の実装は `atbb_status = '専任・公開中'` の物件のみを表示している
- AA13154 は `atbb_status = '一般・公開中'` なので除外されている

**正しい実装:**
- すべての物件を表示する
- `atbb_status` に基づいて適切なバッジを表示：
  - 「公開中」を含む → バッジなし（クリック可能）
  - 「公開前」を含む → 「公開前」バッジ（クリック可能）
  - 「非公開（配信メールのみ）」を含む → 「配信限定」バッジ（クリック可能）
  - 「非公開案件」を含む → 「成約済み」バッジ（クリック不可）
  - その他 → 「成約済み」バッジ（クリック不可）

**修正箇所:**
1. `backend/src/services/PropertyListingService.ts` - `getPublicProperties()` と `getPublicPropertyById()`
   - すべての物件を取得するようにフィルターを削除
   - バッジタイプ判定メソッドを追加
   - クリック可能判定メソッドを追加
2. `frontend/src/components/PublicPropertyCard.tsx` - バッジ表示とクリック制御
   - 複数のバッジタイプに対応
   - クリック可能性の判定を更新
3. `frontend/src/types/publicProperty.ts` - 型定義の更新
   - `badge_type` フィールドを追加
   - `is_clickable` フィールドを更新
