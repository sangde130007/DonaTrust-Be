const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER_TOKEN = 'eyJhbGciOiJlUzI1NilsInR5cCl6lkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl9tZXU3a2U3ZnJ4NWs1liwicm9sZSI6ImRvbm9yliwiZW1haWwiOiJjYXJzb25wcm8yMUBnbWFpbC5jb20iLCJpYXQjOjE3NTYzMTMzMTEsImV4cCl6MTc1NjkxODExMX0.plli-JoStsthXSqbaldQ3wymtceFhHbenYpe30M5Zlk';

async function testChatAPI() {
  console.log('🧪 Testing Chat API...\n');

  const headers = {
    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/`);
      console.log('✅ Health check passed:', healthResponse.data.message);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      return;
    }

    // Test 2: Test campaign chat join with invalid ID
    console.log('\n2️⃣ Testing campaign chat join with invalid ID...');
    try {
      const campaignResponse = await axios.post(
        `${BASE_URL}/api/chat/campaign/invalid-uuid/join`,
        {},
        { headers }
      );
      console.log('✅ Campaign chat join response:', campaignResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Expected 404 error for invalid campaign ID');
      } else if (error.response?.status === 500) {
        console.log('⚠️ Server error (this might be expected if database is not ready):', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test 3: Test charity chat join with invalid ID
    console.log('\n3️⃣ Testing charity chat join with invalid ID...');
    try {
      const charityResponse = await axios.post(
        `${BASE_URL}/api/chat/charity/invalid-uuid/join`,
        {},
        { headers }
      );
      console.log('✅ Charity chat join response:', charityResponse.data);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Expected 404 error for invalid charity ID');
      } else if (error.response?.status === 500) {
        console.log('⚠️ Server error (this might be expected if database is not ready):', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    // Test 4: Test without authentication
    console.log('\n4️⃣ Testing without authentication...');
    try {
      const noAuthResponse = await axios.post(
        `${BASE_URL}/api/chat/campaign/test-uuid/join`,
        {}
      );
      console.log('❌ Should have failed without auth:', noAuthResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Expected 401 error for missing authentication');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    console.log('\n🎉 Chat API tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Fix database issues if any');
    console.log('2. Create valid campaign/charity records');
    console.log('3. Test with valid IDs');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🔧 Server is not running. Please:');
      console.error('   1. Start the server: npm run dev');
      console.error('   2. Make sure it\'s running on port 5000');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  testChatAPI().catch(console.error);
}

module.exports = { testChatAPI };
