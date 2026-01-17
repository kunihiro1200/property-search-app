import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyEmailHistoryDirect() {
  console.log('🔍 Verifying email_history table directly...\n');

  try {
    // 1. Check if table exists using raw SQL
    console.log('1️⃣ Checking table existence with raw SQL...');
    const { data: tableCheck, error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'email_history'
        );
      `
    });

    if (tableError) {
      console.log('❌ Table check failed:', tableError.message);
      
      // Try alternative method
      console.log('\n2️⃣ Trying alternative check method...');
      const { data: altCheck, error: altError } = await supabase
        .from('email_history')
        .select('count')
        .limit(0);
      
      if (altError) {
        console.log('❌ Alternative check also failed:', altError.message);
        console.log('\n📋 Error details:', JSON.stringify(altError, null, 2));
      } else {
        console.log('✅ Table exists (alternative method)');
        console.log('Result:', altCheck);
      }
    } else {
      console.log('✅ Table exists:', tableCheck);
    }

    // 3. Try to insert a test record
    console.log('\n3️⃣ Attempting to insert test record...');
    const testData = {
      buyer_id: 1,
      property_listing_id: 1,
      sent_at: new Date().toISOString(),
      email_subject: 'Test Email',
      email_body: 'This is a test email',
      sender_email: 'test@example.com',
      recipient_email: 'recipient@example.com'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('email_history')
      .insert(testData)
      .select();

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      console.log('📋 Full error:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Clean up test record
      if (insertData && insertData.length > 0) {
        const { error: deleteError } = await supabase
          .from('email_history')
          .delete()
          .eq('id', insertData[0].id);
        
        if (!deleteError) {
          console.log('✅ Test record cleaned up');
        }
      }
    }

    // 4. Check PostgREST schema cache status
    console.log('\n4️⃣ Checking PostgREST status...');
    console.log('Note: If the table exists in PostgreSQL but PostgREST cannot see it,');
    console.log('this indicates a schema cache issue that requires project restart.');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyEmailHistoryDirect();
