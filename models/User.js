module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    role: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'buyer',
      validate: { isIn: [['buyer', 'seller', 'admin']] },
    },
  }, {
    tableName: 'users',
    underscored: true,
    timestamps: true,
  });
  return User;
};
