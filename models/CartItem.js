module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define('CartItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cartId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
  }, {
    tableName: 'cart_items',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['cart_id', 'product_id'] }],
  });
  return CartItem;
};
