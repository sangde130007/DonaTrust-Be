const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DaoApplication = sequelize.define(
  'DaoApplication',
  {
    application_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    introduction: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    experience: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    areas_of_interest: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    certificate_files: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    reviewed_by: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'DaoApplications',
    timestamps: false,
    hooks: {
      beforeUpdate: (application) => {
        application.updated_at = new Date();
      },
    },
  }
);

module.exports = DaoApplication; 