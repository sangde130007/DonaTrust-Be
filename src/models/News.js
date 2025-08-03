const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const News = sequelize.define(
	'News',
	{
		news_id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		title: {
			type: DataTypes.STRING,
			allowNull: false,
			validate: {
				len: [5, 200],
			},
		},
		content: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		summary: {
			type: DataTypes.TEXT,
		},
		author_id: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		category: {
			type: DataTypes.ENUM('announcement', 'update', 'campaign', 'charity', 'system'),
			defaultValue: 'announcement',
		},
		status: {
			type: DataTypes.ENUM('draft', 'published', 'archived'),
			defaultValue: 'draft',
		},
		priority: {
			type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
			defaultValue: 'medium',
		},
		featured: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		image_url: {
			type: DataTypes.STRING,
			validate: {
				isUrl: true,
			},
		},
		tags: {
			type: DataTypes.ARRAY(DataTypes.STRING),
			defaultValue: [],
		},
		views: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		published_at: {
			type: DataTypes.DATE,
		},
		expires_at: {
			type: DataTypes.DATE,
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
		tableName: 'News',
		timestamps: false,
		hooks: {
			beforeUpdate: (news) => {
				news.updated_at = new Date();
			},
			beforeCreate: (news) => {
				if (news.status === 'published' && !news.published_at) {
					news.published_at = new Date();
				}
			},
		},
	}
);

module.exports = News;
