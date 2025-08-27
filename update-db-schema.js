const { Client } = require('pg');
require('dotenv').config();
// Database connection configuration
const dbConfig = {
	host: process.env.DB_HOST || 'localhost',
	port: 5432,
	database: 'donatrust', // Change this to your database name
	user: process.env.DB_USER || 'postgres', // Change this to your database user
	password: process.env.DB_PASSWORD || 'postgres', // Change this to your database password
};

async function updateSchema() {
	const client = new Client(dbConfig);

	try {
		console.log('🔌 Connecting to database...');
		await client.connect();
		console.log('✅ Connected to database successfully');

		console.log('📝 Adding new fields to Users table...');
		await client.query(`
			ALTER TABLE "Users" 
			ADD COLUMN IF NOT EXISTS "dao_approved_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "dao_approved_by" VARCHAR(255),
			ADD COLUMN IF NOT EXISTS "dao_rejection_reason" TEXT,
			ADD COLUMN IF NOT EXISTS "dao_rejected_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "dao_rejected_by" VARCHAR(255),
			ADD COLUMN IF NOT EXISTS "ban_reason" TEXT,
			ADD COLUMN IF NOT EXISTS "banned_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "banned_by" VARCHAR(255),
			ADD COLUMN IF NOT EXISTS "unbanned_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "unbanned_by" VARCHAR(255);
		`);
		console.log('✅ Users table updated');

		console.log('📝 Adding new fields to Campaigns table...');
		// Update Campaigns table
		console.log('📝 Updating Campaigns table...');
		await client.query(`
			ALTER TABLE "Campaigns" 
			ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(255),
			ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "rejected_by" VARCHAR(255),
			ADD COLUMN IF NOT EXISTS "qr_code_url" VARCHAR(255); -- Thêm cột mới
		`);
		console.log('✅ Campaigns table updated');

		console.log('📝 Adding new fields to Charities table...');
		await client.query(`
			ALTER TABLE "Charities" 
			ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "verified_by" VARCHAR(255),
			ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
		`);
		console.log('✅ Charities table updated');

		console.log('📝 Creating News table...');
		await client.query(`
			CREATE TABLE IF NOT EXISTS "News" (
				"news_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				"title" VARCHAR(200) NOT NULL,
				"content" TEXT NOT NULL,
				"summary" TEXT,
				"author_id" VARCHAR(255) NOT NULL,
				"category" VARCHAR(50) DEFAULT 'announcement' CHECK ("category" IN ('announcement', 'update', 'campaign', 'charity', 'system')),
				"status" VARCHAR(50) DEFAULT 'draft' CHECK ("status" IN ('draft', 'published', 'archived')),
				"priority" VARCHAR(50) DEFAULT 'medium' CHECK ("priority" IN ('low', 'medium', 'high', 'urgent')),
				"featured" BOOLEAN DEFAULT false,
				"image_url" VARCHAR(255),
				"tags" TEXT[],
				"views" INTEGER DEFAULT 0,
				"published_at" TIMESTAMP,
				"expires_at" TIMESTAMP,
				"created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				"updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY ("author_id") REFERENCES "Users"("user_id") ON DELETE CASCADE
			);
		`);
		console.log('✅ News table created');

		console.log('🎉 Database schema updated successfully!');
		console.log('You can now start the server with: npm run dev');
	} catch (error) {
		console.error('❌ Error updating schema:', error.message);
		if (error.message.includes('connect')) {
			console.log('\n📌 Please check your database connection settings:');
			console.log('  - Database is running');
			console.log('  - Host, port, database name, user, password are correct');
			console.log('  - Update the dbConfig object in this script with your database details');
		}
	} finally {
		await client.end();
	}
}

updateSchema();
