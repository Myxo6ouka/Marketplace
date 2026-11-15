require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error(
    'Не задана переменная окружения JWT_SECRET. Скопируйте .env.example в .env и заполните её.'
  );
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET,
  // ТЗ: токен живёт не меньше 24 часов
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2d',
};
