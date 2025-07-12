	const path = require('path');
	require('dotenv').config({ path: path.join(__dirname, '../.env') });

	const { updateDatabaseSchema } = require('../src/utils/updateSchema');
	const sequelize = require('../src/config/database');
	const logger = require('../src/utils/logger');

	async function runMigration() {
		try {
			logger.info('🚀 Chạy migration cập nhật schema...');

			// Test database connection
			await sequelize.authenticate();
			logger.info('✓ Kết nối database thành công');

			// Run schema updates
			await updateDatabaseSchema();

			logger.info('✅ Migration hoàn tất!');
			process.exit(0);
		} catch (error) {
			logger.error('❌ Migration thất bại:', error);
			process.exit(1);
		}
	}

	runMigration();
