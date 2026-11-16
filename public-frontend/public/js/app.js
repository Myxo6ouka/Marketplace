'use strict';
/* ---------- утилиты ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'BYN' }).format(Number(n) || 0);
const dateStr = d => d ? new Date(d).toLocaleString('ru-RU') : '';
const toList = d => Array.isArray(d) ? d : (d && (d.items || d.products || d.rows || d.orders)) || [];
const shopOf = p => p.shop || p.seller || { id: p.shopId, name: p.shopName };
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" fill="#9ca3af" font-family="Arial" font-size="22" text-anchor="middle">Нет фото</text></svg>').replace(/'/g, '%27');
const img = (url, cls = '') => `<img class="${cls}" src="${esc(url || PLACEHOLDER)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">`;
const isHidden = p => p.status === 'Скрыт' || p.hidden === true;
const STATUS_NEXT = { 'Новый': ['Подтверждён', 'Отменён'], 'Подтверждён': ['Отправлен', 'Отменён'], 'Отправлен': ['Выполнен', 'Отменён'] };

const appEl = $('#app');
const state = { user: null, cartCount: 0, categories: [] };
window.addEventListener('auth-expired', () => { state.user = null; state.cartCount = 0; renderHeader(); });

let navId = 0;

const loadingHtml = () => '<div class="state"><div class="spin"></div>Загрузка…</div>';
const emptyHtml = (msg, link) => `<div class="state">${esc(msg)}${link ? `<p><a class="btn" href="${link[0]}">${esc(link[1])}</a></p>` : ''}</div>`;
const errorHtml = e => `<div class="state err"><p>${esc(e.message || 'Ошибка')}</p><button class="btn sec" data-action="retry">Повторить</button></div>`;

function toast(msg, type = '') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3500);
}

/* ---------- категории ---------- */
function buildTree(flat) {
  if (flat.some(c => Array.isArray(c.children))) return flat.filter(c => !(c.parentId ?? c.parent_id));
  const map = {}; flat.forEach(c => map[c.id] = { ...c, children: [] }); const roots = [];
  flat.forEach(c => { const pid = c.parentId ?? c.parent_id; (pid && map[pid] ? map[pid].children : roots).push(map[c.id]); });
  return roots;
}
function flatCats(tree, depth = 0, out = []) {
  tree.forEach(c => { out.push({ id: c.id, name: '— '.repeat(depth) + c.name }); flatCats(c.children || [], depth + 1, out); });
  return out;
}
async function loadCategories(force) {
  if (state.categories.length && !force) return;
  state.categories = buildTree(toList(await api.get('/categories')));
}

/* ---------- шапка ---------- */
function renderHeader() {
  const u = state.user; const links = [];
  if (!u || u.role === 'buyer') links.push(`<a href="#/cart">Корзина${state.cartCount ? `<span class="badge">${state.cartCount}</span>` : ''}</a>`);
  if (u && u.role === 'buyer') links.push('<a href="#/orders">Мои заказы</a>');
  if (u && u.role === 'seller') links.push('<a href="#/seller">Кабинет продавца</a>');
  if (u && u.role === 'admin') links.push('<a href="#/admin">Админ-панель</a>');
  links.unshift('<a href="#/">Каталог</a>');
  if (u) links.push(`<span class="muted">${esc(u.name || u.email)}</span><a href="#" data-action="logout">Выйти</a>`);
  else links.push('<a href="#/login">Войти</a><a class="btn sm" href="#/register">Регистрация</a>');
  $('#header').innerHTML = `<div class="header-in"><a class="logo" href="#/">Market<span>Place</span></a>
    <form class="search" id="search"><input name="q" placeholder="Поиск товаров" value="${esc(parseHash().query.q || '')}"><button class="btn">Найти</button></form>
    <nav class="nav">${links.join('')}</nav></div>`;
}
document.addEventListener('submit', e => {
  if (e.target.id === 'search') { e.preventDefault(); location.hash = '#/?q=' + encodeURIComponent(new FormData(e.target).get('q').trim()); }
});

