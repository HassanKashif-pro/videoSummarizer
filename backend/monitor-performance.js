const axios = require('axios');

const API_BASE = 'http://localhost:3001';

async function testPerformance() {
  console.log('🚀 Starting Performance Tests...\n');

  // Test 1: Get notes without content (optimized)
  console.log('📊 Test 1: Fetching notes without content (optimized)');
  const start1 = Date.now();
  try {
    const response = await axios.get(`${API_BASE}/api/videos/notes`, {
      params: { includeContent: false, limit: 50 },
      timeout: 10000
    });
    const time1 = Date.now() - start1;
    console.log(`✅ Success: ${response.data.notes?.length || 0} notes in ${time1}ms`);
    console.log(`📈 Server processing time: ${response.data.meta?.queryTime || 'N/A'}\n`);
  } catch (error) {
    const time1 = Date.now() - start1;
    console.log(`❌ Failed in ${time1}ms:`, error.message, '\n');
  }

  // Test 2: Get notes with content (slow)
  console.log('📊 Test 2: Fetching notes with content (traditional)');
  const start2 = Date.now();
  try {
    const response = await axios.get(`${API_BASE}/api/videos/notes`, {
      params: { includeContent: true, limit: 10 },
      timeout: 10000
    });
    const time2 = Date.now() - start2;
    console.log(`✅ Success: ${response.data.notes?.length || 0} notes in ${time2}ms`);
    console.log(`📈 Server processing time: ${response.data.meta?.queryTime || 'N/A'}\n`);
  } catch (error) {
    const time2 = Date.now() - start2;
    console.log(`❌ Failed in ${time2}ms:`, error.message, '\n');
  }

  // Test 3: Database connection test
  console.log('📊 Test 3: Simple health check');
  const start3 = Date.now();
  try {
    const response = await axios.get(`${API_BASE}/`, {
      timeout: 5000
    });
    const time3 = Date.now() - start3;
    console.log(`✅ Server responding in ${time3}ms\n`);
  } catch (error) {
    const time3 = Date.now() - start3;
    console.log(`❌ Server not responding in ${time3}ms:`, error.message, '\n');
  }

  // Test 4: Check if indexes are working
  console.log('📊 Test 4: Testing query performance with filters');
  const start4 = Date.now();
  try {
    const response = await axios.get(`${API_BASE}/api/videos/notes`, {
      params: { 
        category: 'Uncategorized',
        contentType: 'text',
        includeContent: false,
        limit: 20
      },
      timeout: 10000
    });
    const time4 = Date.now() - start4;
    console.log(`✅ Filtered query: ${response.data.notes?.length || 0} notes in ${time4}ms`);
    console.log(`📈 Server processing time: ${response.data.meta?.queryTime || 'N/A'}\n`);
  } catch (error) {
    const time4 = Date.now() - start4;
    console.log(`❌ Filtered query failed in ${time4}ms:`, error.message, '\n');
  }

  console.log('🏁 Performance tests completed!');
  console.log('💡 If times are still slow:');
  console.log('   1. Check MongoDB connection');
  console.log('   2. Verify database indexes are created');
  console.log('   3. Check network connectivity');
  console.log('   4. Monitor server logs for errors');
}

// Run the tests
testPerformance().catch(console.error); 