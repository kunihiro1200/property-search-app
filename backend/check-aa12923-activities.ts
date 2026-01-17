import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkActivities() {
  console.log('🔍 Checking AA12923 activities...\n');

  // Get seller ID
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('id, seller_number')
    .eq('seller_number', 'AA12923')
    .single();

  if (sellerError || !seller) {
    console.error('❌ Error finding seller:', sellerError);
    return;
  }

  console.log('✅ Found seller:', seller);

  // Get activities
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false });

  if (activitiesError) {
    console.error('❌ Error fetching activities:', activitiesError);
    return;
  }

  console.log(`\n📊 Found ${activities?.length || 0} activities:\n`);
  
  if (activities && activities.length > 0) {
    activities.forEach((activity, index) => {
      console.log(`Activity ${index + 1}:`);
      console.log(`  ID: ${activity.id}`);
      console.log(`  Type: ${activity.type}`);
      console.log(`  Content: ${activity.content?.substring(0, 100)}...`);
      console.log(`  Created: ${activity.created_at}`);
      console.log('');
    });
  } else {
    console.log('❌ No activities found for AA12923');
  }
}

checkActivities().catch(console.error);
