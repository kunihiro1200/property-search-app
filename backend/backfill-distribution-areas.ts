import { Pool } from 'pg';
import dotenv from 'dotenv';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';
import { EnhancedGeolocationService } from './src/services/EnhancedGeolocationService';
import { AreaMapConfigService } from './src/services/AreaMapConfigService';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface PropertyRow {
  property_number: string;
  google_map_url: string;
  address: string;
}

async function backfillDistributionAreas() {
  console.log('Starting distribution areas backfill...\n');

  const calculator = new PropertyDistributionAreaCalculator();

  try {
    // Query all properties with google_map_url but no distribution_areas
    const result = await pool.query<PropertyRow>(`
      SELECT property_number, google_map_url, address
      FROM property_listings
      WHERE google_map_url IS NOT NULL 
        AND google_map_url != ''
        AND (distribution_areas IS NULL OR distribution_areas = '')
      ORDER BY property_number
    `);

    const properties = result.rows;
    console.log(`Found ${properties.length} properties to process\n`);

    if (properties.length === 0) {
      console.log('No properties need backfilling. Exiting.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ propertyNumber: string; error: string }> = [];

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const progress = `[${i + 1}/${properties.length}]`;

      try {
        console.log(`${progress} Processing ${property.property_number}...`);

        // Extract city from address
        const city = extractCityFromAddress(property.address);
        if (!city) {
          throw new Error('Could not extract city from address');
        }

        // Calculate distribution areas
        const result = await calculator.calculateDistributionAreas(
          property.google_map_url,
          city
        );

        if (!result || result.areas.length === 0) {
          throw new Error('No areas calculated');
        }

        // Use formatted string from result
        const formattedAreas = result.formatted;

        // Update database
        await pool.query(
          `UPDATE property_listings 
           SET distribution_areas = $1, updated_at = NOW()
           WHERE property_number = $2`,
          [formattedAreas, property.property_number]
        );

        console.log(`${progress} ✓ ${property.property_number}: ${formattedAreas}`);
        successCount++;
      } catch (error: any) {
        console.error(`${progress} ✗ ${property.property_number}: ${error.message}`);
        errorCount++;
        errors.push({
          propertyNumber: property.property_number,
          error: error.message,
        });
      }

      // Add small delay to avoid overwhelming the system
      if (i < properties.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total properties: ${properties.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\nERRORS:');
      errors.forEach(({ propertyNumber, error }) => {
        console.log(`  ${propertyNumber}: ${error}`);
      });
    }
  } catch (error) {
    console.error('Fatal error during backfill:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

function extractCityFromAddress(address: string): string | null {
  if (!address) return null;

  // Extract city from address (e.g., "大分県大分市..." -> "大分市")
  const cityMatch = address.match(/(大分市|別府市)/);
  return cityMatch ? cityMatch[1] : null;
}

// Run backfill
backfillDistributionAreas()
  .then(() => {
    console.log('\nBackfill completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nBackfill failed:', error);
    process.exit(1);
  });
