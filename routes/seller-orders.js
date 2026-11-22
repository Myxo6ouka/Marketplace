// Заказы продавца. Монтировать: app.use('/api/seller/orders', require('./routes/seller-orders'));
const express = require('express');
const { sequelize, Shop, Product, Order, SubOrder, OrderItem, User } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { HttpError, asyncHandler, ok } = require('../middleware/errors');

const router = express.Router();
router.use(authRequired, requireRole('seller'));

const STATUSES = ['new', 'confirmed', 'shipped', 'completed', 'cancelled'];
// Допустимые переходы: new → confirmed → shipped → completed; cancelled из new и confirmed
const TRANSITIONS = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
};

const toId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : null);
const round2 = (n) => Math.round(n * 100) / 100;

const subInclude = [
  { model: OrderItem, as: 'items' },
  {
    model: Order,
    as: 'order',
    attributes: ['id', 'address', 'paymentMethod', 'createdAt'],
    include: [{ model: User, as: 'buyer', attributes: ['id', 'name', 'email'] }],
  },
];

function serialize(sub) {
  const s = sub.toJSON();
  s.total = round2((s.items || []).reduce((sum, i) => sum + Number(i.price) * i.quantity, 0));
  return s;
}

async function getShop(req) {
  const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
  if (!shop) throw new HttpError(403, 'У продавца нет магазина');
  return shop;
}

// GET /api/seller/orders?status=new — подзаказы только своего магазина
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const shop = await getShop(req);
    const where = { shopId: shop.id };
    if (req.query.status !== undefined) {
      if (!STATUSES.includes(req.query.status)) throw new HttpError(400, 'Неизвестный статус');
      where.status = req.query.status;
    }
    const subs = await SubOrder.findAll({ where, include: subInclude, order: [['id', 'DESC']] });
    ok(res, subs.map(serialize));
  })
);

// PATCH /api/seller/orders/:id/status   { status }
// При отмене (cancelled) остатки товаров возвращаются на склад.
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    const status = req.body.status;
    if (!STATUSES.includes(status)) {
      throw new HttpError(400, `status: одно из ${STATUSES.join(', ')}`);
    }
    if (!id) throw new HttpError(404, 'Подзаказ не найден');
    const shop = await getShop(req);

    await sequelize.transaction(async (t) => {
      const sub = await SubOrder.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
      if (!sub) throw new HttpError(404, 'Подзаказ не найден');
      if (sub.shopId !== shop.id) throw new HttpError(403, 'Это не ваш подзаказ');
      if (!TRANSITIONS[sub.status].includes(status)) {
        throw new HttpError(409, `Нельзя перевести подзаказ из «${sub.status}» в «${status}»`);
      }

      if (status === 'cancelled') {
        const items = await OrderItem.findAll({ where: { subOrderId: sub.id }, transaction: t });
        const ids = items.map((i) => i.productId).filter(Boolean); // товар мог быть удалён (SET NULL)
        const products = ids.length
          ? await Product.findAll({ where: { id: ids }, order: [['id', 'ASC']], lock: t.LOCK.UPDATE, transaction: t })
          : [];
        const byId = new Map(products.map((p) => [p.id, p]));
        for (const item of items) {
          const p = byId.get(item.productId);
          if (p) await p.update({ stock: p.stock + item.quantity }, { transaction: t });
        }
      }

      await sub.update({ status }, { transaction: t });
    });

    const updated = await SubOrder.findByPk(id, { include: subInclude });
    ok(res, serialize(updated));
  })
);

module.exports = router;