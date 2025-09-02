// models/ReportCampaign.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Điều chỉnh đường dẫn nếu cần

const ReportCampaign = sequelize.define('ReportCampaign', {
  report_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'report_id'
  },
  campaign_id: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'campaign_id'
  },
  reporter_id: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'reporter_id'
  },
  reasons: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  other_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'other_reason'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  evidence_files: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
    field: 'evidence_files'
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'resolved', 'dismissed']]
    }
  }
}, {
  tableName: 'ReportCampaigns',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/**
 * Định nghĩa các mối quan hệ giữa các model.
 * Hàm này sẽ được gọi trong file /models/index.js
 */
ReportCampaign.associate = (models) => {
  // Một báo cáo thuộc về một chiến dịch
  ReportCampaign.belongsTo(models.Campaign, {
    foreignKey: 'campaign_id',
    as: 'campaign', // Alias để truy vấn
    onDelete: 'CASCADE'
  });

  // Một báo cáo được tạo bởi một người dùng (reporter)
  ReportCampaign.belongsTo(models.User, {
    foreignKey: 'reporter_id',
    as: 'reporter', // Alias 'reporter' khớp với service
    onDelete: 'SET NULL'
  });
};

module.exports = ReportCampaign;
