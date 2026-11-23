-- Тестовые данные для маркетплейса. Запускать ПОСЛЕ schema.sql:
--   psql -U postgres -d <имя_бд> -f database/seed.sql
-- Пароль у всех тестовых пользователей: password123  (bcrypt через pgcrypto)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ---------- users ----------
INSERT INTO users (id, email, password_hash, name, role) OVERRIDING SYSTEM VALUE VALUES
  (1, 'admin@shop.test',   crypt('password123', gen_salt('bf', 10)), 'Админ',            'admin'),
  (2, 'seller1@shop.test', crypt('password123', gen_salt('bf', 10)), 'Иван Петров',      'seller'),
  (3, 'seller2@shop.test', crypt('password123', gen_salt('bf', 10)), 'Мария Сидорова',   'seller'),
  (4, 'seller3@shop.test', crypt('password123', gen_salt('bf', 10)), 'Олег Заблокиров',  'seller'),
  (5, 'buyer1@shop.test',  crypt('password123', gen_salt('bf', 10)), 'Анна Смирнова',    'buyer'),
  (6, 'buyer2@shop.test',  crypt('password123', gen_salt('bf', 10)), 'Дмитрий Козлов',   'buyer'),
  (7, 'buyer3@shop.test',  crypt('password123', gen_salt('bf', 10)), 'Елена Новикова',   'buyer');

-- ---------- shops (у seller3 магазин заблокирован) ----------
INSERT INTO shops (id, owner_id, name, description, is_blocked) OVERRIDING SYSTEM VALUE VALUES
  (1, 2, 'ТехноМир',    'Электроника и аксессуары с гарантией',        false),
  (2, 3, 'Домашний уют', 'Одежда, товары для дома и книги',            false),
  (3, 4, 'Тёмный склад', 'Магазин заблокирован администратором',       true);

-- ---------- categories (дерево) ----------
INSERT INTO categories (id, name, parent_id) OVERRIDING SYSTEM VALUE VALUES
  (1, 'Электроника',   NULL),
  (2, 'Смартфоны',     1),
  (3, 'Ноутбуки',      1),
  (4, 'Аксессуары',    1),
  (5, 'Одежда',        NULL),
  (6, 'Мужская',       5),
  (7, 'Женская',       5),
  (8, 'Дом и сад',     NULL),
  (9, 'Книги',         NULL),
  (10, 'Пустая категория', NULL);  -- без товаров: удобно проверять DELETE

-- ---------- products ----------
INSERT INTO products (id, shop_id, category_id, title, description, price, stock, image_url, status) OVERRIDING SYSTEM VALUE VALUES
  (1,  1, 2, 'Смартфон Nova X1 128 ГБ',       'Экран 6.5", камера 50 Мп',              24990.00, 15, 'https://picsum.photos/seed/p1/600/600',  'active'),
  (2,  1, 2, 'Смартфон Nova X1 Pro 256 ГБ',   'Флагман с OLED-экраном',                39990.00,  8, 'https://picsum.photos/seed/p2/600/600',  'active'),
  (3,  1, 3, 'Ноутбук Aero 15',               '15.6", 16 ГБ ОЗУ, SSD 512 ГБ',          64990.00,  5, 'https://picsum.photos/seed/p3/600/600',  'active'),
  (4,  1, 3, 'Ноутбук Lite 14',               'Лёгкий ноутбук для учёбы',              37990.00, 12, 'https://picsum.photos/seed/p4/600/600',  'active'),
  (5,  1, 4, 'Наушники беспроводные Pods',    'Bluetooth 5.3, 24 ч работы',             3490.00, 50, 'https://picsum.photos/seed/p5/600/600',  'active'),
  (6,  1, 4, 'Чехол для смартфона',           'Силикон, несколько цветов',               490.00, 200,'https://picsum.photos/seed/p6/600/600',  'active'),
  (7,  1, 4, 'Зарядка 65 Вт GaN',             'Быстрая зарядка USB-C',                  1990.00,  0, 'https://picsum.photos/seed/p7/600/600',  'active'),   -- нет в наличии
  (8,  1, 2, 'Смартфон Nova X0 (старая модель)','Снят с продажи',                      14990.00, 3, 'https://picsum.photos/seed/p8/600/600',  'hidden'),   -- скрыт
  (9,  2, 6, 'Куртка мужская демисезонная',   'Размеры 46–54',                          5990.00, 20, 'https://picsum.photos/seed/p9/600/600',  'active'),
  (10, 2, 6, 'Джинсы мужские классические',   'Прямой крой',                            2990.00, 35, 'https://picsum.photos/seed/p10/600/600', 'active'),
  (11, 2, 7, 'Платье летнее',                 'Хлопок, размеры 42–50',                  3290.00, 18, 'https://picsum.photos/seed/p11/600/600', 'active'),
  (12, 2, 7, 'Пальто женское шерстяное',      'Тёплое, зима',                           8990.00,  6, 'https://picsum.photos/seed/p12/600/600', 'active'),
  (13, 2, 8, 'Набор постельного белья 2-спальный','Сатин, 100% хлопок',                 3990.00, 25, 'https://picsum.photos/seed/p13/600/600', 'active'),
  (14, 2, 8, 'Горшок для цветов керамический','Диаметр 20 см',                           690.00, 80, 'https://picsum.photos/seed/p14/600/600', 'active'),
  (15, 2, 8, 'Плед флисовый',                 '150×200 см',                             1490.00, 40, 'https://picsum.photos/seed/p15/600/600', 'active'),
  (16, 2, 9, 'Книга «Чистый код»',            'Р. Мартин, твёрдый переплёт',            1890.00, 30, 'https://picsum.photos/seed/p16/600/600', 'active'),
  (17, 2, 9, 'Книга «Мастер и Маргарита»',    'М. Булгаков',                             590.00, 60, 'https://picsum.photos/seed/p17/600/600', 'active'),
  (18, 2, 9, 'Книга «Шаблоны проектирования»','Банда четырёх',                          2490.00,  0, 'https://picsum.photos/seed/p18/600/600', 'hidden'),
  (19, 3, 2, 'Смартфон «Тёмный» (заблок. магазин)','Не должен попадать в каталог',      9990.00, 10, 'https://picsum.photos/seed/p19/600/600', 'active'),
  (20, 3, 4, 'Кабель USB-C (заблок. магазин)','Не должен попадать в каталог',             290.00, 100,'https://picsum.photos/seed/p20/600/600', 'active');

