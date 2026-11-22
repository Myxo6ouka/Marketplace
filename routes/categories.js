// Монтировать: app.use('/api/categories', require('./routes/categories'));
const express = require('express');
const { Category } = require('../models');
const { buildTree } = require('./categoryTree');
const { asyncHandler, ok } = require('../middleware/errors');

const router = express.Router();

// GET /api/categories — плоский список [{ id, name, parentId }] (дерево строит фронтенд)
// GET /api/categories?tree=1 — готовое дерево с children
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const categories = await Category.findAll({ order: [['id', 'ASC']] });
    if (req.query.tree === '1') return ok(res, buildTree(categories));
    ok(res, categories);
  })
);

module.exports = router;