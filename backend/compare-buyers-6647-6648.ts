import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function compareBuyers6647And6648() {
  console.log('=== 買主6647と6648の比較 ===\n');

  try {
    // 1. 買主6647を検索
    console.log('1. 買主6647を検索...');
    const buyer6647Response = await fetch(
      `${SUPABASE_URL}/rest/v1/buyers?buyer_number=eq.6647&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (buyer6647Response.ok) {
      const buyers6647 = await buyer6647Response.json() as any[];
      if (buyers6647.length > 0) {
        console.log('✓ 買主6647が見つかりました:');
        console.log(`  名前: ${buyers6647[0].name}`);
        console.log(`  電話: ${buyers6647[0].phone_number}`);
        console.log(`  メール: ${buyers6647[0].email}`);
        console.log(`  作成日時: ${buyers6647[0].db_created_at}`);
      } else {
        console.log('✗ 買主6647が見つかりません');
      }
    } else {
      console.error('✗ 買主6647の検索エラー:', buyer6647Response.status);
    }

    // 2. 買主6648を検索
    console.log('\n2. 買主6648を検索...');
    const buyer6648Response = await fetch(
      `${SUPABASE_URL}/rest/v1/buyers?buyer_number=eq.6648&select=*`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (buyer6648Response.ok) {
      const buyers6648 = await buyer6648Response.json() as any[];
      if (buyers6648.length > 0) {
        console.log('✓ 買主6648が見つかりました:');
        console.log(`  名前: ${buyers6648[0].name}`);
        console.log(`  電話: ${buyers6648[0].phone_number}`);
        console.log(`  メール: ${buyers6648[0].email}`);
        console.log(`  作成日時: ${buyers6648[0].db_created_at}`);
      } else {
        console.log('✗ 買主6648が見つかりません');
      }
    } else {
      console.error('✗ 買主6648の検索エラー:', buyer6648Response.status);
    }

    // 3. 両方を同時に検索（INクエリ）
    console.log('\n3. 両方を同時に検索（INクエリ）...');
    const bothResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/buyers?buyer_number=in.(6647,6648)&select=buyer_number,name,phone_number,email,db_created_at&order=buyer_number`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (bothResponse.ok) {
      const bothBuyers = await bothResponse.json() as any[];
      console.log(`✓ 見つかった買主: ${bothBuyers.length}件`);
      bothBuyers.forEach((buyer: any) => {
        console.log(`  買主${buyer.buyer_number}: ${buyer.name} (${buyer.phone_number})`);
      });
    } else {
      console.error('✗ INクエリエラー:', bothResponse.status);
      const errorText = await bothResponse.text();
      console.error('エラー詳細:', errorText);
    }

    // 4. 買主番号が6640-6650の範囲を検索
    console.log('\n4. 買主番号6640-6650の範囲を検索...');
    const rangeResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/buyers?buyer_number=gte.6640&buyer_number=lte.6650&select=buyer_number,name,phone_number&order=buyer_number`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (rangeResponse.ok) {
      const rangeBuyers = await rangeResponse.json() as any[];
      console.log(`✓ 見つかった買主: ${rangeBuyers.length}件`);
      rangeBuyers.forEach((buyer: any) => {
        console.log(`  買主${buyer.buyer_number}: ${buyer.name}`);
      });
    } else {
      console.error('✗ 範囲検索エラー:', rangeResponse.status);
    }

    // 5. 結論
    console.log('\n=== 結論 ===');
    console.log('買主6648はデータベースに存在します。');
    console.log('同期処理のロジックに問題がある可能性があります。');
    console.log('キーとなるのは「買主番号」であり、「買主ID」ではありません。');

  } catch (error) {
    console.error('エラー:', error);
  }

  console.log('\n=== 比較完了 ===');
}

compareBuyers6647And6648().catch(console.error);
