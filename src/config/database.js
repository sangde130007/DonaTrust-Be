const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize({
	dialect: 'postgres',
	host: process.env.DB_HOST || 'localhost',
	port: process.env.DB_PORT || 5432,
	username: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_NAME || 'donatrust',
	logging: false,
	define: {
		timestamps: true,
		underscored: true,
	},
});

module.exports = sequelize;
