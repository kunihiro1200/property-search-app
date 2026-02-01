/**
 * 軽量同期スクリプト（改良版）
 * 
 * 機能:
 * 1. 新規売主の追加（最後の20行から検出）
 * 2. 「追客中」売主の更新（全行から「追客中」をフィルタリングしてDBと比較）
 * 
 * 実行間隔: 10分ごと（Windowsタスクスケジューラ）
 * 
 * Google Sheets APIクォータ対策:
 * - スプレッドシートデータは30分間キャッシュ
 * - 「追客中」の売主のみを同期対象にすることでDB更新を最小化
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// キャッシュファイルのパス
const CACHE_FILE = path.join(__dirname, '..', 'logs', 'spreadsheet-cache.json');
const CACHE_TTL = 30 * 60 * 1000; // 30分

// ログファイルのパス
const LOG_FILE = path.join(__dirname, '..', 'logs', 'light-sync.log');

// ログ出力関数
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // ログファイルに追記
  try {
    const logsDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (e) {
    // ログ書き込みエラーは無視
  }
}

// 暗号化関数
function encrypt(text: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    return text; // 暗号化キーがない場合はそのまま返す
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// キャッシュを読み込み
function loadCache(): { data: any[], expiry: number } | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      if (cache.expiry > Date.now()) {
        return cache;
      }
    }
  } catch (e) {
    // キャッシュ読み込みエラーは無視
  }
  return null;
}

// キャッシュを保存
function saveCache(data: any[], headers: string[]) {
  try {
    const logsDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const cache = {
      data,
      headers,
      expiry: Date.now() + CACHE_TTL,
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch (e) {
    // キャッシュ保存エラーは無視
  }
}

// 日付をパース
function parseDate(value: any): string | null {
  if (!value) return null;
  
  // Excelシリアル値（数値）の場合
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  const str = String(value).trim();
  if (!str) return null;
  
  // YYYY/MM/DD または YYYY-MM-DD
  const match = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

// 数値をパース
function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const str = String(value).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// 不通フラグを変換
function convertIsUnreachable(value: any): boolean {
  if (!value) return false;
  const str = String(value).trim().toLowerCase();
  return str === '不通' || str === '○' || str === 'true' || str === '1';
}

// 種別を変換
function convertPropertyType(value: any): string | null {
  if (!value) return null;
  const typeStr = String(value).trim();
  const typeMapping: Record<string, string> = {
    '土': '土地', '戸': '戸建', 'マ': 'マンション', '事': '事業用',
  };
  return typeMapping[typeStr] || typeStr;
}

async function lightSync() {
  const startTime = Date.now();
  log('🔄 軽量同期を開始...');

  try {
    // Google Sheets認証
    const credentialsPath = path.join(__dirname, '..', 'google-service-account.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // キャッシュを確認
    let allRows: any[] = [];
    let headers: string[] = [];
    const cache = loadCache();
    
    if (cache) {
      log(`📦 キャッシュを使用 (有効期限: ${Math.round((cache.expiry - Date.now()) / 1000)}秒)`);
      allRows = cache.data;
      headers = (cache as any).headers || [];
    } else {
      log('🔄 スプレッドシートから全データを取得...');
      
      // ヘッダーを取得
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '売主リスト!B1:CZ1',
      });
      headers = headerResponse.data.values?.[0] || [];
      
      // 全データを取得
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: '売主リスト!B2:CZ',
      });
      
      const rows = response.data.values || [];
      log(`📥 取得した行数: ${rows.length}`);
      
      // 行データをオブジェクトに変換
      allRows = rows.map(row => {
        const obj: any = {};
        headers.forEach((header, idx) => {
          obj[header] = row[idx] || null;
        });
        return obj;
      });
      
      // キャッシュを保存
      saveCache(allRows, headers);
      log(`✅ キャッシュを保存 (${allRows.length}行, 有効期限: 30分)`);
    }

    // ========================================
    // Phase 1: 新規売主の追加（最後の20行）
    // ========================================
    log('📥 Phase 1: 新規売主の追加...');
    
    const last20Rows = allRows.slice(-20);
    const newSellerNumbers = last20Rows
      .map(row => row['売主番号'])
      .filter(num => num && String(num).trim() !== '');
    
    if (newSellerNumbers.length > 0) {
      // DBに存在するか確認
      const { data: existingSellers, error: queryError } = await supabase
        .from('sellers')
        .select('seller_number')
        .in('seller_number', newSellerNumbers);

      if (queryError) {
        log(`❌ DB検索エラー: ${queryError.message}`);
      } else {
        const existingNumbers = new Set(existingSellers?.map(s => s.seller_number) || []);
        const newSellers = newSellerNumbers.filter(num => !existingNumbers.has(num));

        if (newSellers.length > 0) {
          log(`🆕 新規売主を検出: ${newSellers.length}件`);
          
          for (const sellerNumber of newSellers) {
            const row = last20Rows.find(r => r['売主番号'] === sellerNumber);
            if (!row) continue;

            const sellerData = {
              seller_number: sellerNumber,
              name: row['名前(漢字のみ）'] ? encrypt(String(row['名前(漢字のみ）'])) : null,
              property_address: row['物件所在地'] || null,
              property_type: convertPropertyType(row['種別']),
              status: row['状況（当社）'] || '追客中',
              inquiry_site: row['サイト'] || null,
              inquiry_date: parseDate(row['反響日付']),
            };

            const { error: insertError } = await supabase
              .from('sellers')
              .insert(sellerData);

            if (insertError) {
              log(`❌ ${sellerNumber} 追加エラー: ${insertError.message}`);
            } else {
              log(`✅ ${sellerNumber} を追加しました`);
            }
          }
        } else {
          log('✅ 新規売主なし');
        }
      }
    }

    // ========================================
    // Phase 2: 「追客中」売主の更新
    // ========================================
    log('🔄 Phase 2: 「追客中」売主の更新...');
    
    // 「状況（当社）」に「追客中」を含む行をフィルタリング
    const tsuikyakuRows = allRows.filter(row => {
      const status = row['状況（当社）'];
      return status && String(status).includes('追客中');
    });
    
    log(`📊 「追客中」の売主: ${tsuikyakuRows.length}件`);
    
    if (tsuikyakuRows.length === 0) {
      log('✅ 「追客中」の売主なし');
    } else {
      // 「追客中」売主の売主番号リスト
      const tsuikyakuSellerNumbers = tsuikyakuRows
        .map(row => row['売主番号'])
        .filter(num => num && String(num).trim() !== '');
      
      // DBから「追客中」売主のデータを取得
      const { data: dbSellers, error: dbError } = await supabase
        .from('sellers')
        .select('seller_number, status, valuation_amount_1, valuation_amount_2, valuation_amount_3, visit_assignee, next_call_date, phone_contact_person, preferred_contact_time, contact_method, pinrich_status, is_unreachable')
        .in('seller_number', tsuikyakuSellerNumbers);
      
      if (dbError) {
        log(`❌ DB検索エラー: ${dbError.message}`);
      } else {
        const dbSellerMap = new Map<string, any>();
        for (const seller of dbSellers || []) {
          dbSellerMap.set(seller.seller_number, seller);
        }
        
        // 更新が必要な売主を検出
        const sellersToUpdate: any[] = [];
        
        for (const row of tsuikyakuRows) {
          const sellerNumber = row['売主番号'];
          if (!sellerNumber) continue;
          
          const dbSeller = dbSellerMap.get(sellerNumber);
          if (!dbSeller) {
            // DBに存在しない = 新規（Phase 1で処理済み）
            continue;
          }
          
          // 重要なフィールドを比較
          let needsUpdate = false;
          
          // 査定額を比較（手動入力優先）
          const sheetVal1 = parseNumeric(row['査定額1'] || row['査定額1（自動計算）v']);
          const sheetVal2 = parseNumeric(row['査定額2'] || row['査定額2（自動計算）v']);
          const sheetVal3 = parseNumeric(row['査定額3'] || row['査定額3（自動計算）v']);
          
          const dbVal1 = dbSeller.valuation_amount_1 ? dbSeller.valuation_amount_1 / 10000 : null;
          const dbVal2 = dbSeller.valuation_amount_2 ? dbSeller.valuation_amount_2 / 10000 : null;
          const dbVal3 = dbSeller.valuation_amount_3 ? dbSeller.valuation_amount_3 / 10000 : null;
          
          if (sheetVal1 !== dbVal1 || sheetVal2 !== dbVal2 || sheetVal3 !== dbVal3) {
            needsUpdate = true;
          }
          
          // 営担を比較
          const sheetVisitAssignee = row['営担'] || null;
          if (sheetVisitAssignee !== dbSeller.visit_assignee) {
            needsUpdate = true;
          }
          
          // 次電日を比較
          const sheetNextCallDate = parseDate(row['次電日']);
          const dbNextCallDate = dbSeller.next_call_date ? String(dbSeller.next_call_date).substring(0, 10) : null;
          if (sheetNextCallDate !== dbNextCallDate) {
            needsUpdate = true;
          }
          
          // コミュニケーションフィールドを比較
          const sheetPhoneContactPerson = row['電話担当（任意）'] || null;
          const sheetPreferredContactTime = row['連絡取りやすい日、時間帯'] || null;
          const sheetContactMethod = row['連絡方法'] || null;
          
          if (sheetPhoneContactPerson !== dbSeller.phone_contact_person ||
              sheetPreferredContactTime !== dbSeller.preferred_contact_time ||
              sheetContactMethod !== dbSeller.contact_method) {
            needsUpdate = true;
          }
          
          // Pinrichを比較
          const sheetPinrich = row['Pinrich'] || null;
          if (sheetPinrich !== dbSeller.pinrich_status) {
            needsUpdate = true;
          }
          
          // 不通を比較
          const sheetIsUnreachable = convertIsUnreachable(row['不通']);
          if (sheetIsUnreachable !== dbSeller.is_unreachable) {
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            sellersToUpdate.push({ sellerNumber, row });
          }
        }
        
        log(`🔄 更新が必要な売主: ${sellersToUpdate.length}件`);
        
        // 更新を実行
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const { sellerNumber, row } of sellersToUpdate) {
          try {
            // 査定額を取得（手動入力優先）
            const valuation1 = parseNumeric(row['査定額1'] || row['査定額1（自動計算）v']);
            const valuation2 = parseNumeric(row['査定額2'] || row['査定額2（自動計算）v']);
            const valuation3 = parseNumeric(row['査定額3'] || row['査定額3（自動計算）v']);
            
            const updateData: any = {
              status: row['状況（当社）'] || '追客中',
              next_call_date: parseDate(row['次電日']),
              visit_assignee: row['営担'] || null,
              phone_contact_person: row['電話担当（任意）'] || null,
              preferred_contact_time: row['連絡取りやすい日、時間帯'] || null,
              contact_method: row['連絡方法'] || null,
              pinrich_status: row['Pinrich'] || null,
              is_unreachable: convertIsUnreachable(row['不通']),
              updated_at: new Date().toISOString(),
            };
            
            // 査定額を追加（万円→円に変換）
            if (valuation1 !== null) updateData.valuation_amount_1 = valuation1 * 10000;
            if (valuation2 !== null) updateData.valuation_amount_2 = valuation2 * 10000;
            if (valuation3 !== null) updateData.valuation_amount_3 = valuation3 * 10000;
            
            const { error: updateError } = await supabase
              .from('sellers')
              .update(updateData)
              .eq('seller_number', sellerNumber);
            
            if (updateError) {
              log(`❌ ${sellerNumber} 更新エラー: ${updateError.message}`);
              errorCount++;
            } else {
              log(`✅ ${sellerNumber} を更新しました`);
              updatedCount++;
            }
          } catch (e: any) {
            log(`❌ ${sellerNumber} 更新エラー: ${e.message}`);
            errorCount++;
          }
        }
        
        log(`🎉 Phase 2完了: ${updatedCount}件更新, ${errorCount}件エラー`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`🎉 軽量同期完了 (${duration}秒)`);

  } catch (error: any) {
    log(`❌ 軽量同期エラー: ${error.message}`);
  }
}

// 実行
lightSync();
