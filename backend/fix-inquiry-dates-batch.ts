　 { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

function parseInquiryDate(inquiryYear: any, inquiryDate: any): string | null {
  if (!inquiryDate || inquiryDate === '') return null;
  
  try {
    const dateStr = String(inquiryDate).trim();
    
    if (dateStr.includes('/') || dateStr.includes('-')) {
      const separator = dateStr.includes('/') ? '/' : '-';
      const parts = dateStr.split(separator);
      
      if (parts.length === 3) {
        const yearStr = parts[0].replace(/\D/g, '');
        const monthStr = parts[1].replace(/\D/g, '');
        const dayStr = parts[2].replace(/\D/g, '');
        if (!yearStr || !monthStr || !dayStr) return null;
        
        // 年が4桁の場合はそのまま使用、2桁の場合は20xxに変換
        // ただし、反響年が指定されている場合はそちらを優先
        let year: string;
        if (inquiryYear) {
          const yearNum = parseInt(String(inquiryYear).replace(/\D/g, ''));
          if (yearNum >= 2000 && yearNum <= 2100) {
            year = String(yearNum);
          } else {
            year = yearStr.length === 4 ? yearStr : `20${yearStr}`;
          }
        } else {
          year = yearStr.length === 4 ? yearStr : `20${yearStr}`;
        }
        return `${year}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
      }
      
      if (parts.length === 2) {
        const monthStr = parts[0].replace(/\D/g, '');
        const dayStr = parts[1].replace(/\D/g, '');
        if (!monthStr || !dayStr) return null;
        
        // 反響年を使用（必須）
        if (!inquiryYear) return null;
        const yearNum = parseInt(String(inquiryYear).replace(/\D/g, ''));
        if (yearNum < 2000 || yearNum > 2100) return null;
        
        return `${yearNum}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function fixInquiryDatesBatch() {
  console.log('=== 反響日付一括修正 ===\n');

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
  
  const sellerNumberColIdx = headers.findIndex((h: string) => h && h.includes('売主番号'));
  const inquiryYearColIdx = headers.findIndex((h: string) => h && h === '反響年');
  const inquiryDateColIdx = headers.findIndex((h: string) => h && h === '反響日付');

  console.log('列インデックス:');
  console.log('  売主番号:', sellerNumberColIdx);
  console.log('  反響年:', inquiryYearColIdx);
  console.log('  反響日付:', inquiryDateColIdx);
  console.log('');

  const updates: { sellerNumber: string; correctDate: string; sheetYear: string; sheetDate: string }[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberColIdx];
    const inquiryYear = row[inquiryYearColIdx];
    const inquiryDate = row[inquiryDateColIdx];
    
    if (!sellerNumber || !inquiryDate) continue;
    
    // すべての日付形式を処理（MM/DD形式とYYYY/MM/DD形式の両方）
    const correctDate = parseInquiryDate(inquiryYear, inquiryDate);
    if (correctDate) {
      updates.push({ 
        sellerNumber, 
        correctDate,
        sheetYear: String(inquiryYear || ''),
        sheetDate: String(inquiryDate)
      });
    }
  }

  console.log(`修正対象: ${updates.length}件`);

  // サンプル表示
  console.log('\nサンプル（最初の10件）:');
  for (let i = 0; i < Math.min(10, updates.length); i++) {
    const u = updates[i];
    console.log(`  ${u.sellerNumber}: 反響年=${u.sheetYear}, 反響日付=${u.sheetDate} → ${u.correctDate}`);
  }

  // バッチ更新（100件ずつ）
  const batchSize = 100;
  let successCount = 0;
  
  console.log('\n更新を開始します...');
  
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    // 各バッチを並列で更新（inquiry_yearも同時に更新）
    const promises = batch.map(u => 
      supabase
        .from('sellers')
        .update({ 
          inquiry_date: u.correctDate,
          inquiry_year: u.sheetYear ? parseInt(u.sheetYear) : null
        })
        .eq('seller_number', u.sellerNumber)
    );
    
    await Promise.all(promises);
    successCount += batch.length;
    
    if ((i + batchSize) % 500 === 0 || i + batchSize >= updates.length) {
      console.log(`進捗: ${Math.min(i + batchSize, updates.length)}/${updates.length}`);
    }
  }

  console.log(`\n完了: ${successCount}件更新`);

  // 確認
  console.log('\n【更新後の確認】');
  
  // AA5210を確認
  const { data: seller5210 } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date, inquiry_year')
    .eq('seller_number', 'AA5210')
    .single();
  console.log('AA5210:', seller5210?.inquiry_date, '(反響年:', seller5210?.inquiry_year, ')');

  // 2026年のデータを確認
  const { data: sellers2026 } = await supabase
    .from('sellers')
    .select('seller_number, inquiry_date')
    .gte('inquiry_date', '2026-01-01')
    .limit(5);
  
  if (sellers2026 && sellers2026.length > 0) {
    console.log(`\n2026年のデータがまだ ${sellers2026.length}件以上あります:`);
    sellers2026.forEach((s: any) => console.log(`  ${s.seller_number}: ${s.inquiry_date}`));
  } else {
    console.log('\n2026年のデータはなくなりました ✓');
  }
}

fixInquiryDatesBatch().catch(console.error);
