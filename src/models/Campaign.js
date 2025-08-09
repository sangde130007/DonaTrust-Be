const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { CAMPAIGN_STATUSES } = require('../config/constants');

const Campaign = sequelize.define(
	'Campaign',
	{
		campaign_id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		charity_id: {
			type: DataTypes.UUID,
			allowNull: false,
		},
		title: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				len: [5, 200],
			},
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		detailed_description: {
			type: DataTypes.TEXT,
		},
		goal_amount: {
			type: DataTypes.DECIMAL(15, 2),
			allowNull: false,
			validate: {
				min: 100000, // Tối thiểu 100k VND
			},
		},
		current_amount: {
			type: DataTypes.DECIMAL(15, 2),
			defaultValue: 0,
		},
		start_date: {
			type: DataTypes.DATEONLY,
			allowNull: false,
		},
		end_date: {
			type: DataTypes.DATEONLY,
			allowNull: false,
		},
		category: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		tags: {
			type: DataTypes.ARRAY(DataTypes.STRING),
			defaultValue: [],
		},
		location: {
			type: DataTypes.STRING,
		},
		beneficiaries: {
			type: DataTypes.STRING,
		},
		expected_impact: {
			type: DataTypes.TEXT,
		},
		status: {
			type: DataTypes.ENUM(Object.values(CAMPAIGN_STATUSES)),
			defaultValue: CAMPAIGN_STATUSES.PENDING,
		},
		approval_status: {
			type: DataTypes.ENUM('pending', 'approved', 'rejected'),
			defaultValue: 'pending',
		},
		rejection_reason: {
			type: DataTypes.TEXT,
		},
		approved_at: {
			type: DataTypes.DATE,
		},
		approved_by: {
			type: DataTypes.STRING,
		},
		rejected_at: {
			type: DataTypes.DATE,
		},
		rejected_by: {
			type: DataTypes.STRING,
		},
		image_url: {
			type: DataTypes.STRING,
		},
		gallery_images: {
			type: DataTypes.ARRAY(DataTypes.STRING),
			defaultValue: [],
		},
		documents: {
			type: DataTypes.ARRAY(DataTypes.STRING),
			defaultValue: [],
		},
		total_donors: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		progress_updates: {
			type: DataTypes.JSON,
			defaultValue: [],
		},
		financial_breakdown: {
			type: DataTypes.JSON,
			defaultValue: {},
		},
		featured: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		views: {
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
		qr_code_url: {
			type: DataTypes.STRING,
			allowNull: true,
			comment: 'Đường dẫn ảnh mã QR thanh toán',
		},
	},
	{
		tableName: 'Campaigns',
		timestamps: false,
		validate: {
			endDateAfterStartDate() {
				if (this.end_date <= this.start_date) {
					throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
				}
			},
		},
		hooks: {
			beforeUpdate: (campaign) => {
				campaign.updated_at = new Date();
			},
		},
	}
);

module.exports = Campaign;
