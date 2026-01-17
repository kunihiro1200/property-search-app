import { createClient } from '@supabase/supase-js';
import * as dotenv from 'dot

dotenv.config();

ient(
  process.env.SUPABASE_URL!,

);

async function debugOscarFilte{
  console.log('='.repeat(80));
  co Debug');


ble
  console.log('\n1. Ch
  const { data: oscarBuyers, error: oscarErsupabase
    .from('buyers')
    .select('*')
    .eq('email', 'oscar.yag74@gmail.om');

 {
    console.error('Error:', oscarError);
    return;
  }

  console.log(`Found ${oscarBuyers?.length || 0} buyer records with osccom`);
  {
    console.log(`\nRecord ${i + 1);
    connumber}`);
    console.log(`  Email: ${buy
    console.log(
    console.log(`  Distribution );
`);
    console.log(`  Depe}`);
    console.log(`  Price Range (Apartmentment}`);
    console.log(`  ;
    console.log(;
  });

s
  console.log('\n2. Checking AA5852 property details...');
  const { data: property, error: propse
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA5852')
    .single();

  if (propError) {
    console.error('Error:', propError);
n;
  }

:');
  console.log(`  Pnumber}`);
  console.log(`  Address: ${property.addr`);
  console.log(`  Property Type: ${property.property_type}`);
  console.log(`  Price: ${property.price?.toLocaleString()}円`);
  console.log(`  Distribution Areas: ${property.dists}`);
  console.log(`  Google Map URL: ${property.google_map_ur);

  // 3. Check if Os
  if (oscarBuyers && oscarBuyers.length > 0) {
    console.log('\n3. Checking Oscar\'s inquiry history...');
    for (const buyer of oscarBuyers) {
      const { data: inquiries, error: inquiryErr
        .from('buyer_inquiries')
elect(`
          property_mber,
          inquiry_date,
          property_listings!inner(
         
            address,
            g_url
          )
        `)
   )


      if (inquiryError) {
        console.error('Error:', inquiryError);
        continue;
      }

   

        console.log(`  - ${inquiry.property_number} (${inquiry.inquiry_date})`);
        console.log(`    Address: ${inquiry.property_listings?.addres;
      });
    }
  }

  // 4. Analyze fi
  console.log('\n4. Analyzing filtering criter');
  
  if (oscarBuyers && oscarBuyers.length > 0) {
    const buyer = oscarBuyers[0]; // Use first record
    
    // Geography check
lter:');
    const propert
    const buyerAreas = extractAreaNumbe);
    console.log(`    Proper}`);
    console.log(`    Buyer , ')}`);
area));
    console.log(`    Matched A;
    console.log(`    ✓ Geography: ${matchedAre'}`);

    // Distribution type check
    console.log('\n  Distribution Typer:');
    console.log(`    Buyer Distribution Type:);
   

                     buyer.distribution_type?.includes('LIil');
    console.log(`    ✓ Distribution: ${distP

    // Status c
    console.log('\n  Status Filter:');
    console.log(`    Buyer Statuss}"`);
    const statusPass = !buyer.latest_status?.includes('買付') && 
                  ;
    console.log(`    ✓ Status: ${statusPass ? 'PASS' : 'FAIL'});

    // Price range check
    console.log(');
    conso_type}`);
    con
    c
   
';
    if (property.property_type === 'マンション' || property.property_type = {
      priceRangeText = buyer.price_range_apartment;
    } else if (property.property_type === '戸建' || property.p) {
se;
    } else i地') {
      priceRangeText = buynge_land;
    }
    
    console.log(`    Buyer Price Range: ${priceR'}`);
    
    // Check property type match
    const typeMatch = checkPropertyTypeMatch(buyer.
    console.log(`    Property Type Match: ${typeMatch ? 'YES' : 'NO'}`);
    
    // Check pric match
    let pricePass = true;
    if (priceRangeText && !priceRangeText.include) {
      pricePass = checkPriceMatch(property.pric
      console.log(`    Price Range Match: ${price`);
    } else {
      console.log(`    Price Range Match: N/A (n)`);
   check type
    }

    console.log(`    ✓ Price: ${pricePass ?}`);

);ole.error(consg().catchFilterin
debugOscar}

n false;}

  reture;
  axPrice <= mertyPricprop&& >= minPrice Price urn propertyret   10000;
  tch[2]) *Maget(ran parseInxPrice =st ma con10000;
   ) * ch[1]att(rangeMe = parseInst minPric{
    coneMatch) rang
  if (\d+)万円/);円)?[～~]((\d+)(?:万h(/Text.matcceRangech = prist rangeMat  con円～Y万円"
"X万 // 
  }

 axPrice;Price <= mertyrn prop
    retu10000;ch[1]) * xOnlyMatt(maInparse=  maxPrice   const {
  (\d+)万円/))\d+)万円～match(/(angeText.eR') && !prices('～cludext.inriceRangeT上') && !pncludes('以angeText.i&& !priceRaxOnlyMatch );
  if (m下)?$/\d+)万円(?:以(/(?:~|～)?(t.matcheTex priceRangnlyMatch =st maxO
  con万円""~X or  "X万円以下"//
   }
rice;
 minPrice >= rn propertyP
    retu000; 10atch[1]) *nlyMt(minOce = parseInminPri const atch) {
   nOnlyMif (mi以上/);
  h(/(\d+)万円matcRangeText.= pricech atnOnlyMconst mi
  // "X万円以上";

   trueなし')) returnncludes('指定eRangeText.ipricgeText || riceRan
  if (!p;eturn truerice) rpropertyPif (!
  {ean ng): bool: strigeText priceRanber | null,tyPrice: numatch(properriceMckPction che;
}

funalsereturn f}
  
  }
     
 return true; {
      === '戸建て'))l tuamalizedAcor== '戸建' || nctual =izedAmal   (nor
     ) && '戸建て'ed ===戸建' || desirired === 'des   if ((
    
    }
 true;n retur
      パート')) {= 'アtual ==zedAcrmali' || no== 'マンションtual =lizedAc (norma &&
        === 'アパート')' || desired 'マンションdesired === if ((   
    
true;rn ual) retuormalizedActired === nif (des    edTypes) {
esir d desired of (const  for

=> t);.filter(t ())ase().trimowerC.toLt => t.map(/[、・\/,]/)t(redType.spli desiedTypes =onst desir
  cse().trim();rCaoLoweype.tl = actualTedActuanormalizonst 
  
  calse;eturn fType) r|| !actualesiredType  (!dan {
  ifoolell): btring | nupe: sTyual | null, actpe: stringsiredTydeTypeMatch(ertyroption checkPnc
fureas;
}

  return a  ;
  }
tches)mah(...eas.pus    ar) {
 if (matches);
  
 ernrPattircledNumbeatch(caString.mrees = a matchconst㊿]/g;
  = /[①-⑳㉑-ern rPattedNumbe const circl] = [];
 : string[onst areas
  
  crn [];ng) retu!areaStri{
  if (ng[] d): strifinell | undetring | nutring: sumbers(areaSeaNon extractArti

func
}  }
  }
  ');y Type/ Propert Range ceg('    - Pri console.loricePass) if (!p     tatus');
log('    - S console.!statusPass)f ( i;
     tion Type')tribuis   - Dnsole.log(' distPass) co(!    if 
   match)');no areagraphy (    - Geolog('0) console.gth === as.len(matchedAre      if );
eria:' Failed Critlog('\n     console.ss) {
  !allPa (  if  
  ED'}`);
  T QUALIFIIED' : '✗ NO? '✓ QUALIF ${allPass nsole.log(` ss;
    cocePaass && pristatusPtPass && 0 && disas.length > dArecheat = m allPass
    const');ult:rall Resve\n5. Oog('ole.l cons
   ll result  // Overa
  