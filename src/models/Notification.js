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
  content: DataTypes.TEXT,
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'Notifications',
  timestamps: false,
});

Notification.belongsTo(User, { foreignKey: 'user_id' });
Notification.belongsTo(Campaign, { foreignKey: 'campaign_id' });
module.exports = Notification;