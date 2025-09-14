// src/models/Campaign.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { CAMPAIGN_STATUSES } = require('../config/constants');

const Campaign = sequelize.define(
  'Campaign',
  {
    campaign_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    charity_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [5, 200] },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    detailed_description: {
      type: DataTypes.TEXT,
    },
    goal_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: { min: 100000 }, // tối thiểu 100k VND
    },
    current_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    location: {
      type: DataTypes.STRING,
    },
    beneficiaries: {
      type: DataTypes.STRING,
    },
    expected_impact: {
      type: DataTypes.TEXT,
    },
    status: {
      type: DataTypes.ENUM(Object.values(CAMPAIGN_STATUSES)),
      defaultValue: CAMPAIGN_STATUSES.PENDING,
    },
    approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    rejection_reason: {
      type: DataTypes.TEXT,
    },
    approved_at: {
      type: DataTypes.DATE,
    },
    approved_by: {
      type: DataTypes.STRING,
    },
    rejected_at: {
      type: DataTypes.DATE,
    },
    rejected_by: {
      type: DataTypes.STRING,
    },
    image_url: {
      type: DataTypes.STRING,
    },
    gallery_images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    documents: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    total_donors: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    progress_updates: {
      // [{ id, created_at, title, content, images:[], spent_amount, spent_items:[{label, amount}], author_id }]
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    financial_breakdown: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    qr_code_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Đường dẫn ảnh mã QR thanh toán',
    },

    // =========== DAO approval fields ===========
    dao_approval_status: {
      type: DataTypes.ENUM('dao_pending', 'dao_approved', 'dao_rejected'),
      allowNull: false,
      defaultValue: 'dao_pending',
      field: 'dao_approval_status',
      comment: 'Trạng thái phê duyệt của DAO',
    },
    dao_approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'dao_approved_at',
    },
    dao_rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'dao_rejected_at',
    },
    dao_approval_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: 'dao_approval_rate',
      comment: 'Tỷ lệ % approve khi DAO chốt',
    },
  },
  {
    tableName: 'Campaigns',
    timestamps: false,
    validate: {
      endDateAfterStartDate() {
        if (this.end_date <= this.start_date) {
          throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
        }
      },
    },
    hooks: {
      beforeValidate: (campaign) => {
        // ép giá trị mặc định để tránh notNull Violation
        if (campaign.dao_approval_status == null) {
          campaign.dao_approval_status = 'dao_pending';
        }
      },
        beforeSave: (campaign) => {
    const goal = campaign.goal_amount != null ? Number(campaign.goal_amount) : 0;
    const curr = campaign.current_amount != null ? Number(campaign.current_amount) : 0;

    if (goal > 0) {
      const progress = curr / goal;
      if (progress >= 0.5 && !campaign.featured) {
        campaign.featured = true; // chỉ bật, không tự tắt nếu < 50%
      }
    }
  },
      beforeUpdate: (campaign) => {
        campaign.updated_at = new Date();
      },
    },
  }
);

module.exports = Campaign;
