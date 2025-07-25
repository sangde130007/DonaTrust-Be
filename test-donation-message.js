const { Sequelize } = require('sequelize');
require('dotenv').config();

// Import models
const Donation = require('./src/models/Donation');
const User = require('./src/models/User');
const Campaign = require('./src/models/Campaign');
const Charity = require('./src/models/Charity');

// Import associations
require('./src/models/associations');

async function testDonationMessage() {
	console.log('🧪 Testing Donation.message column...\n');

	try {
		// Test database connection
		const sequelize = require('./src/config/database');
		await sequelize.authenticate();
		console.log('✅ Database connection successful');

		// Check if message column exists in model
		const donationAttributes = Object.keys(Donation.rawAttributes);
		console.log('📋 Donation model attributes:', donationAttributes);

		if (donationAttributes.includes('message')) {
			console.log('✅ message column exists in Donation model');
		} else {
			console.log('❌ message column missing in Donation model');
			return;
		}

		// Test a simple query to check if message column exists in database
		console.log('\n🔍 Testing database query with message column...');

		try {
			const donations = await Donation.findAll({
				attributes: ['donation_id', 'amount', 'method', 'tx_code', 'message', 'is_anonymous', 'created_at'],
				limit: 1,
			});
			console.log('✅ Query with message column successful');
			console.log(`📊 Found ${donations.length} donations`);

			if (donations.length > 0) {
				console.log('📄 Sample donation:', {
					donation_id: donations[0].donation_id,
					amount: donations[0].amount,
					message: donations[0].message,
					is_anonymous: donations[0].is_anonymous,
				});
			}
		} catch (error) {
			console.log('❌ Query with message column failed:', error.message);

			if (error.message.includes('column "message" does not exist')) {
				console.log('\n🔧 The message column does not exist in database table');
				console.log('💡 Need to run migration: node add-donation-message-column.js');
				return;
			}
			throw error;
		}

		// Test join query (similar to admin service)
		console.log('\n🔗 Testing join query with Donation.message...');

		try {
			const campaigns = await Campaign.findAll({
				include: [
					{
						model: Donation,
						as: 'donations',
						attributes: [
							'donation_id',
							'amount',
							'method',
							'tx_code',
							'message',
							'is_anonymous',
							'created_at',
						],
						include: [
							{
								model: User,
								as: 'user',
								attributes: ['full_name', 'email'],
							},
						],
						limit: 5,
						order: [['created_at', 'DESC']],
					},
				],
				limit: 1,
			});

			console.log('✅ Join query with message column successful');
			console.log(`📊 Found ${campaigns.length} campaigns`);

			if (campaigns.length > 0 && campaigns[0].donations.length > 0) {
				console.log('📄 Sample donation from join:', {
					donation_id: campaigns[0].donations[0].donation_id,
					amount: campaigns[0].donations[0].amount,
					message: campaigns[0].donations[0].message,
					user: campaigns[0].donations[0].user?.full_name || 'Anonymous',
				});
			}
		} catch (error) {
			console.log('❌ Join query failed:', error.message);
			throw error;
		}

		console.log('\n✅ All tests passed! Donation.message column is working correctly');
		console.log('🎉 The API endpoint should now work without the column error');
	} catch (error) {
		console.error('❌ Test failed:', error.message);
		console.error('\n💡 Troubleshooting steps:');
		console.error('1. Check if migration was run: node add-donation-message-column.js');
		console.error('2. Verify database connection settings in .env');
		console.error('3. Check if PostgreSQL is running');
	}
}

// Run test if called directly
if (require.main === module) {
	testDonationMessage().catch(console.error);
}

module.exports = { testDonationMessage };
