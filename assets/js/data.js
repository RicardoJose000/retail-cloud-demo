// Sample data for the demo. Fictional merchant, fictional people.
(function () {
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function ri(a, b) { return Math.floor(a + rnd() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }

  var NOW = new Date();
  function ago(min) { return new Date(NOW.getTime() - min * 60000).toISOString(); }

  var locations = [
    { id: 'WH-NJ', name: 'Newark Distribution Center', short: 'Newark DC', type: 'Warehouse', city: 'Newark, NJ', tz: 'America/New_York', pos: null, tax: 6.625 },
    { id: 'ST-SOHO', name: 'SoHo Flagship', short: 'SoHo', type: 'Store', city: 'New York, NY', tz: 'America/New_York', pos: 'Square', reg: 'Register 2', tax: 8.875 },
    { id: 'ST-BKLYN', name: 'Williamsburg', short: 'Brooklyn', type: 'Store', city: 'Brooklyn, NY', tz: 'America/New_York', pos: 'Clover', reg: 'Station 1', tax: 8.875 },
    { id: 'ST-JC', name: 'Jersey City', short: 'Jersey City', type: 'Store', city: 'Jersey City, NJ', tz: 'America/New_York', pos: null, tax: 6.625 },
  ];

  var products = [
    { id: 'P-100', name: 'Classic Crew Tee', cat: 'Apparel', color: '#111827', price: 28, cost: 9.5, attrs: { Material: '100% organic cotton', Fit: 'Regular', Care: 'Machine wash cold' },
      variants: [['HP-TEE-BLK-S', 'Black / S'], ['SKU-A', 'Black / M'], ['HP-TEE-BLK-L', 'Black / L'], ['HP-TEE-WHT-M', 'White / M'], ['HP-TEE-NVY-M', 'Navy / M']] },
    { id: 'P-110', name: 'Merino Crew Sweater', cat: 'Apparel', color: '#7c5c3b', price: 98, cost: 34, attrs: { Material: 'Extra-fine merino', Fit: 'Relaxed', Care: 'Hand wash' },
      variants: [['HP-SWT-OAT-M', 'Oatmeal / M'], ['HP-SWT-CHR-M', 'Charcoal / M'], ['HP-SWT-CHR-L', 'Charcoal / L']] },
    { id: 'P-120', name: 'Heavyweight Hoodie', cat: 'Apparel', color: '#1f2937', price: 78, cost: 26, attrs: { Material: '450 gsm fleece', Fit: 'Boxy', Care: 'Machine wash cold' },
      variants: [['HP-HOD-BLK-M', 'Black / M'], ['HP-HOD-FST-L', 'Forest / L']] },
    { id: 'P-130', name: 'Selvedge Denim Jean', cat: 'Apparel', color: '#1e3a8a', price: 128, cost: 44, attrs: { Material: '13.5 oz selvedge denim', Fit: 'Straight', Origin: 'Made in USA' },
      variants: [['HP-DNM-3232', '32 x 32'], ['HP-DNM-3432', '34 x 32']] },
    { id: 'P-140', name: 'Canvas Tote', cat: 'Accessories', color: '#a8a29e', price: 42, cost: 12, attrs: { Material: '18 oz waxed canvas', Size: '16 x 14 x 5 in' },
      variants: [['HP-TOT-NAT', 'Natural'], ['HP-TOT-NVY', 'Navy']] },
    { id: 'P-150', name: 'Wool Beanie', cat: 'Accessories', color: '#9a3412', price: 32, cost: 8, attrs: { Material: 'Lambswool blend', Size: 'One size' },
      variants: [['HP-BNE-CHR', 'Charcoal'], ['HP-BNE-RST', 'Rust']] },
    { id: 'P-160', name: 'Leather Card Wallet', cat: 'Accessories', color: '#92400e', price: 55, cost: 17, attrs: { Material: 'Full-grain leather', Slots: '4' },
      variants: [['HP-WAL-TAN', 'Tan'], ['HP-WAL-BLK', 'Black']] },
    { id: 'P-170', name: 'Everyday Sneaker', cat: 'Footwear', color: '#e5e7eb', price: 110, cost: 39, attrs: { Upper: 'Canvas', Sole: 'Natural rubber' },
      variants: [['HP-SNK-09', 'US 9'], ['HP-SNK-10', 'US 10'], ['HP-SNK-11', 'US 11']] },
    { id: 'P-180', name: 'Insulated Bottle 20 oz', cat: 'Home', color: '#65a30d', price: 36, cost: 11, attrs: { Material: 'Stainless steel', Keeps: 'Cold 24h / hot 12h' },
      variants: [['HP-BTL-SGE', 'Sage'], ['HP-BTL-STN', 'Stone']] },
    { id: 'P-190', name: 'Cedar Soy Candle', cat: 'Home', color: '#57534e', price: 24, cost: 6, attrs: { Burn: '50 hours', Wax: 'Soy' },
      variants: [['HP-CND-CDR', 'Cedar 8 oz']] },
  ];

  var variants = [];
  products.forEach(function (p) {
    p.variants = p.variants.map(function (v, i) {
      var bc = '0840' + String(ri(1000000, 9999999)) + String(i);
      var o = { sku: v[0], opt: v[1], barcode: bc.slice(0, 12), product: p.id, name: p.name, price: p.price, cost: p.cost, color: p.color, cat: p.cat, rop: ri(6, 14) };
      variants.push(o);
      return o;
    });
  });

  // ledger: opening balances
  var ledger = [], eid = 1000;
  function ev(o) { o.id = 'EV-' + (eid++); o.ts = o.ts || new Date().toISOString(); ledger.push(o); return o; }
  variants.forEach(function (v) {
    locations.forEach(function (l) {
      var q = l.type === 'Warehouse' ? ri(60, 220) : ri(4, 34);
      if (v.sku === 'SKU-A' && l.id === 'ST-SOHO') q = 40;
      if (v.sku === 'HP-TOT-NVY' && l.id !== 'WH-NJ') q = ri(1, 4);
      if (v.sku === 'HP-SNK-10' && l.id === 'ST-BKLYN') q = 2;
      ev({ ts: ago(60 * 24 * 3 + ri(0, 600)), sku: v.sku, loc: l.id, type: 'OPENING', dOn: q, dRes: 0, src: 'Migration', ref: 'Opening balance', user: 'system' });
    });
  });

  var firstNames = ['Jordan', 'Maya', 'Luis', 'Priya', 'Ethan', 'Grace', 'Omar', 'Hannah', 'Kenji', 'Sofia', 'Marcus', 'Ava', 'Daniel', 'Chloe', 'Andre', 'Nina'];
  var lastNames = ['Alvarez', 'Chen', 'Brooks', 'Patel', 'Morgan', 'Kim', 'Haddad', 'Wright', 'Sato', 'Rossi', 'Bell', 'Nguyen', 'Price', 'Dubois', 'Grant', 'Kowalski'];
  var customers = firstNames.map(function (f, i) {
    var pts = ri(120, 4200);
    return { id: 'C-' + (3101 + i), name: f + ' ' + lastNames[i], email: f.toLowerCase() + '.' + lastNames[i].toLowerCase() + '@example.com',
      tier: pts > 3000 ? 'Gold' : pts > 1200 ? 'Silver' : 'Bronze', points: pts, orders: ri(2, 28), ltv: ri(180, 4800), store: pick(['SoHo', 'Brooklyn', 'Jersey City', 'Online']), since: 2021 + ri(0, 4) };
  });

  // orders
  var ORDER_SPECS = [
    ['W-10471', 'Web', 'Ship', 'Picking', 'ST-SOHO', [['SKU-A', 10]], 0],
    ['A-2231', 'App', 'BOPIS', 'Ready for pickup', 'ST-SOHO', [['SKU-A', 8]], 1],
    ['W-10476', 'Web', 'Local delivery', 'New', 'ST-SOHO', [['SKU-A', 7]], 2],
    ['W-10478', 'Web', 'Ship', 'Shipped', 'WH-NJ', [['HP-SWT-CHR-M', 1], ['HP-BNE-RST', 1]], 3],
    ['P-58810', 'POS', 'In-store', 'Completed', 'ST-BKLYN', [['HP-HOD-BLK-M', 1]], 4],
    ['A-2236', 'App', 'Local delivery', 'Out for delivery', 'ST-BKLYN', [['HP-SNK-10', 1]], 5],
    ['W-10480', 'Web', 'BOPIS', 'New', 'ST-JC', [['HP-TOT-NAT', 2]], 6],
    ['P-58815', 'POS', 'In-store', 'Completed', 'ST-SOHO', [['HP-WAL-TAN', 1], ['HP-TEE-WHT-M', 2]], 7],
    ['W-10481', 'Web', 'Ship', 'Picking', 'WH-NJ', [['HP-DNM-3232', 1]], 8],
    ['A-2240', 'App', 'Ship', 'Packed', 'WH-NJ', [['HP-BTL-SGE', 2], ['HP-CND-CDR', 1]], 9],
    ['P-58819', 'POS', 'In-store', 'Completed', 'ST-JC', [['HP-BNE-CHR', 1]], 10],
    ['W-10483', 'Web', 'Local delivery', 'New', 'ST-SOHO', [['HP-SWT-OAT-M', 1]], 11],
    ['A-2242', 'App', 'BOPIS', 'Picking', 'ST-BKLYN', [['HP-TEE-NVY-M', 1], ['HP-TOT-NVY', 1]], 12],
    ['W-10485', 'Web', 'Ship', 'New', 'WH-NJ', [['HP-SNK-11', 1]], 13],
  ];
  var vmap = {}; variants.forEach(function (v) { vmap[v.sku] = v; });
  var orders = ORDER_SPECS.map(function (s, i) {
    var items = s[5].map(function (it) { return { sku: it[0], qty: it[1], price: vmap[it[0]].price }; });
    var sub = items.reduce(function (a, b) { return a + b.qty * b.price; }, 0);
    var o = { id: s[0], channel: s[1], fulfil: s[2], status: s[3], loc: s[4], items: items, customer: customers[(i * 3) % customers.length].name,
      total: sub, placed: ago(20 + i * 47), payment: s[1] === 'POS' ? (s[4] === 'ST-BKLYN' ? 'Clover terminal' : s[4] === 'ST-SOHO' ? 'Square terminal' : 'Built-in register') : 'Stripe, Visa 4242' };
    var open = ['Completed', 'Shipped'].indexOf(o.status) === -1;
    items.forEach(function (it) {
      if (open && o.channel !== 'POS') ev({ ts: o.placed, sku: it.sku, loc: o.loc, type: 'RESERVE', dOn: 0, dRes: it.qty, src: o.channel === 'App' ? 'Mobile app' : 'Web store', ref: o.id, user: 'system' });
      if (!open) ev({ ts: o.placed, sku: it.sku, loc: o.loc, type: o.channel === 'POS' ? 'SALE' : 'FULFILL', dOn: -it.qty, dRes: 0, src: o.channel === 'POS' ? (locations.filter(function (l) { return l.id === o.loc; })[0].pos || 'Register') : 'Fulfillment', ref: o.id, user: 'system' });
    });
    return o;
  });

  var suppliers = [
    { id: 'SUP-01', name: 'Northfield Knitting Co.', lead: 21, terms: 'Net 30' },
    { id: 'SUP-02', name: 'Atlas Denim Works', lead: 35, terms: 'Net 45' },
    { id: 'SUP-03', name: 'Keystone Leather Goods', lead: 18, terms: 'Net 30' },
    { id: 'SUP-04', name: 'Greenline Home Supply', lead: 12, terms: 'Net 15' },
  ];
  var pos = [
    { id: 'PO-7012', supplier: 'SUP-01', status: 'Partially received', created: ago(60 * 24 * 9), eta: 'Oct 12', lines: [['HP-TEE-BLK-M', 120, 80], ['SKU-A', 150, 90], ['HP-TEE-BLK-L', 120, 120]] },
    { id: 'PO-7015', supplier: 'SUP-02', status: 'Sent', created: ago(60 * 24 * 5), eta: 'Oct 28', lines: [['HP-DNM-3232', 60, 0], ['HP-DNM-3432', 60, 0]] },
    { id: 'PO-7018', supplier: 'SUP-03', status: 'Sent', created: ago(60 * 24 * 3), eta: 'Oct 19', lines: [['HP-WAL-TAN', 80, 0], ['HP-WAL-BLK', 80, 0]] },
    { id: 'PO-7020', supplier: 'SUP-04', status: 'Draft', created: ago(60 * 24), eta: '-', lines: [['HP-BTL-SGE', 100, 0], ['HP-CND-CDR', 140, 0]] },
  ];
  pos[0].lines = pos[0].lines.filter(function (l) { return vmap[l[0]]; });

  var promotions = [
    { id: 'PR-01', name: 'Fall Knitwear 20% off', type: 'Percent off category', value: '20%', scope: 'Sweaters', channels: 'All', start: 'Oct 1', end: 'Oct 31', active: true, uses: 412 },
    { id: 'PR-02', name: 'Buy 2 tees, get 1 free', type: 'Buy X get Y', value: '3 for 2', scope: 'Classic Crew Tee', channels: 'All', start: 'Sep 15', end: 'Nov 15', active: true, uses: 268 },
    { id: 'PR-03', name: 'App-only free local delivery', type: 'Free delivery', value: '$0 delivery', scope: 'Orders over $75', channels: 'App', start: 'Oct 1', end: 'Dec 31', active: true, uses: 97 },
    { id: 'PR-04', name: 'Gold members double points', type: 'Loyalty multiplier', value: '2x points', scope: 'Gold tier', channels: 'All', start: 'Oct 20', end: 'Oct 27', active: false, uses: 0 },
    { id: 'PR-05', name: 'Brooklyn store opening weekend', type: 'Fixed amount', value: '$15 off $100', scope: 'Brooklyn only', channels: 'POS', start: 'Aug 3', end: 'Aug 4', active: false, uses: 189 },
  ];

  var returns = [
    { id: 'RMA-3301', order: 'W-10466', customer: 'Grace Kim', sku: 'HP-SWT-OAT-M', qty: 1, reason: 'Wrong size', loc: 'ST-SOHO', status: 'Received', refund: 98 },
    { id: 'RMA-3302', order: 'A-2219', customer: 'Omar Haddad', sku: 'HP-SNK-10', qty: 1, reason: 'Defective sole', loc: 'ST-BKLYN', status: 'Inspecting', refund: 110 },
    { id: 'RMA-3303', order: 'P-58790', customer: 'Sofia Rossi', sku: 'HP-TEE-BLK-L', qty: 2, reason: 'Changed mind', loc: 'ST-JC', status: 'Requested', refund: 56 },
    { id: 'RMA-3304', order: 'W-10459', customer: 'Kenji Sato', sku: 'HP-TOT-NAT', qty: 1, reason: 'Damaged in transit', loc: 'WH-NJ', status: 'Received', refund: 42 },
  ];

  var drivers = [
    { id: 'D-1', name: 'Carlos M.', status: 'On route', route: 'Route 4', stops: 3, done: 1, vehicle: 'E-bike', loc: 'ST-BKLYN' },
    { id: 'D-2', name: 'Tasha R.', status: 'Loading', route: 'Route 7', stops: 5, done: 0, vehicle: 'Van', loc: 'ST-SOHO' },
    { id: 'D-3', name: 'Ivan P.', status: 'Available', route: '-', stops: 0, done: 0, vehicle: 'E-bike', loc: 'ST-SOHO' },
    { id: 'D-4', name: 'Leah W.', status: 'Off shift', route: '-', stops: 0, done: 0, vehicle: 'Van', loc: 'ST-JC' },
  ];
  var deliveries = [
    { id: 'DL-901', order: 'A-2236', addr: '214 Grand St, Brooklyn', window: '2-4 PM', driver: 'D-1', status: 'Out for delivery' },
    { id: 'DL-902', order: 'W-10476', addr: '55 Prince St, New York', window: '4-6 PM', driver: null, status: 'Unassigned' },
    { id: 'DL-903', order: 'W-10483', addr: '120 Spring St, New York', window: '4-6 PM', driver: null, status: 'Unassigned' },
    { id: 'DL-904', order: 'W-10462', addr: '88 Wythe Ave, Brooklyn', window: '12-2 PM', driver: 'D-1', status: 'Delivered' },
  ];

  var tenants = [
    { name: 'Harbor & Pine', plan: 'Growth', locs: 4, mode: 'Mixed', pos: 'Square, Clover', status: 'Active', mrr: 1290, region: 'US-East' },
    { name: 'Northline Sports', plan: 'Enterprise', locs: 22, mode: 'POS-Integrated', pos: 'Lightspeed', status: 'Active', mrr: 6400, region: 'US-East' },
    { name: 'Casa Verde Market', plan: 'Growth', locs: 6, mode: 'Standalone', pos: '-', status: 'Active', mrr: 1490, region: 'US-West' },
    { name: 'Brightside Pets', plan: 'Starter', locs: 2, mode: 'POS-Integrated', pos: 'Square', status: 'Active', mrr: 390, region: 'US-Central' },
    { name: 'Maple & Main Books', plan: 'Starter', locs: 1, mode: 'Standalone', pos: '-', status: 'Trial', mrr: 0, region: 'CA-Central' },
    { name: 'Lumen Home', plan: 'Growth', locs: 9, mode: 'POS-Integrated', pos: 'Clover', status: 'Active', mrr: 2190, region: 'US-East' },
    { name: 'Tienda Sol', plan: 'Growth', locs: 5, mode: 'Mixed', pos: 'Square', status: 'Active', mrr: 1190, region: 'MX-Central' },
    { name: 'Ridge Outfitters', plan: 'Enterprise', locs: 31, mode: 'POS-Integrated', pos: 'Lightspeed, Square', status: 'Onboarding', mrr: 8900, region: 'US-West' },
  ];

  var sales = [];
  for (var d = 13; d >= 0; d--) {
    var dt = new Date(NOW.getTime() - d * 86400000);
    var wk = dt.getDay() === 0 || dt.getDay() === 6 ? 1.35 : 1;
    sales.push({ day: dt, pos: Math.round(ri(5200, 7800) * wk), web: Math.round(ri(3100, 4600) * wk), app: Math.round(ri(1500, 2600) * wk) });
  }

  var audit = [
    { ts: ago(3), user: 'M. Rivera', role: 'Store manager', action: 'Login', detail: 'Signed in from SoHo (MFA)', type: 'Security' },
    { ts: ago(9), user: 'system', role: 'Connector', action: 'Sync batch', detail: 'Square SoHo: 14 events applied, 0 duplicates', type: 'Sync' },
    { ts: ago(15), user: 'A. Okafor', role: 'Owner', action: 'Price change', detail: 'Merino Crew Sweater $94 -> $98 (all channels)', type: 'Catalog' },
    { ts: ago(26), user: 'system', role: 'Connector', action: 'Sync batch', detail: 'Clover Brooklyn: 9 events applied, 1 duplicate ignored', type: 'Sync' },
    { ts: ago(41), user: 'J. Park', role: 'Warehouse lead', action: 'Cycle count', detail: 'Zone B: 48 bins counted, 1 variance (-1)', type: 'Inventory' },
    { ts: ago(58), user: 'unknown', role: '-', action: 'Login failed', detail: '3 attempts, account locked 15 min', type: 'Security' },
    { ts: ago(73), user: 'A. Okafor', role: 'Owner', action: 'Role update', detail: 'D. Lee: Associate -> Store manager', type: 'Security' },
    { ts: ago(95), user: 'system', role: 'Scheduler', action: 'Reconciliation', detail: 'Nightly compare: 4 locations, 0 open variances', type: 'Sync' },
  ];

  window.DB = { locations: locations, products: products, variants: variants, vmap: vmap, ledger: ledger, customers: customers, orders: orders,
    suppliers: suppliers, pos: pos, promotions: promotions, returns: returns, drivers: drivers, deliveries: deliveries, tenants: tenants,
    sales: sales, audit: audit, ev: ev, rnd: rnd, ri: ri, pick: pick };
})();
