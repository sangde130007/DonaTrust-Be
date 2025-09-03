// src/models/Notification.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Campaign = require('./Campaign');

const Notification = sequelize.define('Notification', {
  noti_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: { model: User, key: 'user_id' },
  },
  campaign_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: Campaign, key: 'campaign_id' },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Thông báo',
  },
  content: DataTypes.TEXT,
  type: {
    type: DataTypes.ENUM('system', 'fundraising', 'donation', 'other'),
    allowNull: false,
    defaultValue: 'system',
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'Notifications',   // ⚠️ GIỮ ĐÚNG CASE NHƯ TRONG DB
  timestamps: false,
});

Notification.belongsTo(User, { foreignKey: 'user_id' });
Notification.belongsTo(Campaign, { foreignKey: 'campaign_id' });

module.exports = Notification;
