const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { ROLES, USER_STATUS } = require('../config/constants');

const User = sequelize.define(
	'User',
	{
		user_id: {
			type: DataTypes.STRING,
			primaryKey: true,
		},
		full_name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		email: {
			type: DataTypes.STRING,
			unique: true,
			allowNull: false,
			validate: {
				isEmail: true,
			},
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
		phone_verified: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		email_verification_token: {
			type: DataTypes.STRING,
		},
		email_verification_expires_at: {
			type: DataTypes.DATE,
		},
		phone_verification_code: {
			type: DataTypes.STRING,
		},
		phone_verification_expires_at: {
			type: DataTypes.DATE,
		},
		password_reset_token: {
			type: DataTypes.STRING,
		},
		password_reset_expires_at: {
			type: DataTypes.DATE,
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		role: {
			type: DataTypes.ENUM(Object.values(ROLES)),
			defaultValue: ROLES.DONOR,
		},
		status: {
			type: DataTypes.ENUM(Object.values(USER_STATUS)),
			defaultValue: USER_STATUS.ACTIVE,
		},
		profile_image: DataTypes.STRING,
		district: DataTypes.STRING,
		ward: DataTypes.STRING,
		address: DataTypes.STRING,
		date_of_birth: DataTypes.DATEONLY,
		gender: {
			type: DataTypes.ENUM('male', 'female', 'other'),
		},
		bio: DataTypes.TEXT,
		last_login: DataTypes.DATE,
		login_attempts: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		locked_until: DataTypes.DATE,
		created_at: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
		updated_at: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
		phone_verified_at: DataTypes.DATE,
		// DAO approval tracking
		dao_approved_at: DataTypes.DATE,
		dao_approved_by: DataTypes.STRING,
		dao_rejection_reason: DataTypes.TEXT,
		dao_rejected_at: DataTypes.DATE,
		dao_rejected_by: DataTypes.STRING,
		// User banning tracking
		ban_reason: DataTypes.TEXT,
		banned_at: DataTypes.DATE,
		banned_by: DataTypes.STRING,
		unbanned_at: DataTypes.DATE,
		unbanned_by: DataTypes.STRING,
	},
	{
		tableName: 'Users',
		timestamps: false,
		hooks: {
			beforeUpdate: (user) => {
				user.updated_at = new Date();
			},
		},
	}
);

module.exports = User;
