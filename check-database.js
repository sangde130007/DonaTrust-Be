const { Sequelize } = require('sequelize');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const Charity = require('./src/models/Charity');
const Campaign = require('./src/models/Campaign');
const Donation = require('./src/models/Donation');
const FinancialReport = require('./src/models/FinancialReport');
const UserSocialLink = require('./src/models/UserSocialLink');
const Vote = require('./src/models/Vote');
const Feedback = require('./src/models/Feedback');
const Notification = require('./src/models/Notification');
const News = require('./src/models/News');

// Import associations
require('./src/models/associations');

async function checkDatabase() {
	console.log('🔍 Checking Database Connection and Schema...\n');

	try {
		// Test database connection
		const sequelize = require('./src/config/database');
		await sequelize.authenticate();
		console.log('✅ Database connection successful');

		// Check if tables exist
		const models = [
			{ name: 'Users', model: User },
			{ name: 'Charities', model: Charity },
			{ name: 'Campaigns', model: Campaign },
			{ name: 'Donations', model: Donation },
			{ name: 'FinancialReports', model: FinancialReport },
			{ name: 'UserSocialLinks', model: UserSocialLink },
			{ name: 'Votes', model: Vote },
			{ name: 'Feedbacks', model: Feedback },
			{ name: 'Notifications', model: Notification },
			{ name: 'News', model: News },
		];

		console.log('\n📋 Checking Tables and Data:');

		for (const { name, model } of models) {
			try {
				const count = await model.count();
				console.log(`✅ ${name}: ${count} records`);
			} catch (error) {
				console.log(`❌ ${name}: Error - ${error.message}`);
			}
		}

		// Check specific columns that were causing issues
		console.log('\n🔧 Checking Model Columns:');
		try {
			const charityAttributes = Object.keys(Charity.rawAttributes);
			console.log('✅ Charity columns:', charityAttributes.join(', '));

			// Verify the 'name' column exists
			if (charityAttributes.includes('name')) {
				console.log('✅ Charity.name column exists');
			} else {
				console.log('❌ Charity.name column missing');
			}

			const donationAttributes = Object.keys(Donation.rawAttributes);
			console.log('✅ Donation columns:', donationAttributes.join(', '));

			// Verify the 'message' column exists
			if (donationAttributes.includes('message')) {
				console.log('✅ Donation.message column exists');
			} else {
				console.log('❌ Donation.message column missing');
			}
		} catch (error) {
			console.log(`❌ Error checking model columns: ${error.message}`);
		}

		// Test a simple query
		console.log('\n🧪 Testing Database Queries:');
		try {
			const users = await User.findAll({ limit: 1 });
			console.log('✅ User query successful');
		} catch (error) {
			console.log(`❌ User query failed: ${error.message}`);
		}

		try {
			const charities = await Charity.findAll({ limit: 1 });
			console.log('✅ Charity query successful');
		} catch (error) {
			console.log(`❌ Charity query failed: ${error.message}`);
		}

		// Test join query that was failing
		console.log('\n🔗 Testing Join Queries:');
		try {
			const campaigns = await Campaign.findAll({
				include: [
					{
						model: Charity,
						as: 'charity',
						attributes: ['charity_id', 'name', 'verification_status'],
					},
				],
				limit: 1,
			});
			console.log('✅ Campaign-Charity join query successful');
		} catch (error) {
			console.log(`❌ Campaign-Charity join query failed: ${error.message}`);
		}

		console.log('\n🎉 Database check complete!');
	} catch (error) {
		console.error('❌ Database connection failed:', error.message);
		console.error('\n💡 Possible solutions:');
		console.error('1. Check if PostgreSQL is running');
		console.error('2. Verify database credentials in .env file');
		console.error('3. Make sure database exists');
		console.error('4. Check network connectivity');
	}
}

// Run check if file is executed directly
if (require.main === module) {
	checkDatabase().catch(console.error);
}

module.exports = { checkDatabase };
