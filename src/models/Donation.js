const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Campaign = require('./Campaign');

const Donation = sequelize.define(
  'Donation',
  {
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
      allowNull: true, // Cho phép null cho ẩn danh
    },
    campaign_id: {
      type: DataTypes.UUID,
      references: {
        model: Campaign,
        key: 'campaign_id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'bank_transfer',
    },
    tx_code: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_anonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'Donations',
    timestamps: false,
  }
);

Donation.belongsTo(User, { foreignKey: 'user_id' });
Donation.belongsTo(Campaign, { foreignKey: 'campaign_id' });

module.exports = Donation;