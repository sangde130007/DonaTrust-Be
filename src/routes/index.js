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
const adminRoutes = require('./admin'); // ⬅️ admin router tổng
const newsRoutes = require('./news');
const daoRoutes = require('./dao');
const chatRoutes = require('./chat');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/user-social-links', userSocialLinkRoutes);
router.use('/charities', charityRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/donations', donationRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/votes', voteRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);   // ⬅️ tất cả admin route nằm dưới /api/admin
router.use('/news', newsRoutes);
router.use('/dao', daoRoutes);
router.use('/chat', chatRoutes);
router.use('/', notificationRoutes);

module.exports = router;
