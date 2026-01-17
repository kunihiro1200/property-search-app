import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function checkBuyer6648RestAPI() {
  console.log('=== 買主6648確認（REST API） ===\n');

  try {
    // 1. スキーマリロードを試行（RPCエンドポイント経由）
    console.log('1. スキーマリロードを試行...');
    try {
      const reloadResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/notify_schema_reload`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (reloadResponse.ok) {
        console.log('✓ スキーマリロード成功');
      } else {
        console.log('○ スキーマリロードRPCが存在しないか、エラー:', reloadResponse.status);
      }
    } catch (error) {
      console.log('○ スキーマリロードスキップ（RPCが存在しない可能性）');
    }

    // 2秒待機
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. 買主6648を検索
    console.log('\n2. 買主6648を検索...');
    const searchResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/buyers?buyer_number=eq.6648&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!searchResponse.ok) {
      console.error('✗ 検索エラー:', searchResponse.status, searchResponse.statusText);
      const errorText = await searchResponse.text();
      console.error('エラー詳細:', errorText);
      return;
    }

    const buyers = await searchResponse.json() as any[];
    
    if (buyers.length > 0) {
      console.log('✓ 買主6648が見つかりました:');
      console.log(JSON.stringify(buyers[0], null, 2));
    } else {
      console.log('○ 買主6648は見つかりませんでした');
    }

    // 3. 買主6647と6648を比較
    console.log('\n3. 買主6647と6648を比較...');
    const comparisonResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/buyers?buyer_number=in.(6647,6648)&select=buyer_number,name,email,phone,created_at,updated_at&order=buyer_number`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (comparisonResponse.ok) {
      const comparisonBuyers = await comparisonResponse.json() as any[];
      console.log(`見つかった買主: ${comparisonBuyers.length}件`);
      comparisonBuyers.forEach((buyer: any) => {
        console.log(`  買主${buyer.buyer_number}:`, {
          name: buyer.name,
          email: buyer.email,
          phone: buyer.phone
        });
      });
    }

    // 4. 買主テーブルの総数を確認
    console.log('\n4. 買主テーブルの総数を確認...');
    const countResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/buyers?select=count`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    );

    if (countResponse.ok) {
      const countHeader = countResponse.headers.get('content-range');
      console.log('買主総数:', countHeader);
    }

  } catch (error) {
    console.error('エラー:', error);
  }

  console.log('\n=== 確認完了 ===');
}

checkBuyer6648RestAPI().catch(console.error);
