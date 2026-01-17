import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 反響年と反響日付を組み合わせて正しい日付を作成
function parseInquiryDate(inquiryYear: any, inquiryDate: any): string | null {
  if (!inquiryDate || inquiryDate === '') return null;
  
  try {
    const dateStr = String(inquiryDate).trim();
    
    // YYYY/MM/DD形式の場合はそのまま使用
    if (dateStr.includes('/') || dateStr.includes('-')) {
      const separator = dateStr.includes('/') ? '/' : '-';
      const parts = dateStr.split(separator);
      
      if (parts.length === 3) {
        const yearStr = parts[0].replace(/\D/g, '');
        const monthStr = parts[1].replace(/\D/g, '');
        const dayStr = parts[2].replace(/\D/g, '');
        
        if (!yearStr || !monthStr || !dayStr) return null;
        
        const year = yearStr.length === 4 ? yearStr : `20${yearStr}`;
        const month = monthStr.padStart(2, '0');
        const day = dayStr.padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      }
      
      // MM/DD形式の場合は反響年を使用
      if (parts.length === 2) {
        const monthStr = parts[0].replace(/\D/g, '');
        const dayStr = parts[1].replace(/\D/g, '');
        
        if (!monthStr || !dayStr) return null;
        
        // 反響年を使用（なければ現在の年）
        let year = new Date().getFullYear();
        if (inquiryYear) {
          const yearNum = parseInt(String(inquiryYear).replace(/\D/g, ''));
          if (yearNum >= 2000 && yearNum <= 2100) {
            year = yearNum;
          }
        }
        
        const month = monthStr.padStart(2, '0');
        const day = dayStr.padStart(2, '0');
        
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

async function fixInquiryDates() {
  console.log('=== 反響日付修正スクリプト ===\n');

  // スプレッドシートからデータを取得
  const auth = new google.auth.GoogleAuth({
    keyFile: 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!A:Z',
  });

  const rows = response.data.values || [];
  const headers = rows[0];
  
  // 列インデックスを取得
  const sellerNumberColIdx = headers.findIndex((h: string) => h && h.includes('売主番号'));
  const inquiryYearColIdx = headers.findIndex((h: string) => h && h === '反響年');
  const inquiryDateColIdx = headers.findIndex((h: string) => h && h === '反響日付');

  console.log('列インデックス:');
  console.log('  売主番号:', sellerNumberColIdx);
  console.log('  反響年:', inquiryYearColIdx);
  console.log('  反響日付:', inquiryDateColIdx);
  console.log('');

  // 修正が必要なレコードを収集
  const updates: { sellerNumber: string; correctDate: string; sheetYear: string; sheetDate: string }[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberColIdx];
    const inquiryYear = row[inquiryYearColIdx];
    const inquiryDate = row[inquiryDateColIdx];
    
    if (!sellerNumber || !inquiryDate) continue;
    
    // MM/DD形式の場合のみ処理
    const dateStr = String(inquiryDate).trim();
    if (dateStr.includes('/') || dateStr.includes('-')) {
      const parts = dateStr.split(dateStr.includes('/') ? '/' : '-');
      if (parts.length === 2 && inquiryYear) {
        const correctDate = parseInquiryDate(inquiryYear, inquiryDate);
        if (correctDate) {
          updates.push({
            sellerNumber,
            correctDate,
            sheetYear: String(inquiryYear),
            sheetDate: dateStr
          });
        }
      }
    }
  }

  console.log(`修正対象: ${updates.length}件\n`);

  // 最初の10件を表示
  console.log('サンプル（最初の10件）:');
  for (let i = 0; i < Math.min(10, updates.length); i++) {
    const u = updates[i];
    console.log(`  ${u.sellerNumber}: ${u.sheetYear}年 ${u.sheetDate} → ${u.correctDate}`);
  }

  // AA5210を確認
  const aa5210 = updates.find(u => u.sellerNumber === 'AA5210');
  if (aa5210) {
    console.log(`\nAA5210: ${aa5210.sheetYear}年 ${aa5210.sheetDate} → ${aa5210.correctDate}`);
  }

  // 実際に更新
  console.log('\n更新を開始します...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const update of updates) {
    const { error } = await supabase
      .from('sellers')
      .update({ inquiry_date: update.correctDate })
      .eq('seller_number', update.sellerNumber);
    
    if (error) {
      errorCount++;
      if (errorCount <= 5) {
        console.error(`  エラー (${update.sellerNumber}):`, error.message);
      }
    } else {
      successCount++;
    }
  }

  console.log(`\n完了: 成功=${successCount}, エラー=${errorCount}`);

  // AA5210を再確認
  const { data: seller } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date')
    .eq('seller_number', 'AA5210')
    .single();
  
  console.log('\nAA5210の更新後の値:', seller?.inquiry_date);
}

fixInquiryDates().catch(console.error);
