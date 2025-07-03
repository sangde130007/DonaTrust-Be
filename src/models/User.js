
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { ROLES } = require('../config/constants');

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  full_name: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  email_verification_token: {
    type: DataTypes.STRING,
  },
  email_verification_expires_at: {
    type: DataTypes.DATE,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM(Object.values(ROLES)),
  },
  profile_image: DataTypes.STRING,
  district: DataTypes.STRING,
  ward: DataTypes.STRING,
  address: DataTypes.STRING,
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: DataTypes.DATE,
  phone_verified_at: DataTypes.DATE,
}, {
  tableName: 'Users',
  timestamps: false,
});

module.exports = User;
