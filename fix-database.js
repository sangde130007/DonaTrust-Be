const { Sequelize } = require('sequelize');
require('dotenv').config();

async function fixDatabase() {
  console.log('🔧 Fixing DonaTrust Database...\n');

  try {
    // Connect to PostgreSQL server
    console.log('📡 Connecting to PostgreSQL server...');
    
    const serverConnection = new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: 'postgres', // Connect to default postgres database first
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

    // Import models
    console.log('📋 Importing models...');
    require('./src/models/associations');

    // Sync database with force: false to avoid data loss
    console.log('🔄 Syncing database tables...');
    await appConnection.sync({ force: false, alter: false });
    console.log('✅ Database tables synchronized');

    // Check if basic tables exist
    console.log('🔍 Checking table structure...');
    
    const tables = await appConnection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    console.log('📊 Existing tables:', tables[0].map(t => t.table_name));

    // Create basic data if tables are empty
    console.log('🌱 Checking for basic data...');
    
    const User = require('./src/models/User');
    const userCount = await User.count();
    
    if (userCount === 0) {
      console.log('📝 Creating sample user...');
      
      try {
        await User.create({
          user_id: 'user_sample_001',
          full_name: 'Sample User',
          email: 'sample@example.com',
          phone: '0901234567',
          password: '$2b$10$dummy.hash.for.sample.user',
          role: 'donor',
          status: 'active',
          email_verified: true,
          phone_verified: false,
          district: 'Quận 1',
          ward: 'Phường Bến Nghé',
          address: '123 Đường ABC',
          date_of_birth: '1990-01-01',
          gender: 'male',
          bio: 'Sample user for testing'
        });
        console.log('✅ Sample user created');
      } catch (error) {
        console.log('⚠️ Could not create sample user:', error.message);
      }
    } else {
      console.log(`✅ Found ${userCount} existing users`);
    }

    await appConnection.close();

    console.log('\n🎉 Database fix completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Test chat API');
    console.log('3. Check logs for any remaining issues');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🔧 PostgreSQL is not running. Please:');
      console.error('   1. Install PostgreSQL: https://www.postgresql.org/download/');
      console.error('   2. Start PostgreSQL service');
      console.error('   3. Run: net start postgresql-x64-15 (Windows)');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n🔧 Wrong database credentials. Please:');
      console.error('   1. Check PostgreSQL username/password');
      console.error('   2. Update .env file with correct credentials');
      console.error('   3. Default: user=postgres, password=postgres');
    } else {
      console.error('\n🔧 General database error. Please:');
      console.error('   1. Verify PostgreSQL is installed and running');
      console.error('   2. Check .env configuration');
      console.error('   3. Test connection manually');
    }
  }
}

// Run fix if called directly
if (require.main === module) {
  fixDatabase().catch(console.error);
}

module.exports = { fixDatabase };
