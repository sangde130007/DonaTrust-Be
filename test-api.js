const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let testCharityId = '';
let testCampaignId = '';

// Test results storage
const testResults = {
	passed: 0,
	failed: 0,
	errors: [],
};

function logResult(testName, success, error = null) {
	if (success) {
		console.log(`✅ ${testName}`);
		testResults.passed++;
	} else {
		console.log(`❌ ${testName} - ${error}`);
		testResults.failed++;
		testResults.errors.push({ test: testName, error });
	}
}

async function testEndpoint(method, endpoint, data = null, headers = {}) {
	try {
		const config = {
			method,
			url: `${BASE_URL}${endpoint}`,
			headers,
		};

		if (data) {
			config.data = data;
		}

		const response = await axios(config);
		return { success: true, data: response.data, status: response.status };
	} catch (error) {
		return {
			success: false,
			error: error.response?.data?.message || error.message,
			status: error.response?.status,
		};
	}
}

async function runTests() {
	console.log('🚀 Starting DonaTrust API Tests...\n');

	// Test 1: Health Check
	const healthCheck = await testEndpoint('GET', '/');
	logResult('Health Check', healthCheck.success, healthCheck.error);

	// Test 2: API Documentation
	const docsCheck = await testEndpoint('GET', '-docs');
	logResult('API Documentation Access', docsCheck.success, docsCheck.error);

	// Test 3: Auth Routes
	console.log('\n📝 Testing Authentication Routes...');

	// Register test user
	const registerData = {
		full_name: 'Test User API',
		email: `testapi${Date.now()}@example.com`,
		password: 'password123',
		phone: '0901234567',
	};

	const register = await testEndpoint('POST', '/auth/register', registerData);
	logResult('User Registration', register.success, register.error);

	if (register.success) {
		// Try to login
		const login = await testEndpoint('POST', '/auth/login', {
			email: registerData.email,
			password: registerData.password,
		});
		logResult('User Login', login.success, login.error);

		if (login.success && login.data.token) {
			authToken = login.data.token;
		}
	}

	// Test 4: User Routes
	console.log('\n👤 Testing User Routes...');

	const userProfile = await testEndpoint('GET', '/users/profile', null, {
		Authorization: `Bearer ${authToken}`,
	});
	logResult('Get User Profile', userProfile.success, userProfile.error);

	// Test 5: Campaign Routes (Public)
	console.log('\n🎯 Testing Campaign Routes...');

	const campaigns = await testEndpoint('GET', '/campaigns');
	logResult('Get All Campaigns', campaigns.success, campaigns.error);

	const categories = await testEndpoint('GET', '/campaigns/categories');
	logResult('Get Campaign Categories', categories.success, categories.error);

	const featuredCampaigns = await testEndpoint('GET', '/campaigns/featured');
	logResult('Get Featured Campaigns', featuredCampaigns.success, featuredCampaigns.error);

	// Test 6: Charity Routes
	console.log('\n🏢 Testing Charity Routes...');

	const charities = await testEndpoint('GET', '/charities');
	logResult('Get All Charities', charities.success, charities.error);

	// Test charity registration (requires auth)
	if (authToken) {
		const charityData = {
			name: 'Test Charity API',
			description: 'Test charity for API testing',
			mission: 'Testing mission',
			license_number: `LIC${Date.now()}`,
			address: '123 Test Street',
			city: 'Test City',
			phone: '0901234567',
			email: `charity${Date.now()}@example.com`,
		};

		const charityReg = await testEndpoint('POST', '/charities/register', charityData, {
			Authorization: `Bearer ${authToken}`,
		});
		logResult('Charity Registration', charityReg.success, charityReg.error);
	}

	// Test 7: Donation Routes
	console.log('\n💰 Testing Donation Routes...');

	const donations = await testEndpoint('GET', '/donations');
	logResult('Get All Donations', donations.success, donations.error);

	// Test 8: News Routes
	console.log('\n📰 Testing News Routes...');

	const news = await testEndpoint('GET', '/news');
	logResult('Get All News', news.success, news.error);

	// Test 9: Feedback Routes
	console.log('\n💬 Testing Feedback Routes...');

	const feedbacks = await testEndpoint('GET', '/feedbacks');
	logResult('Get All Feedbacks', feedbacks.success, feedbacks.error);

	// Test 10: Vote Routes
	console.log('\n🗳️ Testing Vote Routes...');

	const votes = await testEndpoint('GET', '/votes');
	logResult('Get All Votes', votes.success, votes.error);

	// Test 11: Notification Routes
	console.log('\n🔔 Testing Notification Routes...');

	if (authToken) {
		const notifications = await testEndpoint('GET', '/notifications', null, {
			Authorization: `Bearer ${authToken}`,
		});
		logResult('Get User Notifications', notifications.success, notifications.error);
	}

	// Test 12: Admin Routes (will likely fail without admin privileges)
	console.log('\n👑 Testing Admin Routes...');

	if (authToken) {
		const adminStats = await testEndpoint('GET', '/admin/dashboard-stats', null, {
			Authorization: `Bearer ${authToken}`,
		});
		logResult('Admin Dashboard Stats', adminStats.success || adminStats.status === 403, adminStats.error);

		const adminCampaigns = await testEndpoint('GET', '/admin/campaigns', null, {
			Authorization: `Bearer ${authToken}`,
		});
		logResult(
			'Admin Get All Campaigns',
			adminCampaigns.success || adminCampaigns.status === 403,
			adminCampaigns.error
		);

		const pendingCampaigns = await testEndpoint('GET', '/admin/campaigns/pending', null, {
			Authorization: `Bearer ${authToken}`,
		});
		logResult(
			'Admin Get Pending Campaigns',
			pendingCampaigns.success || pendingCampaigns.status === 403,
			pendingCampaigns.error
		);

		// Test campaign detail if we have any campaigns
		if (pendingCampaigns.success && pendingCampaigns.data && pendingCampaigns.data.length > 0) {
			const campaignDetail = await testEndpoint(
				'GET',
				`/admin/campaigns/${pendingCampaigns.data[0].campaign_id}`,
				null,
				{
					Authorization: `Bearer ${authToken}`,
				}
			);
			logResult('Admin Get Campaign Detail', campaignDetail.success, campaignDetail.error);
		}
	}

	// Summary
	console.log('\n📊 Test Summary:');
	console.log(`✅ Passed: ${testResults.passed}`);
	console.log(`❌ Failed: ${testResults.failed}`);
	console.log(
		`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`
	);

	if (testResults.errors.length > 0) {
		console.log('\n🐛 Errors Details:');
		testResults.errors.forEach(({ test, error }) => {
			console.log(`- ${test}: ${error}`);
		});
	}

	console.log('\n🎉 API Testing Complete!');
}

// Run tests if file is executed directly
if (require.main === module) {
	runTests().catch(console.error);
}

module.exports = { runTests, testEndpoint };
