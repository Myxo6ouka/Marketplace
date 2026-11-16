// Монтировать: app.use('/api/favorites', require('./routes/favorites'));
const express = require('express');
const { Favorite, Product, Shop } = require('../models');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireRole('buyer'));

const toId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : null);

// GET /api/favorites
router.get('/', async (req, res, next) => {
  try {
    const favorites = await Favorite.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Product, as: 'product',
        include: [{ model: Shop, as: 'shop', attributes: ['id', 'name', 'isBlocked'] }],
      }],
      order: [['createdAt', 'DESC']],
    });
    res.json(favorites.map((f) => ({
      id: f.id,
      productId: f.productId,
      addedAt: f.createdAt,
      product: f.product,
      available: f.product.status === 'active' && !f.product.shop.isBlocked,
    })));
  } catch (e) { next(e); }
});

// POST /api/favorites  { productId }
router.post('/', async (req, res, next) => {
  try {
    const productId = toId(req.body.productId);
    if (!productId) return res.status(400).json({ error: 'Некорректный productId' });

    const product = await Product.findOne({
      where: { id: productId, status: 'active' },
      include: [{ model: Shop, as: 'shop', where: { isBlocked: false }, required: true, attributes: ['id'] }],
    });
    if (!product) return res.status(404).json({ error: 'Товар не найден или недоступен' });

    const [favorite, created] = await Favorite.findOrCreate({
      where: { userId: req.user.id, productId },
      defaults: { userId: req.user.id, productId },
    });
    res.status(created ? 201 : 200).json(favorite);
  } catch (e) { next(e); }
});

// DELETE /api/favorites/:productId
router.delete('/:productId', async (req, res, next) => {
  try {
    const productId = toId(req.params.productId);
    if (!productId) return res.status(404).json({ error: 'Не найдено в избранном' });
    const deleted = await Favorite.destroy({ where: { userId: req.user.id, productId } });
    if (!deleted) return res.status(404).json({ error: 'Не найдено в избранном' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
