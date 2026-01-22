// setDate()の動作を確認

const testDate = new Date('2025-12-04');
console.log('元の日付:', testDate.toISOString());
console.log('getDate():', testDate.getDate());

testDate.setDate(testDate.getDate() + 7);
console.log('setDate(getDate() + 7)後:', testDate.toISOString());
console.log('getDate():', testDate.getDate());

// もう一度テスト
const testDate2 = new Date('2025-12-04T00:00:00.000Z');
console.log('\n元の日付（UTC）:', testDate2.toISOString());
console.log('getDate():', testDate2.getDate());

testDate2.setDate(testDate2.getDate() + 7);
console.log('setDate(getDate() + 7)後:', testDate2.toISOString());
console.log('getDate():', testDate2.getDate());
