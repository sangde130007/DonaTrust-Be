const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CampaignVote = sequelize.define('CampaignVote', {
  vote_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  campaign_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Campaigns',
      key: 'campaign_id',
    },
  },
  voter_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'user_id',
    },
  },
  vote_decision: {
    type: DataTypes.ENUM('approve', 'reject'),
    allowNull: false,
  },
  vote_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'CampaignVotes',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['campaign_id', 'voter_id']
    }
  ]
});

module.exports = CampaignVote;