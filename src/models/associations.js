const User = require('./User');
const Charity = require('./Charity');
const Campaign = require('./Campaign');
const Donation = require('./Donation');
const FinancialReport = require('./FinancialReport');
const UserSocialLink = require('./UserSocialLink');
const Vote = require('./Vote');
const Feedback = require('./Feedback');
const Notification = require('./Notification');
const News = require('./News');

// User associations
User.hasOne(Charity, { foreignKey: 'user_id', as: 'charity' });
User.hasMany(Donation, { foreignKey: 'user_id', as: 'donations' });
User.hasMany(Vote, { foreignKey: 'user_id', as: 'votes' });
User.hasMany(Feedback, { foreignKey: 'user_id', as: 'feedbacks' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
User.hasOne(UserSocialLink, { foreignKey: 'user_id', as: 'social_links' });
User.hasMany(News, { foreignKey: 'author_id', as: 'news' });

// Charity associations
Charity.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Charity.hasMany(Campaign, { foreignKey: 'charity_id', as: 'campaigns' });
Charity.hasMany(FinancialReport, { foreignKey: 'charity_id', as: 'financial_reports' });

// Campaign associations
Campaign.belongsTo(Charity, { foreignKey: 'charity_id', as: 'charity' });
Campaign.hasMany(Donation, { foreignKey: 'campaign_id', as: 'donations' });
Campaign.hasMany(Vote, { foreignKey: 'campaign_id', as: 'votes' });
Campaign.hasMany(Feedback, { foreignKey: 'campaign_id', as: 'feedbacks' });
Campaign.hasMany(FinancialReport, { foreignKey: 'campaign_id', as: 'financial_reports' });

// Donation associations
Donation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Donation.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

// FinancialReport associations
FinancialReport.belongsTo(Charity, { foreignKey: 'charity_id', as: 'charity' });
FinancialReport.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

// UserSocialLink associations
UserSocialLink.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Vote associations
Vote.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Vote.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

// Feedback associations
Feedback.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Feedback.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// News associations
News.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

module.exports = {
	User,
	Charity,
	Campaign,
	Donation,
	FinancialReport,
	UserSocialLink,
	Vote,
	Feedback,
	Notification,
	News,
};
