const { Sequelize } = require('sequelize');
require('dotenv').config();

async function testAssociations() {
  console.log('🧪 Testing Model Associations...\n');

  try {
    // Connect to database
    const sequelize = new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'donatrust',
      logging: false,
    });

    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Import models
    console.log('📋 Importing models...');
    const { User, Charity, Campaign } = require('./src/models/associations');

    // Test 1: Check if tables exist
    console.log('\n1️⃣ Checking table structure...');

    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📊 Existing tables:', tables[0].map(t => t.table_name));

    // Test 2: Check User model
    console.log('\n2️⃣ Testing User model...');
    try {
      const userCount = await User.count();
      console.log(`✅ User count: ${userCount}`);

      if (userCount > 0) {
        const sampleUser = await User.findOne({
          include: [{
            model: Charity,
            as: 'charity',
            attributes: ['charity_id', 'name']
          }]
        });

        if (sampleUser) {
          console.log('✅ User with charity association found:', {
            user_id: sampleUser.user_id,
            full_name: sampleUser.full_name,
            charity: sampleUser.charity ? sampleUser.charity.name : 'No charity'
          });
        }
      }
    } catch (error) {
      console.log('❌ User model test failed:', error.message);
    }

    // Test 3: Check Campaign model
    console.log('\n3️⃣ Testing Campaign model...');
    try {
      const campaignCount = await Campaign.count();
      console.log(`✅ Campaign count: ${campaignCount}`);

      if (campaignCount > 0) {
        const sampleCampaign = await Campaign.findOne({
          include: [{
            model: Charity,
            as: 'charity',
            attributes: ['charity_id', 'name', 'logo_url']
          }]
        });

        if (sampleCampaign) {
          console.log('✅ Campaign with charity association found:', {
            campaign_id: sampleCampaign.campaign_id,
            title: sampleCampaign.title,
            charity: sampleCampaign.charity ? sampleCampaign.charity.name : 'No charity'
          });
        }
      }
    } catch (error) {
      console.log('❌ Campaign model test failed:', error.message);
    }

    // Test 4: Check Charity model
    console.log('\n4️⃣ Testing Charity model...');
    try {
      const charityCount = await Charity.count();
      console.log(`✅ Charity count: ${charityCount}`);

      if (charityCount > 0) {
        const sampleCharity = await Charity.findOne({
          include: [{
            model: User,
            as: 'user',
            attributes: ['user_id', 'full_name', 'role']
          }]
        });

        if (sampleCharity) {
          console.log('✅ Charity with user association found:', {
            charity_id: sampleCharity.charity_id,
            name: sampleCharity.name,
            user: sampleCharity.user ? sampleCharity.user.full_name : 'No user'
          });
        }
      }
    } catch (error) {
      console.log('❌ Charity model test failed:', error.message);
    }

    await sequelize.close();
    console.log('\n🎉 Association tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n🔧 Database connection failed. Please:');
      console.error('   1. Check if PostgreSQL is running');
      console.error('   2. Verify .env file has correct database credentials');
      console.error('   3. Run: node fix-database.js');
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n🔧 Tables do not exist. Please:');
      console.error('   1. Run: node fix-database.js');
      console.error('   2. This will create all necessary tables');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  testAssociations().catch(console.error);
}

module.exports = { testAssociations };
