const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./users');
const userSocialLinkRoutes = require('./userSocialLinks');
const charityRoutes = require('./charities');
const campaignRoutes = require('./campaigns');
const donationRoutes = require('./donations');
const feedbackRoutes = require('./feedbacks');
const voteRoutes = require('./votes');
const notificationRoutes = require('./notifications');
const adminRoutes = require('./admin');
const newsRoutes = require('./news');
const daoRoutes = require('./dao');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/user-social-links', userSocialLinkRoutes);
router.use('/charities', charityRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/donations', donationRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/votes', voteRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/news', newsRoutes);
router.use('/dao', daoRoutes);


module.exports = router;
