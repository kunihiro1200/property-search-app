import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Google Sheets設定
const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const BUYER_SHEET_NAME = '買主';

async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

async function forceSyncBuyer6648WithSchemaReload() {
  console.log('=== 買主6648強制同期（スキーマリロード付き） ===\n');

  // ステップ1: スキーマリロードを実行
  console.log('ステップ1: スキーマリロードを実行...');
  try {
    // PostgreSQL直接接続でNOTIFYを実行
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    await pool.query("NOTIFY pgrst, 'reload schema';");
    console.log('✓ スキーマリロード成功（NOTIFY pgrst実行）');
    
    await pool.end();
  } catch (error) {
    console.error('✗ スキーマリロードエラー:', error);
  }

  // 2秒待機
  console.log('2秒待機...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ステップ2: スプレッドシートから買主6648を取得
  console.log('\nステップ2: スプレッドシートから買主6648を取得...');
  
  try {
    const sheets = await getGoogleSheetsClient();
    
    // ヘッダー行を取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${BUYER_SHEET_NAME}!1:1`,
    });

    const headers = headerResponse.data.values?.[0] || [];
    console.log('スプレッドシートヘッダー:', headers);

    // 全データを取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${BUYER_SHEET_NAME}!A:Z`,
    });

    const rows = dataResponse.data.values || [];
    
    // 買主番号のカラムインデックスを見つける
    const buyerNumberIndex = headers.findIndex(h => 
      h === '買主番号' || h.includes('買主番号')
    );

    if (buyerNumberIndex === -1) {
      console.error('✗ 買主番号カラムが見つかりません');
      return;
    }

    // 買主6648を検索
    const buyer6648Row = rows.find((row, index) => {
      if (index === 0) return false; // ヘッダー行をスキップ
      return row[buyerNumberIndex] === '6648';
    });

    if (!buyer6648Row) {
      console.error('✗ 買主6648がスプレッドシートに見つかりません');
      return;
    }

    console.log('✓ 買主6648を発見:', buyer6648Row);

    // データをマッピング
    const buyer6648Data: any = {};
    headers.forEach((header, index) => {
      const value = buyer6648Row[index];
      if (value !== undefined && value !== '') {
        buyer6648Data[header] = value;
      }
    });

    console.log('買主6648データ:', buyer6648Data);

    // ステップ3: データベースに同期
    console.log('\nステップ3: データベースに同期...');

    // 既存レコードを確認
    const { data: existingBuyer, error: selectError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6648')
      .maybeSingle();

    if (selectError) {
      console.error('✗ 検索エラー:', selectError);
      return;
    }

    // カラムマッピング（実際のマッピングに合わせて調整）
    const mappedData = {
      buyer_number: buyer6648Data['買主番号'],
      name: buyer6648Data['氏名・会社名'] || buyer6648Data['氏名'],
      email: buyer6648Data['メールアドレス'] || buyer6648Data['Email'],
      phone: buyer6648Data['電話番号'] || buyer6648Data['TEL'],
      // 他のフィールドも必要に応じて追加
    };

    console.log('マッピング後のデータ:', mappedData);

    if (existingBuyer) {
      // 更新
      console.log('既存レコードを更新...');
      const { data: updateData, error: updateError } = await supabase
        .from('buyers')
        .update({
          ...mappedData,
          updated_at: new Date().toISOString()
        })
        .eq('buyer_number', '6648')
        .select();

      if (updateError) {
        console.error('✗ 更新エラー:', updateError);
        console.error('エラー詳細:', JSON.stringify(updateError, null, 2));
      } else {
        console.log('✓ 更新成功:', updateData);
      }
    } else {
      // 新規作成
      console.log('新規レコードを作成...');
      const { data: insertData, error: insertError } = await supabase
        .from('buyers')
        .insert(mappedData)
        .select();

      if (insertError) {
        console.error('✗ 挿入エラー:', insertError);
        console.error('エラー詳細:', JSON.stringify(insertError, null, 2));
      } else {
        console.log('✓ 挿入成功:', insertData);
      }
    }

    // ステップ4: 最終確認
    console.log('\nステップ4: 最終確認...');
    const { data: finalCheck, error: finalError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6648')
      .single();

    if (finalError) {
      console.error('✗ 最終確認エラー:', finalError);
    } else {
      console.log('✓ 買主6648の最終状態:');
      console.log(JSON.stringify(finalCheck, null, 2));
    }

  } catch (error) {
    console.error('エラー:', error);
  }

  console.log('\n=== 同期完了 ===');
}

forceSyncBuyer6648WithSchemaReload().catch(console.error);
