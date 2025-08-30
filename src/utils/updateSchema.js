  // src/utils/updateDatabaseSchema.js
  const sequelize = require('../config/database');
  const logger = require('./logger');

  async function updateDatabaseSchema() {
    try {
      logger.info('Bắt đầu cập nhật schema database...');

      // Ensure pgcrypto for gen_random_uuid (id cho News, v.v.)
      await sequelize.query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
      `);

      // ===== Donations =====
      await sequelize.query(`
        DO $$ BEGIN
            CREATE TYPE donation_status_enum AS ENUM ('pending', 'completed', 'failed');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
            
        ALTER TABLE "Donations"
        ADD COLUMN IF NOT EXISTS "email" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "full_name" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "status" donation_status_enum DEFAULT 'pending' NOT NULL;
      `);
      logger.info('✓ Đã cập nhật Donations table (email, full_name, status ENUM)');

      // ===== Users =====
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

      // ===== Campaigns =====
      // Lưu ý: nếu bạn có ENUM 'enum_Campaigns_dao_approval_status' từ trước, giữ nguyên.
      await sequelize.query(`
        ALTER TABLE "Campaigns" 
        ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "rejected_by" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "dao_approval_status" "enum_Campaigns_dao_approval_status",
        ADD COLUMN IF NOT EXISTS "dao_approved_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "dao_rejected_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "dao_approval_rate" DECIMAL(5,2),
        ADD COLUMN IF NOT EXISTS "qr_code_url" VARCHAR(500);
      `);

      // Bổ sung các cột phục vụ FE mới
      await sequelize.query(`
        ALTER TABLE "Campaigns"
        ADD COLUMN IF NOT EXISTS "gallery_images" TEXT[],
        ADD COLUMN IF NOT EXISTS "progress_updates" JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;
      `);

      // Indexes cho Campaigns
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_campaigns_status_approval') THEN
            CREATE INDEX idx_campaigns_status_approval ON "Campaigns" ("status","approval_status");
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_campaigns_progress_updates_gin') THEN
            CREATE INDEX idx_campaigns_progress_updates_gin ON "Campaigns" USING GIN ("progress_updates");
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_campaigns_tags_gin') THEN
            CREATE INDEX idx_campaigns_tags_gin ON "Campaigns" USING GIN ("tags");
          END IF;
        END$$;
      `);

      logger.info('✓ Đã cập nhật Campaigns table');

      // ===== Charities =====
      await sequelize.query(`
        ALTER TABLE "Charities" 
        ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "verified_by" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
        ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;
      `);

      // FK Charities.user_id -> Users.user_id
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_charities_user_id'
          ) THEN
            ALTER TABLE "Charities"
            ADD CONSTRAINT fk_charities_user_id
            FOREIGN KEY ("user_id")
            REFERENCES "Users"("user_id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
          END IF;
        END$$;
      `);
      logger.info('✓ Đã cập nhật Charities table');

      // ===== News =====
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "News" (
          "news_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "title" VARCHAR(200) NOT NULL,
          "content" TEXT NOT NULL,
          "summary" TEXT,
          "author_id" UUID NOT NULL,
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
          CONSTRAINT fk_news_author FOREIGN KEY ("author_id") REFERENCES "Users"("user_id") ON DELETE CASCADE
        );
      `);

      // Index đơn giản cho News
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_news_status_published_at') THEN
            CREATE INDEX idx_news_status_published_at ON "News" ("status","published_at");
          END IF;
        END$$;
      `);

      logger.info('✓ Đã tạo/đảm bảo News table');

      logger.info('🎉 Cập nhật schema database thành công!');
    } catch (error) {
      logger.error('❌ Lỗi cập nhật schema:', error);
      throw error;
    }
  }

  module.exports = { updateDatabaseSchema };
