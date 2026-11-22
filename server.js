const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
app.use(cors());
app.use(express.json());

// Модели Sequelize пишет роль B (папка models/). Пока их нет, сервер всё равно
// стартует (чтобы npm start работал у всех с первого часа), но без маршрутов, зависящих от БД.
let models = null;
try {
  models = require('./models');
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND' && e.message.includes("'./models'")) {
    console.warn('[warn] Папка models/ не найдена: маршруты с БД отключены.');
  } else {
    throw e;
  }
}

app.get('/api/health', async (req, res) => {
  let db = false;
  if (models && models.sequelize) {
    try {
      await models.sequelize.authenticate();
      db = true;
    } catch (e) {
      db = false;
    }
  }
  res.json({ data: { status: 'ok', db } });
});

if (models) {
  app.use('/api', require('./routes/auth')); // /register, /login, /me

  // Покупатель
  app.use('/api/products', require('./routes/reviews')); // /:id/reviews
  app.use('/api/products', require('./routes/products'));
  app.use('/api/categories', require('./routes/categories'));
  app.use('/api/sellers', require('./routes/sellers')); // фильтр «Продавец» в каталоге
  app.use('/api/cart', require('./routes/cart'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/favorites', require('./routes/favorites'));

  // Продавец
  app.use('/api/seller/products', require('./routes/seller-products'));
  app.use('/api/seller/orders', require('./routes/seller-orders'));

  // Администратор
  // Категории (routes/admin-categories.js от роли B): путь монтирования смотри в комментарии
  // «Монтировать:» в начале файла и раскомментируй, поставив ПЕРЕД moderation:
  // app.use('/api/admin/categories', require('./routes/admin-categories'));
  app.use('/api/admin', require('./routes/moderation'));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', notFound);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Сервер запущен: http://localhost:${config.port}`);
  });
}

module.exports = app;