// src/controllers/donationController.js
const donationService = require('../services/donationService');
const PayOS = require('@payos/node');
const { catchAsync } = require('../utils/catchAsync');
const { AppError } = require('../utils/errorHandler');

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

exports.createPayment = catchAsync(async (req, res) => {
  const { campaign_id, amount, blessing, full_name, email, anonymous, user_id } = req.body;

  const paymentData = await donationService.createDonationPayment({
    campaign_id,
    amount,
    blessing,
    full_name,
    email,
    anonymous,
    user_id
  });

  res.status(200).json({
    status: 'success',
    data: paymentData
  });
});

exports.handleWebhook = catchAsync(async (req, res) => {
  // Xác thực checksum từ PayOS
  const isValid = payos.verifyPaymentWebhook(req.body);
  if (!isValid) {
    throw new AppError('Invalid webhook signature', 403);
  }

  await donationService.handlePayOSWebhook(req.body);
  res.status(200).json({ message: 'Webhook processed successfully' });
});

exports.getDonationsByCampaign = catchAsync(async (req, res) => {
  const { campaign_id } = req.params;
  const donations = await donationService.getDonationsByCampaign(campaign_id);
  res.status(200).json({ status: 'success', data: donations });
});

exports.getDonationHistory = async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 5;
    const campaign_id = req.query.campaign_id || null;

    const result = await donationService.getDonationHistory({ campaign_id, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Không thể lấy lịch sử quyên góp' });
  }
};