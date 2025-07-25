const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Demo script để test endpoint xem detail campaign pending
async function demoCampaignDetail() {
	console.log('🎯 Demo: Xem Detail Campaign Pending\n');

	try {
		// Bước 1: Login với admin account (cần có sẵn admin user)
		console.log('📝 Bước 1: Login admin...');

		const adminLogin = {
			email: 'admin@donatrust.com', // Thay bằng admin email thực tế
			password: 'admin123', // Thay bằng password thực tế
		};

		const loginResponse = await axios.post(`${BASE_URL}/auth/login`, adminLogin);

		if (!loginResponse.data.token) {
			throw new Error('Không thể login admin');
		}

		const token = loginResponse.data.token;
		console.log('✅ Login admin thành công');

		// Headers với token
		const headers = {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		};

		// Bước 2: Lấy danh sách campaign pending
		console.log('\n📋 Bước 2: Lấy danh sách campaigns pending...');

		const pendingResponse = await axios.get(`${BASE_URL}/admin/campaigns/pending`, { headers });
		const pendingCampaigns = pendingResponse.data;

		console.log(`📊 Tìm thấy ${pendingCampaigns.length} campaigns pending`);

		if (pendingCampaigns.length === 0) {
			console.log('ℹ️ Không có campaign pending nào để xem detail');
			return;
		}

		// Hiển thị danh sách campaign pending
		console.log('\n📝 Danh sách campaigns pending:');
		pendingCampaigns.forEach((campaign, index) => {
			console.log(`${index + 1}. ${campaign.title} (ID: ${campaign.campaign_id})`);
			console.log(`   Charity: ${campaign.charity?.name}`);
			console.log(`   Status: ${campaign.approval_status}`);
			console.log(`   Created: ${new Date(campaign.created_at).toLocaleDateString()}`);
			console.log('');
		});

		// Bước 3: Xem detail của campaign đầu tiên
		const firstCampaign = pendingCampaigns[0];
		console.log(`🔍 Bước 3: Xem detail campaign "${firstCampaign.title}"...\n`);

		const detailResponse = await axios.get(`${BASE_URL}/admin/campaigns/${firstCampaign.campaign_id}`, { headers });
		const campaignDetail = detailResponse.data;

		// Hiển thị thông tin chi tiết
		console.log('📄 Thông tin chi tiết campaign:');
		console.log('=====================================');
		console.log(`Tiêu đề: ${campaignDetail.title}`);
		console.log(`Mô tả: ${campaignDetail.description}`);
		console.log(`Mô tả chi tiết: ${campaignDetail.detailed_description || 'Không có'}`);
		console.log(`Mục tiêu: ${Number(campaignDetail.goal_amount).toLocaleString('vi-VN')} VND`);
		console.log(`Đã quyên góp: ${Number(campaignDetail.current_amount).toLocaleString('vi-VN')} VND`);
		console.log(`Ngày bắt đầu: ${new Date(campaignDetail.start_date).toLocaleDateString()}`);
		console.log(`Ngày kết thúc: ${new Date(campaignDetail.end_date).toLocaleDateString()}`);
		console.log(`Danh mục: ${campaignDetail.category}`);
		console.log(`Trạng thái: ${campaignDetail.status}`);
		console.log(`Trạng thái phê duyệt: ${campaignDetail.approval_status}`);
		console.log(`Địa điểm: ${campaignDetail.location || 'Không có'}`);
		console.log(`Đối tượng thụ hưởng: ${campaignDetail.beneficiaries || 'Không có'}`);
		console.log(`Tác động dự kiến: ${campaignDetail.expected_impact || 'Không có'}`);

		// Thông tin charity
		if (campaignDetail.charity) {
			console.log('\n🏢 Thông tin tổ chức từ thiện:');
			console.log('=====================================');
			console.log(`Tên: ${campaignDetail.charity.name}`);
			console.log(`Email: ${campaignDetail.charity.email}`);
			console.log(`Điện thoại: ${campaignDetail.charity.phone}`);
			console.log(`Địa chỉ: ${campaignDetail.charity.address}, ${campaignDetail.charity.city}`);
			console.log(`Trạng thái xác thực: ${campaignDetail.charity.verification_status}`);

			if (campaignDetail.charity.user) {
				console.log(`Người đại diện: ${campaignDetail.charity.user.full_name}`);
				console.log(`Email người đại diện: ${campaignDetail.charity.user.email}`);
			}
		}

		// Thông tin donations (nếu có)
		if (campaignDetail.donations && campaignDetail.donations.length > 0) {
			console.log('\n💰 Donations gần đây:');
			console.log('=====================================');
			campaignDetail.donations.forEach((donation, index) => {
				console.log(`${index + 1}. ${Number(donation.amount).toLocaleString('vi-VN')} VND`);
				console.log(`   Từ: ${donation.is_anonymous ? 'Ẩn danh' : donation.user?.full_name || 'Không rõ'}`);
				console.log(`   Phương thức: ${donation.method || 'Không rõ'}`);
				console.log(`   Mã giao dịch: ${donation.tx_code || 'Không có'}`);

				// Only show message if it exists
				if (donation.hasOwnProperty('message')) {
					console.log(`   Tin nhắn: ${donation.message || 'Không có tin nhắn'}`);
				}

				console.log(`   Ngày: ${new Date(donation.created_at).toLocaleDateString()}`);
				console.log('');
			});
		}

		// Hình ảnh và tài liệu
		if (campaignDetail.image_url) {
			console.log(`\n🖼️ Ảnh chính: ${campaignDetail.image_url}`);
		}

		if (campaignDetail.gallery_images && campaignDetail.gallery_images.length > 0) {
			console.log(`\n📷 Gallery (${campaignDetail.gallery_images.length} ảnh):`);
			campaignDetail.gallery_images.forEach((img, index) => {
				console.log(`${index + 1}. ${img}`);
			});
		}

		if (campaignDetail.documents && campaignDetail.documents.length > 0) {
			console.log(`\n📄 Tài liệu (${campaignDetail.documents.length} file):`);
			campaignDetail.documents.forEach((doc, index) => {
				console.log(`${index + 1}. ${doc}`);
			});
		}

		console.log('\n✅ Demo hoàn thành! Bạn có thể sử dụng thông tin này để:');
		console.log('- Phê duyệt campaign: PUT /admin/campaigns/{id}/approve');
		console.log('- Từ chối campaign: PUT /admin/campaigns/{id}/reject');
	} catch (error) {
		console.error('❌ Lỗi:', error.response?.data?.message || error.message);
		console.error('\n💡 Lưu ý:');
		console.error('- Đảm bảo server đang chạy trên port 3000');
		console.error('- Kiểm tra thông tin login admin');
		console.error('- Đảm bảo có ít nhất 1 campaign pending trong hệ thống');
	}
}

// Chạy demo
if (require.main === module) {
	demoCampaignDetail();
}

module.exports = { demoCampaignDetail };
