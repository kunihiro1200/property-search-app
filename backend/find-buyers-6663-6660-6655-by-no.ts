/**
 * 買主番号（E列）6663, 6660, 6655 を探すスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function findBuyersByNo() {
  const targetBuyerNos = ['6663', '6660', '6655'];
  
  console.log('='.repeat(60));
  console.log('買主番号（E列）6663, 6660, 6655 を探す');
  console.log('='.repeat(60));
  
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
    
    // 全データを取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '買主リスト!A1:BZ10000',
    });
    const allRows = dataResponse.data.values || [];
    const headers = allRows[0] || [];
    const dataRows = allRows.slice(1);
    
    console.log(`\nヘッダー: ${headers.slice(0, 10).join(' | ')}`);
    console.log(`総データ行数: ${dataRows.length}`);
    
    // E列（インデックス4）が買主番号
    const buyerNoColIndex = 4; // E列
    
    console.log('\n【スプレッドシートで検索】');
    
    for (const targetNo of targetBuyerNos) {
      let found = false;
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const buyerNo = String(row[buyerNoColIndex] || '').trim();
        
        if (buyerNo === targetNo) {
          found = true;
          console.log(`\n✓ 買主番号 ${targetNo}: スプレッドシート行 ${i + 2} に存在`);
          console.log(`  A列 (削除): ${row[0] || '(空)'}`);
          console.log(`  B列 (作成日時): ${row[1] || '(空)'}`);
          console.log(`  C列 (初動担当): ${row[2] || '(空)'}`);
          console.log(`  D列 (買主ID): ${row[3] || '(空)'}`);
          console.log(`  E列 (買主番号): ${row[4] || '(空)'}`);
          console.log(`  F列 (受付日): ${row[5] || '(空)'}`);
          console.log(`  G列 (氏名): ${row[6] || '(空)'}`);
          console.log(`  H列 (建物名/価格): ${row[7] || '(空)'}`);
          break;
        }
      }
      
      if (!found) {
        console.log(`\n✗ 買主番号 ${targetNo}: スプレッドシートに存在しません`);
      }
    }
    
    // データベースでも検索
    console.log('\n' + '='.repeat(60));
    console.log('【データベースで検索（buyer_no列）】');
    
    for (const targetNo of targetBuyerNos) {
      // buyer_no列で検索
      const { data: byNo } = await supabase
        .from('buyers')
        .select('id, buyer_id, buyer_no, name, email, phone, property_number, created_at')
        .eq('buyer_no', targetNo);
      
      if (byNo && byNo.length > 0) {
        console.log(`\n✓ 買主番号 ${targetNo}: データベースに存在`);
        for (const b of byNo) {
          console.log(`  id: ${b.id}`);
          console.log(`  buyer_id: ${b.buyer_id}`);
          console.log(`  buyer_no: ${b.buyer_no}`);
          console.log(`  name: ${b.name || '(空)'}`);
          console.log(`  property_number: ${b.property_number || '(空)'}`);
        }
      } else {
        console.log(`\n✗ 買主番号 ${targetNo}: データベースに存在しません`);
      }
    }
    
    // 最新の買主番号を確認
    console.log('\n' + '='.repeat(60));
    console.log('【データベースの最新買主番号】');
    
    const { data: latestByNo } = await supabase
      .from('buyers')
      .select('buyer_no, name, created_at')
      .not('buyer_no', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (latestByNo) {
      console.log('\n最新10件（buyer_no列）:');
      for (const b of latestByNo) {
        console.log(`  buyer_no: ${b.buyer_no}, name: ${b.name || '(空)'}, created_at: ${b.created_at}`);
      }
    }
    
    // 数値として最大の買主番号を確認
    const { data: maxBuyerNo } = await supabase
      .from('buyers')
      .select('buyer_no')
      .not('buyer_no', 'is', null)
      .order('buyer_no', { ascending: false })
      .limit(20);
    
    if (maxBuyerNo) {
      // 数値のみをフィルタリング
      const numericNos = maxBuyerNo
        .map(b => b.buyer_no)
        .filter(no => /^\d+$/.test(no))
        .map(no => parseInt(no, 10))
        .sort((a, b) => b - a);
      
      console.log('\n数値の買主番号（大きい順）:');
      console.log(`  ${numericNos.slice(0, 10).join(', ')}`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

findBuyersByNo().catch(console.error);
