const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Ожидается, что models/index.js (роль B) экспортирует: sequelize, User, Shop.
// Поля моделей в camelCase (underscored: true): passwordHash, ownerId, isBlocked.
const { sequelize, User, Shop } = require('../models');
const { jwtSecret, jwtExpiresIn } = require('../config');
const { authRequired } = require('../middleware/auth');
const { HttpError, asyncHandler, ok } = require('../middleware/errors');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v) => (typeof v === 'string' ? v.trim() : '');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });

const publicUser = (user, shop) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  shop: shop ? { id: shop.id, name: shop.name, isBlocked: shop.isBlocked } : null,
});

// POST /api/register  { email, password, name, role: "buyer"|"seller", shopName? }
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const email = text(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const name = text(req.body.name);
    const role = text(req.body.role) || 'buyer';
    const shopName = text(req.body.shopName);

    if (!EMAIL_RE.test(email) || email.length > 255) throw new HttpError(400, 'Некорректный email');
    if (password.length < 6 || password.length > 72) {
      throw new HttpError(400, 'Пароль должен быть от 6 до 72 символов');
    }
    if (!name || name.length > 100) throw new HttpError(400, 'Укажите имя (до 100 символов)');
    if (!['buyer', 'seller'].includes(role)) {
      throw new HttpError(400, 'Роль может быть только buyer или seller');
    }
    if (role === 'seller' && (!shopName || shopName.length > 100)) {
      throw new HttpError(400, 'Для продавца обязательно название магазина (до 100 символов)');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { user, shop } = await sequelize.transaction(async (t) => {
      const existing = await User.findOne({ where: { email }, transaction: t });
      if (existing) throw new HttpError(409, 'Пользователь с таким email уже существует');

      const created = await User.create({ email, passwordHash, name, role }, { transaction: t });
      let createdShop = null;
      if (role === 'seller') {
        createdShop = await Shop.create(
          { ownerId: created.id, name: shopName },
          { transaction: t }
        );
      }
      return { user: created, shop: createdShop };
    });

    ok(res, { token: signToken(user), user: publicUser(user, shop) }, 201);
  })
);

// POST /api/login  { email, password }
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = text(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) throw new HttpError(400, 'Укажите email и пароль');

    const user = await User.findOne({ where: { email } });
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) throw new HttpError(401, 'Неверный email или пароль');

    const shop = user.role === 'seller' ? await Shop.findOne({ where: { ownerId: user.id } }) : null;
    ok(res, { token: signToken(user), user: publicUser(user, shop) });
  })
);

// GET /api/me  (Authorization: Bearer <JWT>)
router.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new HttpError(401, 'Пользователь не найден');
    const shop = user.role === 'seller' ? await Shop.findOne({ where: { ownerId: user.id } }) : null;
    ok(res, publicUser(user, shop));
  })
);

module.exports = router;
