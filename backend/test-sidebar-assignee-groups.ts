/**
 * サイドバーカウントAPIのassigneeGroupsを確認するスクリプト
 */

import axios from 'axios';

async function testSidebarAssigneeGroups() {
  try {
    console.log('Testing /api/sellers/sidebar-counts endpoint...\n');
    
    const response = await axios.get('http://localhost:3000/api/sellers/sidebar-counts');
    
    console.log('Response status:', response.status);
    console.log('\nFull response data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n=== assigneeGroups ===');
    if (response.data.assigneeGroups && Array.isArray(response.data.assigneeGroups)) {
      console.log(`Found ${response.data.assigneeGroups.length} assignee groups:`);
      response.data.assigneeGroups.forEach((group: any) => {
        console.log(`\n- Initial: ${group.initial}`);
        console.log(`  Total Count: ${group.totalCount}`);
        console.log(`  Today Call Count: ${group.todayCallCount}`);
        console.log(`  Other Count: ${group.otherCount}`);
      });
      
      // Uグループを探す
      const uGroup = response.data.assigneeGroups.find((g: any) => g.initial === 'U');
      if (uGroup) {
        console.log('\n=== U Group Found ===');
        console.log(JSON.stringify(uGroup, null, 2));
      } else {
        console.log('\n⚠️ U Group NOT found in assigneeGroups');
      }
    } else {
      console.log('⚠️ assigneeGroups is missing or not an array');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSidebarAssigneeGroups();
