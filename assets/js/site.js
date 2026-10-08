(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hero video scenes ---------- */
  var MIX = 'https://assets.mixkit.co/videos/';
  var scenes = [
    { id: 33167, t: 'Catalog & variants',  s: 'SKU, barcode, size, colour' },
    { id: 15914, t: 'POS checkout',        s: 'Sales arrive as events' },
    { id: 4705,  t: 'Warehouse & WMS',     s: 'Bins, counts, receiving' },
    { id: 20770, t: 'Fulfillment',         s: 'Pick, pack, ship, BOPIS' },
    { id: 31998, t: 'Local delivery',      s: 'Driver App, proof of delivery' },
    { id: 23282, t: 'Cloud core',          s: 'One ledger, every channel' },
  ];
  var media = $('#heroMedia'), strip = $('#scenes');
  if (media && strip) {
    var vids = scenes.map(function (sc, i) {
      var v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.loop = true; v.preload = i < 2 ? 'auto' : 'none';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.src = MIX + sc.id + '/' + sc.id + '-720.mp4';
      v.className = 'hv' + (i === 0 ? ' on' : '');
      media.appendChild(v);
      var b = document.createElement('button');
      b.className = 'scene' + (i === 0 ? ' on' : '');
      b.innerHTML = '<em>0' + (i + 1) + '</em><b>' + sc.t + '</b><span>' + sc.s + '</span><i><u></u></i>';
      b.addEventListener('click', function () { go(i, true); });
      strip.appendChild(b);
      return v;
    });
    var btns = $$('.scene', strip), cur = 0, timer, DUR = 6000;
    function go(i, manual) {
      var prev = vids[cur];
      cur = i;
      vids.forEach(function (v, k) { v.classList.toggle('on', k === i); });
      btns.forEach(function (b, k) { b.classList.toggle('on', k === i); b.classList.remove('run'); });
      var v = vids[i];
      try { v.currentTime = 0; } catch (e) {}
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      setTimeout(function () { if (prev !== v) prev.pause(); }, 900);
      var nx = vids[(i + 1) % vids.length]; if (nx.preload === 'none') { nx.preload = 'auto'; nx.load(); }
      void btns[i].offsetWidth; btns[i].classList.add('run');
      clearTimeout(timer);
      if (!reduce) timer = setTimeout(function () { go((cur + 1) % vids.length); }, DUR);
    }
    go(0);
  }

  /* ---------- modules ---------- */
  var MODS = [
    ['layout-dashboard', 'Merchant Portal', 'Live KPIs, stock alerts, sync health', 'overview'],
    ['building-2', 'Multi-tenant backend & APIs', 'Tenant isolation, roles, REST + webhooks', 'admin'],
    ['tags', 'Catalog & variants', 'SKU, barcode, attributes, variants', 'catalog'],
    ['boxes', 'Multi-location inventory', 'On hand, reserved, available per location', 'inventory'],
    ['arrow-left-right', 'Transfers', 'Between stores and the warehouse', 'inventory'],
    ['warehouse', 'Warehouse / WMS', 'Bins, pick waves, cycle counts', 'warehouse'],
    ['clipboard-list', 'Purchasing & receiving', 'POs, partial receipts, suppliers', 'purchasing'],
    ['refresh-ccw', 'Replenishment', 'Reorder points, suggested POs', 'purchasing'],
    ['shopping-cart', 'Omnichannel orders', 'Ship, BOPIS, local delivery, in-store', 'orders'],
    ['credit-card', 'Online payments', 'Stripe hosted fields, refunds', 'orders'],
    ['users', 'Customers & loyalty', 'Profiles, tiers, points', 'customers'],
    ['badge-percent', 'Promotions', 'Rules, schedules, channels', 'promotions'],
    ['undo-2', 'Returns', 'RMA, restock or write-off', 'returns'],
    ['globe', 'Branded storefront & apps', 'Web, iOS, Android', 'channels'],
    ['truck', 'Driver App & delivery', 'Dispatch, routes, proof of delivery', 'delivery'],
    ['plug-zap', 'POS Connector Framework', 'Offline replay, idempotency, reconciliation', 'sync'],
    ['bar-chart-3', 'Reporting', 'Sales, stock value, sell-through', 'reports'],
    ['shield-check', 'Security & audit', 'Append-only audit, login tracking', 'audit'],
    ['crown', 'Super Admin Portal', 'Tenants, plans, platform health', 'admin'],
    ['languages', 'Globalization', 'Currency, language, time zone, tax', 'settings'],
  ];
  var mods = $('#mods');
  if (mods) {
    mods.innerHTML = MODS.map(function (m, i) {
      return '<a class="mod tilt reveal" style="--d:' + (i % 4) * 60 + 'ms" href="app.html#/' + m[3] + '">' +
        '<span class="mod-i"><i data-lucide="' + m[0] + '"></i></span><b>' + m[1] + '</b><span>' + m[2] + '</span><em>Open <i data-lucide="arrow-up-right"></i></em></a>';
    }).join('');
  }

  /* ---------- ledger replay ---------- */
  var rows = [
    { k: 'RESERVE', s: 'Web order W-10482', q: '+10 res', on: 40, res: 35 },
    { k: 'ADJUST',  s: 'M. Rivera, damaged', q: '-2', on: 38, res: 35 },
    { k: 'SALE',    s: 'Square txn 88213 (replayed)', q: '-8', on: 30, res: 35 },
    { k: 'DUP',     s: 'Square txn 88213 resent', q: 'ignored', on: 30, res: 35 },
  ];
  var lc = $('#ledgerCard'), lcRows = $('#lcRows'), started = false;
  function setBal(on, res) {
    $('#lcOn').textContent = on; $('#lcRes').textContent = res;
    var av = on - res, el = $('#lcAv');
    el.textContent = av; el.classList.toggle('neg', av < 0);
  }
  function runLedger() {
    lcRows.innerHTML = ''; setBal(40, 25); lc.classList.remove('alert');
    rows.forEach(function (r, i) {
      setTimeout(function () {
        var d = document.createElement('div');
        d.className = 'lc-row k-' + r.k.toLowerCase();
        d.innerHTML = '<span class="mono">' + r.k + '</span><span>' + r.s + '</span><b class="mono">' + r.q + '</b>';
        lcRows.appendChild(d);
        setBal(r.on, r.res);
        if (i === 2) lc.classList.add('alert');
      }, 700 + i * 1100);
    });
    setTimeout(runLedger, 700 + rows.length * 1100 + 4200);
  }
  if (lc) {
    new IntersectionObserver(function (en, o) {
      if (en[0].isIntersecting && !started) { started = true; runLedger(); o.disconnect(); }
    }, { threshold: 0.35 }).observe(lc);
  }

  /* ---------- 3D stack ---------- */
  var stack = $('#stack3d');
  $$('#stackList button').forEach(function (b) {
    function on() {
      $$('#stackList button').forEach(function (x) { x.classList.toggle('on', x === b); });
      $$('.plane', stack).forEach(function (p) { p.classList.toggle('lit', p.classList.contains('p' + b.dataset.l)); });
    }
    b.addEventListener('mouseenter', on); b.addEventListener('click', on);
  });
  if (stack) {
    $$('.plane', stack).forEach(function (p) { if (p.classList.contains('p0')) p.classList.add('lit'); });
    new IntersectionObserver(function (en) { stack.classList.toggle('open', en[0].isIntersecting); }, { threshold: 0.3 }).observe(stack);
  }

  /* ---------- tilt ---------- */
  function bindTilt(el) {
    if (reduce) return;
    var max = el.classList.contains('mod') ? 6 : 9;
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', (-y * max).toFixed(2) + 'deg');
      el.style.setProperty('--ry', (x * max).toFixed(2) + 'deg');
      el.style.setProperty('--mx', ((x + 0.5) * 100).toFixed(1) + '%');
      el.style.setProperty('--my', ((y + 0.5) * 100).toFixed(1) + '%');
    });
    el.addEventListener('pointerleave', function () { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  }

  /* ---------- reveal + nav ---------- */
  function init() {
    if (window.lucide) window.lucide.createIcons();
    $$('.tilt').forEach(bindTilt);
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
    var nav = $('#nav');
    var onScroll = function () { nav.classList.toggle('solid', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
