const express = require('express');
const router = express.Router();
const donationService = require('../services/donationService');

router.post('/', async (req, res, next) => {
  try {
    const donation = await donationService.createDonation(req.body);
    res.status(201).json(donation);
  } catch (error) {
    next(error);
  }
});

    
router.get('/history', async (req, res, next) => {
  try {
    await donationService.getDonationHistory(req, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;