import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkHeaders() {
  const client = new GoogleSheetsClient({
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: '物件',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await client.authenticate();
  const headers = await client.getHeaders();
  
  console.log('Total headers:', headers.length);
  console.log('\nFirst 30 headers:');
  headers.slice(0, 30).forEach((h, i) => console.log(`${i + 1}. ${h}`));
  
  console.log('\nSearching for specific headers:');
  console.log('お気に入り文言:', headers.includes('お気に入り文言') ? '✅' : '❌');
  console.log('こちらの物件について:', headers.includes('こちらの物件について') ? '✅' : '❌');
}

checkHeaders().catch(console.error);