async function refreshCartCount() {
  if (!state.user || state.user.role !== 'buyer') { state.cartCount = 0; return renderHeader(); }
  try { state.cartCount = toList(await api.get('/cart')).reduce((s, i) => s + (i.quantity || 1), 0); } catch (e) { state.cartCount = 0; }
  renderHeader();
}

/* ---------- роутер ---------- */
function parseHash() {
  const raw = location.hash.slice(1) || '/'; const [path, qs] = raw.split('?');
  return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
const routes = [
  [/^\/$/, catalogView], [/^\/product\/(\d+)$/, productView], [/^\/login$/, loginView], [/^\/register$/, registerView],
  [/^\/cart$/, cartView], [/^\/checkout$/, checkoutView], [/^\/orders$/, ordersView], [/^\/seller$/, sellerView], [/^\/admin$/, adminView]
];
async function router() {
  const my = ++navId; const { path, query } = parseHash(); renderHeader(); window.scrollTo(0, 0);
  for (const [re, fn] of routes) {
    const m = path.match(re); if (!m) continue;
    appEl.innerHTML = loadingHtml();
    try { await fn(m.slice(1), query, () => my !== navId); } catch (e) {
      if (my !== navId) return;
      if (e.status === 401 && state.user) { state.user = null; api.token = null; renderHeader(); location.hash = '#/login'; return; }
      appEl.innerHTML = errorHtml(e);
    }
    return;
  }
  appEl.innerHTML = emptyHtml('Страница не найдена', ['#/', 'На главную']);
}
window.addEventListener('hashchange', router);

function requireRole(roles) {
  if (!state.user) { location.hash = '#/login'; return false; }
  if (!roles.includes(state.user.role)) { appEl.innerHTML = '<div class="state err"><h2>403</h2>Недостаточно прав для этой страницы</div>'; return false; }
  return true;
}

/* ---------- каталог ---------- */
function link(q, patch) {
  const n = { ...q, ...patch }; const p = new URLSearchParams();
  Object.entries(n).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); });
  const s = p.toString(); return '#/' + (s ? '?' + s : '');
}
function treeHtml(nodes, q) {
  return `<ul>${nodes.map(c => `<li><a href="${link(q, { category: c.id, page: '' })}" class="${String(q.category) === String(c.id) ? 'active' : ''}">${esc(c.name)}</a>${c.children && c.children.length ? treeHtml(c.children, q) : ''}</li>`).join('')}</ul>`;
}
async function catalogView(_, q, stale) {
  await loadCategories(); if (stale()) return;
  appEl.innerHTML = `<div class="layout"><aside class="filters" id="filters"></aside><section id="results">${loadingHtml()}</section></div>`;
  $('#filters').innerHTML = `<form id="ff"><h3>Поиск</h3><input name="q" value="${esc(q.q)}" placeholder="Название">
    <h3>Цена, BYN</h3><div class="row2"><input name="minPrice" type="number" min="0" placeholder="от" value="${esc(q.minPrice)}"><input name="maxPrice" type="number" min="0" placeholder="до" value="${esc(q.maxPrice)}"></div>
    <h3>Продавец</h3><select name="seller"><option value="">Все продавцы</option></select>
    <h3>Сортировка</h3><select name="sort">${[['', 'Новинки'], ['price_asc', 'Сначала дешёвые'], ['price_desc', 'Сначала дорогие']].map(([v, t]) => `<option value="${v}" ${q.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
    <p><button class="btn" style="width:100%">Применить</button></p><a href="#/">Сбросить всё</a></form>
    <h3>Категории</h3><div class="tree"><a href="${link(q, { category: '', page: '' })}" class="${q.category ? '' : 'active'}">Все товары</a>${treeHtml(state.categories, q)}</div>`;
  $('#ff').onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    location.hash = link(q, { q: f.get('q').trim(), minPrice: f.get('minPrice'), maxPrice: f.get('maxPrice'), sort: f.get('sort'), seller: f.get('seller'), page: '' });
  };
  const sellerSelect = $('#ff [name=seller]');
  try {
    const sellers = toList(await api.get('/sellers'));
    if (stale()) return;
    sellerSelect.innerHTML = '<option value="">Все продавцы</option>' + sellers.map(s => `<option value="${esc(s.id)}" ${String(q.seller)===String(s.id)?'selected':''}>${esc(s.name || s.shopName)}</option>`).join('');
  } catch(e) {
    if (stale()) return;
    if(q.seller) sellerSelect.insertAdjacentHTML('beforeend', `<option value="${esc(q.seller)}" selected>Продавец #${esc(q.seller)}</option>`);
    sellerSelect.insertAdjacentHTML('afterend', '<p class="form-err">Не удалось загрузить список продавцов. Повторите открытие каталога.</p>');
  }
  const params = new URLSearchParams();
  ['q', 'category', 'seller', 'minPrice', 'maxPrice', 'sort', 'page'].forEach(k => q[k] && params.set(k, q[k]));
  let chip = '';
  if (q.seller) {
    try { const s = await api.get('/sellers/' + q.seller); chip = `<span class="chip">Продавец: ${esc(s.name || s.shopName)} <a href="${link(q, { seller: '', page: '' })}">✕</a></span>`; }
    catch (e) { chip = `<span class="chip">Продавец #${esc(q.seller)} <a href="${link(q, { seller: '', page: '' })}">✕</a></span>`; }
  }
  const d = await api.get('/products?' + params); if (stale()) return;
  const items = toList(d); const total = d.total ?? items.length;
  const pages = d.totalPages || d.pages || (d.limit ? Math.ceil(total / d.limit) : 1);
  const page = Number(d.page || q.page || 1);
  const res = $('#results');
  if (!items.length) { res.innerHTML = chip + emptyHtml('Ничего не найдено. Измените фильтры или запрос.', ['#/', 'Сбросить фильтры']); return; }
  res.innerHTML = `${chip}<p class="muted">Найдено: ${total}</p><div class="grid">${items.map(productCard).join('')}</div>${pager(q, page, pages)}`;
}
function productCard(p) {
  const s = shopOf(p);
  return `<div class="pcard"><a href="#/product/${p.id}">${img(p.imageUrl || p.image)}</a><div class="in">
    <a class="t" href="#/product/${p.id}">${esc(p.title || p.name)}</a><div class="price">${money(p.price)}</div>
    <div class="muted">Продавец: <a href="#/?seller=${s.id}">${esc(s.name)}</a></div>
    ${p.stock > 0 ? `<button class="btn sm" data-action="add" data-id="${p.id}">В корзину</button>` : '<span class="muted">Нет в наличии</span>'}</div></div>`;
}
function pager(q, page, pages) {
  if (pages <= 1) return '';
  const out = []; for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) out.push(i === page ? `<span class="cur">${i}</span>` : `<a href="${link(q, { page: i })}">${i}</a>`);
    else if (out[out.length - 1] !== '<span>…</span>') out.push('<span>…</span>');
  }
  return `<div class="pager">${page > 1 ? `<a href="${link(q, { page: page - 1 })}">←</a>` : ''}${out.join('')}${page < pages ? `<a href="${link(q, { page: page + 1 })}">→</a>` : ''}</div>`;
}

