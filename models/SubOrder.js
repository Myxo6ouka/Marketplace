module.exports = (sequelize, DataTypes) => {
  const SubOrder = sequelize.define('SubOrder', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    shopId: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'new',
      validate: { isIn: [['new', 'confirmed', 'shipped', 'completed', 'cancelled']] },
    },
  }, {
    tableName: 'sub_orders',
    underscored: true,
    timestamps: true,
  });
  return SubOrder;
};
