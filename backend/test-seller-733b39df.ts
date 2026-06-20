import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function testSeller() {
  console.log('🧪 Testing seller 733b39df-0009-4ea4-8e98-d6ff1507afdd...\n');

  const sellerId = '733b39df-0009-4ea4-8e98-d6ff1507afdd';

  try {
    // 1. データベースから直接取得
    console.log('1️⃣ Fetching from database directly...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { data: dbSeller, error: dbError } = await supabase
      .from('sellers')
      .select('id, seller_number, inquiry_date, unreachable_status')
      .eq('id', sellerId)
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return;
    }

    console.log('✅ Database result:', {
      id: dbSeller.id,
      seller_number: dbSeller.seller_number,
      inquiry_date: dbSeller.inquiry_date,
      unreachable_status: dbSeller.unreachable_status,
    });

    // 2. SellerServiceを使用して取得
    console.log('\n2️⃣ Fetching using SellerService...');
    const { SellerService } = await import('./src/services/SellerService.supabase');
    const sellerService = new SellerService();
    
    const seller = await sellerService.getSeller(sellerId);
    
    if (!seller) {
      console.error('❌ Seller not found');
      return;
    }

    console.log('✅ SellerService result:', {
      id: seller.id,
      sellerNumber: seller.sellerNumber,
      inquiryDate: seller.inquiryDate,
      unreachableStatus: seller.unreachableStatus,
      isUnreachable: seller.isUnreachable,
    });

    // 3. inquiry_dateのチェック
    console.log('\n3️⃣ Inquiry date check:');
    const inquiryDate = seller.inquiryDate ? new Date(seller.inquiryDate) : null;
    const cutoffDate = new Date('2026-01-01');
    
    if (inquiryDate) {
      console.log(`   Inquiry date: ${inquiryDate.toISOString().split('T')[0]}`);
      console.log(`   Cutoff date:  ${cutoffDate.toISOString().split('T')[0]}`);
      console.log(`   Is >= 2026-01-01: ${inquiryDate >= cutoffDate}`);
      
      if (inquiryDate >= cutoffDate) {
        console.log('   ✅ 不通フィールドが表示されるべき');
      } else {
        console.log('   ❌ 不通フィールドは表示されない（反響日が2026年1月1日より前）');
      }
    } else {
      console.log('   ❌ inquiry_dateがnull');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSeller();
