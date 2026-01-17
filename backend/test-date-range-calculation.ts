// Test date range calculation
const year = 2025;
const month = 11; // November

console.log('=== Date Range Calculation Test ===\n');

// Method 1: Using day 0 of next month
const startDate1 = new Date(year, month - 1, 1);
const endDate1 = new Date(year, month, 0, 23, 59, 59);

console.log('Method 1 (current PerformanceMetricsService):');
console.log(`Start: ${startDate1.toISOString()} (${startDate1.toLocaleDateString()})`);
console.log(`End: ${endDate1.toISOString()} (${endDate1.toLocaleDateString()})`);

// Method 2: Using explicit day 30
const startDate2 = new Date(year, month - 1, 1);
const endDate2 = new Date(year, month - 1, 30, 23, 59, 59);

console.log('\nMethod 2 (diagnostic script):');
console.log(`Start: ${startDate2.toISOString()} (${startDate2.toLocaleDateString()})`);
console.log(`End: ${endDate2.toISOString()} (${endDate2.toLocaleDateString()})`);

// Check what new Date(2025, 11, 0) actually gives
console.log('\n=== Verification ===');
console.log(`new Date(2025, 11, 0) = ${new Date(2025, 11, 0).toISOString()}`);
console.log(`new Date(2025, 10, 30) = ${new Date(2025, 10, 30).toISOString()}`);
console.log(`new Date(2025, 10, 31) = ${new Date(2025, 10, 31).toISOString()}`);
