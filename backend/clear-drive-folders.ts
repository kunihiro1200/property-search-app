/**
 * seller_drive_foldersテーブルをクリアして、
 * 新しい共有ドライブでフォルダを再作成できるようにする
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDriveFolders() {
  console.log('=== Clear Drive Folders ===\n');
  
  // 現在のデータを確認
  const { data: existing, error: fetchError } = await supabase
    .from('seller_drive_folders')
    .select('*');
  
  if (fetchError) {
    console.error('Error fetching data:', fetchError);
    return;
  }
  
  console.log(`Found ${existing?.length || 0} existing folder records`);
  
  if (existing && existing.length > 0) {
    console.log('\nExisting records:');
    existing.forEach(record => {
      console.log(`  - ${record.seller_number}: ${record.drive_folder_id}`);
    });
    
    // 全てのレコードを削除
    const { error: deleteError } = await supabase
      .from('seller_drive_folders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 全削除
    
    if (deleteError) {
      console.error('\nError deleting records:', deleteError);
      return;
    }
    
    console.log('\n✅ All folder records deleted');
  } else {
    console.log('\nNo records to delete');
  }
  
  console.log('\n=== Done ===');
}

clearDriveFolders().catch(console.error);
