const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Charity = require('./Charity');
const { CAMPAIGN_STATUSES } = require('../config/constants');

const Campaign = sequelize.define('Campaign', {
  campaign_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  charity_id: {
    type: DataTypes.UUID,
    references: {
      model: Charity,
      key: 'charity_id',
    },
  },
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  goal_amount: DataTypes.DECIMAL,
  current_amount: {
    type: DataTypes.DECIMAL,
    defaultValue: 0,
  },
  deadline: DataTypes.DATEONLY,
  tags: DataTypes.ARRAY(DataTypes.TEXT),
  status: {
    type: DataTypes.STRING,
    defaultValue: CAMPAIGN_STATUSES.PENDING,
  },
  image_url: DataTypes.STRING,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'Campaigns',
  timestamps: false,
});

Campaign.belongsTo(Charity, { foreignKey: 'charity_id' });
module.exports = Campaign;