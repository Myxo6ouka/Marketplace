// Модерация (только admin). Монтировать: app.use('/api/admin', require('./routes/moderation'));
const express = require('express');
const { fn, col } = require('sequelize');
const { Shop, Product, User } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { HttpError, asyncHandler, ok } = require('../middleware/errors');

const router = express.Router();
router.use(authRequired, requireRole('admin'));

const toId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : null);

// GET /api/admin/sellers — все магазины с владельцем и числом товаров
// (id в ответе — это id МАГАЗИНА, он же используется в /sellers/:id/block)
router.get(
  '/sellers',
  asyncHandler(async (req, res) => {
    const shops = await Shop.findAll({
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'] }],
      order: [['id', 'ASC']],
    });
    const counts = await Product.findAll({
      attributes: ['shopId', [fn('COUNT', col('id')), 'cnt']],
      group: ['shopId'],
      raw: true,
    });
    const countByShop = new Map(counts.map((c) => [c.shopId, Number(c.cnt)]));

    ok(
      res,
      shops.map((s) => ({
        id: s.id,
        name: s.name,
        isBlocked: s.isBlocked,
        owner: s.owner,
        productsCount: countByShop.get(s.id) || 0,
      }))
    );
  })
);

// PATCH /api/admin/sellers/:id/block   { blocked?: boolean }  (без тела — переключает)
// Заблокированный магазин пропадает из каталога, его товары нельзя заказать.
router.patch(
  '/sellers/:id/block',
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    const shop = id ? await Shop.findByPk(id) : null;
    if (!shop) throw new HttpError(404, 'Продавец не найден');
    const blocked = typeof req.body.blocked === 'boolean' ? req.body.blocked : !shop.isBlocked;
    await shop.update({ isBlocked: blocked });
    ok(res, { id: shop.id, name: shop.name, isBlocked: shop.isBlocked });
  })
);

// PATCH /api/admin/products/:id/hide   { hidden?: boolean }  (по умолчанию true)
// hidden: true — скрыть (status = 'hidden'), hidden: false — вернуть в каталог (status = 'active')
router.patch(
  '/products/:id/hide',
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    const product = id ? await Product.findByPk(id) : null;
    if (!product) throw new HttpError(404, 'Товар не найден');
    const hidden = typeof req.body.hidden === 'boolean' ? req.body.hidden : true;
    await product.update({ status: hidden ? 'hidden' : 'active' });
    ok(res, product);
  })
);

module.exports = router;