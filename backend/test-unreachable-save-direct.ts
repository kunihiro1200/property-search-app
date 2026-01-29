import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUnreachableSave() {
  try {
    console.log('🧪 Testing unreachable status save directly to database...\n');

    const sellerId = 'd63eac99-490e-446e-830e-fc69609460be'; // AA13472

    // Step 1: Get current data
    console.log('📥 Step 1: Getting current data...');
    const { data: currentData, error: getError } = await supabase
      .from('sellers')
      .select('id, seller_number, unreachable_status, inquiry_date')
      .eq('id', sellerId)
      .single();

    if (getError) {
      console.error('❌ Error getting data:', getError);
      return;
    }

    console.log('Current data:', {
      seller_number: currentData.seller_number,
      unreachable_status: currentData.unreachable_status,
      inquiry_date: currentData.inquiry_date,
    });
    console.log('');

    // Step 2: Update unreachable_status
    console.log('📤 Step 2: Updating unreachable_status to "通電OK"...');
    const { data: updateData, error: updateError } = await supabase
      .from('sellers')
      .update({ unreachable_status: '通電OK' })
      .eq('id', sellerId)
      .select('id, seller_number, unreachable_status')
      .single();

    if (updateError) {
      console.error('❌ Error updating:', updateError);
      return;
    }

    console.log('✅ Update successful!');
    console.log('Updated data:', {
      seller_number: updateData.seller_number,
      unreachable_status: updateData.unreachable_status,
    });
    console.log('');

    // Step 3: Verify
    console.log('🔍 Step 3: Verifying...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('sellers')
      .select('id, seller_number, unreachable_status')
      .eq('id', sellerId)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
      return;
    }

    console.log('Verified data:', {
      seller_number: verifyData.seller_number,
      unreachable_status: verifyData.unreachable_status,
    });

    if (verifyData.unreachable_status === '通電OK') {
      console.log('\n✅ SUCCESS: Data was saved correctly to database!');
    } else {
      console.log('\n❌ FAILED: Data was not saved correctly');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testUnreachableSave();
