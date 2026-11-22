// Тестовые данные: администратор, два продавца, покупатель, дерево категорий, товары.
// Запуск из корня проекта: node scripts/seed.js   (можно запускать повторно)
// Пароль у всех: 123456
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Shop, Category, Product } = require('../models');

async function user(email, name, role, passwordHash) {
  const [u] = await User.findOrCreate({ where: { email }, defaults: { email, name, role, passwordHash } });
  return u;
}

async function shop(owner, name) {
  const [s] = await Shop.findOrCreate({ where: { ownerId: owner.id }, defaults: { ownerId: owner.id, name } });
  return s;
}

async function category(name, parent) {
  const parentId = parent ? parent.id : null;
  const [c] = await Category.findOrCreate({ where: { name, parentId }, defaults: { name, parentId } });
  return c;
}

async function product(shopRow, categoryRow, title, price, stock) {
  await Product.findOrCreate({
    where: { shopId: shopRow.id, title },
    defaults: { shopId: shopRow.id, categoryId: categoryRow.id, title, price, stock, description: `${title}: тестовый товар` },
  });
}

async function main() {
  const hash = await bcrypt.hash('123456', 10);

  await user('admin@test.ru', 'Администратор', 'admin', hash);
  const seller1 = await user('seller1@test.ru', 'Продавец 1', 'seller', hash);
  const seller2 = await user('seller2@test.ru', 'Продавец 2', 'seller', hash);
  await user('buyer@test.ru', 'Покупатель', 'buyer', hash);

  const techMart = await shop(seller1, 'TechMart');
  const home = await shop(seller2, 'Всё для дома');

  const electronics = await category('Электроника');
  const phones = await category('Смартфоны', electronics);
  const laptops = await category('Ноутбуки', electronics);
  const clothes = await category('Одежда');
  const men = await category('Мужская', clothes);
  const women = await category('Женская', clothes);
  const house = await category('Дом');
  const kitchen = await category('Кухня', house);
  const furniture = await category('Мебель', house);
  const sport = await category('Спорт');
  await category('Авто');
  const books = await category('Книги');

  await product(techMart, phones, 'Смартфон Alpha', 55, 10);
  await product(techMart, phones, 'Смартфон Beta', 78, 5);
  await product(techMart, laptops, 'Ноутбук Pro 15', 240, 3);
  await product(techMart, laptops, 'Ноутбук Air 13', 190, 1); // для проверки нехватки на складе
  await product(techMart, books, 'Книга по Node.js', 32, 20);
  await product(home, men, 'Куртка мужская', 425, 4);
  await product(home, women, 'Платье летнее', 160, 6);
  await product(home, kitchen, 'Блендер', 90, 8);
  await product(home, furniture, 'Стул деревянный', 215, 2);
  await product(home, sport, 'Гантели 10 кг', 400, 5);

  console.log('Готово. Аккаунты (пароль 123456): admin@test.ru, seller1@test.ru, seller2@test.ru, buyer@test.ru');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());