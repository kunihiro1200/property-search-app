import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateCC10StorageHistory() {
  try {
    console.log('🔍 Investigating CC10 storage_location history...\n');
    
    // 1. CC10の現在の状態を確認
    const { data: cc10, error: cc10Error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'CC10')
      .single();
    
    if (cc10Error) {
      console.error('❌ Error fetching CC10:', cc10Error);
      return;
    }
    
    console.log('📋 CC10 current state:');
    console.log('  Property Number:', cc10.property_number);
    console.log('  UUID:', cc10.id);
    console.log('  Created At:', cc10.created_at);
    console.log('  Updated At:', cc10.updated_at);
    console.log('  Storage Location:', cc10.storage_location);
    console.log('  ATBB Status:', cc10.atbb_status);
    console.log('');
    
    // 2. CC105の状態を確認（間違ったフォルダIDの持ち主）
    const { data: cc105, error: cc105Error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'CC105')
      .single();
    
    if (cc105Error) {
      console.log('⚠️ CC105 not found in database');
      console.log('  This means CC105 was never synced to the database');
      console.log('');
    } else {
      console.log('📋 CC105 current state:');
      console.log('  Property Number:', cc105.property_number);
      console.log('  UUID:', cc105.id);
      console.log('  Created At:', cc105.created_at);
      console.log('  Updated At:', cc105.updated_at);
      console.log('  Storage Location:', cc105.storage_location);
      console.log('  ATBB Status:', cc105.atbb_status);
      console.log('');
    }
    
    // 3. 同期ログを確認（storage_location_sync_logsテーブル）
    console.log('📜 Checking storage_location sync logs...');
    const { data: syncLogs, error: syncLogsError } = await supabase
      .from('storage_location_sync_logs')
      .select('*')
      .eq('property_number', 'CC10')
      .order('synced_at', { ascending: false })
      .limit(10);
    
    if (syncLogsError) {
      console.log('⚠️ storage_location_sync_logs table not found or error:', syncLogsError.message);
      console.log('');
    } else if (syncLogs && syncLogs.length > 0) {
      console.log(`  Found ${syncLogs.length} sync logs for CC10:`);
      for (const log of syncLogs) {
        console.log(`    - ${log.synced_at}: ${log.storage_location} (${log.sync_status})`);
      }
      console.log('');
    } else {
      console.log('  No sync logs found for CC10');
      console.log('');
    }
    
    // 4. 自動同期の設定を確認
    console.log('🔧 Checking auto-sync configuration...');
    const { data: autoSyncConfig, error: autoSyncError } = await supabase
      .from('property_listings')
      .select('property_number, storage_location, auto_sync_storage_location')
      .in('property_number', ['CC10', 'CC105']);
    
    if (autoSyncError) {
      console.log('⚠️ Error checking auto-sync config:', autoSyncError.message);
      console.log('');
    } else if (autoSyncConfig) {
      console.log('  Auto-sync configuration:');
      for (const config of autoSyncConfig) {
        console.log(`    ${config.property_number}:`);
        console.log(`      storage_location: ${config.storage_location}`);
        console.log(`      auto_sync_storage_location: ${config.auto_sync_storage_location}`);
      }
      console.log('');
    }
    
    // 5. Google Driveで両方のフォルダを確認
    console.log('📁 Google Drive folder information:');
    console.log('  CC10 (correct):');
    console.log('    Folder ID: 18xvHCFtZC-nnr0ALLru_8q-ZQtCydQBy');
    console.log('    Folder Name: CC10_小池原1期_よかタウン');
    console.log('    URL: https://drive.google.com/drive/folders/18xvHCFtZC-nnr0ALLru_8q-ZQtCydQBy');
    console.log('');
    console.log('  CC105 (incorrect - was set to CC10):');
    console.log('    Folder ID: 1ZOz7sF48fzNrrh3pIWXFIv_KfNE8GE7j');
    console.log('    Folder Name: CC105_青葉台9号地_タマホーム');
    console.log('    URL: https://drive.google.com/drive/folders/1ZOz7sF48fzNrrh3pIWXFIv_KfNE8GE7j');
    console.log('');
    
    // 6. 可能性のある原因を分析
    console.log('🔍 Possible causes:');
    console.log('');
    console.log('1. Manual data entry error:');
    console.log('   - Someone manually entered CC105 folder ID for CC10');
    console.log('   - Copy-paste mistake during data entry');
    console.log('');
    console.log('2. Auto-sync error:');
    console.log('   - Auto-sync script searched for "CC10" in Google Drive');
    console.log('   - Found "CC105" folder (contains "CC10" substring)');
    console.log('   - Incorrectly matched CC105 folder to CC10 property');
    console.log('');
    console.log('3. Spreadsheet sync error:');
    console.log('   - Spreadsheet had wrong folder ID for CC10');
    console.log('   - Sync script copied the wrong value from spreadsheet');
    console.log('');
    
    // 7. スプレッドシートのデータを確認（可能であれば）
    console.log('📊 Recommendation:');
    console.log('  Check the Google Spreadsheet (業務リスト) for CC10:');
    console.log('  - Look for the "格納先" column');
    console.log('  - Verify if the spreadsheet has the correct folder ID');
    console.log('  - If spreadsheet is wrong, fix it there first');
    console.log('');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

investigateCC10StorageHistory();
