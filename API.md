# API-контракт Marketplace

База: `http://localhost:3000/api`. Все запросы и ответы в JSON.

- Успех: `{ "data": ... }`. Ошибка: `{ "error": "текст" }`.
- Коды: 400 (неверные данные), 401 (нет или неверный токен), 403 (нет прав), 404 (не найдено), 409 (конфликт: дубль, нехватка остатка).
- Защищённые маршруты: заголовок `Authorization: Bearer <JWT>`. Роль берётся из токена: `buyer`, `seller`, `admin`.
- Статусы подзаказа: `new` (Новый), `confirmed` (Подтверждён), `shipped` (Отправлен), `completed` (Выполнен), `cancelled` (Отменён).
- Деньги (`price`, `total`) отдаются числом, например `999.99`. Поля в camelCase.

## Авторизация (A)

| Метод и путь | Доступ | Тело | Ответ `data` |
|---|---|---|---|
| `POST /register` | все | `{ email, password, name, role: "buyer"\|"seller", shopName? }` (`shopName` обязателен для seller) | 201 `{ token, user }` |
| `POST /login` | все | `{ email, password }` | `{ token, user }` |
| `GET /me` | любой вошедший | | `user` |

`user`: `{ id, email, name, role, shop: { id, name, isBlocked } | null }`. Ошибки регистрации: 400 (неверные данные), 409 (email занят). Логин: 401 «Неверный email или пароль».

## Каталог (B), открыт всем

| Метод и путь | Ответ `data` |
|---|---|
| `GET /products?q=&category=&seller=&minPrice=&maxPrice=&sort=&page=` | `{ items: [product], page, pages, total }` |
| `GET /products/:id` | `product` |
| `GET /categories` | дерево: `[{ id, name, children: [...] }]` |
| `GET /sellers/:id` | `{ id, name, description }` |

`sort`: `price_asc`, `price_desc`, `new`. `page` с 1. В каталоге только `active` товары из незаблокированных магазинов.

`product`: `{ id, title, description, price, stock, imageUrl, category: { id, name }, seller: { id, name } }`.

## Корзина (B), роль buyer

| Метод и путь | Тело | Ответ `data` |
|---|---|---|
| `GET /cart` | | `{ groups: [{ seller: { id, name }, items: [{ id, product, quantity }], subtotal }], total }` |
| `POST /cart/items` | `{ productId, quantity }` | обновлённая корзина (повтор увеличивает количество) |
| `PATCH /cart/items/:id` | `{ quantity }` | обновлённая корзина |
| `DELETE /cart/items/:id` | | обновлённая корзина |

Ошибки: 409, если скрыт товар или нет остатка.

## Заказы покупателя (A), роль buyer

| Метод и путь | Тело | Ответ `data` |
|---|---|---|
| `POST /orders` | `{ address, paymentMethod? }` (по умолчанию `cash_on_delivery`) | 201 `order` |
| `GET /orders` | | `[order]`, новые сверху |
| `GET /orders/:id` | | `order` (чужой заказ: 404) |

`order`: `{ id, address, paymentMethod, createdAt, subOrders: [{ id, shop: { id, name }, status, total, items: [{ productId, title, quantity, price }] }] }`.

`POST /orders`: 400 при пустой корзине, 409 при нехватке остатка или скрытом товаре (в этом случае ничего не создаётся). Цена фиксируется на момент заказа.

## Кабинет продавца

| Метод и путь | Исполнитель | Тело | Ответ `data` |
|---|---|---|---|
| `GET /seller/products` | B | | `[product]` (только свои, включая скрытые) |
| `POST /seller/products` | B | `{ title, description?, price, stock, categoryId, imageUrl? }` | 201 `product` |
| `PUT /seller/products/:id` | B | те же поля | `product` |
| `DELETE /seller/products/:id` | B | | `{ id }` |
| `GET /seller/orders` | A | | `[subOrder]`, только своего магазина |
| `PATCH /seller/orders/:id/status` | A | `{ status }` | `subOrder` |

Чужой товар или подзаказ: 403. `subOrder`: `{ id, orderId, status, total, address, buyer: { id, name }, items: [...] }`.

Переходы статуса: `new → confirmed → shipped → completed`; `cancelled` возможен из `new` и `confirmed`. Другие переходы: 409.

## Админ, роль admin (остальным 403)

| Метод и путь | Исполнитель | Тело | Ответ `data` |
|---|---|---|---|
| `GET /admin/sellers` | A | | `[{ id, name, ownerEmail, isBlocked }]` |
| `PATCH /admin/sellers/:id/block` | A | `{ blocked: true\|false }` | `{ id, isBlocked }` |
| `PATCH /admin/products/:id/hide` | A | `{ hidden: true\|false }` | `{ id, status }` |
| `GET/POST/PUT/DELETE /admin/categories` | B | `{ name, parentId? }` | категория; удаление категории с товарами: 409 |

## Should (если успеем)

- `POST /products/:id/reviews` (A): `{ rating: 1..5, comment? }`, только покупатель с выполненным подзаказом с этим товаром, один отзыв на товар. `GET /products/:id/reviews`: список и средний рейтинг.
- `GET /favorites`, `POST /favorites` `{ productId }`, `DELETE /favorites/:productId` (B).