/* ---------- карточка товара ---------- */
async function productView([id], _q, stale) {
  const p = await api.get('/products/' + id); if (stale()) return;
  const s = shopOf(p);
  appEl.innerHTML = `<p><a href="#/">← В каталог</a></p><div class="product card">${img(p.imageUrl || p.image)}<div>
    <h1>${esc(p.title || p.name)}</h1><div class="price" style="font-size:1.6rem">${money(p.price)}</div>
    <p class="muted">Категория: ${esc(p.categoryName || p.category?.name || '—')}</p>
    <p>Продавец: <a href="#/?seller=${s.id}">${esc(s.name)}</a></p>
    <p>${p.stock > 0 ? `В наличии: <b>${p.stock}</b> шт.` : '<span style="color:var(--bad)">Нет в наличии</span>'}</p>
    ${p.stock > 0 ? `<div class="qty"><input id="qty" type="number" min="1" max="${p.stock}" value="1"><button class="btn" data-action="add" data-id="${p.id}" data-qty="#qty">В корзину</button></div>` : ''}
    <h2 style="margin-top:20px">Описание</h2><p>${esc(p.description || 'Описание отсутствует')}</p></div></div>`;
}

/* ---------- вход / регистрация ---------- */
function authForm(reg) {
  return `<div class="auth card"><h1>${reg ? 'Регистрация' : 'Вход'}</h1>
  ${api.useMock ? '<div class="hint">Режим заглушки. Тест: buyer@test.ru / seller1@test.ru / admin@test.ru, пароль 123456</div>' : ''}
  <form id="af">${reg ? `<div class="seg"><label><input type="radio" name="role" value="buyer" checked> Покупатель</label><label><input type="radio" name="role" value="seller"> Продавец</label></div>
    <label>Имя</label><input name="name" required>` : ''}
    <label>Email</label><input name="email" type="email" required>
    <label>Пароль</label><input name="password" type="password" required minlength="6">
    ${reg ? '<div id="shopWrap" hidden><label>Название магазина</label><input name="shopName"></div>' : ''}
    <div class="form-err" id="ferr"></div><button class="btn" style="width:100%;margin-top:8px">${reg ? 'Создать аккаунт' : 'Войти'}</button></form>
  <p class="muted">${reg ? 'Уже есть аккаунт? <a href="#/login">Войти</a>' : 'Нет аккаунта? <a href="#/register">Регистрация</a>'}</p></div>`;
}
function bindAuth(reg) {
  const f = $('#af');
  if (reg) f.addEventListener('change', () => { const sel = f.role.value === 'seller'; $('#shopWrap').hidden = !sel; f.shopName.required = sel; });
  f.onsubmit = async e => {
    e.preventDefault(); const b = Object.fromEntries(new FormData(f)); const btn = f.querySelector('button'); btn.disabled = true; $('#ferr').textContent = '';
    if (reg && b.role === 'seller' && !String(b.shopName || '').trim()) { $('#ferr').textContent = 'Укажите название магазина'; btn.disabled = false; return; }
    try {
      const r = await api.post(reg ? '/register' : '/login', b);
      api.token = r.token; state.user = r.user || await api.get('/me'); localStorage.setItem('role', state.user.role); await refreshCartCount();
      const to = { seller: '#/seller', admin: '#/admin' }[state.user.role] || '#/'; location.hash = to; renderHeader();
    } catch (err) { $('#ferr').textContent = err.message; btn.disabled = false; }
  };
}
async function loginView() { appEl.innerHTML = authForm(false); bindAuth(false); }
async function registerView() { appEl.innerHTML = authForm(true); bindAuth(true); }

