module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    buyerId: { type: DataTypes.INTEGER, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    paymentMethod: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'cash_on_delivery' },
  }, {
    tableName: 'orders',
    underscored: true,
    timestamps: true,
  });
  return Order;
};
