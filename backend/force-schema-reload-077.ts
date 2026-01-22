import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceSchemaReload() {
  console.log('🔄 Forcing PostgREST schema cache reload...\n');

  try {
    // Method 1: Send NOTIFY to PostgREST
    console.log('1️⃣ Sending NOTIFY pgrst to PostgREST...');
    const { error: notifyError } = await supabase.rpc('notify_pgrst_reload');
    
    if (notifyError) {
      console.log('⚠️  NOTIFY function not found (this is okay)');
      console.log('   Creating the function...\n');
      
      // Create the notify function
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION notify_pgrst_reload()
          RETURNS void AS $$
          BEGIN
            NOTIFY pgrst, 'reload schema';
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });
      
      if (createError) {
        console.log('⚠️  Could not create function, trying direct SQL...\n');
        
        // Try direct NOTIFY
        const { error: directError } = await supabase.rpc('exec_sql', {
          sql: "NOTIFY pgrst, 'reload schema';"
        });
        
        if (directError) {
          console.log('❌ Direct NOTIFY failed:', directError.message);
        } else {
          console.log('✅ Direct NOTIFY sent successfully');
        }
      } else {
        // Try calling the function again
        const { error: retryError } = await supabase.rpc('notify_pgrst_reload');
        if (!retryError) {
          console.log('✅ NOTIFY sent successfully');
        }
      }
    } else {
      console.log('✅ NOTIFY sent successfully');
    }

    console.log('\n2️⃣ Waiting 3 seconds for cache to refresh...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Method 2: Verify the column exists
    console.log('\n3️⃣ Verifying hidden_images column...');
    const { data: columns, error: columnError } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1);

    if (columnError) {
      console.log('❌ Error querying property_listings:', columnError.message);
      console.log('\n📋 This means PostgREST still hasn\'t reloaded the schema.');
      console.log('\n🔧 MANUAL STEPS REQUIRED:');
      console.log('   1. Go to Supabase Dashboard');
      console.log('   2. Settings → Database → Connection Pooling');
      console.log('   3. Click "Restart" on the connection pooler');
      console.log('   4. Wait 30 seconds');
      console.log('   5. Run this script again\n');
      return;
    }

    console.log('✅ Query successful!');
    
    if (columns && columns.length > 0) {
      const hasHiddenImages = 'hidden_images' in columns[0];
      if (hasHiddenImages) {
        console.log('✅ hidden_images column is now accessible!');
        console.log('\n🎉 Schema cache reload successful!');
        console.log('\nYou can now run: npx ts-node test-hidden-images-access.ts');
      } else {
        console.log('⚠️  Column exists in DB but not in API response');
        console.log('   This means PostgREST needs more time or a manual restart');
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 ALTERNATIVE SOLUTION:');
    console.log('   Run this SQL directly in Supabase SQL Editor:');
    console.log('   ');
    console.log('   NOTIFY pgrst, \'reload schema\';');
    console.log('   ');
    console.log('   Then wait 10 seconds and test again.');
  }
}

forceSchemaReload();
