const User = require('../models/User');
const Charity = require('../models/Charity');
const Campaign = require('../models/Campaign');
const { ROLES, CAMPAIGN_STATUSES } = require('../config/constants');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

const createSampleData = async () => {
	try {
		// Tạo admin user
		const adminPassword = await bcrypt.hash('Admin123', 12);
		const admin = await User.findOrCreate({
			where: { email: 'admin@donatrust.com' },
			defaults: {
				user_id: 'admin_001',
				full_name: 'Admin DonaTrust',
				email: 'admin@donatrust.com',
				phone: '0900000001',
				password: adminPassword	,
				role: ROLES.ADMIN,
				email_verified: true,
				status: 'active',
			},
		});

		// Tạo charity user
		const charityPassword = await bcrypt.hash('Charity123', 12);
		const charityUser = await User.findOrCreate({
			where: { email: 'charity@example.com' },
			defaults: {
				user_id: 'charity_001',
				full_name: 'Tổ chức từ thiện ABC',
				email: 'charity@example.com',
				phone: '0900000002',
				password: charityPassword,
				role: ROLES.CHARITY,
				email_verified: true,
				status: 'active',
			},
		});

		// Tạo charity profile
		if (charityUser[1]) {
			// Nếu user mới được tạo
			const charity = await Charity.findOrCreate({
				where: { user_id: charityUser[0].user_id },
				defaults: {
					user_id: charityUser[0].user_id,
					name: 'Quỹ từ thiện Trái Tim Vàng',
					description: 'Tổ chức từ thiện hoạt động trong lĩnh vực giáo dục và y tế',
					mission: 'Mang lại cơ hội giáo dục và chăm sóc sức khỏe cho trẻ em nghèo',
					vision: 'Một thế giới nơi mọi trẻ em đều có cơ hội phát triển',
					license_number: 'TC2024001',
					license_document: 'https://example.com/license.pdf',
					address: '123 Đường Nguyễn Văn Linh, Quận 7',
					city: 'TP.HCM',
					district: 'Quận 7',
					phone: '0900000002',
					email: 'charity@example.com',
					founded_year: 2020,
					website_url: 'https://traitimvang.org',
					verification_status: 'verified',
				},
			});

			// Tạo sample campaign
			if (charity[1]) {
				await Campaign.create({
					charity_id: charity[0].charity_id,
					title: 'Xây dựng trường học cho trẻ em vùng cao',
					description:
						'Chương trình xây dựng trường học tại các vùng núi cao, giúp trẻ em có môi trường học tập tốt hơn.',
					detailed_description: 'Chi tiết về dự án xây dựng trường học...',
					goal_amount: 500000000, // 500 triệu
					current_amount: 150000000, // 150 triệu
					start_date: new Date('2024-01-01'),
					end_date: new Date('2024-12-31'),
					category: 'education',
					tags: ['giáo dục', 'trẻ em', 'vùng cao'],
					location: 'Lào Cai, Việt Nam',
					beneficiaries: '500 trẻ em từ 6-15 tuổi',
					expected_impact: 'Cải thiện chất lượng giáo dục cho trẻ em vùng cao',
					status: CAMPAIGN_STATUSES.ACTIVE,
					approval_status: 'approved',
					image_url: 'https://example.com/campaign1.jpg',
					featured: true,
				});
			}
		}

		// Tạo donor user
		const donorPassword = await bcrypt.hash('Donor123', 12);
		await User.findOrCreate({
			where: { email: 'donor@example.com' },
			defaults: {
				user_id: 'donor_001',
				full_name: 'Nguyễn Văn Donor',
				email: 'donor@example.com',
				phone: '0900000003',
				password: donorPassword,
				role: ROLES.DONOR,
				email_verified: true,
				status: 'active',
			},
		});

		logger.info('Sample data created successfully');
	} catch (error) {
		logger.error('Error creating sample data:', error);
	}
};

module.exports = {
	createSampleData,
};
