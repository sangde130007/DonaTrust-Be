const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FinancialReport = sequelize.define(
	'FinancialReport',
	{
		report_id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		charity_id: {
			type: DataTypes.UUID,
			allowNull: false,
		},
		campaign_id: {
			type: DataTypes.UUID,
		},
		report_type: {
			type: DataTypes.ENUM('monthly', 'quarterly', 'yearly', 'campaign', 'custom'),
			allowNull: false,
		},
		period_start: {
			type: DataTypes.DATEONLY,
			allowNull: false,
		},
		period_end: {
			type: DataTypes.DATEONLY,
			allowNull: false,
		},
		total_income: {
			type: DataTypes.DECIMAL(15, 2),
			defaultValue: 0,
		},
		total_expenses: {
			type: DataTypes.DECIMAL(15, 2),
			defaultValue: 0,
		},
		administrative_costs: {
			type: DataTypes.DECIMAL(15, 2),
			defaultValue: 0,
		},
		program_costs: {
			type: DataTypes.DECIMAL(15, 2),
			defaultValue: 0,
		},
		fundraising_costs: {
			type: DataTypes.DECIMAL(15, 2),
			defaultValue: 0,
		},
		income_breakdown: {
			type: DataTypes.JSON,
			defaultValue: {},
		},
		expense_breakdown: {
			type: DataTypes.JSON,
			defaultValue: {},
		},
		beneficiaries_served: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		impact_metrics: {
			type: DataTypes.JSON,
			defaultValue: {},
		},
		attachments: {
			type: DataTypes.ARRAY(DataTypes.STRING),
			defaultValue: [],
		},
		status: {
			type: DataTypes.ENUM('draft', 'submitted', 'approved', 'published'),
			defaultValue: 'draft',
		},
		notes: {
			type: DataTypes.TEXT,
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
		tableName: 'FinancialReports',
		timestamps: false,
		hooks: {
			beforeUpdate: (report) => {
				report.updated_at = new Date();
			},
		},
	}
);

module.exports = FinancialReport;
