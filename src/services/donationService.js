const PayOS = require('@payos/node');
const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const crypto = require('crypto');
const payosConfig = require('../config/payos');
const QRCode = require('qrcode');
const sequelize = require('../config/database');

const payos = new PayOS(payosConfig.clientId, payosConfig.apiKey, payosConfig.checksumKey);

function createSignatureData(obj) {
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    let value = obj[key];
    if (value === null || value === undefined || value === 'null' || value === 'undefined') {
      value = '';
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      value = JSON.stringify(value);
    }
    return `${key}=${value}`;
  });
  return pairs.join('&');
}

exports.handlePayOSWebhook = async (webhookData) => {
  // Basic validation
  if (!webhookData || typeof webhookData !== 'object') {
    logger.warn('Webhook body không hợp lệ, có thể là health check:', webhookData);
    return { message: 'Webhook URL hoạt động' };
  }

  // Health-check pattern
  if (webhookData.orderCode && webhookData.amount && !webhookData.code && !webhookData.signature) {
    logger.warn('Health check detected:', webhookData);
    return { message: 'Webhook URL hoạt động' };
  }

  const { code, desc, signature } = webhookData;
  const data = webhookData.data || webhookData;

  // Required fields
  if (!code || !data || !signature) {
    logger.error('Webhook thiếu các trường bắt buộc:', { code, data, signature });
    throw new AppError('Webhook thiếu các trường bắt buộc', 400);
  }

  if (code !== '00') {
    logger.error(`Webhook thất bại từ PayOS: ${desc}`, { code, desc });
    throw new AppError(`Webhook thất bại: ${desc}`, 400);
  }

  if (!data || typeof data !== 'object') {
    logger.error('Webhook data không hợp lệ:', data);
    throw new AppError('Webhook data không hợp lệ', 400);
  }

  logger.info('Received data:', data);

  // Extract minimal fields
  const rawOrderCode = data.orderCode;
  const orderCode = rawOrderCode != null ? String(rawOrderCode).trim() : null;
  const rawAmount = data.amount;
  const amount = rawAmount != null ? Number(rawAmount) : null;
  let status = data.status || 'PENDING';

  if (!orderCode || amount === null || Number.isNaN(amount)) {
    logger.error('Webhook data thiếu orderCode hoặc amount hợp lệ', { orderCode, amount });
    throw new AppError('Webhook data thiếu orderCode hoặc amount hợp lệ', 400);
  }

  // Signature verification
  const signatureData = createSignatureData(data);
  const expectedSignature = crypto
    .createHmac('sha256', payosConfig.checksumKey)
    .update(signatureData)
    .digest('hex');

  logger.info(`Expected signature: ${expectedSignature}`);
  logger.info(`Received signature: ${signature}`);

  if (signature !== expectedSignature) {
    logger.error('Chữ ký webhook không hợp lệ', { expectedSignature, signature });
    throw new AppError('Chữ ký webhook không hợp lệ', 400);
  }

  // Tìm donation
  let donation = await Donation.findOne({
    where: { tx_code: orderCode },
    include: [{ model: Campaign, as: 'campaign' }],
  });

  if (!donation) {
    logger.warn(`Không tìm thấy donation với tx_code: ${orderCode}. Payload:`, data);

    const createOrphan = (process.env.CREATE_ORPHAN_ON_MISSING || 'false').toLowerCase() === 'true';

    if (createOrphan) {
      try {
        const orphanStatus = status === 'PAID' ? 'completed' : status === 'CANCELLED' ? 'failed' : 'pending';
        const orphan = await Donation.create({
          campaign_id: null,
          user_id: null,
          amount: parseFloat(amount) || 0,
          method: 'bank_transfer',
          tx_code: orderCode,
          message: data.desc || data.description || null,
          is_anonymous: true,
          status: orphanStatus,
          email: data.buyerEmail || null,
        });
        logger.info('Orphan donation created for reconciliation', { tx_code: orderCode, orphanId: orphan.id });
        return { message: 'Webhook processed: orphan donation created' };
      } catch (err) {
        logger.error('Lỗi khi tạo orphan donation:', err);
        return { message: 'Webhook received but failed to create orphan donation' };
      }
    } else {
      logger.warn('Không tạo orphan (CREATE_ORPHAN_ON_MISSING=false). Vui lòng điều tra thủ công.', { tx_code: orderCode });
      return { message: 'Webhook received but no matching donation; check system' };
    }
  }

  // Xác định trạng thái dựa trên code
  const newStatus = code === '00' ? 'completed' : status === 'CANCELLED' ? 'failed' : 'pending';

  await sequelize.transaction(async (t) => {
    await donation.update({ status: newStatus }, { transaction: t });
    logger.info(`Updated donation status to ${newStatus} for tx_code: ${orderCode}`);

    if (newStatus === 'completed' && donation.campaign_id) {
      const campaignRecord = await Campaign.findOne({
        where: { campaign_id: donation.campaign_id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!campaignRecord) {
        logger.error(`Không tìm thấy campaign với campaign_id: ${donation.campaign_id}`);
        throw new AppError(`Không tìm thấy campaign với campaign_id: ${donation.campaign_id}`, 404);
      }

      const oldAmount = parseFloat(campaignRecord.current_amount) || 0;
      const added = parseFloat(amount) || 0;
      const newAmount = oldAmount + added;

      await campaignRecord.update({ current_amount: newAmount }, { transaction: t });
      logger.info(`Updated campaign ${campaignRecord.title}: ${oldAmount} + ${added} = ${newAmount}, tx_code: ${orderCode}`);
    } else {
      logger.info(`No campaign update needed for tx_code: ${orderCode}`);
    }
  });

  return { message: 'Webhook processed successfully' };
};

function truncateUtf8(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

const binToBank = {
  '970418': 'Ngân hàng BIDV',
  '970405': 'Ngân hàng Vietcombank',
  '970436': 'Ngân hàng BIDV',
  '970422': 'Ngân hàng VietinBank',
  // Thêm các BIN khác nếu cần
};

function formatAccountNumber(accountNumber) {
  if (!accountNumber || typeof accountNumber !== 'string') return '—';
  // Loại bỏ tiền tố V3CAS nếu có
  const cleaned = accountNumber.replace('V3CAS', '');
  // Chia thành các nhóm 4 chữ số
  return cleaned.match(/.{1,4}/g).join(' ');
}

exports.createDonation = async (donationData) => {
  const { campaign_id } = donationData;
  const rawAmount = donationData.amount;
  const amount = rawAmount === '' || rawAmount === null || rawAmount === undefined
    ? NaN
    : Number(rawAmount);

  const blessing = donationData.blessing || null;
  const full_name = donationData.full_name || null;
  const email = donationData.email || null;
  const anonymous = !!donationData.anonymous;

  if (!campaign_id) throw new AppError('Missing campaign_id', 400);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError('Số tiền quyên góp không hợp lệ', 400);
  if (amount < 10000) throw new AppError('Số tiền quyên góp phải lớn hơn hoặc bằng 10,000 VND', 400);

  const campaign = await Campaign.findOne({
    where: { campaign_id, status: 'active', approval_status: 'approved' },
  });
  if (!campaign) throw new AppError('Chiến dịch không tồn tại hoặc không ở trạng thái hoạt động', 404);

  const orderCodeNumber = Date.now() + Math.floor(Math.random() * 1000);
  const orderCode = Number(orderCodeNumber);

  const rawDescription = `Quyên góp cho ${campaign.title || campaign_id}`;
  const description = truncateUtf8(rawDescription, 25);

  const paymentData = {
    orderCode,
    amount: Math.round(amount),
    description,
    buyerName: anonymous ? 'Ẩn danh' : (full_name || 'Khách'),
    buyerEmail: email,
    returnUrl: payosConfig.returnUrl,
    cancelUrl: payosConfig.cancelUrl.replace(':id', campaign_id),
  };

  logger.info('Creating PayOS payment link', { paymentData });

  try {
    const paymentLink = await payos.createPaymentLink(paymentData);

    if (!paymentLink || paymentLink.orderCode == null) {
      logger.error('PayOS trả về dữ liệu không hợp lệ khi tạo link', { paymentLink });
      throw new AppError('PayOS trả về dữ liệu không hợp lệ', 500);
    }

    logger.info('PayOS payment link response', { paymentLink });

    const donation = await Donation.create({
      campaign_id,
      user_id: null,
      amount: parseFloat(amount),
      method: 'bank_transfer',
      tx_code: String(paymentLink.orderCode),
      message: blessing || null,
      is_anonymous: anonymous,
      status: 'pending',
      email: email || null,
    });

    logger.info('Donation created', { donationId: donation.id, tx_code: donation.tx_code });

    let qrCode = paymentLink.qrCode || null;
    if (qrCode) {
      try {
        qrCode = await QRCode.toDataURL(qrCode);
        logger.info('Converted QR Code to base64', { qrCodeLength: qrCode.length });
      } catch (err) {
        logger.warn('Không thể tạo QR Code base64', { error: err.message });
        qrCode = null;
      }
    }

    return {
      donation,
      paymentUrl: paymentLink.checkoutUrl,
      qrCode,
      bankName: paymentLink.bin ? binToBank[paymentLink.bin.substring(0, 6)] || 'Ngân hàng không xác định' : '—',
      accountNumber: formatAccountNumber(paymentLink.accountNumber),
      accountName: paymentLink.accountName || '—',
      amount: paymentLink.amount || '—',
      description: paymentLink.description || '—',
    };
  } catch (error) {
    logger.error('Error creating PayOS payment link', {
      message: error && error.message,
      stack: error && error.stack,
      response: error && error.response && error.response.data ? error.response.data : undefined,
    });
    const errMsg = error && error.message ? error.message : 'Không thể tạo liên kết thanh toán';
    throw new AppError(errMsg, 500);
  }
};

exports.getDonationHistory = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;
  const campaign_id = req.query.campaign_id;

  try {
    const whereClause = { status: 'completed' };
    if (campaign_id) {
      whereClause.campaign_id = campaign_id;
    }

    const { count, rows } = await Donation.findAndCountAll({
      where: whereClause,
      offset,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']],
      attributes: ['donation_id', 'campaign_id', 'amount', 'message', 'is_anonymous', 'status', 'created_at', 'email', 'full_name'],
    });

    const donations = rows.map(donation => ({
      donation_id: donation.donation_id,
      campaign_id: donation.campaign_id,
      amount: Number(donation.amount) || 0, // Trả về số
      message: donation.message || 'Không có lời chúc',
      is_anonymous: donation.is_anonymous || false,
      status: donation.status || 'unknown',
      created_at: donation.created_at ? donation.created_at.toISOString() : new Date().toISOString(), // Chuẩn ISO 8601
      name: donation.is_anonymous ? null : (donation.full_name || null),
      email: donation.is_anonymous ? null : (donation.email || null),
    }));

    const totalPages = Math.ceil(count / limit);

    res.json({
      data: donations,
      total: count,
      page: parseInt(page),
      totalPages,
    });
  } catch (error) {
    logger.error('Lỗi khi lấy lịch sử quyên góp:', error);
    throw new AppError('Không thể lấy lịch sử quyên góp', 500);
  }
};

