// src/services/donationService.js
const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const { AppError } = require('../utils/errorHandler');

// Lấy sequelize instance từ model (không cần ../models/index.js)
const sequelize = Donation.sequelize;

/**
 * Tạo donation + cập nhật campaign + auto-feature khi đạt 50%
 */
exports.create = async (data) => {
  // data cần có: campaign_id, user_id (hoặc donor info), amount, note...
  if (!data?.campaign_id) throw new AppError('Thiếu campaign_id', 400);
  const amountNum = Number(data?.amount || 0);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new AppError('Số tiền không hợp lệ', 400);
  }

  return await sequelize.transaction(async (t) => {
    // 1) Tạo donation
    const donation = await Donation.create(
      { ...data, amount: amountNum },
      { transaction: t }
    );

    // 2) Tải campaign (FOR UPDATE)
    const campaign = await Campaign.findOne({
      where: { campaign_id: data.campaign_id },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!campaign) throw new AppError('Không tìm thấy chiến dịch', 404);

    const goal = Number(campaign.goal_amount || 0);
    const current = Number(campaign.current_amount || 0);
    const next = current + amountNum;

    // 3) Cập nhật số tiền hiện tại
    await campaign.update(
      { current_amount: next },
      { transaction: t }
    );

    // 4) Auto-feature nếu đạt >= 50% mục tiêu
    if (goal > 0 && next >= goal * 0.5 && !campaign.featured) {
      await campaign.update({ featured: true }, { transaction: t });
    }

    return {
      donation,
      campaign: await Campaign.findByPk(campaign.campaign_id, { transaction: t })
    };
  });
};

exports.getAll = async () => {
  return await Donation.findAll();
};

exports.getById = async (id) => {
  const donation = await Donation.findByPk(id);
  if (!donation) throw new AppError('Không tìm thấy khoản quyên góp', 404);
  return donation;
};

exports.update = async (id, data) => {
  const donation = await Donation.findByPk(id);
  if (!donation) throw new AppError('Không tìm thấy khoản quyên góp', 404);
  await donation.update(data);
  return donation;
};

exports.delete = async (id) => {
  const donation = await Donation.findByPk(id);
  if (!donation) throw new AppError('Không tìm thấy khoản quyên góp', 404);
  await donation.destroy();
};
