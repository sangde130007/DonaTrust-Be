const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Charity = sequelize.define(
	'Charity',
	{
		charity_id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		user_id: {
			type: DataTypes.UUID,
			allowNull: false,
			unique: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				len: [2, 200],
			},
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		mission: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		vision: {
			type: DataTypes.TEXT,
		},
		license_number: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		license_document: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		tax_code: {
			type: DataTypes.STRING,
			unique: true,
		},
		founded_year: {
			type: DataTypes.INTEGER,
			validate: {
				min: 1900,
				max: new Date().getFullYear(),
			},
		},
		website_url: {
			type: DataTypes.STRING,
			validate: {
				isUrl: true,
			},
		},
		social_links: {
			type: DataTypes.JSON,
			defaultValue: {},
		},
		logo_url: {
			type: DataTypes.STRING,
		},
		cover_image_url: {
			type: DataTypes.STRING,
		},
		address: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		city: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		district: {
			type: DataTypes.STRING,
		},
		ward: {
			type: DataTypes.STRING,
		},
		phone: {
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
		bank_account: {
			type: DataTypes.JSON,
			defaultValue: {},
		},
		verification_status: {
			type: DataTypes.ENUM('pending', 'verified', 'rejected'),
			defaultValue: 'pending',
		},
		verification_documents: {
			type: DataTypes.JSON,
			defaultValue: [],
		},
		verified_at: {
			type: DataTypes.DATE,
		},
		verified_by: {
			type: DataTypes.STRING,
		},
		rejection_reason: {
			type: DataTypes.TEXT,
		},
		total_received: {
			type: DataTypes.DECIMAL(15, 2),
			defaultValue: 0,
		},
		total_spent: {
			type: DataTypes.DECIMAL(15, 2),
			defaultValue: 0,
		},
		active_campaigns: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		rating: {
			type: DataTypes.DECIMAL(3, 2),
			defaultValue: 0,
			validate: {
				min: 0,
				max: 5,
			},
		},
		total_reviews: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
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
		tableName: 'Charities',
		timestamps: false,
		hooks: {
			beforeUpdate: (charity) => {
				charity.updated_at = new Date();
			},
		},
	}
);

module.exports = Charity;