/* ---------- корзина ---------- */
function groupByShop(items) {
  const g = {}; items.forEach(i => { const p = i.product || i; const s = shopOf(p); (g[s.id] = g[s.id] || { shop: s, items: [] }).items.push(i); }); return Object.values(g);
}
const sumItems = items => items.reduce((s, i) => s + (i.product || i).price * i.quantity, 0);
async function cartView(_, __, stale) {
  if (!requireRole(['buyer'])) return;
  const items = toList(await api.get('/cart')); if (stale()) return;
  state.cartCount = items.reduce((s, i) => s + i.quantity, 0); renderHeader();
  if (!items.length) { appEl.innerHTML = '<h1>Корзина</h1>' + emptyHtml('Корзина пуста', ['#/', 'Перейти в каталог']); return; }
  appEl.innerHTML = `<h1>Корзина</h1>${groupByShop(items).map(g => `<div class="group"><h2><span>Продавец: ${esc(g.shop.name)}</span><span class="muted">${money(sumItems(g.items))}</span></h2>
    <div class="tbl"><table><tbody>${g.items.map(i => { const p = i.product || i; return `<tr><td style="width:60px">${img(p.imageUrl, 'thumb')}</td>
      <td><a href="#/product/${p.id}">${esc(p.title)}</a><div class="muted">${money(p.price)} · на складе ${p.stock ?? '—'}</div></td>
      <td><span class="qty"><button class="btn sec sm" data-action="qty" data-id="${i.id}" data-q="${i.quantity - 1}">−</button><b>${i.quantity}</b><button class="btn sec sm" data-action="qty" data-id="${i.id}" data-q="${i.quantity + 1}">+</button></span></td>
      <td><b>${money(p.price * i.quantity)}</b></td><td><button class="btn danger sm" data-action="cart-del" data-id="${i.id}">Убрать</button></td></tr>`; }).join('')}</tbody></table></div></div>`).join('')}
    <div class="total">Итого: ${money(sumItems(items))}</div><p style="text-align:right"><a class="btn" href="#/checkout">Оформить заказ</a></p>`;
}