-- ---------- carts / cart_items ----------
INSERT INTO carts (id, user_id) OVERRIDING SYSTEM VALUE VALUES (1, 5), (2, 6);

INSERT INTO cart_items (id, cart_id, product_id, quantity) OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 1,  1),   -- buyer1: товары двух продавцов
  (2, 1, 5,  2),
  (3, 1, 9,  1),
  (4, 1, 16, 1),
  (5, 2, 4,  1),   -- buyer2
  (6, 2, 14, 3),
  (7, 2, 19, 1),   -- товар заблокированного магазина (должен помечаться available=false)
  (8, 2, 8,  1);   -- скрытый товар

-- ---------- favorites ----------
INSERT INTO favorites (id, user_id, product_id) OVERRIDING SYSTEM VALUE VALUES
  (1, 5, 3), (2, 5, 12), (3, 5, 16), (4, 6, 2), (5, 7, 11);

-- ---------- orders / sub_orders / order_items ----------
INSERT INTO orders (id, buyer_id, address, payment_method) OVERRIDING SYSTEM VALUE VALUES
  (1, 5, 'г. Москва, ул. Ленина, д. 10, кв. 25', 'cash_on_delivery'),
  (2, 6, 'г. Казань, пр. Победы, д. 5, кв. 12',   'cash_on_delivery'),
  (3, 7, 'г. Самара, ул. Мира, д. 3, кв. 7',      'cash_on_delivery');

INSERT INTO sub_orders (id, order_id, shop_id, status) OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 1, 'completed'),   -- заказ 1: два продавца
  (2, 1, 2, 'shipped'),
  (3, 2, 1, 'new'),
  (4, 3, 2, 'confirmed'),
  (5, 3, 1, 'cancelled');

INSERT INTO order_items (id, sub_order_id, product_id, product_title, quantity, price) OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 5,  'Наушники беспроводные Pods',     1,  3490.00),
  (2, 1, 6,  'Чехол для смартфона',            2,   490.00),
  (3, 2, 10, 'Джинсы мужские классические',    1,  2990.00),
  (4, 3, 3,  'Ноутбук Aero 15',                1, 64990.00),
  (5, 4, 11, 'Платье летнее',                  2,  3290.00),
  (6, 4, 17, 'Книга «Мастер и Маргарита»',     1,   590.00),
  (7, 5, 7,  'Зарядка 65 Вт GaN',              1,  1990.00);

-- ---------- reviews ----------
INSERT INTO reviews (id, product_id, user_id, rating, comment) OVERRIDING SYSTEM VALUE VALUES
  (1, 5,  5, 5, 'Отличный звук, батарея держит долго'),
  (2, 6,  5, 4, 'Хороший чехол за свои деньги'),
  (3, 10, 5, 5, 'Сидят отлично'),
  (4, 11, 7, 4, 'Красивое платье, чуть мало по размеру'),
  (5, 17, 7, 5, NULL);

-- ---------- сдвигаем sequences (id вставляли вручную) ----------
SELECT setval(pg_get_serial_sequence('users','id'),       (SELECT max(id) FROM users));
SELECT setval(pg_get_serial_sequence('shops','id'),       (SELECT max(id) FROM shops));
SELECT setval(pg_get_serial_sequence('categories','id'),  (SELECT max(id) FROM categories));
SELECT setval(pg_get_serial_sequence('products','id'),    (SELECT max(id) FROM products));
SELECT setval(pg_get_serial_sequence('carts','id'),       (SELECT max(id) FROM carts));
SELECT setval(pg_get_serial_sequence('cart_items','id'),  (SELECT max(id) FROM cart_items));
SELECT setval(pg_get_serial_sequence('favorites','id'),   (SELECT max(id) FROM favorites));
SELECT setval(pg_get_serial_sequence('orders','id'),      (SELECT max(id) FROM orders));
SELECT setval(pg_get_serial_sequence('sub_orders','id'),  (SELECT max(id) FROM sub_orders));
SELECT setval(pg_get_serial_sequence('order_items','id'), (SELECT max(id) FROM order_items));
SELECT setval(pg_get_serial_sequence('reviews','id'),     (SELECT max(id) FROM reviews));

COMMIT;
