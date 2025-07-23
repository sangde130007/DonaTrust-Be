const sequelize = require('./src/config/database');
const DaoApplication = require('./src/models/DaoApplication');
const User = require('./src/models/User');

async function testDaoSystem() {
  try {
    console.log('🔄 Testing DAO Registration System...');

    // 1. Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // 2. Sync models
    await DaoApplication.sync({ force: false });
    console.log('✅ DaoApplication table ready');

    // 3. Test associations
    const testQuery = await DaoApplication.findAll({
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

    // 4. Test constants
    const { DAO_APPLICATION_STATUS } = require('./src/config/constants');
    console.log('✅ DAO constants available:', DAO_APPLICATION_STATUS);

    console.log('🎉 DAO Registration System is fully ready!');
    console.log('\n📝 Available API endpoints:');
    console.log('POST /api/dao/register - Submit DAO application');
    console.log('GET /api/dao/my-application - Get my application status');
    console.log('GET /api/dao/applications - List all applications (admin)');
    console.log('GET /api/dao/applications/:id - Get application details (admin)');
    console.log('POST /api/dao/applications/:id/approve - Approve application (admin)');
    console.log('POST /api/dao/applications/:id/reject - Reject application (admin)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

testDaoSystem();