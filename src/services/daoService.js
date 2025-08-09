// src/services/daoService.js
const { Op } = require('sequelize');
const { User, Campaign, Charity, CampaignVote } = require('../models/associations');
const { AppError } = require('../utils/errorHandler');
const { ROLES } = require('../config/constants');
const logger = require('../utils/logger');

class DAOService {
  /**
   * Lấy danh sách campaigns chờ vote DAO
   */
  async getPendingCampaigns(query = {}) {
    const { page = 1, limit = 10, category, search } = query;
    const offset = (page - 1) * limit;

    const whereClause = {
      approval_status: 'pending',
      status: 'pending'
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const campaigns = await Campaign.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Charity,
          as: 'charity',
          attributes: ['charity_id', 'name', 'verification_status'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['full_name', 'email'],
            },
          ],
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'ASC']],
    });

    // Lấy votes riêng cho mỗi campaign để tính statistics
    const campaignsWithStats = await Promise.all(
      campaigns.rows.map(async (campaign) => {
        const votes = await CampaignVote.findAll({
          where: { campaign_id: campaign.campaign_id },
          include: [
            {
              model: User,
              as: 'voter',
              attributes: ['user_id', 'full_name'],
            }
          ]
        });

        const totalVotes = votes.length;
        const approveVotes = votes.filter(v => v.vote_decision === 'approve').length;
        const rejectVotes = votes.filter(v => v.vote_decision === 'reject').length;
        const approvalRate = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0;

        return {
          ...campaign.toJSON(),
          vote_stats: {
            total_votes: totalVotes,
            approve_votes: approveVotes,
            reject_votes: rejectVotes,
            approval_rate: approvalRate.toFixed(1),
            needs_more_votes: totalVotes < 5,
            meets_threshold: approvalRate >= 50 && totalVotes >= 5,
          }
        };
      })
    );

    return {
      campaigns: campaignsWithStats,
      total: campaigns.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(campaigns.count / limit),
    };
  }

  /**
   * Lấy chi tiết campaign với vote info
   */
  async getCampaignDetail(campaignId, userId) {
   const campaign = await Campaign.findOne({
  where: {
    campaign_id: campaignId,
    approval_status: 'pending'
  },
  attributes: { exclude: [] }, // <-- đảm bảo không bị giới hạn trường
  include: [
    {
      model: Charity,
      as: 'charity',
      attributes: ['charity_id', 'name', 'verification_status', 'email', 'phone'],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'full_name', 'email'],
        },
      ],
    }
  ],
});


    if (!campaign) {
      throw new AppError('Không tìm thấy chiến dịch hoặc chiến dịch đã được xử lý', 404);
    }

    // Lấy tất cả votes cho campaign này
    const votes = await CampaignVote.findAll({
      where: { campaign_id: campaignId },
      include: [
        {
          model: User,
          as: 'voter',
          attributes: ['user_id', 'full_name'],
        }
      ]
    });

    // Kiểm tra user đã vote chưa
    const userVote = votes.find(v => v.voter_id === userId);

    // Tính toán vote stats
    const totalVotes = votes.length;
    const approveVotes = votes.filter(v => v.vote_decision === 'approve').length;
    const rejectVotes = votes.filter(v => v.vote_decision === 'reject').length;
    const approvalRate = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0;

    return {
      ...campaign.toJSON(),
      user_vote: userVote ? {
        decision: userVote.vote_decision,
        reason: userVote.vote_reason,
        created_at: userVote.created_at
      } : null,
      vote_stats: {
        total_votes: totalVotes,
        approve_votes: approveVotes,
        reject_votes: rejectVotes,
        approval_rate: approvalRate.toFixed(1),
        meets_threshold: approvalRate >= 50 && totalVotes >= 5,
        voter_list: votes.map(v => ({
          voter_name: v.voter?.full_name,
          decision: v.vote_decision,
          reason: v.vote_reason,
          created_at: v.created_at
        }))
      }
    };
  }

  /**
   * Vote cho campaign
   */
  async voteCampaign(campaignId, voterId, voteData) {
    const { decision, reason } = voteData;

    // Kiểm tra user có role DAO member
    const voter = await User.findByPk(voterId);
    if (!voter || voter.role !== ROLES.DAO_MEMBER) {
      throw new AppError('Chỉ thành viên DAO mới có quyền vote', 403);
    }

    // Kiểm tra campaign tồn tại và đang pending
    const campaign = await Campaign.findOne({
      where: {
        campaign_id: campaignId,
        approval_status: 'pending'
      }
    });

    if (!campaign) {
      throw new AppError('Không tìm thấy chiến dịch hoặc chiến dịch đã được xử lý', 404);
    }

    // Kiểm tra đã vote chưa
    const existingVote = await CampaignVote.findOne({
      where: {
        campaign_id: campaignId,
        voter_id: voterId
      }
    });

    if (existingVote) {
      throw new AppError('Bạn đã vote cho chiến dịch này rồi', 400);
    }

    // Tạo vote mới
    const vote = await CampaignVote.create({
      campaign_id: campaignId,
      voter_id: voterId,
      vote_decision: decision,
      vote_reason: reason
    });

    // Kiểm tra và cập nhật trạng thái campaign nếu đủ votes
    await this.checkAndUpdateCampaignStatus(campaignId);

    logger.info(`DAO vote created: ${decision} for campaign ${campaignId} by user ${voterId}`);
    return vote;
  }

  /**
   * Kiểm tra và cập nhật trạng thái campaign dựa trên votes
   */
  async checkAndUpdateCampaignStatus(campaignId) {
    // Lấy tất cả votes cho campaign
    const votes = await CampaignVote.findAll({
      where: { campaign_id: campaignId }
    });

    const totalVotes = votes.length;
    const approveVotes = votes.filter(v => v.vote_decision === 'approve').length;
    const approvalRate = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0;

    const campaign = await Campaign.findByPk(campaignId);

    // Điều kiện: cần ít nhất 5 votes và > 50% approve
    if (totalVotes >= 5) {
      if (approvalRate > 50) {
        // Đưa lên admin để duyệt
        await campaign.update({
          dao_approval_status: 'dao_approved',
          dao_approved_at: new Date(),
          dao_approval_rate: approvalRate.toFixed(1)
        });

        logger.info(`Campaign ${campaignId} passed DAO vote (${approvalRate.toFixed(1)}%) - sent to admin review`);
      } else {
        // Không đạt yêu cầu
        await campaign.update({
          dao_approval_status: 'dao_rejected',
          dao_rejected_at: new Date(),
          dao_approval_rate: approvalRate.toFixed(1),
          rejection_reason: `Campaign không đạt yêu cầu vote DAO (${approvalRate.toFixed(1)}% approval rate)`
        });

        logger.info(`Campaign ${campaignId} failed DAO vote (${approvalRate.toFixed(1)}%) - moved to rejected list`);
      }
    }
  }

  /**
   * Lấy danh sách campaigns đã được DAO approve (cho admin)
   */
  async getDAOApprovedCampaigns() {
    const campaigns = await Campaign.findAll({
      where: {
        dao_approval_status: 'dao_approved',
        approval_status: 'pending' // Chưa được admin xử lý
      },
      include: [
        {
          model: Charity,
          as: 'charity',
          attributes: ['charity_id', 'name'],
        }
      ],
      order: [['dao_approved_at', 'ASC']],
    });

    // Lấy votes cho mỗi campaign
    const campaignsWithVotes = await Promise.all(
      campaigns.map(async (campaign) => {
        const votes = await CampaignVote.findAll({
          where: { campaign_id: campaign.campaign_id },
          include: [
            {
              model: User,
              as: 'voter',
              attributes: ['full_name'],
            }
          ]
        });

        return {
          ...campaign.toJSON(),
          dao_votes: votes
        };
      })
    );

    return campaignsWithVotes;
  }

  /**
   * Lấy danh sách campaigns bị DAO reject
   */
  async getDAORejectedCampaigns() {
    const campaigns = await Campaign.findAll({
      where: {
        dao_approval_status: 'dao_rejected'
      },
      include: [
        {
          model: Charity,
          as: 'charity',
          attributes: ['charity_id', 'name'],
        }
      ],
      order: [['dao_rejected_at', 'DESC']],
    });

    // Lấy votes cho mỗi campaign
    const campaignsWithVotes = await Promise.all(
      campaigns.map(async (campaign) => {
        const votes = await CampaignVote.findAll({
          where: { campaign_id: campaign.campaign_id },
          include: [
            {
              model: User,
              as: 'voter',
              attributes: ['full_name'],
            }
          ]
        });

        return {
          ...campaign.toJSON(),
          dao_votes: votes
        };
      })
    );

    return campaignsWithVotes;
  }

  /**
   * Lấy thống kê DAO
   */
  async getDAOStats() {
    const [
      totalDAOMembers,
      pendingCampaigns,
      daoApprovedCampaigns,
      daoRejectedCampaigns,
      totalVotes
    ] = await Promise.all([
      User.count({ where: { role: ROLES.DAO_MEMBER, status: 'active' } }),
      Campaign.count({ where: { approval_status: 'pending', dao_approval_status: null } }),
      Campaign.count({ where: { dao_approval_status: 'dao_approved' } }),
      Campaign.count({ where: { dao_approval_status: 'dao_rejected' } }),
      CampaignVote.count()
    ]);

    return {
      total_dao_members: totalDAOMembers,
      pending_campaigns: pendingCampaigns,
      dao_approved_campaigns: daoApprovedCampaigns,
      dao_rejected_campaigns: daoRejectedCampaigns,
      total_votes_cast: totalVotes,
    };
  }

  /**
   * Lấy lịch sử vote của user
   */
  async getMyVotes(userId, query = {}) {
    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    const votes = await CampaignVote.findAndCountAll({
      where: { voter_id: userId },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['campaign_id', 'title', 'dao_approval_status', 'dao_approved_at'],
          include: [
            {
              model: Charity,
              as: 'charity',
              attributes: ['charity_id', 'name'],
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
    });

    return {
      votes: votes.rows.map(vote => ({
        vote_id: vote.vote_id,
        campaign_id: vote.campaign_id,
        vote: vote.vote_decision,
        reason: vote.vote_reason,
        created_at: vote.created_at,
        campaign: vote.campaign
      })),
      pagination: {
        total: votes.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(votes.count / limit),
      },
    };
  }

  /**
   * Lấy thống kê vote của user
   */
  async getMyVoteStatistics(userId) {
    const votes = await CampaignVote.findAll({
      where: { voter_id: userId }
    });

    const totalVotes = votes.length;
    const approveVotes = votes.filter(v => v.vote_decision === 'approve').length;
    const rejectVotes = votes.filter(v => v.vote_decision === 'reject').length;
    const approvalRate = totalVotes > 0 ? (approveVotes / totalVotes) * 100 : 0;

    return {
      totalVotes,
      approveVotes,
      rejectVotes,
      approvalRate: approvalRate.toFixed(1)
    };
  }
}

module.exports = new DAOService();