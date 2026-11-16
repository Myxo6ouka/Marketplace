module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    parentId: { type: DataTypes.INTEGER, allowNull: true },
  }, {
    tableName: 'categories',
    underscored: true,
    timestamps: true,
  });
  return Category;
};
