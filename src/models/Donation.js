const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Campaign = require('./Campaign');

const Donation = sequelize.define('Donation', {
  donation_id: {
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
  amount: DataTypes.DECIMAL,
  method: DataTypes.STRING,
  tx_code: DataTypes.STRING,
  is_anonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'Donations',
  timestamps: false,
});

Donation.belongsTo(User, { foreignKey: 'user_id' });
Donation.belongsTo(Campaign, { foreignKey: 'campaign_id' });
module.exports = Donation;