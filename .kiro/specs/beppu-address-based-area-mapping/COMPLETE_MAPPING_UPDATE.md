# 別府市エリアマッピング - 完全版更新

## 概要

現在のマッピングデータに不足している住所を追加し、すべての別府市の住所を正しいエリアにマッピングします。

## 更新が必要な理由

現在、多くの別府市の物件が配信エリア「㊶」のみになっており、正しいエリアマッピングが適用されていません。
提供された完全な住所リストに基づいて、データベースを更新する必要があります。

## 更新手順

### 1. データベースの現在の状態を確認
```bash
cd backend
npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
supabase.from('beppu_area_mapping').select('school_district').then(({data}) => {
  const counts: Record<string, number> = {};
  data?.forEach((row: any) => {
    counts[row.school_district] = (counts[row.school_district] || 0) + 1;
  });
  console.log('現在のマッピング数:', counts);
  console.log('合計:', Object.values(counts).reduce((a,b) => a+b, 0));
});
"
```

### 2. populate-beppu-area-mapping.tsを更新

`backend/populate-beppu-area-mapping.ts`のbeppuAreaData配列を、提供された完全な住所リストに基づいて更新します。

主な追加項目：
- ⑨エリア: 南立石板地町、堀田、扇山
- ⑩エリア: 鶴見（特定組を除く）、駅前町、駅前本町、北浜、京町、幸町、新港町、野口、富士見町、餅ヶ浜町、元町、弓ヶ浜町、若草町
- ⑪エリア: 野田、亀川関連
- ⑫エリア: 明礬、新別府、馬場、火売、北中、御幸、風呂本、井田、鉄輪関連、天間、湯山、竹の内、大畑、小倉、朝日ケ丘町
- ⑬エリア: 東山一区、東山二区、城島、山の口、枝郷
- ⑭エリア: 南須賀、石垣東4-10丁目、石垣西4-10丁目、春木、上人南、桜ケ丘、中須賀、船小路町、汐見町、実相寺
- ⑮エリア: 光町、中島町、原町、朝見、乙原、中央町、田の湯町、上田の湯町、青山町、上原町、山の手町、西野口町、立田町、南町、松原町、浜町、千代町、末広町、秋葉町、楠町、浜脇、浦田、田の口、河内、山家、両郡橋、赤松、柳、鳥越、古賀原、内成
- ㊷エリア: 中央町、駅前本町、上田の湯町、野口中町、西野口町、駅前町
- ㊸エリア: 既存データに加えて、複数エリアに属する住所

### 3. データベースを更新
```bash
cd backend
npx ts-node populate-beppu-area-mapping.ts
```

### 4. 既存物件の配信エリアを再計算
```bash
cd backend
npx ts-node backfill-beppu-distribution-areas.ts
```

### 5. 更新を確認
```bash
cd backend
npx ts-node check-aa13149-distribution.ts
```

## 注意事項

1. **複数エリアに属する住所**: 一部の住所は複数のエリアに属します（例: 北中 → ⑫㊶㊸）
2. **エリア番号の統合**: BeppuAreaMappingServiceは自動的に複数のマッピングを統合します
3. **既存データとの整合性**: 更新後、すべての別府市物件の配信エリアが正しく設定されることを確認してください

## 期待される結果

- データベースに約300-400件のマッピングが登録される
- すべての別府市の住所が正しいエリア番号にマッピングされる
- 既存物件の配信エリアが自動的に更新される
- 買主マッチングの精度が向上する

## トラブルシューティング

### 問題: 物件の配信エリアが更新されない
**解決策**: `backfill-beppu-distribution-areas.ts`を再実行してください

### 問題: 一部の住所がマッピングされない
**解決策**: 住所の表記を確認し、必要に応じてマッピングデータに追加してください

### 問題: 配信対象の買主が0名になる
**解決策**: 
1. 物件の配信エリアが正しく設定されているか確認
2. 買主の希望エリアデータを確認
3. `check-aa13149-distribution.ts`でデバッグ

## 次のステップ

更新完了後、以下を実行してください：
1. 別府市の全物件の配信エリアを確認
2. 買主マッチング数を確認
3. 必要に応じて追加の住所をマッピングに追加
