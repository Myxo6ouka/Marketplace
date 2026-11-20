'use strict';
// Заглушка API (localStorage) для работы фронтенда без бэкенда.
// Включить: открыть сайт с ?mock=1 ; выключить: ?mock=0
(function () {
  const q = new URLSearchParams(location.search);
  if (!localStorage.getItem('mock')) localStorage.setItem('mock', '1');
  if (q.has('mock')) localStorage.setItem('mock', q.get('mock') === '1' ? '1' : '0');
  const KEY = 'mockdb_v2';
  const err = (status, message) => Object.assign(new Error(message), { status });

  function seed() {
    const cats = [[1, 'Электроника', null], [2, 'Смартфоны', 1], [3, 'Ноутбуки', 1], [4, 'Одежда', null], [5, 'Мужская', 4], [6, 'Женская', 4],
      [7, 'Дом', null], [8, 'Кухня', 7], [9, 'Мебель', 7], [10, 'Спорт', null], [11, 'Авто', null], [12, 'Книги', null]]
      .map(([id, name, parentId]) => ({ id, name, parentId }));
    const users = [
      { id: 1, name: 'Админ', email: 'admin@test.ru', password: '123456', role: 'admin' },
      { id: 2, name: 'Продавец 1', email: 'seller1@test.ru', password: '123456', role: 'seller' },
      { id: 3, name: 'Продавец 2', email: 'seller2@test.ru', password: '123456', role: 'seller' },
      { id: 4, name: 'Продавец 3', email: 'seller3@test.ru', password: '123456', role: 'seller' },
      { id: 5, name: 'Покупатель', email: 'buyer@test.ru', password: '123456', role: 'buyer' }
    ];
    const shops = [{ id: 1, name: 'TechMart', ownerId: 2, blocked: false }, { id: 2, name: 'Модный дом', ownerId: 3, blocked: false }, { id: 3, name: 'Всё для дома', ownerId: 4, blocked: false }];
    const pool = [[2, 'Смартфон'], [3, 'Ноутбук'], [5, 'Куртка мужская'], [6, 'Платье'], [8, 'Блендер'], [9, 'Стул'], [10, 'Гантели'], [11, 'Автокомпрессор'], [12, 'Книга']];
    const products = [];
    for (let i = 1; i <= 30; i++) {
      const [categoryId, n] = pool[i % pool.length];
      products.push({ id: i, shopId: (i % 3) + 1, categoryId, title: n + ' №' + i, description: 'Описание товара «' + n + ' №' + i + '». Хорошее качество, быстрая отправка.',
        price: 10 + ((i * 37) % 90) * 5, stock: 3 + (i % 7) * 4, imageUrl: 'img/p' + i + '.png', status: 'Активен' });
    }
    return { cats, users, shops, products, carts: {}, orders: [], seq: { user: 6, shop: 4, product: 31, cat: 13, item: 1, order: 1, sub: 1 } };
  }
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY) || 'null') || seed(); }
  catch(e) { db = seed(); }
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));

  const userOut = u => { const s = db.shops.find(x => x.ownerId === u.id); return { id: u.id, name: u.name, email: u.email, role: u.role, shopName: s ? s.name : undefined }; };
  const prodOut = p => {
    const s = db.shops.find(x => x.id === p.shopId), c = db.cats.find(x => x.id === p.categoryId);
    return { id: p.id, title: p.title, description: p.description, price: p.price, stock: p.stock, imageUrl: p.imageUrl, status: p.status,
      categoryId: p.categoryId, categoryName: c && c.name, shop: { id: s.id, name: s.name, blocked: s.blocked } };
  };
  const visible = p => p.status === 'Активен' && !db.shops.find(s => s.id === p.shopId).blocked;
  const descendants = id => { const r = [id]; db.cats.filter(c => c.parentId === id).forEach(c => r.push(...descendants(c.id))); return r; };

  function handle(method, url, body, token) {
    const u = new URL(url, 'http://x'); const path = u.pathname.replace(/\/$/, ''); const sp = u.searchParams; let m;
    const me = token && /^mock\./.test(token) ? db.users.find(x => x.id === +token.slice(5)) : null;
    const need = (...roles) => { if (!me) throw err(401, 'Требуется вход'); if (me.role === 'seller' && db.shops.some(s => s.ownerId === me.id && s.blocked)) throw err(403, 'Магазин заблокирован администратором'); if (roles.length && !roles.includes(me.role)) throw err(403, 'Недостаточно прав'); return me; };
    const myShop = () => db.shops.find(s => s.ownerId === me.id);
    body = body || {};

    if (method === 'POST' && path === '/register') {
      if (!body.email || !body.password || !body.name) throw err(400, 'Заполните все поля');
      if (db.users.some(x => x.email === body.email)) throw err(409, 'Email уже занят');
      const role = body.role === 'seller' ? 'seller' : 'buyer';
      if (role === 'seller' && !body.shopName) throw err(400, 'Укажите название магазина');
      const nu = { id: db.seq.user++, name: body.name, email: body.email, password: body.password, role }; db.users.push(nu);
      if (role === 'seller') db.shops.push({ id: db.seq.shop++, name: body.shopName, ownerId: nu.id, blocked: false });
      save(); return { token: 'mock.' + nu.id, user: userOut(nu) };
    }
    if (method === 'POST' && path === '/login') {
      const x = db.users.find(v => v.email === body.email && v.password === body.password);
      if (!x) throw err(401, 'Неверный email или пароль');
      if(x.role === 'seller' && db.shops.some(s => s.ownerId === x.id && s.blocked)) throw err(403, 'Магазин заблокирован администратором');
      return { token: 'mock.' + x.id, user: userOut(x) };
    }
    if (method === 'GET' && path === '/me') return userOut(need());
    if (method === 'GET' && path === '/categories') return db.cats;
    if (method === 'GET' && path === '/sellers') return db.shops.filter(s => !s.blocked).map(s => ({id:s.id,name:s.name}));
    if (method === 'GET' && path === '/products') {
      let list = db.products.filter(p => sp.get('includeHidden') === '1' && me && me.role === 'admin' ? true : visible(p));
      const qq = (sp.get('q') || '').toLowerCase();
      if (qq) list = list.filter(p => p.title.toLowerCase().includes(qq));
      if (sp.get('category')) { const ids = descendants(+sp.get('category')); list = list.filter(p => ids.includes(p.categoryId)); }
      if (sp.get('seller')) list = list.filter(p => p.shopId === +sp.get('seller'));
      if (sp.get('minPrice')) list = list.filter(p => p.price >= +sp.get('minPrice'));
      if (sp.get('maxPrice')) list = list.filter(p => p.price <= +sp.get('maxPrice'));
      const s = sp.get('sort');
      if (s === 'price_asc') list.sort((a, b) => a.price - b.price); else if (s === 'price_desc') list.sort((a, b) => b.price - a.price); else list.sort((a, b) => b.id - a.id);
      const limit = 12, page = Math.max(1, +sp.get('page') || 1);
      return { items: list.slice((page - 1) * limit, page * limit).map(prodOut), total: list.length, page, totalPages: Math.max(1, Math.ceil(list.length / limit)) };
    }
    if ((m = path.match(/^\/products\/(\d+)$/)) && method === 'GET') {
      const p = db.products.find(x => x.id === +m[1]); if (!p || !visible(p)) throw err(404, 'Товар не найден'); return prodOut(p);
    }
    if ((m = path.match(/^\/sellers\/(\d+)$/)) && method === 'GET') {
      const s = db.shops.find(x => x.id === +m[1]); if (!s) throw err(404, 'Продавец не найден'); return { id: s.id, name: s.name };
    }
    if (path === '/cart' && method === 'GET') {
      need('buyer'); const items = (db.carts[me.id] || []).map(i => ({ id: i.id, quantity: i.quantity, product: prodOut(db.products.find(p => p.id === i.productId)) }));
      return { items };
    }
    if (path === '/cart/items' && method === 'POST') {
      need('buyer'); const p = db.products.find(x => x.id === +body.productId); if (!p || !visible(p)) throw err(404, 'Товар недоступен');
      const cart = db.carts[me.id] = db.carts[me.id] || []; let it = cart.find(i => i.productId === p.id); const qty = Math.max(1, +body.quantity || 1);
      if ((it ? it.quantity : 0) + qty > p.stock) throw err(409, 'Недостаточно товара на складе (осталось ' + p.stock + ')');
      if (it) it.quantity += qty; else cart.push({ id: db.seq.item++, productId: p.id, quantity: qty });
      save(); return { ok: true };
    }
    if ((m = path.match(/^\/cart\/items\/(\d+)$/))) {
      need('buyer'); const cart = db.carts[me.id] || []; const it = cart.find(i => i.id === +m[1]); if (!it) throw err(404, 'Позиция не найдена');
      if (method === 'PATCH') {
        const q2 = +body.quantity; const p = db.products.find(x => x.id === it.productId);
        if (!(q2 >= 1)) throw err(400, 'Некорректное количество'); if (q2 > p.stock) throw err(409, 'Недостаточно товара на складе (осталось ' + p.stock + ')');
        it.quantity = q2; save(); return { ok: true };
      }
      if (method === 'DELETE') { db.carts[me.id] = cart.filter(i => i !== it); save(); return { ok: true }; }
    }
    if (path === '/orders' && method === 'POST') {
      need('buyer'); const cart = db.carts[me.id] || []; if (!cart.length) throw err(400, 'Корзина пуста');
      if (!body.address || String(body.address).trim().length < 5) throw err(400, 'Укажите адрес доставки');
      for (const i of cart) { const p = db.products.find(x => x.id === i.productId); if (!visible(p)) throw err(409, 'Товар «' + p.title + '» недоступен'); if (i.quantity > p.stock) throw err(409, 'Недостаточно товара «' + p.title + '»'); }
      const order = { id: db.seq.order++, userId: me.id, userName: me.name, address: body.address, createdAt: new Date().toISOString(), subOrders: [] };
      cart.forEach(i => {
        const p = db.products.find(x => x.id === i.productId); p.stock -= i.quantity;
        let so = order.subOrders.find(s => s.shopId === p.shopId);
        if (!so) { so = { id: db.seq.sub++, shopId: p.shopId, status: 'Новый', items: [] }; order.subOrders.push(so); }
        so.items.push({ productId: p.id, title: p.title, quantity: i.quantity, price: p.price });
      });
      db.orders.push(order); db.carts[me.id] = []; save(); return orderOut(order);
    }
    if (path === '/orders' && method === 'GET') { need('buyer'); return db.orders.filter(o => o.userId === me.id).reverse().map(orderOut); }
    if ((m = path.match(/^\/orders\/(\d+)$/)) && method === 'GET') {
      need('buyer'); const o = db.orders.find(x => x.id === +m[1]); if (!o) throw err(404, 'Заказ не найден'); if (o.userId !== me.id) throw err(403, 'Чужой заказ'); return orderOut(o);
    }
    if (path === '/seller/products' && method === 'GET') { need('seller'); return db.products.filter(p => p.shopId === myShop().id).map(prodOut); }
    if (path === '/seller/products' && method === 'POST') {
      need('seller'); checkProd(body);
      const p = { id: db.seq.product++, shopId: myShop().id, categoryId: +body.categoryId, title: body.title, description: body.description || '', price: +body.price, stock: +body.stock, imageUrl: body.imageUrl || '', status: 'Активен' };
      db.products.push(p); save(); return prodOut(p);
    }
    if ((m = path.match(/^\/seller\/products\/(\d+)$/))) {
      need('seller'); const p = db.products.find(x => x.id === +m[1]); if (!p) throw err(404, 'Товар не найден'); if (p.shopId !== myShop().id) throw err(403, 'Чужой товар');
      if (method === 'PUT') { checkProd(body); Object.assign(p, { categoryId: +body.categoryId, title: body.title, description: body.description || '', price: +body.price, stock: +body.stock, imageUrl: body.imageUrl || '' }); save(); return prodOut(p); }
      if (method === 'DELETE') { db.products = db.products.filter(x => x !== p); save(); return { ok: true }; }
    }
    if (path === '/seller/orders' && method === 'GET') {
      need('seller'); const sid = myShop().id; const out = [];
      db.orders.forEach(o => o.subOrders.filter(s => s.shopId === sid).forEach(s => out.push(subOut(o, s))));
      return out.reverse();
    }
    if ((m = path.match(/^\/seller\/orders\/(\d+)\/status$/)) && method === 'PATCH') {
      need('seller'); for (const o of db.orders) for (const s of o.subOrders) if (s.id === +m[1]) {
        if (s.shopId !== myShop().id) throw err(403, 'Чужой подзаказ');
        if (!['Новый', 'Подтверждён', 'Отправлен', 'Выполнен', 'Отменён'].includes(body.status)) throw err(400, 'Неверный статус');
        s.status = body.status; save(); return subOut(o, s);
      }
      throw err(404, 'Подзаказ не найден');
    }
    if (path === '/admin/sellers' && method === 'GET') {
      need('admin'); return db.shops.map(s => { const o = db.users.find(x => x.id === s.ownerId); return { id: s.id, shopName: s.name, ownerName: o.name, email: o.email, blocked: s.blocked }; });
    }
    if ((m = path.match(/^\/admin\/sellers\/(\d+)\/block$/)) && method === 'PATCH') { need('admin'); const s = db.shops.find(x => x.id === +m[1]); if (!s) throw err(404, 'Не найден'); s.blocked = !!body.blocked; save(); return { id: s.id, blocked: s.blocked }; }
    if ((m = path.match(/^\/admin\/products\/(\d+)\/hide$/)) && method === 'PATCH') { need('admin'); const p = db.products.find(x => x.id === +m[1]); if (!p) throw err(404, 'Не найден'); p.status = body.hidden ? 'Скрыт' : 'Активен'; save(); return prodOut(p); }
    if (path === '/admin/categories' && method === 'GET') { need('admin'); return db.cats; }
    if (path === '/admin/categories' && method === 'POST') {
      need('admin'); if (!body.name) throw err(400, 'Укажите название'); const c = { id: db.seq.cat++, name: body.name, parentId: body.parentId ? +body.parentId : null }; db.cats.push(c); save(); return c;
    }
    if ((m = path.match(/^\/admin\/categories\/(\d+)$/))) {
      need('admin'); const c = db.cats.find(x => x.id === +m[1]); if (!c) throw err(404, 'Не найдена');
      if (method === 'PUT') { if (!body.name) throw err(400, 'Укажите название'); c.name = body.name; c.parentId = body.parentId ? +body.parentId : null; save(); return c; }
      if (method === 'DELETE') {
        if (db.cats.some(x => x.parentId === c.id) || db.products.some(p => p.categoryId === c.id)) throw err(409, 'Категория не пуста');
        db.cats = db.cats.filter(x => x !== c); save(); return { ok: true };
      }
    }
    throw err(404, 'Маршрут не найден: ' + method + ' ' + path);
  }
  function checkProd(b) {
    if (!b.title || !(+b.price > 0) || !(+b.stock >= 0) || !b.categoryId) throw err(400, 'Проверьте название, цену, остаток и категорию');
  }
  function orderOut(o) {
    return { id: o.id, address: o.address, createdAt: o.createdAt, subOrders: o.subOrders.map(s => ({ id: s.id, status: s.status, shop: { id: s.shopId, name: db.shops.find(x => x.id === s.shopId).name }, items: s.items, total: s.items.reduce((a, i) => a + i.price * i.quantity, 0) })) };
  }
  function subOut(o, s) {
    return { id: s.id, orderId: o.id, status: s.status, createdAt: o.createdAt, address: o.address, buyerName: o.userName, items: s.items, total: s.items.reduce((a, i) => a + i.price * i.quantity, 0) };
  }
  window.mockRequest = (method, url, body, token) => new Promise((res, rej) => setTimeout(() => {
    try { res(JSON.parse(JSON.stringify(handle(method, url, body, token)))); } catch (e) { rej(e); }
  }, 250));
  window.mockReset = () => { localStorage.removeItem(KEY); location.reload(); };
})();
