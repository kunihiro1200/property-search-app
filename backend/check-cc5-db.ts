import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkCC5() {
  try {
    console.log('=== CC5 Database Check ===\n');
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // property_detailsテーブルからCC5のデータを取得
    console.log('Checking property_details table for CC5...');
    const { data, error } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', 'CC5')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ CC5 NOT FOUND in property_details table');
        console.log('→ This is why it takes 34 seconds (fetching from spreadsheet)');
        console.log('\nSolution: Sync CC5 data to database');
      } else {
        console.error('Error:', error);
      }
      return;
    }
    
    console.log('✅ CC5 FOUND in property_details table\n');
    console.log('Has property_about:', !!data.property_about);
    console.log('Has recommended_comments:', !!data.recommended_comments);
    console.log('Has athome_data:', !!data.athome_data);
    console.log('Has favorite_comment:', !!data.favorite_comment);
    console.log('\nUpdated at:', data.updated_at);
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkCC5();
