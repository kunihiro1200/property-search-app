import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA10027Coordinates() {
  console.log('🔍 Checking AA10027 coordinates...\n');

  try {
    // property_listingsテーブルから取得
    const { data: listing, error: listingError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA10027')
      .single();

    if (listingError) {
      console.error('❌ Error fetching from property_listings:', listingError);
      return;
    }

    console.log('📊 Property Listings Data:');
    console.log('  Property Number:', listing.property_number);
    console.log('  Address:', listing.address);
    console.log('  Google Map URL:', listing.google_map_url);
    console.log('  Latitude:', listing.latitude);
    console.log('  Longitude:', listing.longitude);
    console.log('');

    // property_detailsテーブルから取得
    const { data: details, error: detailsError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', 'AA10027')
      .single();

    if (detailsError) {
      console.error('❌ Error fetching from property_details:', detailsError);
    } else {
      console.log('📊 Property Details Data:');
      console.log('  Property Number:', details.property_number);
      console.log('  Google Map URL:', details.google_map_url);
      console.log('');
    }

    // 座標抽出のテスト
    if (listing.google_map_url) {
      console.log('🗺️ Testing coordinate extraction from URL:');
      console.log('  URL:', listing.google_map_url);
      
      // パターン1: ?q=lat,lng
      const qMatch = listing.google_map_url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (qMatch) {
        console.log('  ✅ Pattern 1 (?q=) matched:');
        console.log('    Lat:', parseFloat(qMatch[1]));
        console.log('    Lng:', parseFloat(qMatch[2]));
      }
      
      // パターン2: /search/lat,lng
      const searchMatch = listing.google_map_url.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/);
      if (searchMatch) {
        console.log('  ✅ Pattern 2 (/search/) matched:');
        console.log('    Lat:', parseFloat(searchMatch[1]));
        console.log('    Lng:', parseFloat(searchMatch[2]));
      }
      
      // パターン3: /place/lat,lng
      const placeMatch = listing.google_map_url.match(/\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (placeMatch) {
        console.log('  ✅ Pattern 3 (/place/) matched:');
        console.log('    Lat:', parseFloat(placeMatch[1]));
        console.log('    Lng:', parseFloat(placeMatch[2]));
      }
      
      // パターン4: /@lat,lng,zoom
      const atMatch = listing.google_map_url.match(/\/@(-?\d+\.?\d*),(-?\d+\.?\d*),/);
      if (atMatch) {
        console.log('  ✅ Pattern 4 (/@) matched:');
        console.log('    Lat:', parseFloat(atMatch[1]));
        console.log('    Lng:', parseFloat(atMatch[2]));
      }
      
      if (!qMatch && !searchMatch && !placeMatch && !atMatch) {
        console.log('  ❌ No pattern matched!');
      }
    } else {
      console.log('⚠️ No Google Map URL found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAA10027Coordinates();