/* ---------- оформление ---------- */
async function checkoutView(_, __, stale) {
  if (!requireRole(['buyer'])) return;
  const items = toList(await api.get('/cart')); if (stale()) return;
  if (!items.length) { appEl.innerHTML = '<h1>Оформление</h1>' + emptyHtml('Корзина пуста', ['#/', 'Перейти в каталог']); return; }
  const groups = groupByShop(items);
  appEl.innerHTML = `<h1>Оформление заказа</h1><div class="layout checkout-layout">
    <form class="card" id="cf"><h2>Доставка</h2><label>Адрес доставки</label><textarea name="address" required minlength="5" placeholder="Город, улица, дом, квартира"></textarea>
    <label>Оплата</label><input value="При получении" disabled><div class="form-err" id="ferr"></div>
    <p class="muted">Заказ будет разделён на ${groups.length} подзаказ(а) по продавцам.</p><button class="btn">Подтвердить заказ</button></form>
    <div class="card"><h2>Ваш заказ</h2>${groups.map(g => `<p><b>${esc(g.shop.name)}</b><br>${g.items.map(i => `<span class="muted">${esc((i.product || i).title)} × ${i.quantity}</span>`).join('<br>')}<br>${money(sumItems(g.items))}</p>`).join('')}
    <div class="total">${money(sumItems(items))}</div></div></div>`;
  $('#cf').onsubmit = async e => {
    e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; $('#ferr').textContent = '';
    try { await api.post('/orders', { address: e.target.address.value.trim() }); state.cartCount = 0; renderHeader(); toast('Заказ оформлен', 'ok'); location.hash = '#/orders'; }
    catch (err) { $('#ferr').textContent = err.status === 409 ? 'Не хватает товара: ' + err.message : err.message; btn.disabled = false; }
  };
}

