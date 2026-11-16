module.exports = (sequelize, DataTypes) => {
  const Shop = sequelize.define('Shop', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ownerId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'shops',
    underscored: true,
    timestamps: true,
  });
  return Shop;
};
