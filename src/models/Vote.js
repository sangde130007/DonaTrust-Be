const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Campaign = require('./Campaign');

const Vote = sequelize.define('Vote', {
  vote_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.STRING,
    references: {
      model: User,
      key: 'user_id',
    },
  },
  campaign_id: {
    type: DataTypes.UUID,
    references: {
      model: Campaign,
      key: 'campaign_id',
    },
  },
  vote_weight: DataTypes.INTEGER,
  choice: DataTypes.BOOLEAN,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'Votes',
  timestamps: false,
});

Vote.belongsTo(User, { foreignKey: 'user_id' });
Vote.belongsTo(Campaign, { foreignKey: 'campaign_id' });
module.exports = Vote;