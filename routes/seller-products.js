// Монтировать: app.use('/api/seller/products', require('./routes/seller-products'));
const express = require('express');
const { Product, Category, Shop } = require('../models');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireRole('seller'));

const toId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : null);

async function getShop(req, res) {
  const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
  if (!shop) res.status(403).json({ error: 'У продавца нет магазина' });
  return shop;
}

// Валидация тела; partial=true для PUT (меняем только присланные поля)
async function parseBody(body, { partial }) {
  const errors = [];
  const data = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has('title')) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 200) errors.push('title: обязателен, до 200 символов');
    else data.title = title;
  }
  if (has('description')) data.description = body.description === null ? null : String(body.description);

  if (!partial || has('price')) {
    const price = Number(body.price);
    if (body.price === undefined || body.price === null || body.price === '' || !isFinite(price) || price < 0) {
      errors.push('price: число >= 0');
    } else data.price = Math.round(price * 100) / 100;
  }
  if (!partial || has('stock')) {
    const stock = body.stock === undefined && !partial ? 0 : Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) errors.push('stock: целое число >= 0');
    else data.stock = stock;
  }

  const imageUrl = has('imageUrl') ? body.imageUrl : body.image_url;
  if (imageUrl !== undefined) {
    if (imageUrl === null || imageUrl === '') data.imageUrl = null;
    else if (typeof imageUrl !== 'string' || imageUrl.length > 500 || !/^https?:\/\/\S+$/i.test(imageUrl)) {
      errors.push('imageUrl: ссылка http(s) до 500 символов');
    } else data.imageUrl = imageUrl;
  }

  if (has('status')) {
    if (!['active', 'hidden'].includes(body.status)) errors.push("status: 'active' или 'hidden'");
    else data.status = body.status;
  }

  const categoryRaw = has('categoryId') ? body.categoryId : body.category_id;
  if (!partial || categoryRaw !== undefined) {
    const categoryId = toId(categoryRaw);
    if (!categoryId) errors.push('categoryId: обязателен');
    else if (!(await Category.findByPk(categoryId))) errors.push('categoryId: категория не найдена');
    else data.categoryId = categoryId;
  }

  return { errors, data };
}

// GET /api/seller/products — все свои товары (и active, и hidden)
router.get('/', async (req, res, next) => {
  try {
    const shop = await getShop(req, res); if (!shop) return;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { rows, count } = await Product.findAndCountAll({
      where: { shopId: shop.id },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });
    res.json({ items: rows, page, limit, total: count, pages: Math.ceil(count / limit) });
  } catch (e) { next(e); }
});

// POST /api/seller/products
router.post('/', async (req, res, next) => {
  try {
    const shop = await getShop(req, res); if (!shop) return;
    const { errors, data } = await parseBody(req.body, { partial: false });
    if (errors.length) return res.status(400).json({ errors });
    const product = await Product.create({ ...data, shopId: shop.id });
    res.status(201).json(product);
  } catch (e) { next(e); }
});

// Находит товар и проверяет владельца: нет такого — 404, чужой — 403
async function loadOwned(req, res) {
  const shop = await getShop(req, res); if (!shop) return null;
  const id = toId(req.params.id);
  const product = id ? await Product.findByPk(id) : null;
  if (!product) { res.status(404).json({ error: 'Товар не найден' }); return null; }
  if (product.shopId !== shop.id) { res.status(403).json({ error: 'Это не ваш товар' }); return null; }
  return product;
}

// PUT /api/seller/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const product = await loadOwned(req, res); if (!product) return;
    const { errors, data } = await parseBody(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ errors });
    await product.update(data); // shopId не трогаем
    res.json(product);
  } catch (e) { next(e); }
});

// DELETE /api/seller/products/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const product = await loadOwned(req, res); if (!product) return;
    await product.destroy(); // cart_items/favorites — CASCADE, order_items.product_id — SET NULL
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
