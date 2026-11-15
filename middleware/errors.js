// Единый формат ошибок API: { "error": "текст" } с кодами 400, 401, 403, 404, 409.

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

// Express 4 не ловит ошибки из async-обработчиков сам: оборачиваем их.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Единый формат успеха: { "data": ... }
const ok = (res, data, status = 200) => res.status(status).json({ data });

function notFound(req, res, next) {
  next(new HttpError(404, 'Маршрут не найден'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.status;
  let message = err.message;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Некорректный JSON в теле запроса';
  } else if (!status) {
    switch (err.name) {
      case 'SequelizeValidationError':
        status = 400;
        message = err.errors.map((e) => e.message).join('; ');
        break;
      case 'SequelizeUniqueConstraintError':
        status = 409;
        message = 'Такая запись уже существует';
        break;
      case 'SequelizeForeignKeyConstraintError':
        status = 409;
        message = 'Операция нарушает связи между данными';
        break;
      default:
        status = 500;
    }
  }

  if (status >= 500) {
    console.error(err);
    message = 'Внутренняя ошибка сервера';
  }

  res.status(status).json({ error: message });
}

module.exports = { HttpError, asyncHandler, ok, notFound, errorHandler };
