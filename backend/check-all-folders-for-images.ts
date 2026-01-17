import { createClient } from '@supabase/supabase-js';
import { GoogleDriveService } from './src/services/GoogleDriveService';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllFoldersForImages() {
  console.log('=== 全フォルダの画像チェック ===\n');

  // storage_urlが設定されている物件を取得
  const { data: workTasks, error } = await supabase
    .from('work_tasks')
    .select('property_number, storage_url')
    .not('storage_url', 'is', null)
    .limit(10);

  if (error || !workTasks || workTasks.length === 0) {
    console.log('storage_urlが設定されている物件が見つかりません');
    return;
  }

  console.log(`チェック対象: ${workTasks.length}件\n`);

  const driveService = new GoogleDriveService();
  let totalFolders = 0;
  let foldersWithImages = 0;
  let totalImages = 0;

  for (const wt of workTasks) {
    const folderIdMatch = wt.storage_url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (!folderIdMatch) continue;

    const folderId = folderIdMatch[1];
    totalFolders++;

    try {
      const images = await driveService.listImagesWithThumbnails(folderId);
      
      if (images.length > 0) {
        foldersWithImages++;
        totalImages += images.length;
        console.log(`✅ ${wt.property_number}: ${images.length}枚の画像`);
        // 最初の2枚を表示
        images.slice(0, 2).forEach(img => {
          console.log(`   - ${img.name} (${Math.round(img.size / 1024)}KB)`);
        });
      } else {
        console.log(`⚠️ ${wt.property_number}: 画像なし`);
      }
    } catch (error: any) {
      console.log(`❌ ${wt.property_number}: エラー - ${error.message}`);
    }
  }

  console.log('\n=== サマリー ===');
  console.log(`チェックしたフォルダ: ${totalFolders}件`);
  console.log(`画像があるフォルダ: ${foldersWithImages}件`);
  console.log(`総画像数: ${totalImages}枚`);
  console.log(`画像がないフォルダ: ${totalFolders - foldersWithImages}件`);
}

checkAllFoldersForImages().catch(console.error);
