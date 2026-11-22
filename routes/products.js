// Публичный каталог. Монтировать: app.use('/api/products', require('./routes/products'));
const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { jwtSecret } = require('../config');
const { Product, Category, Shop } = require('../models');
const { descendantIds } = require('./categoryTree');
const { HttpError, asyncHandler, ok } = require('../middleware/errors');

const router = express.Router();

// Необязательная авторизация: нужна только чтобы админ видел скрытые товары (?includeHidden=1)
function isAdmin(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return false;
  try {
    return jwt.verify(token, jwtSecret).role === 'admin';
  } catch (e) {
    return false;
  }
}

const toId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : null);
const toNum = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
// Первый непустой параметр из списка допустимых имён (фронтенд может называть их по-разному)
const first = (q, ...keys) => {
  for (const k of keys) if (q[k] !== undefined && q[k] !== '') return q[k];
  return undefined;
};

function sortOrder(raw) {
  const s = String(raw || '').toLowerCase().replace(/-/g, '_');
  if (['price_asc', 'cheap', 'price'].includes(s)) return [['price', 'ASC'], ['id', 'DESC']];
  if (['price_desc', 'expensive'].includes(s)) return [['price', 'DESC'], ['id', 'DESC']];
  if (['old', 'oldest'].includes(s)) return [['id', 'ASC']];
  if (s === 'title') return [['title', 'ASC']];
  return [['id', 'DESC']]; // новинки
}

const shopInclude = {
  model: Shop,
  as: 'shop',
  attributes: ['id', 'name'],
  where: { isBlocked: false }, // товары заблокированных магазинов не видны
  required: true,
};
// Для админа: и заблокированные магазины, видно isBlocked
const adminShopInclude = { model: Shop, as: 'shop', attributes: ['id', 'name', 'isBlocked'] };
const categoryInclude ={ model: Category, as: 'category', attributes: ['id', 'name'] };

// GET /api/products?q=&minPrice=&maxPrice=&shopId=&categoryId=&sort=&page=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = req.query;
    const adminView = q.includeHidden === '1' && isAdmin(req);
    const where = adminView ? {} : { status: 'active' };

    const text = String(first(q, 'q', 'search', 'query') || '').trim();
    if (text) where.title = { [Op.iLike]: `%${text.replace(/[%_\\]/g, '\\$&')}%` };

    const min = toNum(first(q, 'minPrice', 'priceMin', 'priceFrom', 'price_min', 'from'));
    const max = toNum(first(q, 'maxPrice', 'priceMax', 'priceTo', 'price_max', 'to'));
    if (min !== null || max !== null) {
      where.price = {};
      if (min !== null) where.price[Op.gte] = min;
      if (max !== null) where.price[Op.lte] = max;
    }

    const shopId = toId(first(q, 'shopId', 'sellerId', 'shop', 'seller'));
    if (shopId) where.shopId = shopId;

    const categoryId = toId(first(q, 'categoryId', 'category'));
    if (categoryId) {
      // категория вместе со всеми вложенными
      const cats = await Category.findAll({ attributes: ['id', 'parentId'] });
      where.categoryId = descendantIds(cats, categoryId);
    }

    const page = Math.max(parseInt(q.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 20, 1), 100);

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [adminView ? adminShopInclude : shopInclude, categoryInclude],
      order: sortOrder(q.sort),
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    ok(res, { items: rows, page, limit, total: count, pages: Math.ceil(count / limit) });
  })
);

// GET /api/products/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = toId(req.params.id);
    const product = id
      ? await Product.findOne({ where: { id, status: 'active' }, include: [shopInclude, categoryInclude] })
      : null;
    if (!product) throw new HttpError(404, 'Товар не найден');
    ok(res, product);
  })
);

module.exports = router;