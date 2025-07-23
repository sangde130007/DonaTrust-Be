const axios = require('axios');

async function testNewsAPI() {
  try {
    console.log('🔐 Testing News API...');

    // 1. Login as admin
    console.log('\n1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@donatrust.com',
      password: 'Admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Test news endpoints
    console.log('\n2. Testing News endpoints...');

    try {
      // Get all news
      console.log('📤 Testing GET /admin/news...');
      const newsResponse = await axios.get('http://localhost:5000/api/admin/news', { headers });
      console.log('✅ GET /admin/news successful:', newsResponse.data);
    } catch (error) {
      console.error('❌ GET /admin/news failed:', error.response?.data || error.message);
    }

    try {
      // Create news
      console.log('📤 Testing POST /admin/news...');
      const newsData = {
        title: 'Test News Article - ' + Date.now(),
        content: 'This is a test news article content.',
        category: 'announcement',
        priority: 'medium'
      };

      const createResponse = await axios.post('http://localhost:5000/api/admin/news', newsData, { headers });
      console.log('✅ POST /admin/news successful:', createResponse.data);

      // Try to publish the news
      if (createResponse.data.news_id) {
        console.log('📤 Testing PUT /admin/news/:id/publish...');
        const publishResponse = await axios.put(`http://localhost:5000/api/admin/news/${createResponse.data.news_id}/publish`, {}, { headers });
        console.log('✅ Publish news successful:', publishResponse.data);
      }
    } catch (error) {
      console.error('❌ Create/Publish news failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 News API test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testNewsAPI();