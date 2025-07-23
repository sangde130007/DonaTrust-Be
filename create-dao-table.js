const sequelize = require('./src/config/database');
const DaoApplication = require('./src/models/DaoApplication');
const User = require('./src/models/User');

async function createDaoTable() {
  try {
    console.log('🔄 Creating DAO Applications table...');

    // Create the table if it doesn't exist
    await DaoApplication.sync({ force: false });

    console.log('✅ DAO Applications table created successfully');

    // Test the associations
    const testUserId = 'test_user_123';
    console.log('🔍 Testing associations...');

    // This will throw an error if associations are not properly set up
    const applications = await DaoApplication.findAll({
      include: [
        {
          model: User,
          as: 'user',
          required: false,
        },
      ],
      limit: 1,
    });

    console.log('✅ Associations working correctly');
    console.log('🎉 DAO Application system is ready to use!');

  } catch (error) {
    console.error('❌ Error setting up DAO table:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

createDaoTable(); 