import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAllStorageLocations() {
  try {
    console.log('🔍 Verifying all storage_location values...\n');
    
    // Google Drive APIの認証
    const serviceAccountPath = path.join(__dirname, 'google-service-account.json');
    const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // 公開中の物件のみを取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_location, atbb_status')
      .or(
        'atbb_status.ilike.%公開中%,' +
        'atbb_status.ilike.%公開前%,' +
        'atbb_status.ilike.%非公開（配信メールのみ）%'
      )
      .not('storage_location', 'is', null)
      .order('property_number');
    
    if (error) {
      console.error('❌ Error fetching properties:', error);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('⚠️ No properties found');
      return;
    }
    
    console.log(`📋 Found ${properties.length} public properties with storage_location\n`);
    
    const mismatches: Array<{
      propertyNumber: string;
      expectedFolderName: string;
      actualFolderName: string;
      storageLocation: string;
    }> = [];
    
    let checkedCount = 0;
    let errorCount = 0;
    
    for (const property of properties) {
      checkedCount++;
      
      // フォルダIDを抽出
      const folderIdMatch = property.storage_location.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (!folderIdMatch) {
        console.log(`⚠️ ${property.property_number}: Invalid storage_location format`);
        errorCount++;
        continue;
      }
      
      const folderId = folderIdMatch[1];
      
      try {
        // フォルダのメタデータを取得
        const folderMetadata = await drive.files.get({
          fileId: folderId,
          fields: 'id, name',
        });
        
        const folderName = folderMetadata.data.name || '';
        
        // フォルダ名が物件番号で始まるか確認
        const normalizedFolderName = folderName.toUpperCase();
        const normalizedPropertyNumber = property.property_number.toUpperCase();
        
        if (!normalizedFolderName.startsWith(normalizedPropertyNumber + '_') &&
            !normalizedFolderName.startsWith(normalizedPropertyNumber + '.')) {
          console.log(`❌ ${property.property_number}: Mismatch!`);
          console.log(`   Expected: ${property.property_number}_xxx`);
          console.log(`   Actual: ${folderName}`);
          console.log(`   Storage Location: ${property.storage_location}`);
          console.log('');
          
          mismatches.push({
            propertyNumber: property.property_number,
            expectedFolderName: `${property.property_number}_xxx`,
            actualFolderName: folderName,
            storageLocation: property.storage_location,
          });
        } else {
          console.log(`✅ ${property.property_number}: ${folderName}`);
        }
      } catch (error: any) {
        console.log(`⚠️ ${property.property_number}: Error fetching folder metadata - ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Summary:');
    console.log(`  Total properties checked: ${checkedCount}`);
    console.log(`  Correct: ${checkedCount - mismatches.length - errorCount}`);
    console.log(`  Mismatches: ${mismatches.length}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    if (mismatches.length > 0) {
      console.log('');
      console.log('❌ Properties with incorrect storage_location:');
      console.log('');
      for (const mismatch of mismatches) {
        console.log(`  ${mismatch.propertyNumber}:`);
        console.log(`    Expected: ${mismatch.expectedFolderName}`);
        console.log(`    Actual: ${mismatch.actualFolderName}`);
        console.log(`    URL: ${mismatch.storageLocation}`);
        console.log('');
      }
      
      console.log('📝 Recommendation:');
      console.log('  1. Fix the storage_location for these properties manually');
      console.log('  2. Implement the improved searchFolderByName logic (see fix-search-folder-by-name-logic.md)');
      console.log('  3. Re-run auto-sync for all properties');
    } else {
      console.log('');
      console.log('✅ All storage_location values are correct!');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

verifyAllStorageLocations();
