(function () {
  'use strict';
  var D = window.DB;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var S = { mode: 'pos', loc: 'ALL', cur: 'USD', lang: 'en', page: 'overview', charts: [], net: null, timers: [], safety: false };
  var RATES = { USD: 1, CAD: 1.37, EUR: 0.92, GBP: 0.79, MXN: 18.2 };
  var LOCALE = { USD: 'en-US', CAD: 'en-CA', EUR: 'de-DE', GBP: 'en-GB', MXN: 'es-MX' };

  /* ---------------- helpers ---------------- */
  function money(v, dec) { dec = dec == null ? 0 : dec; return new Intl.NumberFormat(LOCALE[S.cur], { style: 'currency', currency: S.cur, minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v * RATES[S.cur]); }
  function num(v) { return new Intl.NumberFormat('en-US').format(v); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rel(iso) { var m = Math.round((Date.now() - new Date(iso)) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; var h = Math.round(m / 60); if (h < 24) return h + ' h ago'; return Math.round(h / 24) + ' d ago'; }
  function clock(iso) { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }); }
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function loc(id) { return D.locations.filter(function (l) { return l.id === id; })[0]; }
  function posOf(l) { return S.mode === 'pos' && l.pos ? l.pos : (l.type === 'Store' ? 'Built-in register' : 'WMS'); }
  function badge(t, k) { return '<span class="b b-' + (k || 'n') + '">' + esc(t) + '</span>'; }
  function sw(c) { return '<span class="swatch" style="--c:' + c + '"></span>'; }
  function every(fn, ms) { var id = setInterval(fn, ms); S.timers.push(id); return id; }
  function later(fn, ms) { var id = setTimeout(fn, ms); S.timers.push(id); return id; }
  function balances() {
    var m = {};
    for (var i = 0; i < D.ledger.length; i++) {
      var e = D.ledger[i], k = e.sku + '|' + e.loc;
      var b = m[k] || (m[k] = { on: 0, res: 0 });
      b.on += e.dOn; b.res += e.dRes;
    }
    return function (sku, l) { var b = m[sku + '|' + l] || { on: 0, res: 0 }; return { on: b.on, res: b.res, av: b.on - b.res }; };
  }
  function locsInScope() { return S.loc === 'ALL' ? D.locations : D.locations.filter(function (l) { return l.id === S.loc; }); }
  var keyN = 5000;
  function addEv(o) { o.key = o.key || (o.src || 'portal').toLowerCase().replace(/\s+/g, '-') + ':' + (o.ref || 'manual') + ':' + (keyN++); return D.ev(o); }

  /* ---------------- i18n ---------------- */
  var T = {
    en: { overview: 'Dashboard', orders: 'Orders', customers: 'Customers & Loyalty', promotions: 'Promotions', returns: 'Returns', catalog: 'Catalog', inventory: 'Inventory', warehouse: 'Warehouse', purchasing: 'Purchasing', channels: 'Storefront & Apps', delivery: 'Local Delivery', sync: 'POS Connectors', reports: 'Reports', audit: 'Audit & Security', admin: 'Super Admin', settings: 'Settings',
      gOverview: 'Overview', gSell: 'Sell', gStock: 'Stock', gChannels: 'Channels', gInsights: 'Insights', gPlatform: 'Platform' },
    es: { overview: 'Panel', orders: 'Pedidos', customers: 'Clientes y lealtad', promotions: 'Promociones', returns: 'Devoluciones', catalog: 'Catalogo', inventory: 'Inventario', warehouse: 'Almacen', purchasing: 'Compras', channels: 'Tienda y apps', delivery: 'Entrega local', sync: 'Conectores POS', reports: 'Reportes', audit: 'Auditoria', admin: 'Super Admin', settings: 'Ajustes',
      gOverview: 'General', gSell: 'Ventas', gStock: 'Stock', gChannels: 'Canales', gInsights: 'Analisis', gPlatform: 'Plataforma' },
    fr: { overview: 'Tableau de bord', orders: 'Commandes', customers: 'Clients et fidelite', promotions: 'Promotions', returns: 'Retours', catalog: 'Catalogue', inventory: 'Inventaire', warehouse: 'Entrepot', purchasing: 'Achats', channels: 'Boutique et apps', delivery: 'Livraison locale', sync: 'Connecteurs POS', reports: 'Rapports', audit: 'Audit et securite', admin: 'Super Admin', settings: 'Parametres',
      gOverview: 'Vue generale', gSell: 'Vente', gStock: 'Stock', gChannels: 'Canaux', gInsights: 'Analyses', gPlatform: 'Plateforme' },
  };
  function t(k) { return (T[S.lang] && T[S.lang][k]) || T.en[k] || k; }

  var NAV = [
    ['gOverview', [['overview', 'layout-dashboard']]],
    ['gSell', [['orders', 'shopping-cart'], ['customers', 'users'], ['promotions', 'badge-percent'], ['returns', 'undo-2']]],
    ['gStock', [['catalog', 'tags'], ['inventory', 'boxes'], ['warehouse', 'warehouse'], ['purchasing', 'clipboard-list']]],
    ['gChannels', [['channels', 'globe'], ['delivery', 'truck'], ['sync', 'plug-zap']]],
    ['gInsights', [['reports', 'bar-chart-3'], ['audit', 'shield-check']]],
    ['gPlatform', [['admin', 'crown'], ['settings', 'settings-2']]],
  ];
  function groupOf(p) { var g = 'gOverview'; NAV.forEach(function (x) { x[1].forEach(function (i) { if (i[0] === p) g = x[0]; }); }); return g; }

  function renderNav() {
    var lowN = lowStock().length;
    $('#navList').innerHTML = NAV.map(function (g) {
      return '<div class="n-g">' + t(g[0]) + '</div>' + g[1].map(function (i) {
        var extra = '';
        if (i[0] === 'sync' && S.mode === 'pos') extra = '<em class="n-dot ' + (SIM.posOnline ? '' : 'warn') + '"></em>';
        if (i[0] === 'inventory' && lowN) extra = '<em class="n-c">' + lowN + '</em>';
        return '<a href="#/' + i[0] + '" class="' + (S.page === i[0] ? 'on' : '') + '"><i data-lucide="' + i[1] + '"></i><span>' + t(i[0]) + '</span>' + extra + '</a>';
      }).join('');
    }).join('');
    $('#crumbGroup').textContent = t(groupOf(S.page));
    $('#crumbPage').textContent = t(S.page);
  }

  /* ---------------- UI primitives ---------------- */
  function head(title, sub, actions) {
    return '<div class="ph"><div><h1>' + title + '</h1><p>' + sub + '</p></div><div class="ph-a">' + (actions || '') + '</div></div>';
  }
  function kpi(label, value, note, icon, tone) {
    return '<div class="kpi"><div class="kpi-t"><span>' + label + '</span><i data-lucide="' + icon + '"></i></div><b>' + value + '</b><small class="' + (tone || '') + '">' + note + '</small></div>';
  }
  function card(title, body, extra, cls) {
    return '<section class="card ' + (cls || '') + '"><div class="card-h"><h3>' + title + '</h3>' + (extra || '') + '</div>' + body + '</section>';
  }
  function btn(label, icon, attrs, kind) { return '<button class="btn ' + (kind || '') + '" ' + (attrs || '') + '>' + (icon ? '<i data-lucide="' + icon + '"></i>' : '') + label + '</button>'; }

  function toast(msg, kind) {
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = '<i data-lucide="' + (kind === 'warn' ? 'triangle-alert' : kind === 'err' ? 'circle-x' : 'circle-check') + '"></i><span>' + msg + '</span>';
    $('#toasts').appendChild(el); icons();
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 400); }, 3600);
  }
  function openDrawer(html) {
    $('#drawer').innerHTML = '<button class="icon-btn d-x" data-close><i data-lucide="x"></i></button>' + html;
    document.body.classList.add('drawer-open'); icons();
  }
  function closeDrawer() { document.body.classList.remove('drawer-open'); }
  function openModal(title, body, submit, onSubmit) {
    $('#modal').innerHTML = '<div class="m-h"><h3>' + title + '</h3><button class="icon-btn" data-mclose><i data-lucide="x"></i></button></div><form id="mForm"><div class="m-b">' + body + '</div><div class="m-f"><button type="button" class="btn ghost" data-mclose>Cancel</button><button class="btn primary" type="submit">' + submit + '</button></div></form>';
    document.body.classList.add('modal-open'); icons();
    $('#mForm').addEventListener('submit', function (e) { e.preventDefault(); if (onSubmit(new FormData(e.target)) !== false) closeModal(); });
  }
  function closeModal() { document.body.classList.remove('modal-open'); }
  function variantOptions(sel) { return D.variants.map(function (v) { return '<option value="' + v.sku + '"' + (v.sku === sel ? ' selected' : '') + '>' + v.sku + ' - ' + esc(v.name) + ', ' + esc(v.opt) + '</option>'; }).join(''); }
  function locOptions(sel, filter) { return D.locations.filter(filter || function () { return true; }).map(function (l) { return '<option value="' + l.id + '"' + (l.id === sel ? ' selected' : '') + '>' + l.short + '</option>'; }).join(''); }

  function barcode(code) {
    var bits = '101';
    var P = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
    String(code).split('').forEach(function (d, i) { var p = P[+d] || P[0]; bits += i < 6 ? p : p.replace(/./g, function (c) { return c === '1' ? '0' : '1'; }); if (i === 5) bits += '01010'; });
    bits += '101';
    var w = 1.4, x = 0, rects = '';
    for (var i = 0; i < bits.length; i++) { if (bits[i] === '1') rects += '<rect x="' + x.toFixed(1) + '" width="' + w + '" height="30"/>'; x += w; }
    return '<svg class="bc" viewBox="0 0 ' + x.toFixed(1) + ' 30" preserveAspectRatio="none">' + rects + '</svg><span class="mono bc-t">' + code + '</span>';
  }

  function chart(id, cfg) {
    if (!window.Chart) return;
    var c = new window.Chart(document.getElementById(id), cfg); S.charts.push(c); return c;
  }
  if (window.Chart) {
    window.Chart.defaults.font.family = 'Inter, Segoe UI, sans-serif';
    window.Chart.defaults.font.size = 12;
    window.Chart.defaults.color = '#64748b';
    window.Chart.defaults.plugins.legend.labels.boxWidth = 10;
    window.Chart.defaults.plugins.legend.labels.boxHeight = 10;
    window.Chart.defaults.plugins.legend.labels.useBorderRadius = true;
    window.Chart.defaults.plugins.legend.labels.borderRadius = 3;
  }
  var GRID = { color: '#eef2f6' };
  var C = { teal: '#0d9488', blue: '#2563eb', amber: '#d97706', violet: '#7c3aed', slate: '#94a3b8', rose: '#e11d48' };

  function lowStock() {
    var B = balances(), out = [];
    D.variants.forEach(function (v) {
      D.locations.forEach(function (l) {
        if (l.type !== 'Store') return;
        var b = B(v.sku, l.id);
        if (b.av <= Math.min(v.rop, 6)) out.push({ v: v, l: l, b: b });
      });
    });
    return out.sort(function (a, b) { return a.b.av - b.b.av; });
  }

  /* ================= SYNC LAB STATE ================= */
  var SIM = { step: 0, posOnline: true, queue: [], log: [], evIds: [], posCount: 40, dups: 0, alert: false, resolved: null, cap: null, pushed: false };
  var KEY = 'square:ST-SOHO:reg2:txn-88213:line-1';
  function simLog(kind, text) { SIM.log.push({ ts: new Date().toISOString(), kind: kind, text: text }); }
  function simEv(o) { var e = D.ev(o); SIM.evIds.push(e.id); return e; }
  function simReset() {
    for (var i = D.ledger.length - 1; i >= 0; i--) { if (SIM.evIds.indexOf(D.ledger[i].id) > -1) D.ledger.splice(i, 1); }
    SIM ={ step: 0, posOnline: true, queue: [], log: [], evIds: [], posCount: 40, dups: 0, alert: false, resolved: null, cap: null, pushed: false };
    simLog('info', 'Scenario ready. SoHo Square Register 2 connected. SKU-A: on hand 40, reserved 25, available 15.');
  }
  simReset();
  var STEPS = [
    { id: 'disconnect', label: 'Disconnect POS', icon: 'wifi-off' },
    { id: 'possale', label: 'POS sells 8 (offline)', icon: 'scan-barcode' },
    { id: 'online', label: 'Online order reserves 10', icon: 'globe' },
    { id: 'adjust', label: 'Manager adjusts -2', icon: 'clipboard-pen' },
    { id: 'reconnect', label: 'Reconnect and replay', icon: 'refresh-cw' },
    { id: 'dup', label: 'POS resends same sale', icon: 'copy' },
  ];
  function simDo(id) {
    var B, b;
    if (id === 'disconnect') {
      SIM.posOnline = false;
      simLog('warn', 'Heartbeat lost: Square SoHo Register 2. Location marked STALE.');
      if (S.safety) simLog('info', 'Safety buffer active: online availability for SoHo reduced by 10 units while stale.');
    }
    if (id === 'possale') {
      SIM.queue.push({ key: KEY, seq: 1043, qty: 8 });
      SIM.posCount -= 8;
      simLog('pos', 'POS offline sale stored locally: txn 88213, SKU-A x8, seq 1043. Not yet visible in cloud.');
    }
    if (id === 'online') {
      B = balances(); b = B('SKU-A', 'ST-SOHO');
      var atp = b.av - (S.safety ? 10 : 0), q = Math.max(0, Math.min(10, atp));
      SIM.cap = q;
      simEv({ sku: 'SKU-A', loc: 'ST-SOHO', type: 'RESERVE', dOn: 0, dRes: q, src: 'Web store', ref: 'W-10482', user: 'system', key: 'web:W-10482:line-1' });
      if (q < 10) simLog('info', 'Order W-10482 wants 10. Online ATP is ' + atp + ' (buffer on) so ' + q + ' reserved, ' + (10 - q) + ' backordered.');
      else simLog('ok', 'RESERVE +10 for web order W-10482 (cloud ATP was ' + b.av + '). Key web:W-10482:line-1');
    }
    if (id === 'adjust') {
      simEv({ sku: 'SKU-A', loc: 'ST-SOHO', type: 'ADJUST', dOn: -2, dRes: 0, src: 'Merchant Portal', ref: 'Damaged', user: 'M. Rivera', key: 'portal:adj-5531' });
      simLog('ok', 'ADJUST -2 by M. Rivera, reason "Damaged". Queued for push to POS.');
    }
    if (id === 'reconnect') {
      SIM.posOnline = true;
      simLog('info', 'Square SoHo reconnected. Replaying 1 queued event. Last applied seq 1042.');
      SIM.queue.forEach(function (q) {
        simLog('info', 'Sequence check: 1043 follows 1042, no gap.');
        simEv({ sku: 'SKU-A', loc: 'ST-SOHO', type: 'SALE', dOn: -q.qty, dRes: 0, src: 'Square', ref: 'txn 88213', user: 'Register 2', key: q.key });
        simLog('ok', 'INGEST ' + q.key + ' -> SALE -8 applied.');
      });
      SIM.queue = [];
      SIM.posCount -= 2; SIM.pushed = true;
      simLog('ok', 'PUSH adjustment -2 to Square (portal:adj-5531). POS on hand now ' + SIM.posCount + '.');
      B = balances(); b = B('SKU-A', 'ST-SOHO');
      simLog(b.on === SIM.posCount ? 'ok' : 'warn', 'RECONCILE SKU-A SoHo: POS ' + SIM.posCount + ' vs ledger ' + b.on + ' -> ' + (b.on === SIM.posCount ? 'match' : 'variance'));
      if (b.av < 0) {
        SIM.alert = true;
        simLog('err', 'OVERSELL: available ' + b.av + '. Online availability for SKU-A at SoHo set to 0. Store and e-commerce team alerted.');
      } else {
        simLog('ok', 'Available ' + b.av + '. No oversell.' + (S.safety ? ' The safety buffer prevented it.' : ''));
      }
    }
    if (id === 'dup') {
      var exists = D.ledger.some(function (e) { return e.key === KEY; });
      if (exists) { SIM.dups++; simLog('dup', 'DUPLICATE ' + KEY + ' received again. Unique key exists -> ignored, no stock change.'); }
    }
    SIM.step++;
  }
  function simResolve(kind) {
    var B = balances(), b = B('SKU-A', 'ST-SOHO'), short = -b.av;
    if (short <= 0) return;
    if (kind === 'transfer') {
      simEv({ sku: 'SKU-A', loc: 'WH-NJ', type: 'TRANSFER_OUT', dOn: -short, dRes: 0, src: 'Merchant Portal', ref: 'TR-2291', user: 'A. Okafor', key: 'portal:TR-2291:out' });
      simEv({ sku: 'SKU-A', loc: 'ST-SOHO', type: 'TRANSFER_IN', dOn: short, dRes: 0, src: 'Merchant Portal', ref: 'TR-2291', user: 'A. Okafor', key: 'portal:TR-2291:in' });
      simLog('ok', 'TRANSFER TR-2291: ' + short + ' units Newark DC -> SoHo (same-day courier). W-10482 fully covered.');
      SIM.resolved = 'transfer';
    } else {
      simEv({ sku: 'SKU-A', loc: 'ST-SOHO', type: 'RELEASE', dOn: 0, dRes: -short, src: 'Merchant Portal', ref: 'W-10482', user: 'A. Okafor', key: 'portal:W-10482:backorder' });
      simLog('ok', 'BACKORDER ' + short + ' units on W-10482. Customer notified with new date. Reservation reduced.');
      SIM.resolved = 'backorder';
    }
    SIM.alert = false;
    simLog('ok', 'Available back to 0. Online availability will reopen when stock arrives.');
  }

  /* ================= PAGES ================= */
  var P = {};

  /* ---------- OVERVIEW ---------- */
  P.overview = {
    render: function () {
      var B = balances(), units = 0;
      locsInScope().forEach(function (l) { D.variants.forEach(function (v) { units += Math.max(0, B(v.sku, l.id).av); }); });
      var today = D.sales[D.sales.length - 1], f = S.loc === 'ALL' ? 1 : 0.27;
      var tot = (today.pos + today.web + today.app) * f;
      var low = lowStock().filter(function (x) { return S.loc === 'ALL' || x.l.id === S.loc; });
      var lname = S.loc === 'ALL' ? 'all 4 locations' : loc(S.loc).name;
      return head(t('overview'), 'Harbor &amp; Pine, ' + lname + '. Live sample data, refreshed every few seconds.',
          btn('Export', 'download', 'id="expBtn"', 'ghost') + '<a class="btn primary" href="#/sync"><i data-lucide="play"></i>Run SKU-A scenario</a>') +
        '<div class="kpis">' +
          kpi('Net sales today', money(tot), '+8.4% vs last ' + new Date().toLocaleDateString('en-US', { weekday: 'long' }), 'dollar-sign', 'up') +
          kpi('Orders today', num(Math.round(86 * f)), 'Web 31 &middot; App 17 &middot; ' + (S.mode === 'pos' ? 'POS' : 'Store') + ' 38', 'shopping-cart') +
          kpi('Units available', num(units), low.length + ' low-stock alerts', 'boxes', low.length ? 'warn' : '') +
          (S.mode === 'pos' ? kpi('POS sync health', SIM.posOnline ? '100%' : '1 offline', SIM.posOnline ? '2 connectors &middot; 0 errors &middot; lag 1.2 s' : 'SoHo queueing locally', 'plug-zap', SIM.posOnline ? 'up' : 'warn')
            : kpi('Operating model', 'Standalone', 'Built-in register at every store', 'cloud')) +
        '</div>' +
        '<div class="g g-21">' +
          '<section class="card dark net-card"><div class="card-h"><h3>Live network</h3><span class="leg"><i class="c1"></i>Sales <i class="c2"></i>Reservations <i class="c3"></i>Transfers</span></div><div class="net" id="ovNet"></div></section>' +
          card('Low-stock alerts', '<div class="list">' + (low.slice(0, 6).map(function (x) {
            return '<div class="li">' + sw(x.v.color) + '<div><b>' + esc(x.v.name) + '</b><small>' + esc(x.v.opt) + ' &middot; ' + x.l.short + '</small></div><span class="li-r ' + (x.b.av <= 0 ? 'neg' : 'warn') + '">' + x.b.av + ' avail</span></div>';
          }).join('') || '<div class="empty">No alerts</div>') + '</div>', '<a class="lnk" href="#/purchasing">Replenish</a>') +
        '</div>' +
        '<div class="g g-21">' +
          card('Sales by channel, last 14 days', '<div class="ch-h"><canvas id="cSales"></canvas></div>') +
          card('Locations', '<div class="list">' + D.locations.map(function (l) {
            var off = S.mode === 'pos' && l.id === 'ST-SOHO' && !SIM.posOnline;
            var p = posOf(l);
            return '<div class="li"><span class="l-ic"><i data-lucide="' + (l.type === 'Warehouse' ? 'warehouse' : 'store') + '"></i></span><div><b>' + l.name + '</b><small>' + l.city + ' &middot; ' + p + '</small></div>' +
              (off ? badge('Offline, queueing', 'warn') : badge(l.type === 'Warehouse' ? 'WMS live' : (S.mode === 'pos' && l.pos ? 'Synced 12 s ago' : 'Live'), 'ok')) + '</div>';
          }).join('') + '</div>') +
        '</div>' +
        card('Event stream', '<div class="feed" id="feed"></div>', '<span class="live"><i></i>live</span>');
    },
    mount: function () {
      var s = D.sales;
      chart('cSales', { type: 'bar', data: { labels: s.map(function (d) { return d.day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }),
        datasets: [
          { label: S.mode === 'pos' ? 'Store POS' : 'Store register', data: s.map(function (d) { return Math.round(d.pos * RATES[S.cur]); }), backgroundColor: C.teal, borderRadius: 4, stack: 'a' },
          { label: 'Web', data: s.map(function (d) { return Math.round(d.web * RATES[S.cur]); }), backgroundColor: C.blue, borderRadius: 4, stack: 'a' },
          { label: 'App', data: s.map(function (d) { return Math.round(d.app * RATES[S.cur]); }), backgroundColor: '#93c5fd', borderRadius: 4, stack: 'a' }] },
        options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { grid: GRID, ticks: { callback: function (v) { return money(v / RATES[S.cur]); } } } } } });

      function mountNet() { var el = $('#ovNet'); if (el && window.RCNet && !S.net) S.net = window.RCNet(el, { dark: true, autoPackets: false, camY: 8, camZ: 16 }); }
      if (window.RCNet) mountNet(); else window.addEventListener('rcnet-ready', mountNet, { once: true });

      var feed = $('#feed');
      var kinds = [
        function () { var l = D.pick(['ST-SOHO', 'ST-BKLYN', 'ST-JC']), v = D.pick(D.variants); if (v.sku === 'SKU-A') return null; var lo = loc(l); return { node: l, type: 'sale', ev: { sku: v.sku, loc: l, type: 'SALE', dOn: -1, dRes: 0, src: S.mode === 'pos' && lo.pos ? lo.pos : 'Register', ref: 'txn ' + D.ri(88300, 89999), user: 'Register' }, txt: '<b>Sale</b> ' + v.sku + ' x1 at ' + lo.short + ' via ' + posOf(lo) }; },
        function () { var v = D.pick(D.variants); if (v.sku === 'SKU-A') return null; var l = D.pick(['ST-SOHO', 'ST-BKLYN', 'WH-NJ']); var id = 'W-' + D.ri(10490, 10999); return { node: 'WEB', type: 'reserve', ev: { sku: v.sku, loc: l, type: 'RESERVE', dOn: 0, dRes: 1, src: 'Web store', ref: id, user: 'system' }, txt: '<b>Reserve</b> ' + v.sku + ' x1 for ' + id + ' at ' + loc(l).short }; },
        function () { var v = D.pick(D.variants); if (v.sku === 'SKU-A') return null; var to = D.pick(['ST-SOHO', 'ST-BKLYN', 'ST-JC']); return { node: 'WH-NJ', type: 'transfer', txt: '<b>Transfer</b> ' + v.sku + ' x6 Newark DC -> ' + loc(to).short + ' shipped' }; },
        function () { return { node: 'DRV', type: 'sale', txt: '<b>Delivered</b> A-' + D.ri(2244, 2299) + ' by Carlos M., photo + signature saved' }; },
      ];
      function push() {
        var k = kinds[Math.floor(Math.random() * kinds.length)](); if (!k) return;
        if (k.ev) { var B = balances(), b = B(k.ev.sku, k.ev.loc); if (b.av < 3) return; addEv(k.ev); }
        if (S.net) S.net.pulse(k.node, k.type, true);
        var d = document.createElement('div'); d.className = 'fe fe-' + k.type;
        d.innerHTML = '<span class="mono">' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }) + '</span><i></i><span>' + k.txt + '</span>';
        feed.prepend(d); while (feed.children.length > 7) feed.lastChild.remove();
      }
      for (var i = 0; i < 5; i++) push();
      every(push, 2600);
      $('#expBtn').addEventListener('click', function () { toast('Dashboard exported as CSV and PDF (demo)'); });
    },
  };

  /* ---------- INVENTORY ---------- */
  var INV = { tab: 'stock', q: '', cat: 'All', low: false };
  P.inventory = {
    render: function () {
      var B = balances(), locs = locsInScope();
      var cats = ['All'].concat(D.products.map(function (p) { return p.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
      var rows = D.variants.filter(function (v) {
        if (INV.cat !== 'All' && v.cat !== INV.cat) return false;
        if (INV.q && (v.sku + ' ' + v.name + ' ' + v.opt + ' ' + v.barcode).toLowerCase().indexOf(INV.q.toLowerCase()) === -1) return false;
        if (INV.low && !locs.some(function (l) { return l.type === 'Store' && B(v.sku, l.id).av <= Math.min(v.rop, 6); })) return false;
        return true;
      });
      var top = head(t('inventory'), 'On hand, reserved and available per SKU and location. Every number below is the sum of ledger movements.',
        btn('Adjust', 'clipboard-pen', 'id="adjBtn"', 'ghost') + btn('Transfer', 'arrow-left-right', 'id="trfBtn"', 'primary'));
      var tabs = '<div class="tabs"><button data-tab="stock" class="' + (INV.tab === 'stock' ? 'on' : '') + '">Stock by location</button><button data-tab="ledger" class="' + (INV.tab === 'ledger' ? 'on' : '') + '">Stock ledger <em>' + D.ledger.length + '</em></button></div>';
      if (INV.tab === 'ledger') {
        var evs = D.ledger.filter(function (e) { return e.type !== 'OPENING' && (S.loc === 'ALL' || e.loc === S.loc); }).slice(-60).reverse();
        return top + tabs + card('Append-only ledger', '<div class="tw"><table class="tbl"><thead><tr><th>Time</th><th>Event</th><th>SKU</th><th>Location</th><th class="r">&Delta; On hand</th><th class="r">&Delta; Reserved</th><th>Source</th><th>Reference</th><th>Idempotency key</th></tr></thead><tbody>' +
          evs.map(function (e) {
            return '<tr><td class="mono sm">' + clock(e.ts) + '</td><td>' + evBadge(e.type) + '</td><td class="mono">' + e.sku + '</td><td>' + loc(e.loc).short + '</td><td class="r mono ' + (e.dOn < 0 ? 'neg' : e.dOn > 0 ? 'pos' : '') + '">' + (e.dOn ? (e.dOn > 0 ? '+' : '') + e.dOn : '-') + '</td><td class="r mono">' + (e.dRes ? (e.dRes > 0 ? '+' : '') + e.dRes : '-') + '</td><td>' + esc(e.src) + '</td><td>' + esc(e.ref || '') + '</td><td class="mono sm mut">' + esc(e.key || '-') + '</td></tr>';
          }).join('') + '</tbody></table></div>', '<span class="mut sm">Corrections are new events. Nothing is edited or deleted.</span>');
      }
      var filt = '<div class="filters"><div class="search sm"><i data-lucide="search"></i><input id="invQ" placeholder="SKU, name or barcode" value="' + esc(INV.q) + '"></div>' +
        cats.map(function (c) { return '<button class="chip ' + (INV.cat === c ? 'on' : '') + '" data-cat="' + c + '">' + c + '</button>'; }).join('') +
        '<label class="tog"><input type="checkbox" id="invLow" ' + (INV.low ? 'checked' : '') + '><span></span>Low stock only</label></div>';
      var th = '<th>Product / variant</th>' + locs.map(function (l) { return '<th class="r">' + l.short + '<small>' + (l.type === 'Warehouse' ? 'warehouse' : posOf(l)) + '</small></th>'; }).join('') + '<th class="r">Total available</th>';
      var body = rows.map(function (v) {
        var tot = 0;
        var cells = locs.map(function (l) {
          var b = B(v.sku, l.id); tot += b.av;
          var cls = b.av < 0 ? 'neg' : (l.type === 'Store' && b.av <= Math.min(v.rop, 6)) ? 'warn' : '';
          return '<td class="r"><b class="av ' + cls + '">' + b.av + '</b><small class="mono">' + b.on + ' / ' + b.res + '</small></td>';
        }).join('');
        return '<tr class="' + (v.sku === 'SKU-A' ? 'hl' : '') + '"><td><div class="pv">' + sw(v.color) + '<div><b>' + esc(v.name) + '</b><small>' + esc(v.opt) + ' &middot; <span class="mono">' + v.sku + '</span></small></div></div></td>' + cells + '<td class="r"><b>' + num(tot) + '</b></td></tr>';
      }).join('');
      return top + tabs + filt + card(rows.length + ' variants', '<div class="tw"><table class="tbl inv"><thead><tr>' + th + '</tr></thead><tbody>' + body + '</tbody></table></div>', '<span class="mut sm">Cell: <b>available</b>, then on hand / reserved</span>');
    },
    mount: function () {
      $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { INV.tab = b.dataset.tab; rerender(); }); });
      $$('[data-cat]').forEach(function (b) { b.addEventListener('click', function () { INV.cat = b.dataset.cat; rerender(); }); });
      var q = $('#invQ'); if (q) { q.addEventListener('input', function () { INV.q = q.value; clearTimeout(q._t); q._t = setTimeout(function () { rerender(); var n = $('#invQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); }); }
      var lw = $('#invLow'); if (lw) lw.addEventListener('change', function () { INV.low = lw.checked; rerender(); });
      $('#trfBtn').addEventListener('click', transferModal);
      $('#adjBtn').addEventListener('click', adjustModal);
    },
  };
  function evBadge(t) {
    var k = { SALE: 'teal', RESERVE: 'amber', RELEASE: 'n', ADJUST: 'blue', TRANSFER_IN: 'violet', TRANSFER_OUT: 'violet', RECEIVE: 'ok', FULFILL: 'n', RETURN: 'ok', OPENING: 'n' }[t] || 'n';
    return badge(t.replace('_', ' '), k);
  }
  function transferModal(pre) {
    pre = pre || {};
    openModal('New transfer', '<label>SKU<select name="sku">' + variantOptions(pre.sku || 'SKU-A') + '</select></label><div class="row2"><label>From<select name="from">' + locOptions(pre.from || 'WH-NJ') + '</select></label><label>To<select name="to">' + locOptions(pre.to || 'ST-SOHO') + '</select></label></div><label>Quantity<input name="qty" type="number" min="1" value="' + (pre.qty || 6) + '"></label><p class="hint">Creates two ledger events with one transfer id: TRANSFER OUT at the source and TRANSFER IN at the destination.</p>', 'Create transfer', function (f) {
      var sku = f.get('sku'), from = f.get('from'), to = f.get('to'), qty = +f.get('qty');
      if (from === to || qty < 1) { toast('Pick two different locations and a quantity', 'warn'); return false; }
      var B = balances(); if (B(sku, from).av < qty) { toast('Only ' + B(sku, from).av + ' available at ' + loc(from).short, 'warn'); return false; }
      var id = 'TR-' + D.ri(2300, 2999);
      addEv({ sku: sku, loc: from, type: 'TRANSFER_OUT', dOn: -qty, dRes: 0, src: 'Merchant Portal', ref: id, user: 'A. Okafor' });
      addEv({ sku: sku, loc: to, type: 'TRANSFER_IN', dOn: qty, dRes: 0, src: 'Merchant Portal', ref: id, user: 'A. Okafor' });
      toast(id + ': ' + qty + ' x ' + sku + ' ' + loc(from).short + ' -> ' + loc(to).short);
      rerender();
    });
  }
  function adjustModal() {
    openModal('Stock adjustment', '<label>SKU<select name="sku">' + variantOptions('SKU-A') + '</select></label><div class="row2"><label>Location<select name="loc">' + locOptions('ST-SOHO') + '</select></label><label>Change<input name="qty" type="number" value="-1"></label></div><label>Reason<select name="reason"><option>Damaged</option><option>Count correction</option><option>Theft / loss</option><option>Found stock</option><option>Sample / display</option></select></label><p class="hint">Reason and user are stored on the event. In POS-Integrated Mode the adjustment is pushed to the POS after commit.</p>', 'Save adjustment', function (f) {
      var q = +f.get('qty'); if (!q) { toast('Enter a non-zero change', 'warn'); return false; }
      addEv({ sku: f.get('sku'), loc: f.get('loc'), type: 'ADJUST', dOn: q, dRes: 0, src: 'Merchant Portal', ref: f.get('reason'), user: 'A. Okafor' });
      toast('Adjustment ' + (q > 0 ? '+' : '') + q + ' saved for ' + f.get('sku'));
      rerender();
    });
  }

  /* ---------- CATALOG ---------- */
  var CAT = { q: '' };
  P.catalog = {
    render: function () {
      var B = balances();
      var list = D.products.filter(function (p) { return !CAT.q || (p.name + ' ' + p.cat + ' ' + p.variants.map(function (v) { return v.sku + ' ' + v.barcode; }).join(' ')).toLowerCase().indexOf(CAT.q.toLowerCase()) > -1; });
      return head(t('catalog'), 'Products, variants, SKUs, barcodes and attributes. One catalog for every channel and location.', btn('Import CSV', 'upload', 'id="impBtn"', 'ghost') + btn('Add product', 'plus', 'id="addProd"', 'primary')) +
        '<div class="kpis">' + kpi('Products', D.products.length, D.variants.length + ' variants', 'tags') + kpi('Categories', 4, 'Apparel, Accessories, Footwear, Home', 'folder-tree') + kpi('Barcodes', D.variants.length, 'GTIN / UPC validated', 'scan-barcode') + kpi('Channels', 3, 'POS, web store, mobile apps', 'globe') + '</div>' +
        '<div class="filters"><div class="search sm"><i data-lucide="search"></i><input id="catQ" placeholder="Search name, SKU or barcode" value="' + esc(CAT.q) + '"></div></div>' +
        card('Products', '<div class="tw"><table class="tbl click"><thead><tr><th>Product</th><th>Category</th><th>Variants</th><th class="r">Price</th><th class="r">Available</th><th>Channels</th></tr></thead><tbody>' +
          list.map(function (p) {
            var av = 0; p.variants.forEach(function (v) { D.locations.forEach(function (l) { av += B(v.sku, l.id).av; }); });
            return '<tr data-prod="' + p.id + '"><td><div class="pv">' + sw(p.color) + '<div><b>' + esc(p.name) + '</b><small class="mono">' + p.id + '</small></div></div></td><td>' + p.cat + '</td><td>' + p.variants.map(function (v) { return '<span class="vchip">' + esc(v.opt) + '</span>'; }).join('') + '</td><td class="r">' + money(p.price, 2) + '</td><td class="r"><b>' + num(av) + '</b></td><td>' + badge('POS', 'n') + badge('Web', 'n') + badge('App', 'n') + '</td></tr>';
          }).join('') + '</tbody></table></div>');
    },
    mount: function () {
      $$('[data-prod]').forEach(function (r) { r.addEventListener('click', function () { productDrawer(r.dataset.prod); }); });
      var q = $('#catQ'); q.addEventListener('input', function () { CAT.q = q.value; clearTimeout(q._t); q._t = setTimeout(function () { rerender(); var n = $('#catQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
      $('#impBtn').addEventListener('click', function () { toast('CSV import: 248 rows validated, 0 errors (demo)'); });
      $('#addProd').addEventListener('click', function () {
        openModal('Add product', '<label>Name<input name="name" value="Linen Overshirt" required></label><div class="row2"><label>Category<select name="cat"><option>Apparel</option><option>Accessories</option><option>Footwear</option><option>Home</option></select></label><label>Price (USD)<input name="price" type="number" value="88"></label></div><label>Variant options (comma separated)<input name="opts" value="Sand / M, Sand / L, Olive / M"></label><p class="hint">SKUs and barcodes are generated. Opening stock starts at 0 in every location.</p>', 'Create product', function (f) {
          var id = 'P-' + D.ri(200, 999), nm = f.get('name'), pr = +f.get('price') || 0;
          var p = { id: id, name: nm, cat: f.get('cat'), color: '#a16207', price: pr, cost: Math.round(pr * 0.35), attrs: { Material: 'Linen' }, variants: [] };
          f.get('opts').split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (o, i) {
            var v = { sku: 'HP-NEW-' + id.slice(2) + '-' + (i + 1), opt: o, barcode: '0840' + D.ri(10000000, 99999999), product: id, name: nm, price: pr, cost: p.cost, color: p.color, cat: p.cat, rop: 8 };
            p.variants.push(v); D.variants.push(v); D.vmap[v.sku] = v;
          });
          D.products.unshift(p); toast(nm + ' created with ' + p.variants.length + ' variants'); rerender();
        });
      });
    },
  };
  function productDrawer(id) {
    var p = D.products.filter(function (x) { return x.id === id; })[0], B = balances();
    openDrawer('<div class="d-h">' + sw(p.color) + '<div><small class="mono">' + p.id + ' &middot; ' + p.cat + '</small><h2>' + esc(p.name) + '</h2></div></div>' +
      '<div class="d-sec"><h4>Attributes</h4><div class="attrs">' + Object.keys(p.attrs).map(function (k) { return '<div><span>' + k + '</span><b>' + esc(p.attrs[k]) + '</b></div>'; }).join('') + '<div><span>Price</span><b>' + money(p.price, 2) + '</b></div><div><span>Cost</span><b>' + money(p.cost, 2) + '</b></div><div><span>Margin</span><b>' + Math.round((1 - p.cost / p.price) * 100) + '%</b></div></div></div>' +
      '<div class="d-sec"><h4>Variants</h4>' + p.variants.map(function (v) {
        var cells = D.locations.map(function (l) { var b = B(v.sku, l.id); return '<div><span>' + l.short + '</span><b class="' + (b.av < 0 ? 'neg' : '') + '">' + b.av + '</b></div>'; }).join('');
        return '<div class="var"><div class="var-h"><div><b>' + esc(v.opt) + '</b><small class="mono">' + v.sku + '</small></div><div class="bcw">' + barcode(v.barcode) + '</div></div><div class="var-s">' + cells + '</div></div>';
      }).join('') + '</div>' +
      '<div class="d-sec"><h4>Channel availability</h4><div class="toglist">' + ['POS (all stores)', 'Web store', 'iOS and Android apps', 'Local delivery', 'Buy online, pick up in store'].map(function (c, i) { return '<label class="tog"><input type="checkbox" ' + (i < 5 ? 'checked' : '') + '><span></span>' + c + '</label>'; }).join('') + '</div></div>');
  }

  /* ---------- WAREHOUSE ---------- */
  var WAVES = null;
  P.warehouse = {
    render: function () {
      if (!WAVES) {
        WAVES = { 'To pick': ['W-10485', 'W-10481', 'A-2245', 'W-10490'], 'Picking': ['A-2240', 'W-10471'], 'Packed': ['W-10477', 'A-2238'], 'Shipped': ['W-10478', 'W-10474', 'A-2233'] };
      }
      var zones = ['A', 'B', 'C', 'D'], bins = '';
      zones.forEach(function (z, zi) {
        bins += '<div class="zone"><span>Zone ' + z + '</span><div class="bins">';
        for (var i = 1; i <= 24; i++) { var f = ((i * 37 + zi * 53) % 100); var c = f > 92 ? 'b5' : f > 75 ? 'b4' : f > 50 ? 'b3' : f > 25 ? 'b2' : 'b1'; bins += '<i class="' + c + '" title="' + z + '-' + String(i).padStart(2, '0') + ': ' + f + '% full"></i>'; }
        bins += '</div></div>';
      });
      var kan = Object.keys(WAVES).map(function (col, ci) {
        return '<div class="kcol"><div class="kcol-h"><b>' + col + '</b><em>' + WAVES[col].length + '</em></div>' + WAVES[col].map(function (o) {
          var ord = D.orders.filter(function (x) { return x.id === o; })[0];
          var items = ord ? ord.items.reduce(function (a, b) { return a + b.qty; }, 0) : D.ri(1, 4);
          return '<div class="kcard"><div><b class="mono">' + o + '</b><small>' + items + ' units &middot; bin ' + zones[o.length % 4] + '-' + String(o.charCodeAt(3) % 24 + 1).padStart(2, '0') + '</small></div>' + (ci < 3 ? '<button class="icon-btn sm" data-adv="' + col + '|' + o + '" title="Move to next step"><i data-lucide="arrow-right"></i></button>' : '<i data-lucide="check" class="okc"></i>') + '</div>';
        }).join('') + '</div>';
      }).join('');
      return head(t('warehouse'), 'Newark Distribution Center. Bins, pick waves, packing and cycle counts.', btn('Start cycle count', 'scan-line', 'id="ccBtn"', 'ghost') + btn('Release wave', 'layers', 'id="waveBtn"', 'primary')) +
        '<div class="kpis">' + kpi('Bins in use', '312 / 384', '81% utilisation', 'grid-3x3') + kpi('Picks today', '214', 'Avg 46 s per pick', 'hand') + kpi('Pick accuracy', '99.6%', 'Scan-verified', 'scan-barcode', 'up') + kpi('Orders to ship', WAVES['To pick'].length + WAVES['Picking'].length + WAVES['Packed'].length, 'Cut-off 4:00 PM', 'package') + '</div>' +
        '<div class="g g-12">' + card('Bin occupancy', '<div class="zones">' + bins + '</div><div class="bleg"><span><i class="b1"></i>0-25%</span><span><i class="b2"></i>25-50%</span><span><i class="b3"></i>50-75%</span><span><i class="b4"></i>75-92%</span><span><i class="b5"></i>Full</span></div>') +
        card('Pick, pack, ship', '<div class="kanban">' + kan + '</div>') + '</div>' +
        card('Cycle counts', '<div class="tw"><table class="tbl"><thead><tr><th>Task</th><th>Zone</th><th>Bins</th><th>Assigned</th><th>Status</th><th class="r">Variance</th><th></th></tr></thead><tbody id="ccBody">' +
          [['CC-118', 'B', 48, 'J. Park', 'Completed', '-1 unit'], ['CC-119', 'C', 36, 'R. Diaz', 'In progress', '-'], ['CC-120', 'A', 24, 'Unassigned', 'Scheduled', '-']].map(function (r) {
            return '<tr><td class="mono">' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td><td>' + badge(r[4], r[4] === 'Completed' ? 'ok' : r[4] === 'In progress' ? 'amber' : 'n') + '</td><td class="r mono">' + r[5] + '</td><td class="r">' + (r[4] === 'Scheduled' ? '<button class="btn xs" data-cc>Start</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>');
    },
    mount: function () {
      var cols = Object.keys(WAVES);
      $$('[data-adv]').forEach(function (b) { b.addEventListener('click', function () {
        var p = b.dataset.adv.split('|'), i = cols.indexOf(p[0]);
        WAVES[p[0]] = WAVES[p[0]].filter(function (x) { return x !== p[1]; }); WAVES[cols[i + 1]].unshift(p[1]);
        toast(p[1] + ' moved to ' + cols[i + 1]); rerender();
      }); });
      $$('[data-cc]').forEach(function (b) { b.addEventListener('click', function () { toast('CC-120 started. Counters scan bins on the handheld app.'); b.closest('tr').children[4].innerHTML = badge('In progress', 'amber'); b.remove(); }); });
      $('#ccBtn').addEventListener('click', function () { toast('Cycle count CC-121 created for Zone D (24 bins)'); });
      $('#waveBtn').addEventListener('click', function () { WAVES['To pick'].push('W-' + D.ri(10500, 10599), 'A-' + D.ri(2250, 2299)); toast('Wave 38 released: 2 orders added to picking'); rerender(); });
    },
  };

  /* ---------- PURCHASING ---------- */
  var PUR = { tab: 'po' };
  function supName(id) { return D.suppliers.filter(function (s) { return s.id === id; })[0].name; }
  function replenRows() {
    var B = balances(), out = [];
    D.variants.forEach(function (v) {
      D.locations.forEach(function (l) {
        var b = B(v.sku, l.id), rop = l.type === 'Warehouse' ? v.rop * 6 : v.rop;
        if (b.av < rop) out.push({ v: v, l: l, b: b, rop: rop, sug: rop * (l.type === 'Warehouse' ? 3 : 2) - b.av });
      });
    });
    return out;
  }
  P.purchasing = {
    render: function () {
      var tabs = '<div class="tabs">' + [['po', 'Purchase orders'], ['rep', 'Replenishment'], ['sup', 'Suppliers']].map(function (x) { return '<button data-pt="' + x[0] + '" class="' + (PUR.tab === x[0] ? 'on' : '') + '">' + x[1] + (x[0] === 'rep' ? ' <em>' + replenRows().length + '</em>' : '') + '</button>'; }).join('') + '</div>';
      var top = head(t('purchasing'), 'Purchase orders, receiving and replenishment from suppliers to the warehouse, and from the warehouse to stores.', btn('New purchase order', 'plus', 'id="newPo"', 'primary'));
      var body;
      if (PUR.tab === 'po') {
        body = card('Purchase orders', '<div class="tw"><table class="tbl"><thead><tr><th>PO</th><th>Supplier</th><th>Status</th><th>Received</th><th>ETA</th><th class="r">Cost</th><th></th></tr></thead><tbody>' + D.pos.map(function (po) {
          var ord = 0, rec = 0, cost = 0; po.lines.forEach(function (l) { ord += l[1]; rec += l[2]; cost += l[1] * D.vmap[l[0]].cost; });
          var k = { Draft: 'n', Sent: 'blue', 'Partially received': 'amber', Received: 'ok' }[po.status];
          var act = po.status === 'Draft' ? '<button class="btn xs" data-send="' + po.id + '">Send</button>' : po.status !== 'Received' ? '<button class="btn xs primary" data-recv="' + po.id + '">Receive</button>' : '';
          return '<tr><td class="mono">' + po.id + '</td><td>' + supName(po.supplier) + '</td><td>' + badge(po.status, k) + '</td><td><div class="prog"><i style="width:' + Math.round(rec / ord * 100) + '%"></i></div><small class="mono">' + rec + ' / ' + ord + '</small></td><td>' + po.eta + '</td><td class="r">' + money(cost) + '</td><td class="r">' + act + '</td></tr>';
        }).join('') + '</tbody></table></div>');
      } else if (PUR.tab === 'rep') {
        body = card('Suggested replenishment', '<div class="tw"><table class="tbl"><thead><tr><th>Variant</th><th>Location</th><th class="r">Available</th><th class="r">Reorder point</th><th class="r">Suggested</th><th>Source</th><th></th></tr></thead><tbody>' + replenRows().map(function (r, i) {
          var wh = r.l.type === 'Warehouse';
          return '<tr><td><div class="pv">' + sw(r.v.color) + '<div><b>' + esc(r.v.name) + '</b><small>' + esc(r.v.opt) + ' &middot; <span class="mono">' + r.v.sku + '</span></small></div></div></td><td>' + r.l.short + '</td><td class="r ' + (r.b.av < 0 ? 'neg' : 'warn') + '">' + r.b.av + '</td><td class="r">' + r.rop + '</td><td class="r"><b>' + r.sug + '</b></td><td>' + (wh ? 'Purchase order' : 'Transfer from Newark DC') + '</td><td class="r"><button class="btn xs primary" data-rep="' + i + '">' + (wh ? 'Create PO' : 'Create transfer') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>', '<span class="mut sm">Reorder points per SKU and location, based on 28-day sell-through and supplier lead time</span>');
      } else {
        body = card('Suppliers', '<div class="tw"><table class="tbl"><thead><tr><th>Supplier</th><th>Lead time</th><th>Terms</th><th>Open POs</th><th>On-time rate</th></tr></thead><tbody>' + D.suppliers.map(function (s, i) {
          return '<tr><td><b>' + s.name + '</b><small class="mono mut"> ' + s.id + '</small></td><td>' + s.lead + ' days</td><td>' + s.terms + '</td><td>' + D.pos.filter(function (p) { return p.supplier === s.id && p.status !== 'Received'; }).length + '</td><td>' + [96, 88, 99, 93][i] + '%</td></tr>';
        }).join('') + '</tbody></table></div>');
      }
      return top + tabs + body;
    },
    mount: function () {
      $$('[data-pt]').forEach(function (b) { b.addEventListener('click', function () { PUR.tab = b.dataset.pt; rerender(); }); });
      $$('[data-send]').forEach(function (b) { b.addEventListener('click', function () { var po = D.pos.filter(function (p) { return p.id === b.dataset.send; })[0]; po.status = 'Sent'; po.eta = 'Oct 24'; toast(po.id + ' sent to ' + supName(po.supplier) + ' by EDI / email'); rerender(); }); });
      $$('[data-recv]').forEach(function (b) { b.addEventListener('click', function () { receiveModal(b.dataset.recv); }); });
      $$('[data-rep]').forEach(function (b) { b.addEventListener('click', function () {
        var r = replenRows()[+b.dataset.rep];
        if (r.l.type === 'Warehouse') {
          var id = 'PO-' + D.ri(7030, 7099); D.pos.unshift({ id: id, supplier: 'SUP-01', status: 'Draft', created: new Date().toISOString(), eta: '-', lines: [[r.v.sku, r.sug, 0]] });
          toast(id + ' drafted for ' + r.sug + ' x ' + r.v.sku); PUR.tab = 'po'; rerender();
        } else transferModal({ sku: r.v.sku, from: 'WH-NJ', to: r.l.id, qty: r.sug });
      }); });
      $('#newPo').addEventListener('click', function () {
        openModal('New purchase order', '<label>Supplier<select name="sup">' + D.suppliers.map(function (s) { return '<option value="' + s.id + '">' + s.name + '</option>'; }).join('') + '</select></label><div class="row2"><label>SKU<select name="sku">' + variantOptions('HP-SWT-CHR-M') + '</select></label><label>Quantity<input name="qty" type="number" value="60"></label></div><p class="hint">Delivers to Newark Distribution Center. Received quantities post RECEIVE events to the ledger.</p>', 'Create draft', function (f) {
          var id = 'PO-' + D.ri(7030, 7099); D.pos.unshift({ id: id, supplier: f.get('sup'), status: 'Draft', created: new Date().toISOString(), eta: '-', lines: [[f.get('sku'), +f.get('qty'), 0]] });
          toast(id + ' created as draft'); PUR.tab = 'po'; rerender();
        });
      });
    },
  };
  function receiveModal(id) {
    var po = D.pos.filter(function (p) { return p.id === id; })[0];
    openModal('Receive ' + po.id, '<p class="hint" style="margin-top:0">' + supName(po.supplier) + ' &rarr; Newark Distribution Center. Scan or enter quantities. Partial receipts are fine.</p>' + po.lines.map(function (l, i) {
      var v = D.vmap[l[0]];
      return '<div class="rline"><div class="pv">' + sw(v.color) + '<div><b>' + esc(v.name) + '</b><small>' + esc(v.opt) + ' &middot; <span class="mono">' + v.sku + '</span> &middot; ' + l[2] + ' of ' + l[1] + ' received</small></div></div><input name="q' + i + '" type="number" min="0" max="' + (l[1] - l[2]) + '" value="' + (l[1] - l[2]) + '"></div>';
    }).join(''), 'Post receipt', function (f) {
      var units = 0;
      po.lines.forEach(function (l, i) { var q = Math.max(0, Math.min(l[1] - l[2], +f.get('q' + i) || 0)); if (q) { l[2] += q; units += q; addEv({ sku: l[0], loc: 'WH-NJ', type: 'RECEIVE', dOn: q, dRes: 0, src: 'Receiving', ref: po.id, user: 'J. Park' }); } });
      po.status = po.lines.every(function (l) { return l[2] >= l[1]; }) ? 'Received' : 'Partially received';
      toast(units + ' units received on ' + po.id + '. Stock updated.'); rerender();
    });
  }

  /* ---------- ORDERS ---------- */
  var ORD = { f: 'All' };
  var FLOW = { Ship: ['New', 'Picking', 'Packed', 'Shipped'], BOPIS: ['New', 'Picking', 'Ready for pickup', 'Completed'], 'Local delivery': ['New', 'Picking', 'Out for delivery', 'Completed'], 'In-store': ['Completed'] };
  function stK(s) { return { New: 'blue', Picking: 'amber', Packed: 'amber', 'Ready for pickup': 'violet', 'Out for delivery': 'violet', Shipped: 'ok', Completed: 'ok', Refunded: 'n' }[s] || 'n'; }
  P.orders = {
    render: function () {
      var list = D.orders.filter(function (o) { return (ORD.f === 'All' || o.fulfil === ORD.f) && (S.loc === 'ALL' || o.loc === S.loc); });
      var st = ['New', 'Picking', 'Packed', 'Ready for pickup', 'Out for delivery', 'Shipped', 'Completed'];
      return head(t('orders'), 'Every channel in one queue: in-store, web, app. Ship, buy online pick up in store, or local delivery.', btn('Export', 'download', 'id="oExp"', 'ghost')) +
        '<div class="pipe">' + st.map(function (s) { var n = D.orders.filter(function (o) { return o.status === s; }).length; return '<div><b>' + n + '</b><span>' + s + '</span></div>'; }).join('') + '</div>' +
        '<div class="filters">' + ['All', 'Ship', 'BOPIS', 'Local delivery', 'In-store'].map(function (c) { return '<button class="chip ' + (ORD.f === c ? 'on' : '') + '" data-of="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
        card(list.length + ' orders', '<div class="tw"><table class="tbl click"><thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Channel</th><th>Fulfillment</th><th>Location</th><th class="r">Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>' + list.map(function (o) {
          return '<tr data-ord="' + o.id + '"><td class="mono"><b>' + o.id + '</b></td><td class="mut">' + rel(o.placed) + '</td><td>' + o.customer + '</td><td>' + badge(o.channel === 'POS' && S.mode !== 'pos' ? 'Store' : o.channel, o.channel === 'POS' ? 'teal' : o.channel === 'Web' ? 'blue' : 'violet') + '</td><td>' + o.fulfil + '</td><td>' + loc(o.loc).short + '</td><td class="r">' + money(o.total, 2) + '</td><td class="mut sm">' + (o.channel === 'POS' && S.mode !== 'pos' ? 'Built-in register' : o.payment) + '</td><td>' + badge(o.status, stK(o.status)) + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    },
    mount: function () {
      $$('[data-of]').forEach(function (b) { b.addEventListener('click', function () { ORD.f = b.dataset.of; rerender(); }); });
      $$('[data-ord]').forEach(function (r) { r.addEventListener('click', function () { orderDrawer(r.dataset.ord); }); });
      $('#oExp').addEventListener('click', function () { toast('Orders exported (CSV)'); });
    },
  };
  function orderDrawer(id) {
    var o = D.orders.filter(function (x) { return x.id === id; })[0]; if (!o) return;
    var flow = FLOW[o.fulfil], idx = flow.indexOf(o.status), next = flow[idx + 1];
    var steps = ['Placed', 'Paid'].concat(o.channel === 'POS' ? [] : ['Stock reserved']).concat(flow);
    var reached = o.status === 'Refunded' ? 2 : steps.indexOf(o.status);
    var sub = o.total, tax = sub * loc(o.loc).tax / 100;
    openDrawer('<div class="d-h"><span class="l-ic big"><i data-lucide="receipt"></i></span><div><small>' + o.channel + ' &middot; ' + o.fulfil + ' &middot; ' + loc(o.loc).name + '</small><h2 class="mono">' + o.id + '</h2></div>' + badge(o.status, stK(o.status)) + '</div>' +
      '<div class="d-sec"><h4>Timeline</h4><ol class="tl">' + steps.map(function (s, i) { return '<li class="' + (i <= reached ? 'done' : '') + '"><b>' + s + '</b>' + (i <= reached ? '<small>' + new Date(new Date(o.placed).getTime() + i * 9 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '</small>' : '') + '</li>'; }).join('') + '</ol></div>' +
      '<div class="d-sec"><h4>Items</h4>' + o.items.map(function (it) { var v = D.vmap[it.sku]; return '<div class="li">' + sw(v.color) + '<div><b>' + esc(v.name) + '</b><small>' + esc(v.opt) + ' &middot; <span class="mono">' + v.sku + '</span></small></div><span>' + it.qty + ' x ' + money(it.price, 2) + '</span></div>'; }).join('') +
      '<div class="tot"><div><span>Subtotal</span><b>' + money(sub, 2) + '</b></div><div><span>Sales tax ' + loc(o.loc).tax + '%</span><b>' + money(tax, 2) + '</b></div><div class="grand"><span>Total</span><b>' + money(sub + tax, 2) + '</b></div></div></div>' +
      '<div class="d-sec"><h4>Customer and payment</h4><div class="attrs"><div><span>Customer</span><b>' + o.customer + '</b></div><div><span>Payment</span><b>' + o.payment + '</b></div><div><span>Status</span><b>' + (o.status === 'Refunded' ? 'Refunded' : 'Captured') + '</b></div></div></div>' +
      '<div class="d-act">' + (next ? btn('Mark as ' + next, 'arrow-right', 'id="oNext"', 'primary') : '') + (o.status !== 'Refunded' && o.channel !== 'POS' ? btn('Refund', 'rotate-ccw', 'id="oRef"', 'ghost') : '') + '</div>');
    var nb = $('#oNext'); if (nb) nb.addEventListener('click', function () {
      o.status = next;
      if (next === 'Shipped' || next === 'Completed') o.items.forEach(function (it) {
        if (o.channel !== 'POS') { addEv({ sku: it.sku, loc: o.loc, type: 'RELEASE', dOn: 0, dRes: -it.qty, src: 'Fulfillment', ref: o.id, user: 'A. Okafor' }); addEv({ sku: it.sku, loc: o.loc, type: 'FULFILL', dOn: -it.qty, dRes: 0, src: 'Fulfillment', ref: o.id, user: 'A. Okafor' }); }
      });
      toast(o.id + ' is now ' + next + (next === 'Ready for pickup' ? '. Customer notified by SMS and email.' : '')); orderDrawer(o.id); rerender();
    });
    var rb = $('#oRef'); if (rb) rb.addEventListener('click', function () {
      if (['Shipped', 'Completed'].indexOf(o.status) === -1) o.items.forEach(function (it) { addEv({ sku: it.sku, loc: o.loc, type: 'RELEASE', dOn: 0, dRes: -it.qty, src: 'Payments', ref: o.id, user: 'A. Okafor' }); });
      o.status = 'Refunded'; toast('Refund of ' + money(o.total, 2) + ' issued through Stripe. Reservation released.'); orderDrawer(o.id); rerender();
    });
  }

  /* ---------- CUSTOMERS ---------- */
  P.customers = {
    render: function () {
      var liab = D.customers.reduce(function (a, c) { return a + c.points; }, 0) / 500 * 10;
      return head(t('customers'), 'Customer accounts across store, web and app, with one loyalty balance.', btn('Add customer', 'user-plus', 'id="addCust"', 'primary')) +
        '<div class="kpis">' + kpi('Members', '4,812', '+126 this month', 'users', 'up') + kpi('Repeat purchase rate', '38%', '+3 pts vs last quarter', 'repeat', 'up') + kpi('Points outstanding', num(D.customers.reduce(function (a, c) { return a + c.points; }, 0) * 37), 'Liability ' + money(liab * 37), 'coins') + kpi('Avg lifetime value', money(612), 'Gold members ' + money(1840), 'gem') + '</div>' +
        '<div class="g g-12">' + card('Loyalty program', '<div class="tiers"><div class="tier t1"><b>Bronze</b><span>0+ points</span><small>1 point per $1</small></div><div class="tier t2"><b>Silver</b><span>1,200+ points</span><small>1.25x points, free shipping</small></div><div class="tier t3"><b>Gold</b><span>3,000+ points</span><small>1.5x points, early access, free delivery</small></div></div><div class="hint">500 points = $10 reward. Earned and redeemed in store, on the web and in the apps.</div>') +
        card('Customers', '<div class="tw"><table class="tbl click"><thead><tr><th>Name</th><th>Tier</th><th class="r">Points</th><th class="r">Orders</th><th class="r">Lifetime value</th><th>Home store</th></tr></thead><tbody>' + D.customers.map(function (c) {
          return '<tr data-cust="' + c.id + '"><td><div class="pv"><span class="av-c">' + c.name.split(' ').map(function (x) { return x[0]; }).join('') + '</span><div><b>' + c.name + '</b><small>' + c.email + '</small></div></div></td><td>' + badge(c.tier, c.tier === 'Gold' ? 'amber' : c.tier === 'Silver' ? 'n' : 'brz') + '</td><td class="r mono">' + num(c.points) + '</td><td class="r">' + c.orders + '</td><td class="r">' + money(c.ltv) + '</td><td>' + c.store + '</td></tr>';
        }).join('') + '</tbody></table></div>') + '</div>';
    },
    mount: function () {
      $$('[data-cust]').forEach(function (r) { r.addEventListener('click', function () {
        var c = D.customers.filter(function (x) { return x.id === r.dataset.cust; })[0];
        var nextT = c.tier === 'Bronze' ? 1200 : c.tier === 'Silver' ? 3000 : null;
        openDrawer('<div class="d-h"><span class="av-c big">' + c.name.split(' ').map(function (x) { return x[0]; }).join('') + '</span><div><small class="mono">' + c.id + ' &middot; member since ' + c.since + '</small><h2>' + c.name + '</h2></div>' + badge(c.tier, c.tier === 'Gold' ? 'amber' : 'n') + '</div>' +
          '<div class="d-sec"><h4>Loyalty</h4><div class="attrs"><div><span>Points</span><b>' + num(c.points) + '</b></div><div><span>Reward value</span><b>' + money(Math.floor(c.points / 500) * 10) + '</b></div><div><span>Lifetime value</span><b>' + money(c.ltv) + '</b></div></div>' + (nextT ? '<div class="prog lg"><i style="width:' + Math.min(100, Math.round(c.points / nextT * 100)) + '%"></i></div><small class="mut">' + num(nextT - c.points) + ' points to ' + (c.tier === 'Bronze' ? 'Silver' : 'Gold') + '</small>' : '<small class="mut">Top tier reached</small>') + '</div>' +
          '<div class="d-sec"><h4>Recent activity</h4><ol class="tl">' + [['Earned 98 points', 'SoHo store, POS'], ['Redeemed 500 points', 'Web order, $10 off'], ['Earned 42 points', 'iOS app, BOPIS'], ['Joined Silver tier', 'Automatic upgrade']].map(function (a, i) { return '<li class="done"><b>' + a[0] + '</b><small>' + a[1] + ' &middot; ' + (i * 9 + 3) + ' days ago</small></li>'; }).join('') + '</ol></div>' +
          '<div class="d-sec"><h4>Contact preferences</h4><div class="toglist"><label class="tog"><input type="checkbox" checked><span></span>Email receipts</label><label class="tog"><input type="checkbox" checked><span></span>SMS order updates</label><label class="tog"><input type="checkbox"><span></span>Marketing emails</label></div></div>');
      }); });
      $('#addCust').addEventListener('click', function () {
        openModal('Add customer', '<div class="row2"><label>First name<input name="f" value="Riley"></label><label>Last name<input name="l" value="Parker"></label></div><label>Email<input name="e" value="riley.parker@example.com"></label><label>Home store<select name="s"><option>SoHo</option><option>Brooklyn</option><option>Jersey City</option><option>Online</option></select></label>', 'Create', function (f) {
          D.customers.unshift({ id: 'C-' + D.ri(3200, 3999), name: f.get('f') + ' ' + f.get('l'), email: f.get('e'), tier: 'Bronze', points: 0, orders: 0, ltv: 0, store: f.get('s'), since: new Date().getFullYear() });
          toast('Customer created and enrolled in loyalty'); rerender();
        });
      });
    },
  };

  /* ---------- PROMOTIONS ---------- */
  P.promotions = {
    render: function () {
      return head(t('promotions'), 'Rules by category, product, tier, channel and location. Applied the same way in store and online.', btn('New promotion', 'plus', 'id="newPromo"', 'primary')) +
        '<div class="promos">' + D.promotions.map(function (p) {
          return '<div class="promo ' + (p.active ? 'on' : '') + '"><div class="pr-h"><span class="pr-v">' + p.value + '</span><label class="tog"><input type="checkbox" data-pr="' + p.id + '" ' + (p.active ? 'checked' : '') + '><span></span></label></div><b>' + p.name + '</b><small>' + p.type + '</small><div class="pr-m"><span><i data-lucide="target"></i>' + p.scope + '</span><span><i data-lucide="radio"></i>' + p.channels + '</span><span><i data-lucide="calendar"></i>' + p.start + ' - ' + p.end + '</span></div><div class="pr-f">' + num(p.uses) + ' redemptions</div></div>';
        }).join('') + '</div>';
    },
    mount: function () {
      $$('[data-pr]').forEach(function (c) { c.addEventListener('change', function () { var p = D.promotions.filter(function (x) { return x.id === c.dataset.pr; })[0]; p.active = c.checked; toast(p.name + (p.active ? ' is live on all selected channels' : ' paused')); rerender(); }); });
      $('#newPromo').addEventListener('click', function () {
        openModal('New promotion', '<label>Name<input name="n" value="Weekend denim offer"></label><div class="row2"><label>Type<select name="t"><option>Percent off category</option><option>Fixed amount</option><option>Buy X get Y</option><option>Free delivery</option><option>Loyalty multiplier</option></select></label><label>Value<input name="v" value="15%"></label></div><div class="row2"><label>Applies to<input name="s" value="Denim"></label><label>Channels<select name="c"><option>All</option><option>POS</option><option>Web</option><option>App</option></select></label></div>', 'Create', function (f) {
          D.promotions.unshift({ id: 'PR-' + D.ri(10, 99), name: f.get('n'), type: f.get('t'), value: f.get('v'), scope: f.get('s'), channels: f.get('c'), start: 'Today', end: '+7 days', active: true, uses: 0 });
          toast('Promotion created and synced to ' + (f.get('c') === 'All' ? 'all channels' : f.get('c'))); rerender();
        });
      });
    },
  };

  /* ---------- RETURNS ---------- */
  P.returns = {
    render: function () {
      return head(t('returns'), 'Returns from any channel to any store. Restock or write off, with refunds to the original payment.', '') +
        card('Return requests', '<div class="tw"><table class="tbl"><thead><tr><th>RMA</th><th>Order</th><th>Customer</th><th>Item</th><th>Reason</th><th>Location</th><th class="r">Refund</th><th>Status</th><th></th></tr></thead><tbody>' + D.returns.map(function (r) {
          var v = D.vmap[r.sku], act = '';
          if (r.status === 'Requested') act = '<button class="btn xs" data-ra="approve|' + r.id + '">Approve</button>';
          else if (r.status === 'Inspecting' || r.status === 'Received') act = '<button class="btn xs primary" data-ra="restock|' + r.id + '">Restock</button> <button class="btn xs ghost" data-ra="writeoff|' + r.id + '">Write off</button>';
          else if (r.status === 'Approved') act = '<button class="btn xs" data-ra="receive|' + r.id + '">Receive</button>';
          return '<tr><td class="mono">' + r.id + '</td><td class="mono">' + r.order + '</td><td>' + r.customer + '</td><td><div class="pv">' + sw(v.color) + '<div><b>' + esc(v.name) + '</b><small>' + esc(v.opt) + ' x' + r.qty + '</small></div></div></td><td>' + r.reason + '</td><td>' + loc(r.loc).short + '</td><td class="r">' + money(r.refund, 2) + '</td><td>' + badge(r.status, r.status === 'Restocked' ? 'ok' : r.status === 'Written off' ? 'n' : 'amber') + '</td><td class="r nowrap">' + act + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    },
    mount: function () {
      $$('[data-ra]').forEach(function (b) { b.addEventListener('click', function () {
        var p = b.dataset.ra.split('|'), r = D.returns.filter(function (x) { return x.id === p[1]; })[0];
        if (p[0] === 'approve') { r.status = 'Approved'; toast(r.id + ' approved. Prepaid label sent.'); }
        if (p[0] === 'receive') { r.status = 'Received'; toast(r.id + ' received at ' + loc(r.loc).short); }
        if (p[0] === 'restock') { r.status = 'Restocked'; addEv({ sku: r.sku, loc: r.loc, type: 'RETURN', dOn: r.qty, dRes: 0, src: 'Returns', ref: r.id, user: 'A. Okafor' }); toast(r.qty + ' x ' + r.sku + ' back in stock at ' + loc(r.loc).short + '. Refund ' + money(r.refund, 2) + ' issued.'); }
        if (p[0] === 'writeoff') { r.status = 'Written off'; toast(r.id + ' written off. Refund issued, no stock change.'); }
        rerender();
      }); });
    },
  };

  /* ---------- CHANNELS ---------- */
  var BR = { color: '#0e1a2b', name: 'Harbor & Pine' };
  P.channels = {
    render: function () {
      var cols = ['#0e1a2b', '#7c2d12', '#065f46', '#1e3a8a', '#6d28d9', '#be123c'];
      return head(t('channels'), 'Merchant-branded web store and iOS / Android apps, all fed by the same catalog, stock and loyalty data.', btn('Preview store', 'external-link', 'id="prevBtn"', 'ghost') + btn('Publish changes', 'upload-cloud', 'id="pubBtn"', 'primary')) +
        '<div class="kpis">' + kpi('Web store', 'Live', 'harborandpine.com &middot; SSL &middot; CDN', 'globe', 'up') + kpi('iOS app', 'v1.4.0', 'Live on App Store', 'smartphone', 'up') + kpi('Android app', 'v1.4.0', 'Live on Google Play', 'smartphone', 'up') + kpi('Conversion', '3.1%', 'Web 2.6% &middot; App 4.4%', 'trending-up') + '</div>' +
        '<div class="g g-12">' + card('Branding', '<label class="fl">Store name<input id="brName" value="' + esc(BR.name) + '"></label><div class="fl">Brand color<div class="swatches">' + cols.map(function (c) { return '<button data-col="' + c + '" class="' + (BR.color === c ? 'on' : '') + '" style="--c:' + c + '"></button>'; }).join('') + '</div></div>' +
          '<div class="fl">Checkout options</div><div class="toglist">' + ['Ship to home', 'Buy online, pick up in store', 'Local delivery', 'Apple Pay and Google Pay', 'Guest checkout'].map(function (x) { return '<label class="tog"><input type="checkbox" checked><span></span>' + x + '</label>'; }).join('') + '</div>' +
          '<div class="fl">Languages and currencies</div><div class="hint" style="margin-top:4px">English, Spanish, French &middot; USD, CAD, EUR, GBP, MXN. Change them in the top bar to see the whole portal switch.</div>') +
        card('Live preview', '<div class="pvw" id="pvw" style="--brand:' + BR.color + '">' +
          '<div class="browser"><div class="b-bar"><i></i><i></i><i></i><span>harborandpine.com</span></div><div class="b-body"><div class="b-nav"><b id="pvName">' + esc(BR.name) + '</b><span>New</span><span>Men</span><span>Women</span><span>Home</span><i data-lucide="shopping-bag"></i></div>' +
          '<div class="b-hero"><div><small>Fall edit</small><b>Everyday essentials, made to last.</b><a>Shop now</a></div></div>' +
          '<div class="b-grid">' + D.products.slice(0, 4).map(function (p) { return '<div><span class="sw" style="--c:' + p.color + '"></span><b>' + esc(p.name) + '</b><em>' + money(p.price) + '</em></div>'; }).join('') + '</div></div></div>' +
          '<div class="phone"><div class="ph-notch"></div><div class="ph-body"><div class="ph-top"><b id="pvName2">' + esc(BR.name) + '</b><i data-lucide="user"></i></div><div class="ph-img" style="--c:#111827"><span>Classic Crew Tee</span></div><b class="ph-title">Classic Crew Tee</b><div class="ph-price">' + money(28, 2) + ' &middot; <span>Black / M</span></div><div class="ph-opt on"><i data-lucide="store"></i><div><b>Pick up at SoHo</b><small>Ready in 2 hours</small></div></div><div class="ph-opt"><i data-lucide="bike"></i><div><b>Local delivery</b><small>Today 4-6 PM</small></div></div><div class="ph-btn">Add to bag</div></div></div>' +
        '</div>') + '</div>';
    },
    mount: function () {
      $$('[data-col]').forEach(function (b) { b.addEventListener('click', function () { BR.color = b.dataset.col; $('#pvw').style.setProperty('--brand', BR.color); $$('[data-col]').forEach(function (x) { x.classList.toggle('on', x === b); }); }); });
      $('#brName').addEventListener('input', function (e) { BR.name = e.target.value; $('#pvName').textContent = BR.name; $('#pvName2').textContent = BR.name; });
      $('#pubBtn').addEventListener('click', function () { toast('Published to web store. Apps pick up theme changes on next launch (no store review needed).'); });
      $('#prevBtn').addEventListener('click', function () { toast('Preview link copied (demo)'); });
    },
  };

  /* ---------- DELIVERY ---------- */
  P.delivery = {
    render: function () {
      var dmap = {}; D.drivers.forEach(function (d) { dmap[d.id] = d; });
      return head(t('delivery'), 'Same-day delivery from stores. Dispatch, live routes and proof of delivery from the Driver App.', btn('Optimize routes', 'route', 'id="optBtn"', 'primary')) +
        '<div class="kpis">' + kpi('Deliveries today', '23', '19 on time &middot; 0 late', 'truck', 'up') + kpi('Unassigned', D.deliveries.filter(function (d) { return !d.driver; }).length, 'Window 4-6 PM', 'inbox', 'warn') + kpi('Drivers on shift', '3', '1 on route &middot; 1 loading', 'bike') + kpi('Avg delivery time', '38 min', 'From pick to doorstep', 'timer') + '</div>' +
        '<div class="g g-21">' + card('Live map', '<svg class="map" viewBox="0 0 640 300"><defs><pattern id="mg" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#e2e8f0" stroke-width="1"/></pattern></defs><rect width="640" height="300" fill="#f8fafc"/><rect width="640" height="300" fill="url(#mg)"/><path d="M300 0 C 320 80, 280 160, 330 300" stroke="#bfdbfe" stroke-width="34" fill="none"/>' +
          '<path class="route" d="M120 210 C 170 170, 210 150, 250 120" stroke="#0d9488" stroke-width="4" fill="none" stroke-linecap="round"/><path class="route r2" d="M420 90 C 470 120, 500 160, 560 170 S 600 230, 590 250" stroke="#7c3aed" stroke-width="4" fill="none" stroke-linecap="round"/>' +
          '<g class="pin"><circle cx="120" cy="210" r="10" fill="#0e1a2b"/><text x="120" y="214" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">S</text></g><g class="pin"><circle cx="420" cy="90" r="10" fill="#0e1a2b"/><text x="420" y="94" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">B</text></g>' +
          '<circle cx="250" cy="120" r="7" fill="#0d9488"/><circle cx="560" cy="170" r="7" fill="#7c3aed"/><circle cx="590" cy="250" r="7" fill="#7c3aed"/><circle class="drv" cx="180" cy="170" r="8" fill="#f59e0b" stroke="#fff" stroke-width="3"/><text x="134" y="236" font-size="11" fill="#475569">SoHo</text><text x="434" y="78" font-size="11" fill="#475569">Brooklyn</text></svg>') +
        card('Drivers', '<div class="list">' + D.drivers.map(function (d) { return '<div class="li"><span class="av-c">' + d.name.slice(0, 1) + '</span><div><b>' + d.name + '</b><small>' + d.vehicle + ' &middot; ' + loc(d.loc).short + (d.stops ? ' &middot; ' + d.done + '/' + d.stops + ' stops' : '') + '</small></div>' + badge(d.status, d.status === 'On route' ? 'teal' : d.status === 'Available' ? 'ok' : d.status === 'Loading' ? 'amber' : 'n') + '</div>'; }).join('') + '</div>') + '</div>' +
        card('Delivery queue', '<div class="tw"><table class="tbl"><thead><tr><th>Delivery</th><th>Order</th><th>Address</th><th>Window</th><th>Driver</th><th>Status</th></tr></thead><tbody>' + D.deliveries.map(function (d) {
          return '<tr><td class="mono">' + d.id + '</td><td class="mono">' + d.order + '</td><td>' + d.addr + '</td><td>' + d.window + '</td><td>' + (d.driver ? dmap[d.driver].name : '<select class="sel xs" data-asg="' + d.id + '"><option value="">Assign driver</option>' + D.drivers.filter(function (x) { return x.status !== 'Off shift'; }).map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join('') + '</select>') + '</td><td>' + badge(d.status, d.status === 'Delivered' ? 'ok' : d.status === 'Unassigned' ? 'amber' : 'teal') + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    },
    mount: function () {
      $$('[data-asg]').forEach(function (s) { s.addEventListener('change', function () {
        var d = D.deliveries.filter(function (x) { return x.id === s.dataset.asg; })[0], dr = D.drivers.filter(function (x) { return x.id === s.value; })[0]; if (!dr) return;
        d.driver = dr.id; d.status = 'Assigned'; dr.stops++; if (dr.status === 'Available') { dr.status = 'Loading'; dr.route = 'Route ' + D.ri(8, 12); }
        toast(d.id + ' assigned to ' + dr.name + '. Pushed to Driver App.'); rerender();
      }); });
      $('#optBtn').addEventListener('click', function () { toast('Routes optimized: 2 routes, 11.4 mi total, all windows met'); });
    },
  };

  /* ---------- SYNC LAB ---------- */
  var SIMBUSY = false;
  P.sync = {
    render: function () {
      if (S.mode !== 'pos') {
        return head(t('sync'), 'Reusable POS Connector Framework.', '') +
          '<div class="banner"><i data-lucide="cloud"></i><div><b>Standalone Mode is on.</b><span>Stores use the built-in register, so sales go straight into the ledger and there is nothing to reconcile. Switch to POS-Integrated Mode to run the sync scenario.</span></div>' + btn('Switch to POS-Integrated', 'plug-zap', 'id="toPos"', 'primary') + '</div>';
      }
      var B = balances(), b = B('SKU-A', 'ST-SOHO');
      var nextStep = SIM.step < STEPS.length ? STEPS[SIM.step] : null;
      var stepper = '<div class="steps">' + STEPS.map(function (s, i) {
        var st = i < SIM.step ? 'done' : i === SIM.step ? 'next' : '';
        return '<button class="step ' + st + '" data-step="' + i + '" ' + (i !== SIM.step || SIMBUSY ? 'disabled' : '') + '><em>' + (i < SIM.step ? '<i data-lucide="check"></i>' : i + 1) + '</em><span>' + s.label + '</span></button>';
      }).join('') + '</div>';
      var ledgerRows = D.ledger.filter(function (e) { return e.sku === 'SKU-A' && (e.loc === 'ST-SOHO' || SIM.evIds.indexOf(e.id) > -1); });
      var run = 0, runR = 0;
      var lt = ledgerRows.map(function (e) {
        if (e.loc === 'ST-SOHO') { run += e.dOn; runR += e.dRes; }
        var isNew = SIM.evIds.indexOf(e.id) > -1;
        return '<tr class="' + (isNew ? 'new' : '') + '"><td class="mono sm">' + clock(e.ts) + '</td><td>' + evBadge(e.type) + '</td><td>' + loc(e.loc).short + '</td><td class="r mono ' + (e.dOn < 0 ? 'neg' : e.dOn > 0 ? 'pos' : '') + '">' + (e.dOn ? (e.dOn > 0 ? '+' : '') + e.dOn : '-') + '</td><td class="r mono">' + (e.dRes ? (e.dRes > 0 ? '+' : '') + e.dRes : '-') + '</td><td class="r mono"><b>' + (e.loc === 'ST-SOHO' ? (run - runR) : '') + '</b></td><td>' + esc(e.src) + ' &middot; ' + esc(e.ref || '') + '</td><td class="mono sm mut">' + esc(e.key || '-') + '</td></tr>';
      }).join('');
      // allocation
      var alloc = '';
      if (SIM.step >= 5 || SIM.alert || SIM.resolved) {
        var left = b.on, rows = [['W-10471', 10, 'Web'], ['A-2231', 8, 'App'], ['W-10476', 7, 'Web']];
        var w82 = D.ledger.filter(function (e) { return e.sku === 'SKU-A' && e.loc === 'ST-SOHO' && e.ref === 'W-10482'; }).reduce(function (a, e) { return a + e.dRes; }, 0);
        if (SIM.cap != null) rows.push(['W-10482', w82, 'Web']);
        alloc = '<table class="tbl mini"><thead><tr><th>Reservation (oldest first)</th><th class="r">Qty</th><th class="r">Covered</th><th class="r">Short</th></tr></thead><tbody>' + rows.map(function (r) {
          var cov = Math.max(0, Math.min(r[1], left)); left -= r[1];
          return '<tr><td class="mono">' + r[0] + ' <small class="mut">' + r[2] + '</small></td><td class="r">' + r[1] + '</td><td class="r pos">' + cov + '</td><td class="r ' + (r[1] - cov ? 'neg' : '') + '">' + (r[1] - cov || '-') + '</td></tr>';
        }).join('') + '</tbody></table>';
      }
      var alertBox = SIM.alert ? '<div class="alert-box"><div class="ab-h"><i data-lucide="triangle-alert"></i><div><b>Oversell: ' + (-b.av) + ' units short on SKU-A at SoHo</b><span>Walk-in sale is final. Shortfall goes to the newest reservation (W-10482). Online availability set to 0.</span></div></div>' + alloc + '<div class="ab-a">' + btn('Transfer ' + (-b.av) + ' from Newark DC', 'arrow-left-right', 'id="rsTrf"', 'primary') + btn('Backorder ' + (-b.av), 'clock', 'id="rsBo"', 'ghost') + '</div></div>'
        : SIM.resolved ? '<div class="ok-box"><i data-lucide="circle-check"></i><div><b>Resolved by ' + (SIM.resolved === 'transfer' ? 'transfer from Newark DC' : 'backorder') + '</b><span>Available is 0, nothing oversold. Every step is in the ledger and audit trail.</span></div></div>' + alloc
        : (SIM.step >= 5 ? '<div class="ok-box"><i data-lucide="shield-check"></i><div><b>No oversell</b><span>' + (S.safety ? 'The safety buffer capped the online order while SoHo was offline.' : 'Stock covers all reservations.') + '</span></div></div>' + alloc : '');
      var conn = [
        { n: 'Square', l: 'SoHo Flagship', r: 'Register 2', on: SIM.posOnline, q: SIM.queue.length, ev: 1284 },
        { n: 'Clover', l: 'Williamsburg', r: 'Station 1', on: true, q: 0, ev: 906 },
        { n: 'Lightspeed', l: 'Not connected', r: 'Adapter available', on: null, q: 0, ev: 0 },
      ];
      return head(t('sync'), 'Your test case, live: POS offline, sale 8, online reservation 10, adjustment -2, reconnect. No last-write-wins.',
          '<label class="tog" title="Hold back 10 units from online sales while a POS is offline"><input type="checkbox" id="safety" ' + (S.safety ? 'checked' : '') + ' ' + (SIM.step > 0 ? 'disabled' : '') + '><span></span>Safety buffer (10)</label>' + btn('Reset', 'rotate-ccw', 'id="simReset"', 'ghost') + btn(SIM.step >= STEPS.length ? 'Done' : 'Auto-play', 'play', 'id="simAuto" ' + (SIM.step >= STEPS.length || SIMBUSY ? 'disabled' : ''), 'primary')) +
        stepper +
        '<div class="g g-sync">' +
          '<div class="col">' +
            card('Connectors', '<div class="list">' + conn.map(function (c) {
              return '<div class="li conn"><span class="l-ic"><i data-lucide="' + (c.on === null ? 'plug' : 'plug-zap') + '"></i></span><div><b>' + c.n + '</b><small>' + c.l + ' &middot; ' + c.r + '</small></div>' + (c.on === null ? badge('Available', 'n') : c.on ? badge('Online', 'ok') : badge('Offline, ' + c.q + ' queued', 'warn')) + '</div>';
            }).join('') + '</div>') +
            '<section class="card pos-dev ' + (SIM.posOnline ? '' : 'off') + '"><div class="card-h"><h3>Square Register 2 &middot; SoHo</h3>' + (SIM.posOnline ? '<span class="live"><i></i>online</span>' : '<span class="live off"><i></i>offline</span>') + '</div>' +
              '<div class="pd-b"><div><span>POS on hand (its own view)</span><b>' + SIM.posCount + '</b></div><div><span>Offline queue</span><b>' + SIM.queue.length + '</b></div><div><span>Last seq applied</span><b class="mono">' + (SIM.step >= 5 ? 1043 : 1042) + '</b></div><div><span>Duplicates ignored</span><b>' + SIM.dups + '</b></div></div>' +
              (SIM.queue.length ? '<div class="pd-q mono">' + SIM.queue.map(function (q) { return 'seq ' + q.seq + ' &middot; SALE SKU-A x' + q.qty + '<br><small>' + q.key + '</small>'; }).join('') + '</div>' : '') + '</section>' +
          '</div>' +
          '<div class="col">' +
            '<div class="bal3"><div><span>On hand</span><b>' + b.on + '</b><small>physical stock</small></div><div><span>Reserved</span><b>' + b.res + '</b><small>open orders</small></div><div class="' + (b.av < 0 ? 'neg' : b.av === 0 ? 'zero' : '') + '"><span>Available</span><b>' + b.av + '</b><small>on hand - reserved</small></div></div>' +
            alertBox +
            card('Stock ledger &middot; SKU-A &middot; SoHo', '<div class="tw"><table class="tbl sm"><thead><tr><th>Time</th><th>Event</th><th>Loc</th><th class="r">&Delta; On hand</th><th class="r">&Delta; Res</th><th class="r">Avail</th><th>Source</th><th>Idempotency key</th></tr></thead><tbody>' + lt + '</tbody></table></div>', '<span class="mut sm">append-only</span>') +
          '</div>' +
          '<div class="col">' + '<section class="card dark console"><div class="card-h"><h3>Connector log</h3><span class="mono sm">tail -f</span></div><div class="con" id="con">' + SIM.log.map(function (l) { return '<div class="cl cl-' + l.kind + '"><span>' + clock(l.ts) + '</span>' + esc(l.text) + '</div>'; }).join('') + '</div></section>' +
            card('Why this is safe', '<ul class="why"><li><b>Movements, not totals.</b> The POS sends "-8", never "32".</li><li><b>Unique key per event.</b> Resends are no-ops.</li><li><b>Sequence numbers.</b> Gaps are held until filled.</li><li><b>Reconcile, never overwrite.</b> Mismatches become variance records.</li><li><b>Append-only.</b> Corrections are new events.</li></ul>') +
          '</div>' +
        '</div>';
    },
    mount: function () {
      var tp = $('#toPos'); if (tp) { tp.addEventListener('click', function () { setMode('pos'); }); return; }
      var con = $('#con'); if (con) con.scrollTop = con.scrollHeight;
      $$('[data-step]').forEach(function (b) { b.addEventListener('click', function () { simDo(STEPS[+b.dataset.step].id); rerender(); }); });
      $('#simReset').addEventListener('click', function () { simReset(); SIMBUSY = false; rerender(); toast('Scenario reset'); });
      var sf = $('#safety'); sf.addEventListener('change', function () { S.safety = sf.checked; toast(S.safety ? 'Safety buffer on: 10 units held back from online sales while a POS is offline' : 'Safety buffer off'); });
      $('#simAuto').addEventListener('click', function () {
        SIMBUSY = true; rerender();
        (function nxt() {
          if (S.page !== 'sync') { SIMBUSY = false; return; }
          if (SIM.step >= STEPS.length) { SIMBUSY = false; rerender(); return; }
          simDo(STEPS[SIM.step].id); rerender();
          later(nxt, 1500);
        })();
      });
      var rt = $('#rsTrf'); if (rt) rt.addEventListener('click', function () { simResolve('transfer'); rerender(); toast('Transfer created. SoHo covered.'); });
      if (S.autoPlay) { S.autoPlay = false; if (SIM.step === 0) later(function () { var b = $('#simAuto'); if (b) b.click(); }, 700); }
      var rbo = $('#rsBo'); if (rbo) rbo.addEventListener('click', function () { simResolve('backorder'); rerender(); toast('Backorder created. Customer notified.'); });
    },
  };

  /* ---------- REPORTS ---------- */
  var REP = { days: 14 };
  P.reports = {
    render: function () {
      var s = D.sales.slice(-REP.days), tot = s.reduce(function (a, d) { return a + d.pos + d.web + d.app; }, 0);
      return head(t('reports'), 'Sales, stock value and sell-through across locations and channels.', '<div class="seg">' + [7, 14].map(function (d) { return '<button data-days="' + d + '" class="' + (REP.days === d ? 'on' : '') + '">' + d + ' days</button>'; }).join('') + '</div>' + btn('Export', 'download', 'id="rExp"', 'ghost')) +
        '<div class="kpis">' + kpi('Net sales', money(tot), '+11.2% vs prior period', 'dollar-sign', 'up') + kpi('Gross margin', '64.8%', '+0.6 pts', 'percent', 'up') + kpi('Avg basket', money(71.4, 2), 'Store ' + money(64, 2) + ' &middot; Online ' + money(83, 2), 'shopping-basket') + kpi('Sell-through', '41%', '28-day, all locations', 'gauge') + '</div>' +
        '<div class="g g-21">' + card('Sales by channel', '<div class="ch-h"><canvas id="rLine"></canvas></div>') + card('Stock value by location', '<div class="ch-h"><canvas id="rDough"></canvas></div>') + '</div>' +
        '<div class="g g-11">' + card('Sales by location', '<div class="ch-h sm"><canvas id="rLoc"></canvas></div>') + card('Top sellers, units', '<div class="ch-h sm"><canvas id="rTop"></canvas></div>') + '</div>';
    },
    mount: function () {
      var s = D.sales.slice(-REP.days), lab = s.map(function (d) { return d.day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }), R = RATES[S.cur];
      var tick = { callback: function (v) { return money(v / R); } };
      chart('rLine', { type: 'line', data: { labels: lab, datasets: [
        { label: S.mode === 'pos' ? 'Store POS' : 'Store register', data: s.map(function (d) { return d.pos * R; }), borderColor: C.teal, backgroundColor: 'rgba(13,148,136,.08)', fill: true, tension: .35, pointRadius: 0, borderWidth: 2.5 },
        { label: 'Web', data: s.map(function (d) { return d.web * R; }), borderColor: C.blue, tension: .35, pointRadius: 0, borderWidth: 2.5 },
        { label: 'App', data: s.map(function (d) { return d.app * R; }), borderColor: C.violet, tension: .35, pointRadius: 0, borderWidth: 2.5 }] },
        options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { grid: GRID, ticks: tick } } } });
      var B = balances(), val = D.locations.map(function (l) { return D.variants.reduce(function (a, v) { return a + Math.max(0, B(v.sku, l.id).on) * v.cost; }, 0) * R; });
      chart('rDough', { type: 'doughnut', data: { labels: D.locations.map(function (l) { return l.short; }), datasets: [{ data: val, backgroundColor: [C.slate, C.teal, C.blue, C.violet], borderWidth: 0 }] },
        options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: function (c) { return c.label + ': ' + money(c.raw / R); } } } } } });
      chart('rLoc', { type: 'bar', data: { labels: ['SoHo', 'Brooklyn', 'Jersey City', 'Online'], datasets: [{ label: 'Net sales', data: [41200, 28900, 17600, 52300].map(function (x) { return x * R * REP.days / 14; }), backgroundColor: [C.teal, C.blue, C.violet, '#93c5fd'], borderRadius: 6 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: GRID, ticks: tick } } } });
      chart('rTop', { type: 'bar', data: { labels: ['Classic Crew Tee', 'Heavyweight Hoodie', 'Canvas Tote', 'Merino Sweater', 'Everyday Sneaker'], datasets: [{ label: 'Units', data: [412, 236, 198, 174, 151].map(function (x) { return Math.round(x * REP.days / 14); }), backgroundColor: C.teal, borderRadius: 6 }] },
        options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: GRID }, y: { grid: { display: false } } } } });
      $$('[data-days]').forEach(function (b) { b.addEventListener('click', function () { REP.days = +b.dataset.days; rerender(); }); });
      $('#rExp').addEventListener('click', function () { toast('Report exported (CSV, XLSX)'); });
    },
  };

  /* ---------- AUDIT ---------- */
  var AUD = { f: 'All' };
  function auditRows() {
    var led = D.ledger.filter(function (e) { return e.type !== 'OPENING'; }).slice(-30).map(function (e) {
      return { ts: e.ts, user: e.user, role: e.src, action: e.type.replace('_', ' '), detail: e.sku + ' at ' + loc(e.loc).short + ': on hand ' + (e.dOn >= 0 ? '+' : '') + e.dOn + ', reserved ' + (e.dRes >= 0 ? '+' : '') + e.dRes + (e.ref ? ' (' + e.ref + ')' : ''), type: 'Inventory' };
    });
    return D.audit.concat(led).sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
  }
  P.audit = {
    render: function () {
      var rows = auditRows().filter(function (r) { return AUD.f === 'All' || r.type === AUD.f; });
      return head(t('audit'), 'Append-only audit trail of logins, changes, stock movements and connector activity.', btn('Export CSV', 'download', 'id="aExp"', 'primary')) +
        '<div class="kpis">' + kpi('Events (24 h)', num(rows.length + 3184), 'Retained 7 years', 'scroll-text') + kpi('Failed logins', '3', '1 account locked', 'shield-alert', 'warn') + kpi('MFA coverage', '100%', 'Owners and managers', 'key-round', 'up') + kpi('Open variances', '0', 'Last reconciliation 1 h ago', 'scale', 'up') + '</div>' +
        '<div class="filters">' + ['All', 'Security', 'Sync', 'Inventory', 'Catalog'].map(function (c) { return '<button class="chip ' + (AUD.f === c ? 'on' : '') + '" data-af="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
        card('Audit log', '<div class="tw"><table class="tbl"><thead><tr><th>Time</th><th>Type</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody>' + rows.slice(0, 40).map(function (r) {
          return '<tr><td class="mono sm">' + rel(r.ts) + '</td><td>' + badge(r.type, { Security: 'rose', Sync: 'teal', Inventory: 'blue', Catalog: 'violet' }[r.type]) + '</td><td><b>' + esc(r.user) + '</b><small class="mut"> ' + esc(r.role) + '</small></td><td>' + esc(r.action) + '</td><td class="mut">' + esc(r.detail) + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    },
    mount: function () {
      $$('[data-af]').forEach(function (b) { b.addEventListener('click', function () { AUD.f = b.dataset.af; rerender(); }); });
      $('#aExp').addEventListener('click', function () {
        var csv = 'time,type,user,role,action,detail\n' + auditRows().map(function (r) { return [r.ts, r.type, r.user, r.role, r.action, r.detail].map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'audit-log.csv'; a.click();
        toast('audit-log.csv downloaded');
      });
    },
  };

  /* ---------- SUPER ADMIN ---------- */
  P.admin = {
    render: function () {
      var mrr = D.tenants.reduce(function (a, x) { return a + x.mrr; }, 0), locs = D.tenants.reduce(function (a, x) { return a + x.locs; }, 0);
      return head(t('admin'), 'Platform view across all merchants: tenants, plans, connectors and health.', btn('Create tenant', 'plus', 'id="newT"', 'primary')) +
        '<div class="kpis">' + kpi('Tenants', D.tenants.length, D.tenants.filter(function (x) { return x.status !== 'Active'; }).length + ' onboarding or trial', 'building-2') + kpi('Locations', locs, 'Across US, CA, MX', 'map-pin') + kpi('MRR', money(mrr), '+14% month over month', 'trending-up', 'up') + kpi('API p95 / uptime', '84 ms', '99.98% last 30 days', 'activity', 'up') + '</div>' +
        '<div class="g g-21">' + card('Tenants', '<div class="tw"><table class="tbl"><thead><tr><th>Tenant</th><th>Plan</th><th class="r">Locations</th><th>Mode</th><th>POS</th><th>Region</th><th class="r">MRR</th><th>Status</th></tr></thead><tbody>' + D.tenants.map(function (x) {
          return '<tr><td><b>' + esc(x.name) + '</b></td><td>' + x.plan + '</td><td class="r">' + x.locs + '</td><td>' + badge(x.mode, x.mode === 'Standalone' ? 'n' : x.mode === 'Mixed' ? 'violet' : 'teal') + '</td><td class="sm">' + x.pos + '</td><td class="mono sm">' + x.region + '</td><td class="r">' + money(x.mrr) + '</td><td>' + badge(x.status, x.status === 'Active' ? 'ok' : 'amber') + '</td></tr>';
        }).join('') + '</tbody></table></div>') +
        '<div class="col">' + card('Connector usage', '<div class="bars">' + [['Square', 4, 1284], ['Clover', 2, 906], ['Lightspeed', 2, 2210]].map(function (c) { return '<div class="bar-r"><span>' + c[0] + '</span><div class="prog"><i style="width:' + Math.round(c[2] / 2210 * 100) + '%"></i></div><small>' + c[1] + ' tenants &middot; ' + num(c[2]) + ' events/h</small></div>'; }).join('') + '</div>') +
        card('Platform health', '<div class="health">' + [['API gateway', 'Healthy', 'ok'], ['Event bus lag', '1.2 s', 'ok'], ['Dead-letter queue', '0 messages', 'ok'], ['Database CPU', '31%', 'ok'], ['Last backup', '42 min ago, verified', 'ok']].map(function (h) { return '<div><span>' + h[0] + '</span>' + badge(h[1], h[2]) + '</div>'; }).join('') + '</div>') + '</div></div>';
    },
    mount: function () {
      $('#newT').addEventListener('click', function () {
        openModal('Create tenant', '<label>Merchant name<input name="n" value="Bayside Goods"></label><div class="row2"><label>Plan<select name="p"><option>Starter</option><option selected>Growth</option><option>Enterprise</option></select></label><label>Operating model<select name="m"><option>Standalone</option><option>POS-Integrated</option><option>Mixed</option></select></label></div><div class="row2"><label>Region<select name="r"><option>US-East</option><option>US-West</option><option>CA-Central</option><option>MX-Central</option></select></label><label>Default currency<select name="c"><option>USD</option><option>CAD</option><option>MXN</option></select></label></div><p class="hint">Creates an isolated tenant: row-level security policies, owner invite, default roles and a sandbox API key.</p>', 'Create tenant', function (f) {
          D.tenants.unshift({ name: f.get('n'), plan: f.get('p'), locs: 1, mode: f.get('m'), pos: '-', status: 'Onboarding', mrr: 0, region: f.get('r') });
          toast(f.get('n') + ' created. Owner invite sent.'); rerender();
        });
      });
    },
  };

  /* ---------- SETTINGS ---------- */
  var SET = { tab: 'glob' };
  P.settings = {
    render: function () {
      var tabs = '<div class="tabs">' + [['glob', 'Globalization'], ['roles', 'Roles and permissions'], ['api', 'API and webhooks']].map(function (x) { return '<button data-st="' + x[0] + '" class="' + (SET.tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
      var body;
      if (SET.tab === 'glob') {
        body = '<div class="g g-11">' + card('Currency and language', '<label class="fl">Display currency<select id="sCur" class="sel">' + Object.keys(RATES).map(function (c) { return '<option ' + (S.cur === c ? 'selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label><label class="fl">Language<select id="sLang" class="sel">' + [['en', 'English'], ['es', 'Espanol'], ['fr', 'Francais']].map(function (l) { return '<option value="' + l[0] + '" ' + (S.lang === l[0] ? 'selected' : '') + '>' + l[1] + '</option>'; }).join('') + '</select></label><div class="hint">Prices are stored in each tenant\'s base currency with per-market price lists. Example: Classic Crew Tee = ' + money(28, 2) + '</div>') +
          card('Locations, time zones and tax', '<div class="tw"><table class="tbl"><thead><tr><th>Location</th><th>Time zone</th><th class="r">Sales tax</th><th>Units</th></tr></thead><tbody>' + D.locations.map(function (l) { return '<tr><td>' + l.name + '</td><td class="mono sm">' + l.tz + '</td><td class="r">' + l.tax + '%</td><td>Imperial</td></tr>'; }).join('') + '<tr><td class="mut">Toronto (planned)</td><td class="mono sm">America/Toronto</td><td class="r">13% HST</td><td>Metric</td></tr><tr><td class="mut">Mexico City (planned)</td><td class="mono sm">America/Mexico_City</td><td class="r">16% IVA</td><td>Metric</td></tr></tbody></table></div>') + '</div>';
      } else if (SET.tab === 'roles') {
        var perms = ['View sales', 'Process returns', 'Adjust stock', 'Approve transfers', 'Edit prices', 'Manage users', 'Connector settings'];
        var roles = [['Owner', [1, 1, 1, 1, 1, 1, 1]], ['Store manager', [1, 1, 1, 1, 0, 0, 0]], ['Associate', [1, 1, 0, 0, 0, 0, 0]], ['Warehouse', [0, 0, 1, 1, 0, 0, 0]], ['Driver', [0, 0, 0, 0, 0, 0, 0]]];
        body = card('Role matrix', '<div class="tw"><table class="tbl matrix"><thead><tr><th>Permission</th>' + roles.map(function (r) { return '<th class="c">' + r[0] + '</th>'; }).join('') + '</tr></thead><tbody>' + perms.map(function (p, i) { return '<tr><td>' + p + '</td>' + roles.map(function (r) { return '<td class="c">' + (r[1][i] ? '<i data-lucide="check" class="okc"></i>' : '<span class="mut">-</span>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>', '<span class="mut sm">Scoped per tenant and per location. MFA required for Owner and Store manager.</span>');
      } else {
        body = '<div class="g g-11">' + card('API keys', '<div class="list">' + [['Production', 'rk_live_****************8f2a', 'Created Sep 2'], ['Sandbox', 'rk_test_****************c41d', 'Created Aug 14'], ['Square connector', 'conn_sq_************91be', 'Scope: inventory, sales']].map(function (k) { return '<div class="li"><span class="l-ic"><i data-lucide="key-round"></i></span><div><b>' + k[0] + '</b><small class="mono">' + k[1] + '</small></div><button class="btn xs ghost" data-rot>Rotate</button></div>'; }).join('') + '</div>') +
          card('Webhooks', '<div class="list">' + [['inventory.changed', 'https://erp.example.com/hooks/stock', '99.9% delivered'], ['order.created', 'https://crm.example.com/hooks/orders', '100% delivered'], ['oversell.detected', 'Slack #store-ops', '100% delivered']].map(function (w) { return '<div class="li"><span class="l-ic"><i data-lucide="webhook"></i></span><div><b class="mono">' + w[0] + '</b><small>' + w[1] + '</small></div>' + badge(w[2], 'ok') + '</div>'; }).join('') + '</div><div class="hint">Signed with HMAC-SHA256. Retries with backoff for 24 hours, then dead-letter.</div>') + '</div>';
      }
      return head(t('settings'), 'Currency, language, time zones, tax, roles and integrations.', '') + tabs + body;
    },
    mount: function () {
      $$('[data-st]').forEach(function (b) { b.addEventListener('click', function () { SET.tab = b.dataset.st; rerender(); }); });
      var c = $('#sCur'); if (c) c.addEventListener('change', function () { setCur(c.value); });
      var l = $('#sLang'); if (l) l.addEventListener('change', function () { setLang(l.value); });
      $$('[data-rot]').forEach(function (b) { b.addEventListener('click', function () { toast('Key rotated. Old key valid for 24 hours.'); }); });
    },
  };

  /* ================= ROUTER + GLOBAL CONTROLS ================= */
  function cleanup() {
    S.charts.forEach(function (c) { c.destroy(); }); S.charts = [];
    if (S.net) { S.net.destroy(); S.net = null; }
    S.timers.forEach(function (id) { clearInterval(id); clearTimeout(id); }); S.timers = [];
  }
  function render() {
    cleanup();
    renderNav();
    $('#view').innerHTML = '<div class="pg">' + P[S.page].render() + '</div>';
    if (P[S.page].mount) P[S.page].mount();
    icons();
  }
  function rerender() { var y = window.scrollY; render(); window.scrollTo(0, y); }
  function route() {
    var r = (location.hash.replace(/^#\/?/, '') || 'overview').split('?')[0];
    S.page = P[r] ? r : 'overview';
    if (/[?&]play/.test(location.hash)) S.autoPlay = true;
    closeDrawer(); closeModal(); document.body.classList.remove('nav-open');
    render(); window.scrollTo(0, 0);
  }
  function setMode(m) {
    S.mode = m;
    $$('#modeSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === m); });
    toast(m === 'pos' ? 'POS-Integrated Mode: Square (SoHo) and Clover (Brooklyn) connected' : 'Standalone Mode: every store uses the built-in register');
    rerender();
  }
  function setCur(c) { S.cur = c; $('#curSel').value = c; rerender(); }
  function setLang(l) { S.lang = l; $('#langSel').value = l; document.documentElement.lang = l; rerender(); }

  function init() {
    $('#locSel').innerHTML = '<option value="ALL">All locations</option>' + D.locations.map(function (l) { return '<option value="' + l.id + '">' + l.short + '</option>'; }).join('');
    $('#locSel').addEventListener('change', function (e) { S.loc = e.target.value; rerender(); });
    $('#curSel').addEventListener('change', function (e) { setCur(e.target.value); });
    $('#langSel').addEventListener('change', function (e) { setLang(e.target.value); });
    $$('#modeSeg button').forEach(function (b) { b.addEventListener('click', function () { if (S.mode !== b.dataset.mode) setMode(b.dataset.mode); }); });
    $('#menuBtn').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    $('#drawerBg').addEventListener('click', closeDrawer);
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeDrawer();
      if (e.target.closest('[data-mclose]') || e.target.id === 'modalBg') closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); closeModal(); }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('#q').focus(); }
    });
    $('#q').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var v = e.target.value.trim().toLowerCase(); if (!v) return;
      var ord = D.orders.filter(function (o) { return o.id.toLowerCase() === v; })[0];
      if (ord) { location.hash = '#/orders'; setTimeout(function () { orderDrawer(ord.id); }, 60); return; }
      var cu = D.customers.filter(function (c) { return c.name.toLowerCase().indexOf(v) > -1; })[0];
      if (cu && !D.variants.some(function (x) { return (x.sku + x.name + x.barcode).toLowerCase().indexOf(v) > -1; })) { location.hash = '#/customers'; toast('Customer found: ' + cu.name); return; }
      INV.q = e.target.value.trim(); INV.tab = 'stock';
      if (location.hash === '#/inventory') rerender(); else location.hash = '#/inventory';
    });
    $('#bellBtn').addEventListener('click', function () {
      var low = lowStock();
      openDrawer('<div class="d-h"><span class="l-ic big"><i data-lucide="bell"></i></span><div><small>Notifications</small><h2>Alerts</h2></div></div><div class="d-sec">' +
        (SIM.alert ? '<div class="li"><span class="l-ic neg"><i data-lucide="triangle-alert"></i></span><div><b>Oversell on SKU-A at SoHo</b><small>Resolve in POS Connectors</small></div></div>' : '') +
        (!SIM.posOnline ? '<div class="li"><span class="l-ic warn"><i data-lucide="wifi-off"></i></span><div><b>Square SoHo offline</b><small>Sales queueing locally</small></div></div>' : '') +
        '<div class="li"><span class="l-ic warn"><i data-lucide="package"></i></span><div><b>' + low.length + ' low-stock alerts</b><small>Suggested transfers ready in Purchasing</small></div></div>' +
        '<div class="li"><span class="l-ic"><i data-lucide="truck"></i></span><div><b>2 deliveries unassigned</b><small>Window 4-6 PM, SoHo</small></div></div></div>');
    });
    window.addEventListener('hashchange', route);
    route();
  }
  init();
})();
