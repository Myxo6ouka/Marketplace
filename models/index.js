require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Подключение из .env: либо DATABASE_URL, либо DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
const options = { dialect: 'postgres', logging: false };
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, options)
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      ...options,
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
    });

const User = require('./User')(sequelize, DataTypes);
const Shop = require('./Shop')(sequelize, DataTypes);
const Category = require('./Category')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const Cart = require('./Cart')(sequelize, DataTypes);
const CartItem = require('./CartItem')(sequelize, DataTypes);
const Order = require('./Order')(sequelize, DataTypes);
const SubOrder = require('./SubOrder')(sequelize, DataTypes);
const OrderItem = require('./OrderItem')(sequelize, DataTypes);
const Favorite = require('./Favorite')(sequelize, DataTypes);

// users <-> shops (1:1, shops.owner_id UNIQUE, CASCADE)
User.hasOne(Shop, { foreignKey: 'ownerId', as: 'shop', onDelete: 'CASCADE' });
Shop.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// categories: дерево по parent_id (RESTRICT)
Category.hasMany(Category, { foreignKey: 'parentId', as: 'children', onDelete: 'RESTRICT' });
Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });

// shops -> products (CASCADE), categories -> products (RESTRICT)
Shop.hasMany(Product, { foreignKey: 'shopId', as: 'products', onDelete: 'CASCADE' });
Product.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products', onDelete: 'RESTRICT' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// users -> carts (1:1, CASCADE), carts -> cart_items (CASCADE), products -> cart_items (CASCADE)
User.hasOne(Cart, { foreignKey: 'userId', as: 'cart', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });
Product.hasMany(CartItem, { foreignKey: 'productId', as: 'cartItems', onDelete: 'CASCADE' });
CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// users -> orders (RESTRICT), orders -> sub_orders (CASCADE), shops -> sub_orders (RESTRICT)
User.hasMany(Order, { foreignKey: 'buyerId', as: 'orders', onDelete: 'RESTRICT' });
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Order.hasMany(SubOrder, { foreignKey: 'orderId', as: 'subOrders', onDelete: 'CASCADE' });
SubOrder.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Shop.hasMany(SubOrder, { foreignKey: 'shopId', as: 'subOrders', onDelete: 'RESTRICT' });
SubOrder.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

// sub_orders -> order_items (CASCADE), products -> order_items (SET NULL)
SubOrder.hasMany(OrderItem, { foreignKey: 'subOrderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(SubOrder, { foreignKey: 'subOrderId', as: 'subOrder' });
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems', onDelete: 'SET NULL' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// favorites (CASCADE)
User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites', onDelete: 'CASCADE' });
Favorite.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Product.hasMany(Favorite, { foreignKey: 'productId', as: 'favorites', onDelete: 'CASCADE' });
Favorite.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// ВАЖНО: sequelize.sync() не вызываем — таблицы создаёт database/schema.sql

module.exports = {
  sequelize,
  Sequelize,
  User,
  Shop,
  Category,
  Product,
  Cart,
  CartItem,
  Order,
  SubOrder,
  OrderItem,
  Favorite,
};
