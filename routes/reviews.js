// Отзывы (Should). Монтировать ДО или ПОСЛЕ products: app.use('/api/products', require('./routes/reviews'));
// Требует модель Review (models/Review.js) и её подключения в models/index.js.
const express = require('express');
const { Review, Product, User, Order, SubOrder, OrderItem } = require('../models');
const { authRequired } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { HttpError, asyncHandler, ok } = require('../middleware/errors');

const router = express.Router();

const toId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : null);

async function findProduct(idRaw) {
  const id = toId(idRaw);
  const product = id ? await Product.findByPk(id) : null;
  if (!product) throw new HttpError(404, 'Товар не найден');
  return product;
}

// GET /api/products/:id/reviews — публичный
router.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id);
    const reviews = await Review.findAll({
      where: { productId: product.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      order: [['id', 'DESC']],
    });
    const count = reviews.length;
    const average = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : null;
    ok(res, { items: reviews, count, average });
  })
);

// POST /api/products/:id/reviews   { rating: 1..5, comment? }
// Только покупатель, у которого есть подзаказ completed с этим товаром. Один отзыв на товар.
router.post(
  '/:id/reviews',
  authRequired,
  requireRole('buyer'),
  asyncHandler(async (req, res) => {
    const product = await findProduct(req.params.id);

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpError(400, 'rating: целое число от 1 до 5');
    }
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim() : null;

    const purchased = await OrderItem.findOne({
      where: { productId: product.id },
      include: [
        {
          model: SubOrder,
          as: 'subOrder',
          required: true,
          where: { status: 'completed' },
          include: [{ model: Order, as: 'order', required: true, where: { buyerId: req.user.id } }],
        },
      ],
    });
    if (!purchased) {
      throw new HttpError(403, 'Оставить отзыв можно только на товар из выполненного заказа');
    }

    const duplicate = await Review.findOne({ where: { productId: product.id, userId: req.user.id } });
    if (duplicate) throw new HttpError(409, 'Вы уже оставляли отзыв на этот товар');

    const review = await Review.create({
      productId: product.id,
      userId: req.user.id,
      rating,
      comment: comment || null,
    });
    ok(res, review, 201);
  })
);

module.exports = router;