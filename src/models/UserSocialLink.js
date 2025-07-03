const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const UserSocialLink = sequelize.define('UserSocialLink', {
  link_id: {
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
  google_id: DataTypes.STRING,
  facebook_id: DataTypes.STRING,
  youtube_id: DataTypes.STRING,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'User_Social_Links',
  timestamps: false,
});

UserSocialLink.belongsTo(User, { foreignKey: 'user_id' });
module.exports = UserSocialLink;