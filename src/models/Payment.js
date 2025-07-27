const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Campaign = require("./Campaign");

const Payment = sequelize.define(
  "Payment",
  {
    payment_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      references: {
        model: User,
        key: "user_id",
      },
    },
    campaign_id: {
      type: DataTypes.UUID,
      references: {
        model: Campaign,
        key: "campaign_id",
      },
    },
    payment_amount: DataTypes.DECIMAL, //Giá trị giao dịch
    transaction_fee: DataTypes.DECIMAL, //Phí giao dịch
    transaction_code: DataTypes.STRING,

    donate_method: DataTypes.STRING,
    bank_code: DataTypes.STRING,
    bank_name: DataTypes.STRING,
    bank_account: DataTypes.STRING,
    qr_code: DataTypes.STRING,

    note: DataTypes.STRING,
    status: DataTypes.STRING,
    visible: DataTypes.BOOLEAN,
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: DataTypes.DATE,
    created_by: DataTypes.STRING,
    deleted_by: DataTypes.STRING,
  },
  {
    tableName: "Payments",
    timestamps: false,
  }
);

Payment.belongsTo(User, { foreignKey: "user_id" });
Payment.belongsTo(Campaign, { foreignKey: "campaign_id" });
module.exports = Payment;