/* ---------- мои заказы ---------- */
const statusBadge = s => `<span class="st s-${esc(s)}">${esc(s)}</span>`;
async function ordersView(_, __, stale) {
  if (!requireRole(['buyer'])) return;
  const orders = toList(await api.get('/orders')); if (stale()) return;
  if (!orders.length) { appEl.innerHTML = '<h1>Мои заказы</h1>' + emptyHtml('У вас пока нет заказов', ['#/', 'Перейти в каталог']); return; }
  appEl.innerHTML = '<h1>Мои заказы</h1>' + orders.map(o => `<div class="card group"><h2><span>Заказ №${o.id}</span><span class="muted">${dateStr(o.createdAt)}</span></h2>
    <p class="muted">Адрес: ${esc(o.address)}</p>${(o.subOrders || o.suborders || []).map(s => `<div class="tbl" style="margin-bottom:10px"><table><thead><tr><th colspan="3">Продавец: ${esc(shopOf(s).name)}</th><th>${statusBadge(s.status)}</th></tr></thead><tbody>
    ${(s.items || []).map(i => `<tr><td>${esc(i.title || i.product?.title)}</td><td>${i.quantity} шт.</td><td>${money(i.price)}</td><td>${money(i.price * i.quantity)}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>`).join('');
}

/* ---------- вкладки ---------- */
const tabsHtml = (base, tabs, cur) => `<div class="tabs">${tabs.map(([k, t]) => `<a href="#/${base}?tab=${k}" class="${k === cur ? 'on' : ''}">${t}</a>`).join('')}</div>`;

/* ---------- кабинет продавца ---------- */
const cache = { sellerProducts: [], adminProducts: [], cats: [] };
async function sellerView(_, q, stale) {
  if (!requireRole(['seller'])) return;
  await loadCategories(); const tab = q.tab || 'products';
  appEl.innerHTML = `<h1>Кабинет продавца</h1>${tabsHtml('seller', [['products', 'Мои товары'], ['orders', 'Подзаказы']], tab)}<div id="tab">${loadingHtml()}</div>`;
  if (tab === 'orders') {
    const list = toList(await api.get('/seller/orders')); if (stale()) return;
    $('#tab').innerHTML = !list.length ? emptyHtml('Подзаказов пока нет') : list.map(s => `<div class="card group"><h2><span>Подзаказ №${s.id}${s.orderId ? ' (заказ №' + s.orderId + ')' : ''}</span>${statusBadge(s.status)}</h2>
      <p class="muted">${dateStr(s.createdAt)} · Покупатель: ${esc(s.buyerName || s.buyer?.name || '—')} · Адрес: ${esc(s.address || '—')}</p>
      <div class="tbl"><table><tbody>${(s.items || []).map(i => `<tr><td>${esc(i.title || i.product?.title)}</td><td>${i.quantity} шт.</td><td>${money(i.price)}</td></tr>`).join('')}</tbody></table></div>
      <div class="actions" style="margin-top:10px"><b>Итого: ${money(s.total ?? (s.items || []).reduce((a, i) => a + i.price * i.quantity, 0))}</b>
      ${(STATUS_NEXT[s.status] || []).map(n => `<button class="btn sm ${n === 'Отменён' ? 'danger' : ''}" data-action="sub-status" data-id="${s.id}" data-st="${n}">${n}</button>`).join('') || '<span class="muted">Статус финальный</span>'}</div></div>`).join('');
    return;
  }
  const list = toList(await api.get('/seller/products')); if (stale()) return; cache.sellerProducts = list;
  $('#tab').innerHTML = `<div class="bar"><span class="grow muted">Товаров: ${list.length}</span><button class="btn" data-action="prod-new">+ Добавить товар</button></div>` +
    (!list.length ? emptyHtml('У вас пока нет товаров') : `<div class="tbl"><table><thead><tr><th></th><th>Название</th><th>Цена</th><th>Остаток</th><th>Статус</th><th></th></tr></thead><tbody>
    ${list.map(p => `<tr><td>${img(p.imageUrl, 'thumb')}</td><td>${esc(p.title)}<div class="muted">${esc(p.categoryName || '')}</div></td><td>${money(p.price)}</td><td>${p.stock}</td><td><span class="st s-${isHidden(p) ? 'Скрыт' : 'Активен'}">${isHidden(p) ? 'Скрыт' : 'Активен'}</span></td>
    <td><div class="actions"><button class="btn sec sm" data-action="prod-edit" data-id="${p.id}">Изменить</button><button class="btn danger sm" data-action="prod-del" data-id="${p.id}">Удалить</button></div></td></tr>`).join('')}</tbody></table></div>`);
}
function productFields() {
  return [{ name: 'title', label: 'Название', required: true }, { name: 'description', label: 'Описание', type: 'textarea' },
    { name: 'price', label: 'Цена, BYN', type: 'number', required: true, step: '0.01', min: '0.01' }, { name: 'stock', label: 'Остаток, шт.', type: 'number', required: true, min: '0', step: '1' },
    { name: 'categoryId', label: 'Категория', type: 'select', required: true, options: flatCats(state.categories).map(c => [c.id, c.name]) }, { name: 'imageUrl', label: 'Ссылка на фото', type: 'url' }];
}

/* ---------- админ-панель ---------- */
async function adminView(_, q, stale) {
  if (!requireRole(['admin'])) return;
  await loadCategories(true); const tab = q.tab || 'sellers';
  appEl.innerHTML = `<h1>Админ-панель</h1>${tabsHtml('admin', [['sellers', 'Продавцы'], ['products', 'Товары'], ['cats', 'Категории']], tab)}<div id="tab">${loadingHtml()}</div>`;
  if (tab === 'sellers') {
    const list = toList(await api.get('/admin/sellers')); if (stale()) return;
    $('#tab').innerHTML = !list.length ? emptyHtml('Продавцов нет') : `<div class="tbl"><table><thead><tr><th>ID</th><th>Магазин</th><th>Владелец</th><th>Email</th><th>Статус</th><th></th></tr></thead><tbody>
      ${list.map(s => { const bl = s.blocked ?? s.isBlocked; return `<tr><td>${s.id}</td><td>${esc(s.shopName || s.name)}</td><td>${esc(s.ownerName || '')}</td><td>${esc(s.email || '')}</td>
      <td><span class="st ${bl ? 'blocked' : 's-Активен'}">${bl ? 'Заблокирован' : 'Активен'}</span></td>
      <td><button class="btn sm ${bl ? 'sec' : 'danger'}" data-action="seller-block" data-id="${s.id}" data-b="${bl ? 0 : 1}">${bl ? 'Разблокировать' : 'Заблокировать'}</button></td></tr>`; }).join('')}</tbody></table></div>`;
  } else if (tab === 'products') {
    const page = Number(q.page || 1); const d = await api.get('/products?includeHidden=1&page=' + page); if (stale()) return;
    const list = toList(d); cache.adminProducts = list; const pages = d.totalPages || d.pages || 1;
    $('#tab').innerHTML = (!list.length ? emptyHtml('Товаров нет') : `<div class="tbl"><table><thead><tr><th></th><th>Название</th><th>Продавец</th><th>Цена</th><th>Статус</th><th></th></tr></thead><tbody>
      ${list.map(p => `<tr><td>${img(p.imageUrl, 'thumb')}</td><td>${esc(p.title)}</td><td>${esc(shopOf(p).name)}</td><td>${money(p.price)}</td><td><span class="st s-${isHidden(p) ? 'Скрыт' : 'Активен'}">${isHidden(p) ? 'Скрыт' : 'Активен'}</span></td>
      <td><button class="btn sm sec" data-action="prod-hide" data-id="${p.id}" data-h="${isHidden(p) ? 0 : 1}">${isHidden(p) ? 'Показать' : 'Скрыть'}</button></td></tr>`).join('')}</tbody></table></div>`) +
      pager({ tab: 'products' }, page, pages).replace(/href="#\/\?/g, 'href="#/admin?');
  } else {
    const flat = flatCats(state.categories); cache.cats = flat;
    $('#tab').innerHTML = `<div class="bar"><span class="grow muted">Категорий: ${flat.length}</span><button class="btn" data-action="cat-new">+ Категория</button></div>` +
      (!flat.length ? emptyHtml('Категорий нет') : `<div class="tbl"><table><thead><tr><th>ID</th><th>Название</th><th></th></tr></thead><tbody>${flat.map(c => `<tr><td>${c.id}</td><td>${esc(c.name)}</td>
      <td><div class="actions"><button class="btn sec sm" data-action="cat-edit" data-id="${c.id}">Изменить</button><button class="btn danger sm" data-action="cat-del" data-id="${c.id}">Удалить</button></div></td></tr>`).join('')}</tbody></table></div>`);
  }
}
function findCat(id, nodes = state.categories) {
  for (const c of nodes) { if (String(c.id) === String(id)) return c; const r = findCat(id, c.children || []); if (r) return r; } return null;
}

/* ---------- универсальная форма в диалоге ---------- */
function openForm(title, fields, values, onSubmit) {
  const dlg = $('#dlg');
  dlg.innerHTML = `<h2>${esc(title)}</h2><form id="df">${fields.map(f => {
    const v = values[f.name] ?? ''; const a = `name="${f.name}" ${f.required ? 'required' : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.step ? `step="${f.step}"` : ''}`;
    let input;
    if (f.type === 'textarea') input = `<textarea ${a}>${esc(v)}</textarea>`;
    else if (f.type === 'select') input = `<select ${a}>${f.empty ? `<option value="">${esc(f.empty)}</option>` : '<option value="" disabled ' + (v === '' ? 'selected' : '') + '>Выберите…</option>'}${f.options.map(([val, t]) => `<option value="${val}" ${String(val) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    else input = `<input type="${f.type || 'text'}" ${a} value="${esc(v)}">`;
    return `<label>${esc(f.label)}</label>${input}`;
  }).join('')}<div class="form-err" id="dferr"></div><div class="actions" style="margin-top:12px"><button class="btn">Сохранить</button><button type="button" class="btn sec" id="dcancel">Отмена</button></div></form>`;
  dlg.showModal(); $('#dcancel').onclick = () => dlg.close();
  $('#df').onsubmit = async e => {
    e.preventDefault(); const btn = e.target.querySelector('.btn'); btn.disabled = true;
    try { await onSubmit(Object.fromEntries(new FormData(e.target))); dlg.close(); } catch (err) { $('#dferr').textContent = err.message; btn.disabled = false; }
  };
}

/* ---------- действия ---------- */
const actions = {
  retry: () => router(),
  async logout() { api.token = null; state.user = null; state.cartCount = 0; location.hash = '#/'; renderHeader(); router(); },
  async add(d) {
    if (!state.user) { toast('Войдите, чтобы добавить товар в корзину'); location.hash = '#/login'; return; }
    if (state.user.role !== 'buyer') return toast('Корзина доступна только покупателям', 'bad');
    const qty = d.qty ? Number($(d.qty).value) || 1 : 1;
    await api.post('/cart/items', { productId: Number(d.id), quantity: qty }); toast('Добавлено в корзину', 'ok'); refreshCartCount();
  },
  async qty(d) { if (Number(d.q) < 1) return; await api.patch('/cart/items/' + d.id, { quantity: Number(d.q) }); router(); },
  async 'cart-del'(d) { await api.del('/cart/items/' + d.id); router(); },
  'prod-new'() { openForm('Новый товар', productFields(), {}, async v => { await api.post('/seller/products', prodBody(v)); toast('Товар добавлен', 'ok'); router(); }); },
  'prod-edit'(d) {
    const p = cache.sellerProducts.find(x => String(x.id) === d.id);
    openForm('Редактирование товара', productFields(), { ...p, categoryId: p.categoryId ?? p.category?.id }, async v => { await api.put('/seller/products/' + d.id, prodBody(v)); toast('Сохранено', 'ok'); router(); });
  },
  async 'prod-del'(d) { if (!confirm('Удалить товар?')) return; await api.del('/seller/products/' + d.id); toast('Товар удалён', 'ok'); router(); },
  async 'sub-status'(d) { if (d.st === 'Отменён' && !confirm('Отменить подзаказ?')) return; await api.patch('/seller/orders/' + d.id + '/status', { status: d.st }); toast('Статус: ' + d.st, 'ok'); router(); },
  async 'seller-block'(d) { await api.patch('/admin/sellers/' + d.id + '/block', { blocked: d.b === '1' }); toast(d.b === '1' ? 'Продавец заблокирован' : 'Продавец разблокирован', 'ok'); router(); },
  async 'prod-hide'(d) { await api.patch('/admin/products/' + d.id + '/hide', { hidden: d.h === '1' }); toast(d.h === '1' ? 'Товар скрыт' : 'Товар показан', 'ok'); router(); },
  'cat-new'() { catForm('Новая категория', {}, v => api.post('/admin/categories', catBody(v))); },
  'cat-edit'(d) { const c = findCat(d.id); catForm('Изменить категорию', { name: c.name, parentId: c.parentId ?? c.parent_id ?? '' }, v => api.put('/admin/categories/' + d.id, catBody(v))); },
  async 'cat-del'(d) { if (!confirm('Удалить категорию?')) return; await api.del('/admin/categories/' + d.id); toast('Категория удалена', 'ok'); router(); }
};
const prodBody = v => ({ title: v.title.trim(), description: v.description, price: Number(v.price), stock: Number(v.stock), categoryId: Number(v.categoryId), imageUrl: v.imageUrl });
const catBody = v => ({ name: v.name.trim(), parentId: v.parentId ? Number(v.parentId) : null });
function catForm(title, vals, save) {
  openForm(title, [{ name: 'name', label: 'Название', required: true }, { name: 'parentId', label: 'Родительская категория', type: 'select', empty: '— корневая —', options: cache.cats.map(c => [c.id, c.name]) }], vals,
    async v => { await save(v); toast('Сохранено', 'ok'); router(); });
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  e.preventDefault(); const fn = actions[b.dataset.action]; if (!fn) return;
  try { await fn(b.dataset, b); } catch (err) { toast(err.message, 'bad'); }
});

/* ---------- старт ---------- */
(async function init() {
  if (api.token) { try { state.user = await api.get('/me'); localStorage.setItem('role', state.user.role); } catch (e) { api.token = null; } }
  await refreshCartCount(); router();
})();
