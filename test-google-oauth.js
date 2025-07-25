const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Demo script để test Google OAuth login
async function testGoogleOAuth() {
	console.log('🔐 Testing Google OAuth Flow...\n');

	try {
		// Hiển thị hướng dẫn lấy authorization code
		console.log('📋 Bước 1: Lấy Authorization Code từ Google');
		console.log('=====================================');
		console.log('1. Mở browser và truy cập URL sau:');

		const googleOAuthURL =
			'https://accounts.google.com/o/oauth2/v2/auth?' +
			'client_id=YOUR_GOOGLE_CLIENT_ID&' +
			'redirect_uri=http://localhost:3000/auth/google/callback&' +
			'scope=openid%20email%20profile&' +
			'response_type=code&' +
			'state=test_state';

		console.log(`\n${googleOAuthURL}\n`);

		console.log('2. Đăng nhập Google và cho phép app truy cập');
		console.log('3. Copy authorization code từ callback URL');
		console.log('   URL sẽ có dạng: ...callback?code=4/0AX4XfWi...&state=test_state');
		console.log('4. Paste code vào script này để test\n');

		// Để test, user cần paste code vào đây
		const testCode = 'PASTE_YOUR_AUTHORIZATION_CODE_HERE';

		if (testCode === 'PASTE_YOUR_AUTHORIZATION_CODE_HERE') {
			console.log('❌ Chưa có authorization code để test');
			console.log('💡 Vui lòng làm theo hướng dẫn trên để lấy code từ Google\n');

			// Hiển thị cách test manual
			console.log('🧪 Test Manual với Postman/Curl:');
			console.log('=====================================');
			console.log('POST http://localhost:3000/api/auth/google');
			console.log('Content-Type: application/json');
			console.log('');
			console.log('{');
			console.log('  "code": "YOUR_AUTHORIZATION_CODE_HERE"');
			console.log('}\n');

			return;
		}

		console.log('🔍 Bước 2: Testing Backend OAuth Endpoint...\n');

		// Test Google OAuth endpoint
		const response = await axios.post(`${BASE_URL}/auth/google`, {
			code: testCode,
		});

		console.log('✅ Google OAuth Success!');
		console.log('=====================================');
		console.log('📊 Response Data:');
		console.log('- Token:', response.data.token ? '✅ Received' : '❌ Missing');
		console.log('- User ID:', response.data.user?.user_id || 'N/A');
		console.log('- Full Name:', response.data.user?.full_name || 'N/A');
		console.log('- Email:', response.data.user?.email || 'N/A');
		console.log('- Role:', response.data.user?.role || 'N/A');
		console.log('- Email Verified:', response.data.user?.email_verified ? '✅' : '❌');
		console.log('- Profile Image:', response.data.user?.profile_image ? '✅' : '❌');

		console.log('\n🎯 JWT Token Preview:');
		if (response.data.token) {
			const tokenParts = response.data.token.split('.');
			console.log(`Header: ${tokenParts[0]}`);
			console.log(`Payload: ${tokenParts[1]}`);
			console.log(`Signature: ${tokenParts[2]}`);

			// Decode payload (for demo - don't do this in production)
			try {
				const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
				console.log('\n📋 Token Payload:');
				console.log('- User ID:', payload.user_id);
				console.log('- Email:', payload.email);
				console.log('- Role:', payload.role);
				console.log('- Expires:', new Date(payload.exp * 1000).toLocaleString());
			} catch (e) {
				console.log('- Token payload decode failed');
			}
		}

		console.log('\n🚀 Next Steps:');
		console.log('- Use this token for authenticated API calls');
		console.log('- Add to Authorization header: Bearer <token>');
		console.log('- Token expires in 7 days');
	} catch (error) {
		console.error('❌ Google OAuth Test Failed:');
		console.error('=====================================');

		if (error.response) {
			console.error('Status:', error.response.status);
			console.error('Message:', error.response.data?.message || 'Unknown error');
			console.error('Details:', error.response.data);
		} else if (error.request) {
			console.error('Network Error: Cannot connect to server');
			console.error('Make sure DonaTrust backend is running on port 3000');
		} else {
			console.error('Error:', error.message);
		}

		console.error('\n💡 Troubleshooting:');
		console.error('1. Check if server is running: npm run dev');
		console.error('2. Verify GOOGLE_CLIENT_ID in .env file');
		console.error('3. Ensure authorization code is fresh (not expired)');
		console.error('4. Check Google OAuth setup in Google Cloud Console');
		console.error('5. Verify redirect URI matches exactly');
	}
}

// Helper function để tạo Google OAuth URL
function generateGoogleOAuthURL(clientId, redirectUri = 'http://localhost:3000/auth/google/callback') {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: 'openid email profile',
		response_type: 'code',
		state: Math.random().toString(36).substring(2, 15),
		access_type: 'offline',
		prompt: 'consent',
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Helper function để parse authorization code từ URL
function parseCodeFromUrl(url) {
	try {
		const urlObj = new URL(url);
		return urlObj.searchParams.get('code');
	} catch (e) {
		return null;
	}
}

// Helper function để validate Google OAuth setup
async function validateGoogleOAuthSetup() {
	console.log('🔧 Validating Google OAuth Setup...\n');

	require('dotenv').config();

	const requiredEnvs = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];

	let isValid = true;

	for (const env of requiredEnvs) {
		if (!process.env[env] || process.env[env] === 'your_google_client_id') {
			console.log(`❌ ${env}: Missing or using placeholder value`);
			isValid = false;
		} else {
			console.log(`✅ ${env}: Configured`);
		}
	}

	if (isValid) {
		console.log('\n✅ Google OAuth configuration looks good!');
		console.log('\n🔗 Test OAuth URL:');
		console.log(generateGoogleOAuthURL(process.env.GOOGLE_CLIENT_ID));
	} else {
		console.log('\n❌ Google OAuth configuration incomplete');
		console.log('\n💡 Setup Instructions:');
		console.log('1. Go to Google Cloud Console');
		console.log('2. Create OAuth 2.0 Client ID');
		console.log('3. Add redirect URI: http://localhost:3000/auth/google/callback');
		console.log('4. Update .env file with client_id and client_secret');
	}

	return isValid;
}

// Run validation và test
if (require.main === module) {
	validateGoogleOAuthSetup().then((isValid) => {
		if (isValid) {
			console.log('\n' + '='.repeat(50));
			testGoogleOAuth();
		}
	});
}

module.exports = {
	testGoogleOAuth,
	generateGoogleOAuthURL,
	parseCodeFromUrl,
	validateGoogleOAuthSetup,
};
