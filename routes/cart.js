// Корзина покупателя. Монтировать: app.use('/api/cart', require('./routes/cart'));
const express = require('express');
const { Cart, CartItem, Product, Shop } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { HttpError, asyncHandler, ok } = require('../middleware/errors');

const router = express.Router();
router.use(authRequired, requireRole('buyer'));

const toId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : null);
const round2 = (n) => Math.round(n * 100) / 100;

// Корзина создаётся при первом обращении (при регистрации её никто не создаёт)
async function getCart(userId) {
  const [cart] = await Cart.findOrCreate({ where: { userId }, defaults: { userId } });
  return cart;
}

async function loadCart(userId) {
  const cart = await getCart(userId);
  const rows = await CartItem.findAll({
    where: { cartId: cart.id },
    order: [['id', 'ASC']],
    include: [
      {
        model: Product,
        as: 'product',
        include: [{ model: Shop, as: 'shop', attributes: ['id', 'name', 'isBlocked'] }],
      },
    ],
  });

  const items = rows.map((r) => {
    const p = r.product;
    const purchasable = !!p && p.status === 'active' && !p.shop.isBlocked;
    return {
      id: r.id,
      productId: r.productId,
      quantity: r.quantity,
      // available = товар можно купить прямо сейчас в этом количестве
      available: purchasable && p.stock >= r.quantity,
      subtotal: p ? round2(Number(p.price) * r.quantity) : 0,
      product: p && {
        id: p.id,
        title: p.title,
        price: p.price,
        imageUrl: p.imageUrl,
        stock: p.stock,
        status: p.status,
        shop: { id: p.shop.id, name: p.shop.name },
      },
    };
  });

  return {
    items,
    count: items.reduce((s, i) => s + i.quantity, 0),
    total: round2(items.reduce((s, i) => s + i.subtotal, 0)),
  };
}

// Позиция корзины по числу из адреса. Для /items/:id число — это id позиции корзины
// (если такой нет — id товара), для /:productId — наоборот. Так работает с любым вариантом фронтенда.
async function findItem(cartId, idRaw, preferItemId) {
  const id = toId(idRaw);
  if (!id) return null;
  const byItem = () => CartItem.findOne({ where: { cartId, id } });
  const byProduct = () => CartItem.findOne({ where: { cartId, productId: id } });
  return preferItemId ? (await byItem()) || (await byProduct()) : (await byProduct()) || (await byItem());
}

// GET /api/cart
router.get(
  '/',
  asyncHandler(async (req, res) => {
    ok(res, await loadCart(req.user.id));
  })
);

// POST /api/cart  или  POST /api/cart/items   { productId, quantity = 1 }
router.post(
  ['/', '/items'],
  asyncHandler(async (req, res) => {
    const productId = toId(req.body.productId);
    if (!productId) throw new HttpError(400, 'Некорректный productId');
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new HttpError(400, 'Количество должно быть целым числом от 1');
    }

    const product = await Product.findOne({
      where: { id: productId, status: 'active' },
      include: [{ model: Shop, as: 'shop', attributes: ['id', 'isBlocked'] }],
    });
    if (!product || product.shop.isBlocked) throw new HttpError(404, 'Товар не найден или недоступен');

    const cart = await getCart(req.user.id);
    const existing = await CartItem.findOne({ where: { cartId: cart.id, productId } });
    const newQty = (existing ? existing.quantity : 0) + quantity;
    if (newQty > product.stock) {
      throw new HttpError(409, `Недостаточно товара на складе (осталось ${product.stock})`);
    }

    if (existing) await existing.update({ quantity: newQty });
    else await CartItem.create({ cartId: cart.id, productId, quantity });

    ok(res, await loadCart(req.user.id), existing ? 200 : 201);
  })
);

// PATCH|PUT /api/cart/items/:id  или  /api/cart/:productId   { quantity }  (0 = удалить)
const updateQuantity = (preferItemId) =>
  asyncHandler(async (req, res) => {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new HttpError(400, 'Количество должно быть целым числом, 0 — удалить');
    }

    const cart = await getCart(req.user.id);
    const item = await findItem(cart.id, req.params.id, preferItemId);
    if (!item) throw new HttpError(404, 'Товара нет в корзине');

    if (quantity === 0) {
      await item.destroy();
    } else {
      const product = await Product.findByPk(item.productId);
      if (!product || quantity > product.stock) {
        throw new HttpError(409, `Недостаточно товара на складе (осталось ${product ? product.stock : 0})`);
      }
      await item.update({ quantity });
    }
    ok(res, await loadCart(req.user.id));
  });

router.patch('/items/:id', updateQuantity(true));
router.put('/items/:id', updateQuantity(true));
router.patch('/:id', updateQuantity(false));
router.put('/:id', updateQuantity(false));

// DELETE /api/cart/items/:id  или  /api/cart/:productId
const removeItem = (preferItemId) =>
  asyncHandler(async (req, res) => {
    const cart = await getCart(req.user.id);
    const item = await findItem(cart.id, req.params.id, preferItemId);
    if (!item) throw new HttpError(404, 'Товара нет в корзине');
    await item.destroy();
    ok(res, await loadCart(req.user.id));
  });

router.delete('/items/:id', removeItem(true));
router.delete('/:id', removeItem(false));

// DELETE /api/cart — очистить корзину
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await getCart(req.user.id);
    await CartItem.destroy({ where: { cartId: cart.id } });
    ok(res, await loadCart(req.user.id));
  })
);

module.exports = router;