const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testDaoAPI() {
  try {
    // 1. Login first
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'donor@example.com',
      password: 'Donor123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');

    // 2. Test DAO registration
    console.log('📝 Testing DAO registration...');
    const formData = new FormData();
    formData.append('fullName', 'Nguyễn Văn Test');
    formData.append('email', 'test@example.com');
    formData.append('introduction', 'Tôi muốn tham gia DAO để giúp đỡ cộng đồng và đóng góp vào việc xây dựng một hệ thống từ thiện minh bạch hơn. Tôi tin rằng công nghệ có thể làm thay đổi thế giới.');
    formData.append('experience', 'Tôi có 5 năm kinh nghiệm trong việc tham gia các hoạt động từ thiện, từng làm tình nguyện viên cho nhiều tổ chức. Có hiểu biết về công nghệ blockchain và smart contracts.');
    formData.append('areasOfInterest', JSON.stringify({
      education: true,
      medical: true,
      children: false,
      environment: false,
      naturalDisaster: false,
      disability: false
    }));

    // If you have a test file, uncomment this:
    // formData.append('certificates', fs.createReadStream('./test-certificate.jpg'));

    const registerResponse = await axios.post('http://localhost:5000/api/dao/register', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ DAO registration successful!');
    console.log('Response:', registerResponse.data);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testDaoAPI();