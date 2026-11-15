// Монтировать: app.use('/api/admin/categories', require('./routes/admin-categories'));
const express = require('express');
const { ForeignKeyConstraintError, UniqueConstraintError } = require('sequelize');
const { Category, Product } = require('../models');
const { authRequired, requireRole } = require('../middleware/auth');
const { buildTree, descendantIds } = require('../utils/categoryTree');

const router = express.Router();
router.use(authRequired, requireRole('admin'));

const toId = (v) => (/^\d+$/.test(String(v)) ? Number(v) : null);

function parseName(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  return name && name.length <= 100 ? name : null;
}

// (parent_id, name) уникально, но для parent_id = NULL PostgreSQL дубли пропускает — проверяем руками
async function nameTaken(name, parentId, exceptId) {
  const dup = await Category.findOne({ where: { name, parentId } });
  return dup && dup.id !== exceptId;
}

// GET /api/admin/categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    res.json(buildTree(categories));
  } catch (e) { next(e); }
});

// POST /api/admin/categories  { name, parentId? }
router.post('/', async (req, res, next) => {
  try {
    const name = parseName(req.body);
    if (!name) return res.status(400).json({ error: 'name: обязателен, до 100 символов' });

    let parentId = null;
    const rawParent = req.body.parentId ?? req.body.parent_id;
    if (rawParent !== undefined && rawParent !== null) {
      parentId = toId(rawParent);
      if (!parentId || !(await Category.findByPk(parentId))) {
        return res.status(400).json({ error: 'parentId: родительская категория не найдена' });
      }
    }
    if (await nameTaken(name, parentId)) {
      return res.status(409).json({ error: 'Категория с таким названием уже есть на этом уровне' });
    }
    res.status(201).json(await Category.create({ name, parentId }));
  } catch (e) {
    if (e instanceof UniqueConstraintError) return res.status(409).json({ error: 'Категория уже существует' });
    next(e);
  }
});

// PUT /api/admin/categories/:id  { name?, parentId? }
router.put('/:id', async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const category = id ? await Category.findByPk(id) : null;
    if (!category) return res.status(404).json({ error: 'Категория не найдена' });

    const data = {};
    if (req.body.name !== undefined) {
      const name = parseName(req.body);
      if (!name) return res.status(400).json({ error: 'name: до 100 символов, не пустой' });
      data.name = name;
    }
    const rawParent = req.body.parentId !== undefined ? req.body.parentId : req.body.parent_id;
    if (rawParent !== undefined) {
      if (rawParent === null) data.parentId = null;
      else {
        const parentId = toId(rawParent);
        if (!parentId || !(await Category.findByPk(parentId))) {
          return res.status(400).json({ error: 'parentId: родительская категория не найдена' });
        }
        const all = await Category.findAll({ attributes: ['id', 'parentId'], raw: true });
        if (descendantIds(all, id).includes(parentId)) {
          return res.status(400).json({ error: 'Нельзя сделать категорию потомком самой себя' });
        }
        data.parentId = parentId;
      }
    }
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Нечего обновлять' });

    const name = data.name ?? category.name;
    const parentId = data.parentId !== undefined ? data.parentId : category.parentId;
    if (await nameTaken(name, parentId, id)) {
      return res.status(409).json({ error: 'Категория с таким названием уже есть на этом уровне' });
    }
    await category.update(data);
    res.json(category);
  } catch (e) {
    if (e instanceof UniqueConstraintError) return res.status(409).json({ error: 'Категория уже существует' });
    next(e);
  }
});

// DELETE /api/admin/categories/:id — 409, если есть товары или подкатегории (ON DELETE RESTRICT)
router.delete('/:id', async (req, res, next) => {
  try {
    const id = toId(req.params.id);
    const category = id ? await Category.findByPk(id) : null;
    if (!category) return res.status(404).json({ error: 'Категория не найдена' });

    const [products, children] = await Promise.all([
      Product.count({ where: { categoryId: id } }),
      Category.count({ where: { parentId: id } }),
    ]);
    if (products > 0) return res.status(409).json({ error: 'В категории есть товары', products });
    if (children > 0) return res.status(409).json({ error: 'У категории есть подкатегории', children });

    await category.destroy();
    res.status(204).end();
  } catch (e) {
    if (e instanceof ForeignKeyConstraintError) {
      return res.status(409).json({ error: 'Категорию нельзя удалить: на неё есть ссылки' });
    }
    next(e);
  }
});

module.exports = router;
