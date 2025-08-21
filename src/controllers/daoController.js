const daoService = require('../services/daoService');
const { check } = require('express-validator');
const validate = require('../middleware/validationMiddleware');

/**
 * @swagger
 * tags:
 *   name: DAO Management
 *   description: API quản lý DAO voting system
 */

class DAOController {
  /**
   * @swagger
   * /api/dao/campaigns/pending:
   *   get:
   *     summary: Lấy danh sách campaigns chờ vote DAO
   *     tags: [DAO Management]
   *     security:
   *       - bearerAuth: []
   */
  getPendingCampaigns = async (req, res, next) => {
    try {
      const result = await daoService.getPendingCampaigns(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/dao/campaigns/{id}:
   *   get:
   *     summary: Lấy chi tiết campaign với thông tin vote
   *     tags: [DAO Management]
   *     security:
   *       - bearerAuth: []
   */
  getCampaignDetail = async (req, res, next) => {
    try {
      const campaign = await daoService.getCampaignDetail(req.params.id, req.user.user_id);
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/dao/campaigns/{id}/vote:
   *   post:
   *     summary: Vote cho campaign
   *     tags: [DAO Management]
   *     security:
   *       - bearerAuth: []
   */
  voteCampaign = [
    check('decision')
      .isIn(['approve', 'reject'])
      .withMessage('Decision phải là approve hoặc reject'),
    check('reason')
      .optional()
      .isLength({ min: 10, max: 500 })
      .withMessage('Lý do vote phải từ 10-500 ký tự'),
    validate,
    async (req, res, next) => {
      try {
        const vote = await daoService.voteCampaign(
          req.params.id,
          req.user.user_id,
          req.body
        );
        res.status(201).json({
          message: 'Vote thành công',
          vote
        });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/dao/stats:
   *   get:
   *     summary: Lấy thống kê DAO
   *     tags: [DAO Management]
   *     security:
   *       - bearerAuth: []
   */
  getStats = async (req, res, next) => {
    try {
      const stats = await daoService.getDAOStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/dao/campaigns/dao-approved:
   *   get:
   *     summary: Lấy danh sách campaigns đã được DAO approve (cho admin)
   *     tags: [DAO Management]
   *     security:
   *       - bearerAuth: []
   */
  getDAOApprovedCampaigns = async (req, res, next) => {
    try {
      const campaigns = await daoService.getDAOApprovedCampaigns();
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/dao/campaigns/dao-rejected:
   *   get:
   *     summary: Lấy danh sách campaigns bị DAO reject
   *     tags: [DAO Management]
   *     security:
   *       - bearerAuth: []
   */
  getDAORejectedCampaigns = async (req, res, next) => {
    try {
      const campaigns = await daoService.getDAORejectedCampaigns();
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/dao/my-votes:
   *   get:
   *     summary: Lấy lịch sử vote của user hiện tại
   *     tags: [DAO Management]
   *     security:
   *       - bearerAuth: []
   */
  getMyVotes = async (req, res, next) => {
    try {
      const votes = await daoService.getMyVotes(req.user.user_id, req.query);
      res.json(votes);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/dao/my-vote-statistics:
   *   get:
   *     summary: Lấy thống kê vote của user hiện tại
   *     tags: [DAO Management]
   *     security:
   *       - bearerAuth: []
   */
  getMyVoteStatistics = async (req, res, next) => {
    try {
      const stats = await daoService.getMyVoteStatistics(req.user.user_id);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new DAOController();
