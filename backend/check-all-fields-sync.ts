import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config({ path: './.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAllFieldsSync() {
  console.log('🔍 Checking if all database fields are included in decryptSeller...\n');

  try {
    // 1. データベースのカラム一覧を取得
    const { data: columns, error: columnsError } = await supabase
      .from('sellers')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.error('❌ Error fetching columns:', columnsError);
      return;
    }

    if (!columns || columns.length === 0) {
      console.error('❌ No sellers found in database');
      return;
    }

    const dbColumns = Object.keys(columns[0]);
    console.log(`📊 Database has ${dbColumns.length} columns\n`);

    // 2. decryptSellerで返されるフィールド一覧（手動リスト）
    const decryptedFields = [
      'id',
      'name',
      'address',
      'phoneNumber',
      'email',
      'status',
      'confidence',
      'assignedTo',
      'appointmentDate',
      'appointmentNotes',
      'nextCallDate',
      'createdAt',
      'updatedAt',
      'sellerNumber',
      'inquirySource',
      'inquiryYear',
      'inquiryDate',
      'inquiryDatetime',
      'inquiryDetailedDatetime',
      'isUnreachable',
      'unreachableStatus', // ← 今回追加
      'unreachableSince',
      'firstCallerInitials',
      'firstCallerEmployeeId',
      'confidenceLevel',
      'duplicateConfirmed',
      'duplicateConfirmedAt',
      'duplicateConfirmedBy',
      'fixedAssetTaxRoadPrice',
      'valuationAmount1',
      'valuationAmount2',
      'valuationAmount3',
      'valuationAssignedBy',
      'competitorName',
      'competitorNameAndReason',
      'exclusiveOtherDecisionFactors',
      'otherDecisionCountermeasure',
      'contractYearMonth',
      'exclusiveOtherDecisionMeeting',
      'inquirySite',
      'site',
      'exclusionDate',
      'exclusionAction',
      'comments',
      'visitDate',
      'visitTime',
      'visitAcquisitionDate',
      'visitAssignee',
      'visitValuationAcquirer',
      'valuationAssignee',
      'phoneAssignee',
      'inquiryMedium',
      'inquiryContent',
      'saleReason',
      'desiredTiming',
      'desiredPrice',
      'notes',
      'visitNotes',
      'mailingStatus',
      'mailSentDate',
      'valuationMethod', // ← 今回追加
      'viewingNotes',
      'latestStatus',
      'property', // 物件情報（別途追加）
    ];

    console.log(`📊 decryptSeller returns ${decryptedFields.length} fields\n`);

    // 3. データベースカラム名をcamelCaseに変換
    const dbColumnsCamelCase = dbColumns.map(col => {
      // snake_case → camelCase
      return col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    });

    // 4. 欠けているフィールドを検出
    const missingInDecrypted: string[] = [];
    
    dbColumns.forEach((dbCol, index) => {
      const camelCaseCol = dbColumnsCamelCase[index];
      
      // 特殊なマッピング
      const specialMappings: { [key: string]: string } = {
        'phone_number': 'phoneNumber',
        'inquiry_site': 'inquirySite', // または 'site'
        'inquiry_detailed_datetime': 'inquiryDetailedDatetime', // または 'inquiryDatetime'
        'is_unreachable': 'isUnreachable',
        'unreachable_status': 'unreachableStatus',
        'unreachable_since': 'unreachableSince',
        'first_caller_initials': 'firstCallerInitials',
        'first_caller_employee_id': 'firstCallerEmployeeId',
        'confidence': 'confidence', // または 'confidenceLevel'
        'duplicate_confirmed': 'duplicateConfirmed',
        'duplicate_confirmed_at': 'duplicateConfirmedAt',
        'duplicate_confirmed_by': 'duplicateConfirmedBy',
        'fixed_asset_tax_road_price': 'fixedAssetTaxRoadPrice',
        'valuation_amount_1': 'valuationAmount1',
        'valuation_amount_2': 'valuationAmount2',
        'valuation_amount_3': 'valuationAmount3',
        'valuation_assigned_by': 'valuationAssignedBy',
        'competitor_name': 'competitorName',
        'competitor_name_and_reason': 'competitorNameAndReason',
        'exclusive_other_decision_factor': 'exclusiveOtherDecisionFactors',
        'other_decision_countermeasure': 'otherDecisionCountermeasure',
        'contract_year_month': 'contractYearMonth',
        'exclusive_other_decision_meeting': 'exclusiveOtherDecisionMeeting',
        'exclusion_date': 'exclusionDate',
        'exclusion_action': 'exclusionAction',
        'visit_date': 'visitDate',
        'visit_time': 'visitTime',
        'visit_acquisition_date': 'visitAcquisitionDate',
        'visit_assignee': 'visitAssignee',
        'visit_valuation_acquirer': 'visitValuationAcquirer',
        'valuation_assignee': 'valuationAssignee',
        'phone_assignee': 'phoneAssignee',
        'inquiry_medium': 'inquiryMedium',
        'inquiry_content': 'inquiryContent',
        'sale_reason': 'saleReason',
        'desired_timing': 'desiredTiming',
        'desired_price': 'desiredPrice',
        'visit_notes': 'visitNotes',
        'mailing_status': 'mailingStatus',
        'mail_sent_date': 'mailSentDate',
        'valuation_method': 'valuationMethod',
        'viewing_notes': 'viewingNotes',
        'latest_status': 'latestStatus',
        'seller_number': 'sellerNumber',
        'inquiry_source': 'inquirySource',
        'inquiry_year': 'inquiryYear',
        'inquiry_date': 'inquiryDate',
        'appointment_date': 'appointmentDate',
        'appointment_notes': 'appointmentNotes',
        'next_call_date': 'nextCallDate',
        'created_at': 'createdAt',
        'updated_at': 'updatedAt',
        'assigned_to': 'assignedTo',
      };

      const expectedField = specialMappings[dbCol] || camelCaseCol;
      
      if (!decryptedFields.includes(expectedField)) {
        // 無視するフィールド（内部使用のみ）
        const ignoredFields = [
          'deleted_at',
          'last_synced_at',
          'property_address', // propertiesテーブルに移動
        ];
        
        if (!ignoredFields.includes(dbCol)) {
          missingInDecrypted.push(`${dbCol} → ${expectedField}`);
        }
      }
    });

    // 5. 結果を表示
    if (missingInDecrypted.length === 0) {
      console.log('✅ All database fields are included in decryptSeller!\n');
      console.log('🎉 No missing fields detected.\n');
    } else {
      console.log('⚠️  Missing fields in decryptSeller:\n');
      missingInDecrypted.forEach(field => {
        console.log(`  ❌ ${field}`);
      });
      console.log('');
      console.log('📝 Action required:');
      console.log('  1. Add missing fields to decryptSeller method');
      console.log('  2. Update Seller type definition');
      console.log('  3. Restart backend server');
      console.log('  4. Test API response');
      console.log('');
    }

    // 6. 重要なフィールドの確認
    console.log('🎯 Checking critical fields:\n');
    
    const criticalFields = [
      { db: 'unreachable_status', decrypted: 'unreachableStatus' },
      { db: 'valuation_method', decrypted: 'valuationMethod' },
      { db: 'property_address', decrypted: 'property.address' },
      { db: 'comments', decrypted: 'comments' },
      { db: 'visit_assignee', decrypted: 'visitAssignee' },
      { db: 'visit_valuation_acquirer', decrypted: 'visitValuationAcquirer' },
    ];

    criticalFields.forEach(field => {
      const exists = dbColumns.includes(field.db);
      const inDecrypted = decryptedFields.includes(field.decrypted.split('.')[0]);
      
      if (exists && inDecrypted) {
        console.log(`  ✅ ${field.db} → ${field.decrypted}`);
      } else if (exists && !inDecrypted) {
        console.log(`  ❌ ${field.db} → ${field.decrypted} (MISSING IN DECRYPTED)`);
      } else if (!exists) {
        console.log(`  ⚠️  ${field.db} (NOT IN DATABASE)`);
      }
    });

    console.log('');
    console.log('✅ Field sync check completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAllFieldsSync();
