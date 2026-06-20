import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCC10StorageLocation() {
  try {
    console.log('🔧 Fixing CC10 storage_location...\n');
    
    // 現在の状態を確認
    const { data: currentProperty, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', 'CC10')
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching CC10:', fetchError);
      return;
    }
    
    console.log('📋 Current state:');
    console.log('  Property Number:', currentProperty.property_number);
    console.log('  Current Storage Location:', currentProperty.storage_location);
    console.log('');
    
    // 正しいフォルダURL
    const correctFolderId = '18xvHCFtZC-nnr0ALLru_8q-ZQtCydQBy';
    const correctStorageUrl = `https://drive.google.com/drive/folders/${correctFolderId}`;
    
    console.log('✅ Correct folder:');
    console.log('  Folder Name: CC10_小池原1期_よかタウン');
    console.log('  Folder ID:', correctFolderId);
    console.log('  Correct Storage Location:', correctStorageUrl);
    console.log('  Subfolders: athome公開, 小池原1期2号棟, 小池原1期1号棟');
    console.log('');
    
    // 更新を実行
    console.log('🔄 Updating storage_location...');
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({ storage_location: correctStorageUrl })
      .eq('property_number', 'CC10');
    
    if (updateError) {
      console.error('❌ Error updating storage_location:', updateError);
      return;
    }
    
    console.log('✅ Successfully updated storage_location for CC10');
    console.log('');
    
    // 更新後の状態を確認
    const { data: updatedProperty, error: verifyError } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', 'CC10')
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
      return;
    }
    
    console.log('📋 Updated state:');
    console.log('  Property Number:', updatedProperty.property_number);
    console.log('  New Storage Location:', updatedProperty.storage_location);
    console.log('');
    console.log('✅ CC10 storage_location has been fixed!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('  1. Clear image cache for CC10');
    console.log('  2. Verify images are displayed correctly on the public property site');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixCC10StorageLocation();
