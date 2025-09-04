const express = require('express');
const router = express.Router();
const donationService = require('../services/donationService'); // <-- đường dẫn theo repo của bạn

// PayOS sẽ POST webhook payload ở đây
router.post('/', express.json(), async (req, res) => {
  try {
    const result = await donationService.handlePayOSWebhook(req.body);
    return res.status(200).json(result || { message: 'ok' });
  } catch (err) {
    // Nếu bạn dùng AppError có .status, trả status đó
    const status = (err && err.status) || 500;
    console.error('PayOS webhook error:', err && err.message ? err.message : err);
    return res.status(status).json({ message: err.message || 'Webhook processing error' });
  }
});

module.exports = router;