const sequelize = require('../config/database');
const logger = require('./logger');

async function updateDatabaseSchema() {
	try {
		logger.info('Bắt đầu cập nhật schema database...');

		// Add new fields to Users table
		await sequelize.query(`
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
		logger.info('✓ Đã cập nhật Users table');

		// Add new fields to Campaigns table
		await sequelize.query(`
			ALTER TABLE "Campaigns" 
			ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(255),
			ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "rejected_by" VARCHAR(255);
		`);
		logger.info('✓ Đã cập nhật Campaigns table');

		// Add new fields to Charities table
		await sequelize.query(`
			ALTER TABLE "Charities" 
			ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP,
			ADD COLUMN IF NOT EXISTS "verified_by" VARCHAR(255),
			ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
		`);
		logger.info('✓ Đã cập nhật Charities table');

		// Create News table if not exists
		await sequelize.query(`
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
		logger.info('✓ Đã tạo News table');

		logger.info('🎉 Cập nhật schema database thành công!');
	} catch (error) {
		logger.error('❌ Lỗi cập nhật schema:', error);
		throw error;
	}
}

module.exports = { updateDatabaseSchema };
