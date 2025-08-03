const { User, Charity, Campaign, DaoApplication, CampaignVote } = require('./src/models/associations');
const sequelize = require('./src/config/database');

async function seedDaoData() {
  try {
    console.log('🌱 Starting to seed DAO data...');

    // 1. Create Users
    const users = await User.bulkCreate([
      {
        user_id: 'user001',
        full_name: 'Nguyễn Văn A',
        email: 'user001@example.com',
        password: '$2b$10$example_hash', // In production, use proper hashing
        role: 'user',
        status: 'active'
      },
      {
        user_id: 'user002',
        full_name: 'Trần Thị B',
        email: 'user002@example.com',
        password: '$2b$10$example_hash',
        role: 'user',
        status: 'active'
      },
      {
        user_id: 'dao_member001',
        full_name: 'DAO Member 1',
        email: 'dao1@example.com',
        password: '$2b$10$example_hash',
        role: 'dao_member',
        status: 'active'
      },
      {
        user_id: 'dao_member002',
        full_name: 'DAO Member 2',
        email: 'dao2@example.com',
        password: '$2b$10$example_hash',
        role: 'dao_member',
        status: 'active'
      }
    ], { ignoreDuplicates: true });

    console.log('✅ Users created');

    // 2. Create Charities
    const charities = await Charity.bulkCreate([
      {
        charity_id: 'charity001',
        user_id: 'user001',
        name: 'Quỹ từ thiện ABC',
        description: 'Tổ chức từ thiện uy tín với nhiều năm hoạt động',
        email: 'charity@abc.com',
        phone: '0123456789',
        verification_status: 'verified'
      },
      {
        charity_id: 'charity002',
        user_id: 'user002',
        name: 'Quỹ từ thiện XYZ',
        description: 'Tổ chức từ thiện mới với nhiều dự án ý nghĩa',
        email: 'charity@xyz.com',
        phone: '0987654321',
        verification_status: 'verified'
      }
    ], { ignoreDuplicates: true });

    console.log('✅ Charities created');

    // 3. Create Campaigns
    const campaigns = await Campaign.bulkCreate([
      {
        campaign_id: 'campaign001',
        charity_id: 'charity001',
        title: 'Xây trường học vùng cao',
        description: 'Dự án xây dựng trường học cho trẻ em vùng cao tại Sơn La. Dự án sẽ cung cấp cơ sở vật chất học tập tốt cho hơn 200 học sinh.',
        detailed_description: 'Chi tiết dự án bao gồm:\n- Xây dựng 5 phòng học\n- Thư viện với 1000 đầu sách\n- Sân chơi và nhà vệ sinh\n- Đào tạo giáo viên địa phương',
        goal_amount: 500000000,
        category: 'education',
        location: 'Sơn La',
        status: 'pending',
        approval_status: 'pending',
        dao_approval_status: 'pending',
        beneficiaries: '200 học sinh vùng cao',
        expected_impact: 'Nâng cao chất lượng giáo dục cho trẻ em vùng cao'
      },
      {
        campaign_id: 'campaign002',
        charity_id: 'charity002',
        title: 'Hỗ trợ y tế cho người nghèo',
        description: 'Cung cấp dịch vụ y tế miễn phí cho người dân nghèo tại Hà Nội. Dự án sẽ tổ chức các buổi khám bệnh và cấp thuốc miễn phí.',
        detailed_description: 'Dự án bao gồm:\n- Khám bệnh miễn phí cho 500 người\n- Cấp thuốc cơ bản\n- Tư vấn dinh dưỡng\n- Khám sức khỏe định kỳ',
        goal_amount: 300000000,
        category: 'health',
        location: 'Hà Nội',
        status: 'pending',
        approval_status: 'pending',
        dao_approval_status: 'pending',
        beneficiaries: '500 người dân nghèo',
        expected_impact: 'Cải thiện sức khỏe cộng đồng'
      },
      {
        campaign_id: 'campaign003',
        charity_id: 'charity001',
        title: 'Bảo vệ môi trường',
        description: 'Dự án trồng cây và bảo vệ môi trường tại TP.HCM. Dự án sẽ trồng 1000 cây xanh và tổ chức các hoạt động bảo vệ môi trường.',
        detailed_description: 'Hoạt động bao gồm:\n- Trồng 1000 cây xanh\n- Tổ chức các buổi dọn rác\n- Giáo dục môi trường cho học sinh\n- Tạo không gian xanh cho cộng đồng',
        goal_amount: 200000000,
        category: 'environment',
        location: 'TP.HCM',
        status: 'pending',
        approval_status: 'pending',
        dao_approval_status: 'pending',
        beneficiaries: 'Cộng đồng TP.HCM',
        expected_impact: 'Cải thiện môi trường và nâng cao ý thức bảo vệ môi trường'
      }
    ], { ignoreDuplicates: true });

    console.log('✅ Campaigns created');

    // 4. Create DAO Applications
    const daoApplications = await DaoApplication.bulkCreate([
      {
        application_id: 'dao_app001',
        user_id: 'dao_member001',
        full_name: 'DAO Member 1',
        email: 'dao1@example.com',
        introduction: 'Tôi là một chuyên gia trong lĩnh vực từ thiện với nhiều năm kinh nghiệm. Tôi đã tham gia và quản lý nhiều dự án từ thiện có tác động tích cực đến cộng đồng.',
        experience: 'Đã tham gia nhiều dự án từ thiện và có hiểu biết sâu rộng về quản trị phi tập trung. Tôi có kinh nghiệm trong việc đánh giá tính khả thi và tác động của các dự án từ thiện.',
        areas_of_interest: {
          education: true,
          health: true,
          environment: false,
          poverty: true,
          disaster: false,
          children: true,
          elderly: false,
          disability: true,
          animals: false,
          community: true
        },
        status: 'approved'
      },
      {
        application_id: 'dao_app002',
        user_id: 'dao_member002',
        full_name: 'DAO Member 2',
        email: 'dao2@example.com',
        introduction: 'Chuyên gia về blockchain và quản trị phi tập trung với đam mê về các dự án có tác động xã hội tích cực.',
        experience: 'Có kinh nghiệm trong việc đánh giá và quản lý các dự án từ thiện. Tôi hiểu rõ về các tiêu chí đánh giá và cách thức hoạt động của các tổ chức từ thiện.',
        areas_of_interest: {
          education: true,
          health: false,
          environment: true,
          poverty: true,
          disaster: true,
          children: false,
          elderly: true,
          disability: false,
          animals: true,
          community: true
        },
        status: 'approved'
      }
    ], { ignoreDuplicates: true });

    console.log('✅ DAO Applications created');

    // 5. Create some sample votes (optional)
    const votes = await CampaignVote.bulkCreate([
      {
        vote_id: 'vote001',
        campaign_id: 'campaign001',
        voter_id: 'dao_member001',
        vote_decision: 'approve',
        vote_reason: 'Campaign có mục tiêu rõ ràng và khả thi. Dự án sẽ có tác động tích cực đến giáo dục vùng cao.'
      },
      {
        vote_id: 'vote002',
        campaign_id: 'campaign001',
        voter_id: 'dao_member002',
        vote_decision: 'approve',
        vote_reason: 'Dự án có tác động tích cực đến cộng đồng và được lập kế hoạch chi tiết.'
      }
    ], { ignoreDuplicates: true });

    console.log('✅ Sample votes created');

    console.log('🎉 DAO data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Charities: ${charities.length}`);
    console.log(`- Campaigns: ${campaigns.length}`);
    console.log(`- DAO Applications: ${daoApplications.length}`);
    console.log(`- Sample Votes: ${votes.length}`);

    console.log('\n🔗 You can now:');
    console.log('1. Login as DAO member (dao1@example.com or dao2@example.com)');
    console.log('2. Visit /dao/campaigns/pending to see campaigns for voting');
    console.log('3. Vote on campaigns at /dao/campaigns/:id');

  } catch (error) {
    console.error('❌ Error seeding DAO data:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the seeding
seedDaoData();