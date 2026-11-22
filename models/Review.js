// Таблица reviews уже есть в database/schema.sql (product_id, user_id, rating 1..5, comment).
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'Review',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      productId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      rating: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 1, max: 5 } },
      comment: { type: DataTypes.TEXT },
    },
    { tableName: 'reviews', underscored: true }
  );