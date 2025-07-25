const { Sequelize } = require('sequelize');
require('dotenv').config();

async function setupDatabase() {
	console.log('🗄️ Setting up DonaTrust Database...\n');

	try {
		// First, try to connect to PostgreSQL server (without specific database)
		console.log('📡 Testing PostgreSQL connection...');

		const serverConnection = new Sequelize({
			dialect: 'postgres',
			host: process.env.DB_HOST || 'localhost',
			port: process.env.DB_PORT || 5432,
			username: process.env.DB_USER || 'postgres',
			password: process.env.DB_PASSWORD || '123',
			database: 'donastrust', // Connect to default postgres database first
			logging: false,
		});

		await serverConnection.authenticate();
		console.log('✅ PostgreSQL server connection successful');

		// Check if our database exists
		const dbName = process.env.DB_NAME || 'donatrust';
		console.log(`🔍 Checking if database '${dbName}' exists...`);

		const [results] = await serverConnection.query(`
            SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbName}'
        `);

		if (results.length === 0) {
			console.log(`📝 Database '${dbName}' does not exist. Creating...`);

			// Create database
			await serverConnection.query(`CREATE DATABASE "${dbName}"`);
			console.log(`✅ Database '${dbName}' created successfully`);
		} else {
			console.log(`✅ Database '${dbName}' already exists`);
		}

		await serverConnection.close();

		// Now connect to our specific database
		console.log(`🔗 Connecting to database '${dbName}'...`);

		const appConnection = new Sequelize({
			dialect: 'postgres',
			host: process.env.DB_HOST || 'localhost',
			port: process.env.DB_PORT || 5432,
			username: process.env.DB_USER || 'postgres',
			password: process.env.DB_PASSWORD || 'postgres',
			database: dbName,
			logging: false,
		});

		await appConnection.authenticate();
		console.log('✅ Application database connection successful');

		// Import and sync models
		console.log('📋 Setting up database tables...');

		// Import models
		require('./src/models/associations');

		// Sync database (create tables if they don't exist)
		await appConnection.sync({ alter: false, force: false });
		console.log('✅ Database tables synchronized');

		// Run migration for message column
		console.log('🔧 Checking for required migrations...');
		try {
			const { addDonationMessageColumn } = require('./add-donation-message-column');
			await addDonationMessageColumn();
		} catch (error) {
			console.log('ℹ️ Migration may have already been applied:', error.message);
		}

		await appConnection.close();

		console.log('\n🎉 Database setup completed successfully!');
		console.log('\n📝 Next steps:');
		console.log('1. Start the server: npm run dev');
		console.log('2. Test API: node demo-campaign-detail.js');
		console.log('3. Access Swagger docs: http://localhost:3000/api-docs');
	} catch (error) {
		console.error('❌ Database setup failed:', error.message);

		console.error('\n💡 Troubleshooting:');

		if (error.message.includes('ECONNREFUSED')) {
			console.error('🔧 PostgreSQL is not running. Please:');
			console.error('   1. Install PostgreSQL: https://www.postgresql.org/download/');
			console.error('   2. Start PostgreSQL service');
			console.error('   3. Run: net start postgresql-x64-15 (Windows)');
		} else if (error.message.includes('password authentication failed')) {
			console.error('🔧 Wrong database credentials. Please:');
			console.error('   1. Check PostgreSQL username/password');
			console.error('   2. Update .env file with correct credentials');
			console.error('   3. Default: user=postgres, password=postgres');
		} else if (error.message.includes('does not exist')) {
			console.error('🔧 Database user does not exist. Please:');
			console.error('   1. Create PostgreSQL user: createuser -s postgres');
			console.error("   2. Set password: ALTER USER postgres PASSWORD 'postgres';");
		} else {
			console.error('🔧 General database error. Please:');
			console.error('   1. Verify PostgreSQL is installed and running');
			console.error('   2. Check .env configuration');
			console.error('   3. Test connection manually');
		}

		console.error('\n📋 Quick Setup Alternative:');
		console.error('If you want to skip PostgreSQL setup temporarily:');
		console.error('1. Comment out database-related code in server.js');
		console.error('2. Use mock data for testing');
		console.error('3. Focus on API structure first');
	}
}

// Run setup if called directly
if (require.main === module) {
	setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
