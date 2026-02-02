/**
 * formatInquiryDateメソッドのテスト
 * Excelシリアル値が正しく変換されるか確認
 */

function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const str = String(value).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function formatInquiryDate(inquiryYear: any, inquiryDate: any): string | null {
  if (!inquiryYear || !inquiryDate) return null;
  
  const year = parseNumeric(inquiryYear);
  if (year === null) return null;
  
  const dateStr = String(inquiryDate).trim();
  
  console.log(`  inquiryYear: ${inquiryYear} (type: ${typeof inquiryYear})`);
  console.log(`  inquiryDate: ${inquiryDate} (type: ${typeof inquiryDate})`);
  console.log(`  dateStr: "${dateStr}"`);
  console.log(`  /^\\d+$/.test(dateStr): ${/^\d+$/.test(dateStr)}`);
  
  // Excelシリアル値（数値）の場合
  if (/^\d+$/.test(dateStr)) {
    const serialNumber = parseInt(dateStr, 10);
    console.log(`  serialNumber: ${serialNumber}`);
    console.log(`  serialNumber > 30000: ${serialNumber > 30000}`);
    console.log(`  serialNumber < 60000: ${serialNumber < 60000}`);
    // Excelシリアル値の範囲チェック（30000〜60000程度が妥当）
    if (serialNumber > 30000 && serialNumber < 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000);
      const y = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${month}-${day}`;
    }
  }
  
  // MM/DD 形式の場合
  if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
    const [month, day] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY/MM/DD 形式の場合（年が含まれている）
  if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
    const [y, month, day] = dateStr.split('/');
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

// テスト
console.log('🧪 formatInquiryDateのテスト\n');

console.log('テスト1: Excelシリアル値（数値型）');
const result1 = formatInquiryDate(2026, 46054);
console.log(`  結果: ${result1}\n`);

console.log('テスト2: Excelシリアル値（文字列型）');
const result2 = formatInquiryDate(2026, '46054');
console.log(`  結果: ${result2}\n`);

console.log('テスト3: MM/DD形式');
const result3 = formatInquiryDate(2026, '2/1');
console.log(`  結果: ${result3}\n`);

console.log('テスト4: YYYY/MM/DD形式');
const result4 = formatInquiryDate(2026, '2026/2/1');
console.log(`  結果: ${result4}\n`);
