import { PerformanceMetricsService } from './src/services/PerformanceMetricsService';

async function testCompetitorLossVisited() {
  const service = new PerformanceMetricsService();
  
  // Test with November 2025 (2025-11)
  const year = 2025;
  const month = 11;
  
  console.log(`Testing Competitor Loss (Visited) for ${year}-${month.toString().padStart(2, '0')}`);
  console.log('='.repeat(80));
  
  try {
    const result = await service.calculateCompetitorLossVisited(year, month);
    
    console.log('\n営担別の他決割合（訪問済み）:');
    console.log('-'.repeat(80));
    
    if (result.byRepresentative.length === 0) {
      console.log('データがありません');
    } else {
      result.byRepresentative.forEach(rep => {
        console.log(`${rep.representative}: ${rep.count}件 (${rep.rate.toFixed(1)}%)`);
      });
    }
    
    console.log('-'.repeat(80));
    console.log(`合計: ${result.total.count}件 (${result.total.rate.toFixed(1)}%)`);
    console.log('\n');
    
    // Also test the full metrics to see all data
    console.log('Full Performance Metrics:');
    console.log('='.repeat(80));
    const fullMetrics = await service.calculateMetrics(`${year}-${month.toString().padStart(2, '0')}`);
    console.log(JSON.stringify(fullMetrics, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

testCompetitorLossVisited()
  .then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nTest failed:', error);
    process.exit(1);
  });
