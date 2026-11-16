/* NutriTrack – persistence (IndexedDB with a localStorage fallback) and data model. */
(function () {
  'use strict';

  var DB_NAME = 'nutritrack';
  var DB_VERSION = 1;
  var STORES = ['entries', 'water', 'customFoods', 'savedMeals', 'settings'];
  var MEALS = [
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' },
    { id: 'snack', label: 'Snacks' }
  ];

  var data = { entries: [], water: [], customFoods: [], savedMeals: [], settings: {} };
  var backend = null; // { kind, getAll, put, del, clear }

  // ── Small helpers ──────────────────────────────────────────────────
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return ymd(new Date()); }
  function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  function r1(n) { return Math.round(n * 10) / 10; }

  // ── IndexedDB backend ──────────────────────────────────────────────
  function openIdb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      var req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return reject(e); }
      req.onupgradeneeded = function () {
        var db = req.result;
        STORES.forEach(function (s) {
          if (!db.objectStoreNames.contains(s)) {
            var os = db.createObjectStore(s, { keyPath: s === 'settings' ? 'key' : 'id' });
            if (s === 'entries' || s === 'water') os.createIndex('date', 'date');
          }
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Could not open database')); };
      req.onblocked = function () { reject(new Error('Database blocked')); };
    });
  }

  function idbBackend(db) {
    function tx(store, mode, fn) {
      return new Promise(function (resolve, reject) {
        var t, out;
        try { t = db.transaction(store, mode); } catch (e) { return reject(e); }
        t.oncomplete = function () { resolve(out); };
        t.onerror = t.onabort = function () { reject(t.error || new Error('Storage write failed')); };
        out = fn(t.objectStore(store));
      });
    }
    return {
      kind: 'indexeddb',
      getAll: function (store) {
        return new Promise(function (resolve, reject) {
          var rq = db.transaction(store, 'readonly').objectStore(store).getAll();
          rq.onsuccess = function () { resolve(rq.result || []); };
          rq.onerror = function () { reject(rq.error); };
        });
      },
      put: function (store, items) { return tx(store, 'readwrite', function (os) { items.forEach(function (i) { os.put(i); }); }); },
      del: function (store, ids) { return tx(store, 'readwrite', function (os) { ids.forEach(function (i) { os.delete(i); }); }); },
      clear: function (store) { return tx(store, 'readwrite', function (os) { os.clear(); }); }
    };
  }

  // ── localStorage fallback (private-mode browsers etc.) ─────────────
  function lsBackend() {
    var mem = {};
    function keyOf(store) { return store === 'settings' ? 'key' : 'id'; }
    function read(store) {
      if (mem[store]) return mem[store];
      try { mem[store] = JSON.parse(localStorage.getItem('nt:' + store) || '[]'); } catch (e) { mem[store] = []; }
      return mem[store];
    }
    function write(store) {
      try { localStorage.setItem('nt:' + store, JSON.stringify(mem[store])); } catch (e) { /* memory only */ }
    }
    return {
      kind: 'localstorage',
      getAll: function (store) { return Promise.resolve(read(store).slice()); },
      put: function (store, items) {
        var arr = read(store), k = keyOf(store);
        items.forEach(function (it) {
          var i = arr.findIndex(function (x) { return x[k] === it[k]; });
          if (i >= 0) arr[i] = it; else arr.push(it);
        });
        write(store); return Promise.resolve();
      },
      del: function (store, ids) {
        var k = keyOf(store);
        mem[store] = read(store).filter(function (x) { return ids.indexOf(x[k]) < 0; });
        write(store); return Promise.resolve();
      },
      clear: function (store) { mem[store] = []; write(store); return Promise.resolve(); }
    };
  }

  // ── Defaults ───────────────────────────────────────────────────────
  var DEFAULTS = {
    profile: { name: '', age: 25, diet: 'none', activity: 'moderate' },
    goals: { kcal: 2200, protein: 110, carbs: 275, fat: 73, water: 2500 },
    waterSizes: [150, 250, 500, 750],
    flags: { seeded: false, sampleBanner: false }
  };

  function setting(key) {
    var v = data.settings[key];
    return v === undefined ? JSON.parse(JSON.stringify(DEFAULTS[key])) : v;
  }
  function setSetting(key, value) {
    data.settings[key] = value;
    return backend.put('settings', [{ key: key, value: value }]);
  }

  // ── Food model ─────────────────────────────────────────────────────
  function customToFood(c) {
    var servings = [{ label: c.servingLabel, factor: 1 }];
    return {
      id: c.id, name: c.name, category: c.category || 'My foods', diet: c.diet || 'veg',
      base: { kcal: c.kcal, protein: c.protein, carbs: c.carbs, fat: c.fat },
      servings: servings, aliases: '', unit: 'g',
      gramBasis: c.servingGrams > 0 ? c.servingGrams : 0, source: 'custom'
    };
  }
  function allFoods() { return window.NT_FOODS.concat(data.customFoods.map(customToFood)); }
  function findFood(id) {
    if (!id) return null;
    var f = window.NT_FOODS.find(function (x) { return x.id === id; });
    if (f) return f;
    var c = data.customFoods.find(function (x) { return x.id === id; });
    return c ? customToFood(c) : null;
  }

  function calc(base, factor, qty) {
    var m = factor * qty;
    return { kcal: Math.round(base.kcal * m), protein: r1(base.protein * m), carbs: r1(base.carbs * m), fat: r1(base.fat * m) };
  }

  /** item = { foodId, name, serving:{label,factor}, qty, base } */
  function makeItem(food, serving, qty) {
    return {
      foodId: food.id, name: food.name,
      serving: { label: serving.label, factor: serving.factor },
      qty: qty, base: { kcal: food.base.kcal, protein: food.base.protein, carbs: food.base.carbs, fat: food.base.fat },
      estimated: food.source !== 'custom'
    };
  }
  function itemToEntry(item, date, meal, extra) {
    var t = calc(item.base, item.serving.factor, item.qty);
    var e = {
      id: uid(), date: date, meal: meal, foodId: item.foodId, name: item.name,
      serving: item.serving, qty: item.qty, base: item.base, estimated: item.estimated !== false,
      kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat, ts: Date.now()
    };
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    return e;
  }

  // ── Entries ────────────────────────────────────────────────────────
  function addEntries(entries) {
    entries.forEach(function (e) { data.entries.push(e); });
    return backend.put('entries', entries);
  }
  function updateEntry(id, patch) {
    var e = data.entries.find(function (x) { return x.id === id; });
    if (!e) return Promise.reject(new Error('That entry no longer exists.'));
    Object.keys(patch).forEach(function (k) { e[k] = patch[k]; });
    var t = calc(e.base, e.serving.factor, e.qty);
    e.kcal = t.kcal; e.protein = t.protein; e.carbs = t.carbs; e.fat = t.fat;
    delete e.sample;
    return backend.put('entries', [e]);
  }
  function deleteEntries(ids) {
    data.entries = data.entries.filter(function (e) { return ids.indexOf(e.id) < 0; });
    return backend.del('entries', ids);
  }
  function entriesOn(date) {
    return data.entries.filter(function (e) { return e.date === date; }).sort(function (a, b) { return a.ts - b.ts; });
  }
  function sum(entries) {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0, count: entries.length };
    entries.forEach(function (e) { t.kcal += e.kcal; t.protein += e.protein; t.carbs += e.carbs; t.fat += e.fat; });
    t.kcal = Math.round(t.kcal); t.protein = r1(t.protein); t.carbs = r1(t.carbs); t.fat = r1(t.fat);
    return t;
  }
  function totalsOn(date) { return sum(entriesOn(date)); }
  /** Map of date -> totals for every date that has entries (single pass). */
  function totalsByDate() {
    var map = {};
    data.entries.forEach(function (e) {
      var t = map[e.date] || (map[e.date] = { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
      t.kcal += e.kcal; t.protein += e.protein; t.carbs += e.carbs; t.fat += e.fat; t.count++;
    });
    Object.keys(map).forEach(function (d) {
      var t = map[d]; t.kcal = Math.round(t.kcal); t.protein = r1(t.protein); t.carbs = r1(t.carbs); t.fat = r1(t.fat);
    });
    return map;
  }

  // ── Water ──────────────────────────────────────────────────────────
  function addWater(date, ml) {
    var w = { id: uid(), date: date, ml: ml, ts: Date.now() };
    data.water.push(w);
    return backend.put('water', [w]).then(function () { return w; });
  }
  function deleteWater(id) {
    data.water = data.water.filter(function (w) { return w.id !== id; });
    return backend.del('water', [id]);
  }
  function waterOn(date) {
    return data.water.filter(function (w) { return w.date === date; }).sort(function (a, b) { return a.ts - b.ts; });
  }
  function waterTotal(date) { return waterOn(date).reduce(function (a, w) { return a + w.ml; }, 0); }

  // ── Custom foods & saved meals ─────────────────────────────────────
  function saveCustomFood(c) {
    if (!c.id) c.id = 'custom-' + uid();
    var i = data.customFoods.findIndex(function (x) { return x.id === c.id; });
    if (i >= 0) data.customFoods[i] = c; else data.customFoods.push(c);
    return backend.put('customFoods', [c]).then(function () { return c; });
  }
  function deleteCustomFood(id) {
    data.customFoods = data.customFoods.filter(function (x) { return x.id !== id; });
    return backend.del('customFoods', [id]);
  }
  function saveMeal(m) {
    if (!m.id) m.id = 'meal-' + uid();
    var i = data.savedMeals.findIndex(function (x) { return x.id === m.id; });
    if (i >= 0) data.savedMeals[i] = m; else data.savedMeals.push(m);
    return backend.put('savedMeals', [m]).then(function () { return m; });
  }
  function deleteMeal(id) {
    data.savedMeals = data.savedMeals.filter(function (x) { return x.id !== id; });
    return backend.del('savedMeals', [id]);
  }
  function mealTotals(m) {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    m.items.forEach(function (it) {
      var c = calc(it.base, it.serving.factor, it.qty);
      t.kcal += c.kcal; t.protein += c.protein; t.carbs += c.carbs; t.fat += c.fat;
    });
    t.protein = r1(t.protein); t.carbs = r1(t.carbs); t.fat = r1(t.fat);
    return t;
  }

  // ── Goal suggestions ───────────────────────────────────────────────
  // General reference ranges only (rough, population-level estimates of daily
  // energy needs by age band and activity). They are starting points, not limits.
  var ENERGY = [
    [8, [1300, 1500, 1700]], [13, [1700, 1900, 2200]], [18, [2000, 2400, 2800]],
    [30, [2200, 2500, 2800]], [50, [2000, 2300, 2600]], [70, [1800, 2100, 2400]], [200, [1700, 1900, 2200]]
  ];
  function suggestGoals(age, activity) {
    var row = ENERGY.find(function (r) { return age <= r[0]; })[1];
    var kcal = activity === 'sedentary' ? row[0]
      : activity === 'light' ? (row[0] + row[1]) / 2
      : activity === 'moderate' ? row[1] : row[2];
    kcal = Math.round(kcal / 50) * 50;
    var pPct = age < 14 ? 0.15 : 0.2, fPct = 0.3, cPct = 1 - pPct - fPct;
    var water = age < 9 ? 1200 : age < 14 ? 1600 : age < 19 ? 2000 : 2500;
    if (activity === 'active' && age >= 14) water += 250;
    return {
      kcal: kcal, protein: Math.round(kcal * pPct / 4), carbs: Math.round(kcal * cPct / 4),
      fat: Math.round(kcal * fPct / 9), water: water
    };
  }
  /** Lowest calorie goal the app will accept – keeps goals from becoming restrictive. */
  function minKcal(age) { return age < 9 ? 1000 : age < 18 ? 1400 : 1200; }

  // ── Sample data ────────────────────────────────────────────────────
  function seed() {
    var F = function (id) { return window.NT_FOODS.find(function (f) { return f.id === id; }); };
    // [foodId, servingIndex, qty]
    var B = [
      [['poha', 0, 1], ['chai', 0, 1]],
      [['idli', 2, 1], ['sambar', 0, 1], ['coconut-chutney', 0, 1]],
      [['aloo-paratha', 0, 1], ['curd', 0, 1]],
      [['omelette', 1, 1], ['bread-brown', 1, 1], ['chai', 0, 1]],
      [['upma', 0, 1], ['banana', 0, 1], ['coffee', 0, 1]],
      [['besan-chilla', 0, 2], ['chai', 0, 1]],
      [['masala-dosa', 0, 1], ['sambar', 0, 1]]
    ];
    var L = [
      [['roti', 0, 2], ['dal-tadka', 0, 1], ['mixed-veg', 0, 1], ['rice', 0, 1], ['salad', 0, 1]],
      [['rajma', 0, 1], ['rice', 1, 1], ['curd', 0, 1]],
      [['chole', 0, 1], ['roti', 0, 2], ['salad', 0, 1]],
      [['veg-pulao', 1, 1], ['raita', 0, 1]],
      [['roti', 0, 2], ['palak-paneer', 0, 1], ['moong-dal', 0, 1]],
      [['chicken-curry', 0, 1], ['rice', 0, 1], ['roti', 0, 1], ['salad', 0, 1]],
      [['curd-rice', 1, 1], ['aloo-sabzi', 0, 1]]
    ];
    var D = [
      [['roti', 0, 2], ['paneer-butter-masala', 0, 1], ['salad', 0, 1]],
      [['khichdi', 1, 1], ['curd', 0, 1]],
      [['roti', 0, 3], ['bhindi', 0, 1], ['moong-dal', 0, 1]],
      [['dosa', 0, 2], ['sambar', 0, 1], ['coconut-chutney', 0, 1]],
      [['egg-curry', 0, 1], ['roti', 0, 2]],
      [['roti', 0, 2], ['aloo-gobi', 0, 1], ['dal-tadka', 0, 1]],
      [['veg-biryani', 1, 1], ['raita', 0, 1]]
    ];
    var S = [
      [['banana', 0, 1]], [['apple', 0, 1], ['almonds', 0, 1]], [['roasted-chana', 0, 1]],
      [['chai', 0, 1], ['marie', 0, 1]], [['makhana', 0, 1]], [['samosa', 0, 1], ['chai', 0, 1]],
      [['sprouts', 0, 1], ['chaas', 0, 1]]
    ];
    var hours = { breakfast: 8, lunch: 13, snack: 17, dinner: 20 };
    var entries = [], water = [];
    var t = today();

    function push(date, meal, combo) {
      combo.forEach(function (c, i) {
        var food = F(c[0]);
        var qty = meal === 'lunch' || meal === 'dinner' ? c[2] * 1.5 : c[2];
        var e = itemToEntry(makeItem(food, food.servings[c[1]], qty), date, meal, { sample: true });
        var d = parseYmd(date); d.setHours(hours[meal], i * 2, 0, 0);
        e.ts = d.getTime();
        entries.push(e);
      });
    }
    for (var back = 14; back >= 0; back--) {
      var date = addDays(t, -back);
      var k = (back * 5 + 3) % 7;
      push(date, 'breakfast', B[k]);
      push(date, 'lunch', L[(k + back) % 7]);
      if (back > 0) {
        push(date, 'dinner', D[(k * 2 + back) % 7]);
        if (back % 4 !== 2) push(date, 'snack', S[(k + 2 * back) % 7]);
      }
      var glasses = back === 0 ? 3 : 5 + ((back * 3) % 5);
      for (var g = 0; g < glasses; g++) {
        var wd = parseYmd(date); wd.setHours(7 + g * 2, 15, 0, 0);
        water.push({ id: uid(), date: date, ml: g % 3 === 2 ? 500 : 250, ts: wd.getTime(), sample: true });
      }
    }

    var customs = [
      { id: 'custom-' + uid(), name: 'Homemade protein laddoo', category: 'My foods', diet: 'veg', servingLabel: '1 laddoo', servingGrams: 35, kcal: 150, protein: 6, carbs: 14, fat: 8, sample: true },
      { id: 'custom-' + uid(), name: 'Mum\'s vegetable soup', category: 'My foods', diet: 'vegan', servingLabel: '1 bowl', servingGrams: 250, kcal: 90, protein: 3, carbs: 15, fat: 2, sample: true }
    ];
    var meals = [
      { id: 'meal-' + uid(), name: 'Everyday dal-roti thali', sample: true, items: L[0].map(function (c) { var f = F(c[0]); return makeItem(f, f.servings[c[1]], c[2]); }) },
      { id: 'meal-' + uid(), name: 'Quick idli breakfast', sample: true, items: B[1].map(function (c) { var f = F(c[0]); return makeItem(f, f.servings[c[1]], c[2]); }) }
    ];

    // Nothing in the sample should be time-stamped in the future.
    var now = Date.now();
    entries.concat(water).forEach(function (x, i) { if (x.ts > now) x.ts = now - 600000 + i; });

    data.entries = data.entries.concat(entries);
    data.water = data.water.concat(water);
    data.customFoods = data.customFoods.concat(customs);
    data.savedMeals = data.savedMeals.concat(meals);
    var profile = setting('profile');
    if (!profile.name) profile.name = 'Riya';
    return Promise.all([
      backend.put('entries', entries), backend.put('water', water),
      backend.put('customFoods', customs), backend.put('savedMeals', meals),
      setSetting('profile', profile),
      setSetting('flags', { seeded: true, sampleBanner: true })
    ]);
  }

  function removeSampleData() {
    var pick = function (arr) { return arr.filter(function (x) { return x.sample; }).map(function (x) { return x.id; }); };
    var ids = { entries: pick(data.entries), water: pick(data.water), customFoods: pick(data.customFoods), savedMeals: pick(data.savedMeals) };
    Object.keys(ids).forEach(function (s) { data[s] = data[s].filter(function (x) { return !x.sample; }); });
    return Promise.all(Object.keys(ids).map(function (s) { return backend.del(s, ids[s]); }))
      .then(function () { return setSetting('flags', { seeded: true, sampleBanner: false }); });
  }

  function clearAll() {
    data.entries = []; data.water = []; data.customFoods = []; data.savedMeals = [];
    var flags = { seeded: true, sampleBanner: false };
    data.settings = { flags: flags };
    return Promise.all(STORES.map(function (s) { return backend.clear(s); }))
      .then(function () { return backend.put('settings', [{ key: 'flags', value: flags }]); });
  }

  // ── Init ───────────────────────────────────────────────────────────
  function init() {
    return openIdb().then(idbBackend, function () { return lsBackend(); }).then(function (b) {
      backend = b;
      return Promise.all(STORES.map(function (s) { return backend.getAll(s); }));
    }).catch(function () {
      backend = lsBackend();
      return Promise.all(STORES.map(function (s) { return backend.getAll(s); }));
    }).then(function (res) {
      data.entries = res[0]; data.water = res[1]; data.customFoods = res[2]; data.savedMeals = res[3];
      data.settings = {};
      res[4].forEach(function (row) { data.settings[row.key] = row.value; });
      if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist().catch(function () {}); } catch (e) { /* ignore */ } }
      if (!setting('flags').seeded) return seed();
    }).then(function () { return backend.kind; });
  }

  window.NT = window.NT || {};
  window.NT.store = {
    MEALS: MEALS, data: data, init: init, uid: uid, ymd: ymd, parseYmd: parseYmd, today: today, addDays: addDays, r1: r1,
    setting: setting, setSetting: setSetting,
    allFoods: allFoods, findFood: findFood, calc: calc, makeItem: makeItem, itemToEntry: itemToEntry,
    addEntries: addEntries, updateEntry: updateEntry, deleteEntries: deleteEntries, entriesOn: entriesOn,
    sum: sum, totalsOn: totalsOn, totalsByDate: totalsByDate,
    addWater: addWater, deleteWater: deleteWater, waterOn: waterOn, waterTotal: waterTotal,
    saveCustomFood: saveCustomFood, deleteCustomFood: deleteCustomFood,
    saveMeal: saveMeal, deleteMeal: deleteMeal, mealTotals: mealTotals,
    suggestGoals: suggestGoals, minKcal: minKcal,
    seed: seed, removeSampleData: removeSampleData, clearAll: clearAll,
    backendKind: function () { return backend ? backend.kind : 'none'; }
  };
})();
