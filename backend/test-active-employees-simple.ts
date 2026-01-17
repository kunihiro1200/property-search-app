import axios from 'axios';

async function testActiveEmployeesSimple() {
  try {
    console.log('Testing /employees/active endpoint (no auth)...\n');
    
    const response = await axios.get('http://localhost:3000/employees/active');
    
    console.log('✅ API call successful\n');
    console.log(`📊 Total active employees: ${response.data.employees.length}\n`);
    
    // 各社員の情報を表示
    response.data.employees.forEach((emp: any, index: number) => {
      console.log(`${index + 1}. ${emp.name} (${emp.email})`);
    });
    
    // tenant@ifoo-oita.comが含まれているか確認
    const hasTenant = response.data.employees.some((emp: any) => emp.email === 'tenant@ifoo-oita.com');
    console.log(`\n✅ tenant@ifoo-oita.com is ${hasTenant ? 'included' : 'NOT included'}`);
    
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status);
      console.error(error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testActiveEmployeesSimple();
