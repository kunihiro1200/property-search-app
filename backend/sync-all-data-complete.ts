import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { encrypt } from './src/utils/encryption';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SyncProgress {
  total: number;
  processed: number;
  updated: number;
  created: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{
    sellerNumber: string;
    error: string;
  }>;
}

// Parse date from various formats
function parseDate(dateStr: any): string | null {
  if (!dateStr || dateStr === '') return null;
  
  try {
    const str = String(dateStr).trim();
    
    // Skip invalid formats - check for non-numeric characters (except / and -)
    if (str.includes('M') || str.length > 20 || /[a-zA-Zｗｋ]/.test(str)) {
      return null;
    }
    
    // Remove any trailing non-numeric characters
    const cleaned = str.replace(/[^0-9\/\-]+$/, '');
    
    // Handle YYYY/MM/DD or YYYY-MM-DD format
    if (cleaned.includes('/') || cleaned.includes('-')) {
      const separator = cleaned.includes('/') ? '/' : '-';
      const parts = cleaned.split(separator);
      
      if (parts.length === 3) {
        // Clean each part to remove non-numeric characters
        const yearStr = parts[0].replace(/\D/g, '');
        const monthStr = parts[1].replace(/\D/g, '');
        const dayStr = parts[2].replace(/\D/g, '');
        
        if (!yearStr || !monthStr || !dayStr) {
          return null;
        }
        
        const year = yearStr.length === 4 ? yearStr : `20${yearStr}`;
        const month = monthStr.padStart(2, '0');
        const day = dayStr.padStart(2, '0');
        
        // Validate date components
        const y = parseInt(year);
        const m = parseInt(month);
        const d = parseInt(day);
        
        if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
          return null;
        }
        
        return `${year}-${month}-${day}`;
      }
      
      // Handle MM/DD format (assume current year)
      if (parts.length === 2) {
        const monthStr = parts[0].replace(/\D/g, '');
        const dayStr = parts[1].replace(/\D/g, '');
        
        if (!monthStr || !dayStr) {
          return null;
        }
        
        const year = new Date().getFullYear();
        const month = monthStr.padStart(2, '0');
        const day = dayStr.padStart(2, '0');
        
        const m = parseInt(month);
        const d = parseInt(day);
        
        if (m < 1 || m > 12 || d < 1 || d > 31) {
          return null;
        }
        
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

// Parse number
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

// Map property type from spreadsheet to database enum
function mapPropertyType(value: any): string | null {
  if (!value) return null;
  
  const str = String(value).trim();
  
  // Map Japanese abbreviations and full names to enum values
  const mapping: { [key: string]: string } = {
    '戸': 'detached_house',
    '戸建': 'detached_house',
    '戸建て': 'detached_house',
    'マ': 'apartment',
    'マンション': 'apartment',
    '土': 'land',
    '土地': 'land',
    '商': 'commercial',
    '商業': 'commercial',
    '商業用': 'commercial',
  };
  
  return mapping[str] || null;
}

async function syncAllData() {
  console.log('🔄 Starting complete data sync from spreadsheet to Supabase...\n');
  
  const startTime = Date.now();
  const progress: SyncProgress = {
    total: 0,
    processed: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  try {
    // Initialize Google Sheets client
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    // Get all rows from spreadsheet
    console.log('📊 Fetching data from spreadsheet...');
    const rows = await sheetsClient.readAll();
    console.log(`✅ Found ${rows.length} rows in spreadsheet\n`);

    progress.total = rows.length;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const sellerNumber = row['売主番号'];
        if (!sellerNumber) {
          progress.skipped++;
          progress.processed++;
          continue;
        }

        // Map all fields from spreadsheet
        const sellerData: any = {
          seller_number: sellerNumber,
          // Basic info (encrypted) - name is required, use placeholder if empty
          name: row['名前(漢字のみ）'] ? encrypt(String(row['名前(漢字のみ）'])) : encrypt('未入力'),
          address: row['依頼者住所(物件所在と異なる場合）'] ? encrypt(String(row['依頼者住所(物件所在と異なる場合）'])) : null,
          phone_number: row['電話番号\nハイフン不要'] ? encrypt(String(row['電話番号\nハイフン不要'])) : null,
          email: row['メールアドレス'] ? encrypt(String(row['メールアドレス'])) : null,
          
          // Inquiry info
          inquiry_site: row['サイト'] || null,
          inquiry_date: parseDateWithYear(row['反響日付'], row['反響年']),
          inquiry_source: row['査定方法'] || null,
          inquiry_medium: row['連絡方法'] || null,
          inquiry_content: row['査定理由（査定サイトから転記）'] || null,
          
          // Status
          status: row['状況（当社）'] || null,
          confidence: row['確度'] || null,
          next_call_date: parseDate(row['次電日']),
          contract_year_month: parseDate(row['契約年月 他決は分かった時点']),
          
          // Competitor info
          competitor_name: row['競合名'] || null,
          competitor_name_and_reason: row['競合名、理由\n（他決、専任）'] || null,
          exclusive_other_decision_factor: row['専任・他決要因'] || null,
          
          // Valuation
          valuation_amount_1: parseNumber(row['査定額1（自動計算）v']),
          valuation_amount_2: parseNumber(row['査定額2（自動計算）v']),
          valuation_amount_3: parseNumber(row['査定額3（自動計算）v']),
          valuation_assignee: row['査定担当'] || null,
          
          // Visit info
          visit_date: parseDate(row['訪問日 Y/M/D']),
          visit_time: row['訪問時間'] || null,
          visit_assignee: row['営担'] || null,
          visit_valuation_acquirer: row['訪問査定取得者'] || null,
          visit_notes: row['訪問メモ'] || null,
          
          // Other
          phone_assignee: row['電話担当（任意）'] || null,
          comments: row['コメント'] || null,
          
          // Seller preferences
          sale_reason: row['査定理由（査定サイトから転記）'] || null,
          desired_timing: row['いつまでに売りたいか？'] || null,
          desired_price: row['希望の価格はあるか？'] || null,
          notes: row['訪問時注意点'] || null,
          
          updated_at: new Date().toISOString(),
        };

        // Property data - only create/update if we have required fields
        const address = row['物件所在地'] || row['物件住所'] || null;
        const propertyType = mapPropertyType(row['種別'] || row['物件種別']);
        
        // Extract prefecture and city from address if available
        let prefecture = '未設定';
        let city = '未設定';
        
        if (address) {
          const addressStr = String(address);
          // Simple extraction - first 3-4 chars for prefecture
          const prefectures = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
            '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
            '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
            '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
            '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
            '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
            '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];
          
          for (const pref of prefectures) {
            if (addressStr.startsWith(pref)) {
              prefecture = pref;
              const remaining = addressStr.substring(pref.length);
              // Extract city (up to 市/区/町/村)
              const cityMatch = remaining.match(/^([^0-9]+?[市区町村])/);
              if (cityMatch) {
                city = cityMatch[1];
              }
              break;
            }
          }
        }

        const propertyData: any = {
          address: address || '未設定',
          prefecture,
          city,
          property_type: propertyType || 'land', // Default to land if not specified
          land_area: parseNumber(row['土（㎡）'] || row['土地面積']),
          building_area: parseNumber(row['建（㎡）'] || row['建物面積']),
          build_year: parseNumber(row['築年']),
          structure: row['構造'] || null,
          seller_situation: row['状況（売主）'] || null,
          floor_plan: row['間取り'] || null,
        };

        // Check if seller exists
        const { data: existing } = await supabase
          .from('sellers')
          .select('id')
          .eq('seller_number', sellerNumber)
          .maybeSingle();

        if (existing) {
          // Update existing seller
          const { error: sellerError } = await supabase
            .from('sellers')
            .update(sellerData)
            .eq('id', existing.id);

          if (sellerError) {
            throw new Error(`Seller update error: ${sellerError.message}`);
          }

          // Update or create property (always try to create/update if we have address)
          const { data: existingProperty } = await supabase
            .from('properties')
            .select('id')
            .eq('seller_id', existing.id)
            .maybeSingle();

          if (existingProperty) {
            const { error: propError } = await supabase
              .from('properties')
              .update(propertyData)
              .eq('id', existingProperty.id);

            if (propError) {
              console.warn(`Property update warning for ${sellerNumber}:`, propError.message);
            }
          } else {
            const { error: propError } = await supabase
              .from('properties')
              .insert({
                seller_id: existing.id,
                ...propertyData,
              });

            if (propError) {
              console.warn(`Property create warning for ${sellerNumber}:`, propError.message);
            }
          }

          progress.updated++;
        } else {
          // Create new seller
          const { data: newSeller, error: sellerError } = await supabase
            .from('sellers')
            .insert({
              ...sellerData,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (sellerError) {
            throw new Error(`Seller create error: ${sellerError.message}`);
          }

          // Create property
          if (newSeller) {
            const { error: propError } = await supabase
              .from('properties')
              .insert({
                seller_id: newSeller.id,
                ...propertyData,
              });

            if (propError) {
              console.warn(`Property create warning for ${sellerNumber}:`, propError.message);
            }
          }

          progress.created++;
        }

        progress.processed++;

        // Progress reporting every 100 records
        if (progress.processed % 100 === 0) {
          console.log(`  Processed ${progress.processed}/${progress.total} sellers...`);
        }

      } catch (error: any) {
        progress.errors++;
        progress.processed++;
        
        const sellerNumber = String(row['売主番号'] || 'unknown');
        progress.errorDetails.push({
          sellerNumber,
          error: error.message,
        });

        console.error(`❌ Error processing ${sellerNumber}:`, error.message);
      }
    }

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Sync completed!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`  - Total rows: ${progress.total}`);
    console.log(`  - Processed: ${progress.processed}`);
    console.log(`  - Updated: ${progress.updated}`);
    console.log(`  - Created: ${progress.created}`);
    console.log(`  - Skipped: ${progress.skipped}`);
    console.log(`  - Errors: ${progress.errors}`);
    console.log(`  - Duration: ${duration}s`);
    console.log('='.repeat(60));

    if (progress.errorDetails.length > 0) {
      console.log('\n❌ Error Details (first 20):');
      progress.errorDetails.slice(0, 20).forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.sellerNumber}: ${err.error}`);
      });
      
      if (progress.errorDetails.length > 20) {
        console.log(`  ... and ${progress.errorDetails.length - 20} more errors`);
      }
    }

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

syncAllData().catch(console.error);
