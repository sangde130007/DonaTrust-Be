const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Charity = sequelize.define('Charity', {
  charity_id: {
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
  name: DataTypes.STRING,
  mission: DataTypes.TEXT,
  license_document: DataTypes.STRING,
  description: DataTypes.TEXT,
  website_url: DataTypes.STRING,
}, {
  tableName: 'Charities',
  timestamps: false,
});

Charity.belongsTo(User, { foreignKey: 'user_id' });
module.exports = Charity;