// Список продавцов для фильтра каталога.
// Монтировать: app.use('/api/sellers', require('./routes/sellers'));
const express = require('express');
const { Shop } = require('../models');
const { HttpError, asyncHandler, ok } = require('../middleware/errors');

const router = express.Router();

const out = (s) => ({ id: s.id, name: s.name, shopName: s.name });

// GET /api/sellers — незаблокированные магазины
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const shops = await Shop.findAll({ where: { isBlocked: false }, order: [['name', 'ASC']] });
    ok(res, shops.map(out));
  })
);

// GET /api/sellers/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : null;
    const shop = id ? await Shop.findByPk(id) : null;
    if (!shop) throw new HttpError(404, 'Продавец не найден');
    ok(res, out(shop));
  })
);

module.exports = router;