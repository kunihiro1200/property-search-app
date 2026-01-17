import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Expected new columns in sellers table
const expectedSellerColumns = [
  'inquiry_detailed_datetime',
  'inquiry_site',
  'inquiry_reason',
  'site_url',
  'number_of_companies',
  'valuation_amount_1',
  'valuation_amount_2',
  'valuation_amount_3',
  'post_visit_valuation_amount_1',
  'valuation_method',
  'valuation_pdf_url',
  'fixed_asset_tax_road_price',
  'email_sent_date',
  'mail_sent_date',
  'first_call_initials',
  'first_call_person',
  'second_call_after_unreachable',
  'contact_method',
  'preferred_contact_time',
  'mailing_status',
  'alternative_mailing_address',
  'visit_acquisition_date',
  'visit_date',
  'visit_time',
  'visit_day_of_week',
  'visit_assignee',
  'visit_acquired_by',
  'visit_notes',
  'visit_ratio',
  'valuation_assignee',
  'phone_assignee',
  'contract_year_month',
  'exclusive_other_decision_meeting',
  'comments',
  'competitor_name_and_reason',
  'competitor_name',
  'exclusive_other_decision_factor',
  'other_decision_countermeasure',
  'pinrich_status',
  'past_owner_info',
  'past_property_info',
  'requires_duplicate_check',
  'seller_copy',
  'buyer_copy',
  'purchase_info',
  'exclusion_site',
  'exclusion_criteria',
  'exclusion_date',
  'exclusion_action',
  'cancel_notice_assignee',
  'exclusive_script',
  'price_loss_list_entered',
  'company_introduction',
  'property_introduction',
  'property_address_for_ieul_mansion',
  'requestor_address'
];

// Expected new columns in properties table
const expectedPropertyColumns = [
  'land_area_verified',
  'building_area_verified',
  'floor_plan',
  'seller_situation'
];

async function verifyMigration009() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Verifying Migration 009: Full Seller Fields Expansion        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  let allPassed = true;
  
  try {
    // Test 1: Check if we can query new columns in sellers table
    console.log('📊 Test 1: Verifying sellers table columns...');
    
    const { error: sellerError } = await supabase
      .from('sellers')
      .select(expectedSellerColumns.join(', '))
      .limit(1);
    
    if (sellerError) {
      console.error('   ❌ Failed to query sellers table:', sellerError.message);
      console.log('   Missing columns detected. Please run the migration.');
      allPassed = false;
    } else {
      console.log(`   ✅ All ${expectedSellerColumns.length} new columns exist in sellers table`);
    }
    
    // Test 2: Check if we can query new columns in properties table
    console.log('\n📊 Test 2: Verifying properties table columns...');
    
    const { error: propertyError } = await supabase
      .from('properties')
      .select(expectedPropertyColumns.join(', '))
      .limit(1);
    
    if (propertyError) {
      console.error('   ❌ Failed to query properties table:', propertyError.message);
      console.log('   Missing columns detected. Please run the migration.');
      allPassed = false;
    } else {
      console.log(`   ✅ All ${expectedPropertyColumns.length} new columns exist in properties table`);
    }
    
    // Test 3: Test inserting data with new fields
    console.log('\n📊 Test 3: Testing data insertion with new fields...');
    
    const testSeller = {
      name: 'Migration Test Seller',
      address: 'Test Address',
      phone_number: '9999999999',
      inquiry_site: 'ウ',
      valuation_amount_1: 50000000,
      valuation_amount_2: 55000000,
      valuation_amount_3: 60000000,
      pinrich_status: '配信中',
      contact_method: 'Email',
      mailing_status: '未'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('sellers')
      .insert(testSeller)
      .select()
      .single();
    
    if (insertError) {
      console.error('   ❌ Failed to insert test data:', insertError.message);
      allPassed = false;
    } else {
      console.log('   ✅ Successfully inserted test seller with new fields');
      console.log(`      Seller Number: ${insertData.seller_number}`);
      console.log(`      Inquiry Site: ${insertData.inquiry_site}`);
      console.log(`      Valuation Amount 1: ¥${insertData.valuation_amount_1?.toLocaleString()}`);
      
      // Clean up test data
      await supabase
        .from('sellers')
        .delete()
        .eq('id', insertData.id);
      
      console.log('   ✅ Test data cleaned up');
    }
    
    // Test 4: Verify status enum includes new values
    console.log('\n📊 Test 4: Verifying status enum expansion...');
    
    const newStatuses = ['exclusive_contract', 'general_contract', 'other_decision', 'follow_up_not_needed'];
    let statusTestPassed = true;
    
    for (const status of newStatuses) {
      const testStatusSeller = {
        name: `Status Test ${status}`,
        address: 'Test Address',
        phone_number: `888888888${newStatuses.indexOf(status)}`,
        status: status
      };
      
      const { data, error } = await supabase
        .from('sellers')
        .insert(testStatusSeller)
        .select()
        .single();
      
      if (error) {
        console.error(`   ❌ Failed to insert seller with status '${status}':`, error.message);
        statusTestPassed = false;
        allPassed = false;
      } else {
        // Clean up
        await supabase.from('sellers').delete().eq('id', data.id);
      }
    }
    
    if (statusTestPassed) {
      console.log('   ✅ All new status values are valid');
    }
    
    // Test 5: Check sample of indexes
    console.log('\n📊 Test 5: Checking index creation...');
    console.log('   ℹ️  Note: Index verification requires direct database access');
    console.log('   ℹ️  Indexes should be verified in Supabase Dashboard → Database → Indexes');
    
    // Summary
    console.log('\n' + '═'.repeat(66));
    if (allPassed) {
      console.log('✅ Migration 009 verification PASSED');
      console.log('\n📋 Summary:');
      console.log(`   • ${expectedSellerColumns.length} new columns in sellers table`);
      console.log(`   • ${expectedPropertyColumns.length} new columns in properties table`);
      console.log('   • Status enum expanded with 4 new values');
      console.log('   • Data insertion and retrieval working correctly');
      console.log('\n🎉 Migration 009 is fully functional!');
    } else {
      console.log('❌ Migration 009 verification FAILED');
      console.log('\n📋 Action Required:');
      console.log('   1. Go to Supabase Dashboard → SQL Editor');
      console.log('   2. Copy contents of: backend/migrations/009_full_seller_fields_expansion.sql');
      console.log('   3. Paste and execute in SQL Editor');
      console.log('   4. Run this verification script again');
    }
    console.log('═'.repeat(66) + '\n');
    
    return allPassed;
    
  } catch (error) {
    console.error('\n❌ Unexpected error during verification:', error);
    return false;
  }
}

async function main() {
  const success = await verifyMigration009();
  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
