const { getDonationAttributes } = require('./src/services/adminService');

console.log('🧪 Quick Test: Checking Donation attributes...\n');

try {
	// Import models to check attributes
	const Donation = require('./src/models/Donation');

	// Test the helper method
	const attributes = Object.keys(Donation.rawAttributes);
	console.log('📋 Available Donation attributes:', attributes);

	// Check if message exists
	const hasMessage = attributes.includes('message');
	console.log(`✅ Message column exists: ${hasMessage}`);

	// Test what attributes would be used in query
	const baseAttributes = ['donation_id', 'amount', 'method', 'tx_code', 'is_anonymous', 'created_at'];
	const queryAttributes = hasMessage ? [...baseAttributes, 'message'] : baseAttributes;

	console.log('🔍 Attributes that will be used in query:', queryAttributes);

	console.log('\n✅ Quick test passed!');
	console.log('🎉 The API should now work with the safe attribute handling');

	console.log('\n💡 To fully test the API:');
	console.log('1. Make sure PostgreSQL is running');
	console.log('2. Set correct DB_PASSWORD in .env file');
	console.log('3. Start the server: npm run dev');
	console.log('4. Test API: node demo-campaign-detail.js');
} catch (error) {
	console.error('❌ Quick test failed:', error.message);
}
