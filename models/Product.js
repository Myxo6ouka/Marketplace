module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    shopId: { type: DataTypes.INTEGER, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.DECIMAL(12, 2), allowNull: false, validate: { min: 0 } },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    imageUrl: { type: DataTypes.STRING(500) },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'active',
      validate: { isIn: [['active', 'hidden']] },
    },
  }, {
    tableName: 'products',
    underscored: true,
    timestamps: true,
  });
  return Product;
};
