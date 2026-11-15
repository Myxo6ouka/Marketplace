const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { HttpError } = require('./errors');

// Проверяет заголовок Authorization: Bearer <JWT> и кладёт в req.user { id, role }.
// Роль берётся из токена, права проверяются на сервере (requireRole).
function authRequired(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Требуется авторизация'));
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (e) {
    return next(new HttpError(401, 'Недействительный или просроченный токен'));
  }
}

module.exports = { authRequired };
