module.exports = (sequelize, DataTypes) => {
  const Favorite = sequelize.define('Favorite', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    tableName: 'favorites',
    underscored: true,
    timestamps: true,
    indexes: [{ unique: true, fields: ['user_id', 'product_id'] }],
  });
  return Favorite;
};
