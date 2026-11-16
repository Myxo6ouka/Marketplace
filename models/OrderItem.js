module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subOrderId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: true }, // ON DELETE SET NULL
    productTitle: { type: DataTypes.STRING(200), allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0 } },
  }, {
    tableName: 'order_items',
    underscored: true,
    timestamps: true,
  });
  return OrderItem;
};
