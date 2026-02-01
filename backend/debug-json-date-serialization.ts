/**
 * JSONシリアライズ時のDate変換を確認
 */

const testData = {
  visitDate: new Date('2026-02-03'),
  visitAssignee: '裏天真',
};

console.log('=== JSONシリアライズ前 ===');
console.log('visitDate:', testData.visitDate);
console.log('visitDate type:', typeof testData.visitDate);
console.log('visitDate instanceof Date:', testData.visitDate instanceof Date);

const jsonString = JSON.stringify(testData);
console.log('');
console.log('=== JSONシリアライズ後 ===');
console.log('JSON文字列:', jsonString);

const parsed = JSON.parse(jsonString);
console.log('');
console.log('=== JSONパース後 ===');
console.log('visitDate:', parsed.visitDate);
console.log('visitDate type:', typeof parsed.visitDate);
console.log('visitDate instanceof Date:', parsed.visitDate instanceof Date);

// フロントエンドのnormalizeDateStringをシミュレート
const normalizeDateString = (dateStr: string | Date | undefined | null): string | null => {
  if (!dateStr) return null;
  
  try {
    let dateString: string;
    
    if (dateStr instanceof Date) {
      const year = dateStr.getFullYear();
      const month = String(dateStr.getMonth() + 1).padStart(2, '0');
      const day = String(dateStr.getDate()).padStart(2, '0');
      dateString = `${year}-${month}-${day}`;
    } else {
      dateString = String(dateStr);
    }
    
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    if (dateString.includes('-')) {
      const datePart = dateString.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

console.log('');
console.log('=== normalizeDateString結果 ===');
console.log('シリアライズ前:', normalizeDateString(testData.visitDate));
console.log('パース後:', normalizeDateString(parsed.visitDate));
