const { HttpError } = require('./errors');

// Использовать после authRequired: router.get('/x', authRequired, requireRole('seller'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Требуется авторизация'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Недостаточно прав'));
    }
    return next();
  };
}

module.exports = { requireRole };
