const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

async function addDonationMessageColumn() {
	console.log('🔧 Adding message column to Donations table...\n');

	try {
		// Create database connection
		const sequelize = new Sequelize({
			dialect: 'postgres',
			host: process.env.DB_HOST || 'localhost',
			port: process.env.DB_PORT || 5432,
			username: process.env.DB_USER || 'postgres',
			password: process.env.DB_PASSWORD || '',
			database: process.env.DB_NAME || 'donatrust',
			logging: false,
		});

		// Test connection
		await sequelize.authenticate();
		console.log('✅ Database connection successful');

		// Check if message column already exists
		const [results] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Donations' AND column_name = 'message'
        `);

		if (results.length > 0) {
			console.log('ℹ️ Message column already exists in Donations table');
			return;
		}

		// Add the message column
		await sequelize.query(`
            ALTER TABLE "Donations" 
            ADD COLUMN "message" TEXT;
        `);

		console.log('✅ Successfully added message column to Donations table');

		// Verify the column was added
		const [verifyResults] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'Donations' AND column_name = 'message'
        `);

		if (verifyResults.length > 0) {
			console.log('📋 Column details:', verifyResults[0]);
		}

		// Update existing donation records to have a default message (optional)
		const [updateResult] = await sequelize.query(`
            UPDATE "Donations" 
            SET "message" = 'Cảm ơn bạn đã đóng góp!' 
            WHERE "message" IS NULL;
        `);

		console.log(`✅ Updated ${updateResult.length} existing records with default message`);

		console.log('\n🎉 Migration completed successfully!');
	} catch (error) {
		console.error('❌ Migration failed:', error.message);

		if (error.message.includes('column "message" of relation "Donations" already exists')) {
			console.log('ℹ️ Column already exists, migration not needed');
		} else {
			console.error('\n💡 Troubleshooting:');
			console.error('1. Check database connection settings');
			console.error('2. Ensure PostgreSQL is running');
			console.error('3. Verify table "Donations" exists');
			console.error('4. Check database permissions');
			throw error;
		}
	}
}

// Run migration if called directly
if (require.main === module) {
	addDonationMessageColumn().catch(console.error);
}

module.exports = { addDonationMessageColumn };
