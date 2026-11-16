// ЗАГЛУШКА. Если в проекте уже есть своя auth-middleware — удали этот файл
// и поправь require в routes/*.js. Ожидается, что после authRequired в req.user лежит { id, role }.
const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (e) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user && req.user.role)
    ? next()
    : res.status(403).json({ error: 'Недостаточно прав' });

module.exports = { authRequired, requireRole };
