const express = require('express');
const { sequelize, Cart, CartItem, Product, Shop, Order, SubOrder, OrderItem } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { HttpError, asyncHandler, ok } = require('../middleware/errors');

const router = express.Router();
router.use(authRequired, requireRole('buyer'));

const round2 = (n) => Math.round(n * 100) / 100;

const orderInclude = [
  {
    model: SubOrder,
    as: 'subOrders',
    include: [{ model: OrderItem, as: 'items' }],
  },
];

// В таблицах нет колонок total, поэтому суммы считаем при выдаче ответа.
function serialize(order) {
  const o = order.toJSON();
  o.subOrders = (o.subOrders || []).map((s) => ({
    ...s,
    total: round2((s.items || []).reduce((sum, i) => sum + Number(i.price) * i.quantity, 0)),
  }));
  o.total = round2(o.subOrders.reduce((sum, s) => sum + s.total, 0));
  return o;
}

// POST /api/orders  { address }  (оплата только при получении)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const address = typeof req.body.address === 'string' ? req.body.address.trim() : '';
    if (!address) throw new HttpError(400, 'Укажите адрес доставки');

    const orderId = await sequelize.transaction(async (t) => {
      // 1. Корзина покупателя (блокируем строку, чтобы двойной клик не создал два заказа)
      const cart = await Cart.findOne({
        where: { userId: req.user.id },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      const cartItems = cart
        ? await CartItem.findAll({ where: { cartId: cart.id }, order: [['productId', 'ASC']], transaction: t })
        : [];
      if (!cartItems.length) throw new HttpError(400, 'Корзина пуста');

      // 2. Блокировка товаров, порядок по id (защита от взаимных блокировок)
      const products = await Product.findAll({
        where: { id: cartItems.map((i) => i.productId) },
        order: [['id', 'ASC']],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      const productById = new Map(products.map((p) => [p.id, p]));

      const shops = await Shop.findAll({
        where: { id: [...new Set(products.map((p) => p.shopId))] },
        transaction: t,
      });
      const shopById = new Map(shops.map((s) => [s.id, s]));

      // 3. Проверки: active, магазин не заблокирован, хватает stock
      for (const item of cartItems) {
        const p = productById.get(item.productId);
        if (!p || p.status !== 'active') {
          throw new HttpError(409, `Товар #${item.productId} недоступен для заказа`);
        }
        const shop = shopById.get(p.shopId);
        if (!shop || shop.isBlocked) {
          throw new HttpError(409, `Магазин товара «${p.title}» недоступен`);
        }
        if (p.stock < item.quantity) {
          throw new HttpError(409, `Недостаточно товара «${p.title}» на складе (осталось ${p.stock})`);
        }
      }

      // 4. Заказ
      const order = await Order.create(
        { buyerId: req.user.id, address, paymentMethod: 'cash_on_delivery' },
        { transaction: t }
      );

      // 5. По одному подзаказу на каждый магазин
      const byShop = new Map();
      for (const item of cartItems) {
        const p = productById.get(item.productId);
        if (!byShop.has(p.shopId)) byShop.set(p.shopId, []);
        byShop.get(p.shopId).push({ item, p });
      }

      for (const [shopId, rows] of byShop) {
        const sub = await SubOrder.create(
          { orderId: order.id, shopId, status: 'new' },
          { transaction: t }
        );
        await OrderItem.bulkCreate(
          rows.map(({ item, p }) => ({
            subOrderId: sub.id,
            productId: p.id,
            productTitle: p.title, // копия названия на момент заказа
            price: p.price, // копия цены на момент заказа
            quantity: item.quantity,
          })),
          { transaction: t }
        );
      }

      // 6. Списание остатков и очистка корзины
      for (const item of cartItems) {
        const p = productById.get(item.productId);
        await p.update({ stock: p.stock - item.quantity }, { transaction: t });
      }
      await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

      return order.id;
    });

    const order = await Order.findByPk(orderId, { include: orderInclude });
    ok(res, serialize(order), 201);
  })
);

// GET /api/orders: только свои заказы
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orders = await Order.findAll({
      where: { buyerId: req.user.id },
      include: orderInclude,
      order: [['id', 'DESC']],
    });
    ok(res, orders.map(serialize));
  })
);

// GET /api/orders/:id: чужой заказ даёт 404 (не раскрываем, что он существует)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, 'Некорректный id');
    const order = await Order.findOne({ where: { id, buyerId: req.user.id }, include: orderInclude });
    if (!order) throw new HttpError(404, 'Заказ не найден');
    ok(res, serialize(order));
  })
);

module.exports = router;