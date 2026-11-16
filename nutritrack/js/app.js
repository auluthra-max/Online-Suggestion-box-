/* NutriTrack – views, actions and routing. */
(function () {
  'use strict';

  var S = window.NT.store, U = window.NT.ui;
  var esc = U.esc, icon = U.icon, num = U.num, g1 = U.g1;
  var MEALS = S.MEALS;
  var C = { kcal: 'var(--accent)', protein: 'var(--protein)', carbs: 'var(--carbs)', fat: 'var(--fat)', water: 'var(--water)' };
  var EST_NOTE = 'Nutrition values are estimates for typical home-style portions and have not been verified against a lab or official source.';

  var NAV = [
    { id: 'dashboard', label: 'Home', long: 'Dashboard', icon: 'home' },
    { id: 'log', label: 'Log', long: 'Food log', icon: 'log' },
    { id: 'history', label: 'History', long: 'History', icon: 'calendar' },
    { id: 'analytics', label: 'Stats', long: 'Analytics', icon: 'chart' },
    { id: 'library', label: 'Foods', long: 'Foods & meals', icon: 'book' },
    { id: 'profile', label: 'Profile', long: 'Profile & goals', icon: 'user' }
  ];
  var DIETS = [
    { id: 'none', label: 'No preference' }, { id: 'veg', label: 'Vegetarian' },
    { id: 'egg', label: 'Eggetarian (vegetarian + eggs)' }, { id: 'vegan', label: 'Vegan' },
    { id: 'nonveg', label: 'Non-vegetarian' }
  ];
  var ACTIVITY = [
    { id: 'sedentary', label: 'Mostly sitting' }, { id: 'light', label: 'Lightly active' },
    { id: 'moderate', label: 'Moderately active' }, { id: 'active', label: 'Very active' }
  ];
  var DIET_LEVEL = { vegan: 0, veg: 1, egg: 2, nonveg: 3 };
  var DIET_NAME = { vegan: 'Vegan', veg: 'Vegetarian', egg: 'Contains egg', nonveg: 'Non-vegetarian' };

  var state = {
    route: 'dashboard',
    date: S.today(),
    an: { range: 'week', anchor: S.today(), meal: 'all', sort: 'new', q: '', tsort: 'date', tdir: -1 },
    hist: { month: S.today().slice(0, 7), selected: S.today() },
    lib: { tab: 'database', browser: null }
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function mealLabel(id) { var m = MEALS.find(function (x) { return x.id === id; }); return m ? m.label : id; }
  function goals() { return S.setting('goals'); }
  function fail(err) { U.toast((err && err.message) || 'Something went wrong. Your change was not saved.', { error: true }); }
  function opt(value, label, selected) { return '<option value="' + esc(value) + '"' + (selected ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    return S.ymd(S.parseYmd(s)) === s;
  }

  // ════════════════════════════════════════════════════════════════════
  // Shared components
  // ════════════════════════════════════════════════════════════════════
  function entryRow(e, showMeta) {
    var sub = (showMeta ? U.fmtDate(e.date, { day: 'numeric', month: 'short' }) + ' · ' + mealLabel(e.meal) + ' · ' : '') +
      g1(e.qty) + ' × ' + e.serving.label;
    return '<li class="entry">' +
      '<div class="entry-main"><span class="entry-name">' + esc(e.name) + (e.estimated !== false ? ' <span class="badge" title="' + esc(EST_NOTE) + '">est.</span>' : '') + '</span>' +
      '<span class="entry-sub">' + esc(sub) + '</span>' +
      '<span class="entry-macros"><i style="background:' + C.protein + '"></i>P ' + g1(e.protein) + ' g<i style="background:' + C.carbs + '"></i>C ' + g1(e.carbs) + ' g<i style="background:' + C.fat + '"></i>F ' + g1(e.fat) + ' g</span></div>' +
      '<span class="entry-kcal">' + num(e.kcal) + '<small>kcal</small></span>' +
      '<span class="entry-actions">' +
        '<button type="button" class="icon-btn" data-action="edit-entry" data-id="' + esc(e.id) + '" aria-label="Edit ' + esc(e.name) + '">' + icon('edit', 18) + '</button>' +
        '<button type="button" class="icon-btn" data-action="delete-entry" data-id="' + esc(e.id) + '" aria-label="Delete ' + esc(e.name) + '">' + icon('trash', 18) + '</button>' +
      '</span></li>';
  }

  function dayLog(date) {
    var entries = S.entriesOn(date);
    return MEALS.map(function (m) {
      var list = entries.filter(function (e) { return e.meal === m.id; });
      var t = S.sum(list);
      return '<section class="card meal-card">' +
        '<header class="card-head"><div><h3>' + m.label + '</h3><p class="muted small">' + (list.length ? num(t.kcal) + ' kcal · ' + list.length + (list.length === 1 ? ' item' : ' items') : 'Nothing logged') + '</p></div>' +
        '<div class="row-gap">' +
          (list.length ? '<button type="button" class="btn btn-ghost btn-sm" data-action="save-meal-from" data-date="' + date + '" data-meal="' + m.id + '" title="Save these items as a reusable meal">' + icon('bookmark', 16) + '<span class="hide-xs">Save meal</span></button>' : '') +
          '<button type="button" class="btn btn-soft btn-sm" data-action="add-food" data-date="' + date + '" data-meal="' + m.id + '">' + icon('plus', 16) + 'Add</button>' +
        '</div></header>' +
        (list.length ? '<ul class="entries">' + list.map(function (e) { return entryRow(e); }).join('') + '</ul>' : '') +
        '</section>';
    }).join('');
  }

  function waterCard(date) {
    var total = S.waterTotal(date), goal = goals().water, logs = S.waterOn(date);
    var sizes = S.setting('waterSizes');
    var p = U.pct(total, goal);
    return '<section class="card water-card">' +
      '<header class="card-head"><div><h3>' + icon('drop', 18) + ' Water</h3><p class="muted small">' + (date === S.today() ? 'Today' : U.fmtDate(date)) + '</p></div>' +
      '<div class="water-total"><b>' + num(total) + '</b> / ' + num(goal) + ' ml</div></header>' +
      U.meter({ value: total, goal: goal, color: C.water, aria: 'Water ' + total + ' of ' + goal + ' millilitres' }) +
      '<p class="muted small water-note">' + (total >= goal ? 'Hydration goal reached — nice.' : p + '% of your daily goal · ' + num(goal - total) + ' ml to go') + '</p>' +
      '<div class="chips">' + sizes.map(function (ml) {
        return '<button type="button" class="chip" data-action="add-water" data-date="' + date + '" data-ml="' + ml + '">+ ' + ml + ' ml</button>';
      }).join('') + '</div>' +
      '<form class="inline-form" data-submit="add-water-custom" data-date="' + date + '" novalidate>' +
        '<label class="sr-only" for="wc-' + date + '">Custom amount in millilitres</label>' +
        '<input id="wc-' + date + '" class="input" name="ml" type="number" inputmode="numeric" min="1" max="5000" step="1" placeholder="Custom ml">' +
        '<button type="submit" class="btn btn-soft">Add</button></form>' +
      (logs.length ? '<ul class="water-logs">' + logs.slice().reverse().map(function (w) {
        return '<li><span>' + w.ml + ' ml</span><button type="button" data-action="del-water" data-id="' + esc(w.id) + '" aria-label="Remove ' + w.ml + ' ml">' + icon('x', 13) + '</button></li>';
      }).join('') + '</ul>' : '') +
      '</section>';
  }

  function macroMeters(t, g) {
    return [['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fats']].map(function (m) {
      var v = t[m[0]], goal = g[m[0]];
      return '<div class="macro"><div class="macro-top"><span><i style="background:' + C[m[0]] + '"></i>' + m[1] + '</span>' +
        '<span><b>' + g1(v) + '</b> / ' + goal + ' g</span></div>' +
        U.meter({ value: v, goal: goal, color: C[m[0]], aria: m[1] + ' ' + g1(v) + ' of ' + goal + ' grams' }) +
        '<span class="muted small">' + U.pct(v, goal) + '% of goal</span></div>';
    }).join('');
  }

  function energySplit(t, emptyText) {
    return U.segments([
      { label: 'Protein', value: t.protein * 4, color: C.protein, detail: g1(t.protein) + ' g' },
      { label: 'Carbs', value: t.carbs * 4, color: C.carbs, detail: g1(t.carbs) + ' g' },
      { label: 'Fats', value: t.fat * 9, color: C.fat, detail: g1(t.fat) + ' g' }
    ], emptyText);
  }

  function tile(label, value, unit, sub) {
    return '<div class="tile"><span class="tile-label">' + esc(label) + '</span><span class="tile-value">' + value + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</span>' +
      (sub ? '<span class="tile-sub">' + esc(sub) + '</span>' : '') + '</div>';
  }

  // ════════════════════════════════════════════════════════════════════
  // Food browser (search, filter, sort)
  // ════════════════════════════════════════════════════════════════════
  function defaultDietFilter() {
    var d = S.setting('profile').diet;
    return d === 'veg' || d === 'vegan' || d === 'egg' ? d : 'all';
  }
  function newBrowserState() { return { q: '', cat: 'all', diet: defaultDietFilter(), sort: 'relevance', scope: 'all' }; }

  function recentFoodIds() {
    var seen = {}, out = [];
    S.data.entries.slice().sort(function (a, b) { return b.ts - a.ts; }).some(function (e) {
      if (e.foodId && !seen[e.foodId]) { seen[e.foodId] = 1; out.push(e.foodId); }
      return out.length >= 20;
    });
    return out;
  }

  function searchFoods(bs) {
    var foods;
    if (bs.scope === 'recent') foods = recentFoodIds().map(S.findFood).filter(Boolean);
    else foods = S.allFoods();
    if (bs.scope === 'custom') foods = foods.filter(function (f) { return f.source === 'custom'; });
    if (bs.cat !== 'all') foods = foods.filter(function (f) { return f.category === bs.cat; });
    if (bs.diet !== 'all') { var max = DIET_LEVEL[bs.diet]; foods = foods.filter(function (f) { return DIET_LEVEL[f.diet] <= max; }); }
    var q = bs.q.trim().toLowerCase();
    var tokens = q ? q.split(/\s+/) : [];
    var rows = [];
    foods.forEach(function (f, i) {
      var name = f.name.toLowerCase();
      var hay = name + ' ' + f.aliases.toLowerCase() + ' ' + f.category.toLowerCase();
      if (!tokens.every(function (t) { return hay.indexOf(t) >= 0; })) return;
      var score = !q ? 0 : name.indexOf(q) === 0 ? 0 : name.indexOf(q) > 0 ? 1 : tokens.every(function (t) { return name.indexOf(t) >= 0; }) ? 2 : 3;
      rows.push({ f: f, n: S.calc(f.base, f.servings[0].factor, 1), score: score, i: i });
    });
    var by = {
      relevance: function (a, b) { return a.score - b.score || (bs.scope === 'recent' || !q ? a.i - b.i : a.f.name.localeCompare(b.f.name)); },
      name: function (a, b) { return a.f.name.localeCompare(b.f.name); },
      'kcal-asc': function (a, b) { return a.n.kcal - b.n.kcal; },
      'kcal-desc': function (a, b) { return b.n.kcal - a.n.kcal; },
      'protein-desc': function (a, b) { return b.n.protein - a.n.protein; }
    };
    return rows.sort(by[bs.sort] || by.relevance);
  }

  function foodRow(r) {
    var f = r.f;
    return '<button type="button" class="food-row" data-food="' + esc(f.id) + '">' +
      '<span class="diet-dot diet-' + f.diet + '" title="' + DIET_NAME[f.diet] + '"></span>' +
      '<span class="food-main"><span class="food-name">' + esc(f.name) + ' <span class="badge' + (f.source === 'custom' ? ' badge-mine' : '') + '">' + (f.source === 'custom' ? 'my food' : 'est.') + '</span></span>' +
      '<span class="food-sub">' + esc(f.servings[0].label) + ' · P ' + g1(r.n.protein) + ' · C ' + g1(r.n.carbs) + ' · F ' + g1(r.n.fat) + ' g</span></span>' +
      '<span class="food-kcal">' + num(r.n.kcal) + '<small>kcal</small></span></button>';
  }

  function mountBrowser(container, bs, onPick) {
    var cats = window.NT_CATEGORIES.slice();
    if (S.data.customFoods.length) cats.push('My foods');
    container.innerHTML =
      '<div class="browser">' +
        '<div class="search">' + icon('search', 18) + '<input class="input" type="search" data-b="q" placeholder="Search foods — roti, dal, paneer, idli…" aria-label="Search foods" autocomplete="off" value="' + esc(bs.q) + '" autofocus></div>' +
        '<div class="chips scope" role="tablist">' + [['all', 'All foods'], ['recent', 'Recent'], ['custom', 'My foods']].map(function (s) {
          return '<button type="button" class="chip' + (bs.scope === s[0] ? ' is-on' : '') + '" data-scope="' + s[0] + '" role="tab" aria-selected="' + (bs.scope === s[0]) + '">' + s[1] + '</button>';
        }).join('') + '</div>' +
        '<div class="filters">' +
          '<label><span>Category</span><select class="input" data-b="cat">' + opt('all', 'All categories', bs.cat === 'all') + cats.map(function (c) { return opt(c, c, bs.cat === c); }).join('') + '</select></label>' +
          '<label><span>Diet</span><select class="input" data-b="diet">' + [['all', 'All foods'], ['veg', 'Vegetarian'], ['egg', 'Vegetarian + egg'], ['vegan', 'Vegan']].map(function (d) { return opt(d[0], d[1], bs.diet === d[0]); }).join('') + '</select></label>' +
          '<label><span>Sort by</span><select class="input" data-b="sort">' + [['relevance', 'Best match'], ['name', 'Name A–Z'], ['kcal-asc', 'Calories: low to high'], ['kcal-desc', 'Calories: high to low'], ['protein-desc', 'Protein: high to low']].map(function (d) { return opt(d[0], d[1], bs.sort === d[0]); }).join('') + '</select></label>' +
        '</div>' +
        '<p class="est-note">' + icon('info', 15) + '<span>' + EST_NOTE + '</span></p>' +
        '<p class="muted small" data-count aria-live="polite"></p>' +
        '<div class="food-results" data-results></div>' +
      '</div>';
    var results = $('[data-results]', container), count = $('[data-count]', container);
    function draw() {
      var rows = searchFoods(bs);
      count.textContent = rows.length + (rows.length === 1 ? ' food' : ' foods');
      results.innerHTML = rows.length ? rows.map(foodRow).join('') :
        '<div class="empty"><p>No foods match' + (bs.q.trim() ? ' “' + esc(bs.q.trim()) + '”' : ' these filters') + '.</p>' +
        '<button type="button" class="btn btn-soft btn-sm" data-new-food>' + icon('plus', 16) + 'Create a custom food</button></div>';
    }
    container.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-b'); if (!k) return;
      bs[k] = e.target.value; draw();
    });
    container.addEventListener('click', function (e) {
      var sc = e.target.closest('[data-scope]');
      if (sc) {
        bs.scope = sc.getAttribute('data-scope');
        container.querySelectorAll('[data-scope]').forEach(function (b) { var on = b === sc; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
        return draw();
      }
      if (e.target.closest('[data-new-food]')) return openFoodForm(null, { name: bs.q.trim(), onSaved: draw });
      var row = e.target.closest('[data-food]');
      if (row) { var f = S.findFood(row.getAttribute('data-food')); if (f) onPick(f); }
    });
    draw();
    return { redraw: draw };
  }

  // ════════════════════════════════════════════════════════════════════
  // Modals: picker, food detail, custom food, saved meals
  // ════════════════════════════════════════════════════════════════════
  function openPicker(o) {
    var bs = newBrowserState();
    var hasMeals = o.mode === 'log' && S.data.savedMeals.length > 0;
    U.openModal({
      title: o.mode === 'log' ? 'Add to ' + mealLabel(o.meal) + ' · ' + U.relDate(o.date) : 'Add food to meal',
      wide: true, focus: false,
      body: (hasMeals ? '<div class="tabs" role="tablist"><button type="button" class="tab is-on" data-ptab="foods">Foods</button><button type="button" class="tab" data-ptab="meals">Saved meals</button></div>' : '') +
        '<div data-pane="foods"></div><div data-pane="meals" hidden></div>',
      onMount: function (api) {
        mountBrowser($('[data-pane="foods"]', api.body), bs, function (food) {
          openFoodDetail({ food: food, mode: o.mode, date: o.date, meal: o.meal, onDone: o.onCollect });
        });
        if (!hasMeals) return;
        var pane = $('[data-pane="meals"]', api.body);
        pane.innerHTML = '<ul class="entries">' + S.data.savedMeals.map(function (m) {
          var t = S.mealTotals(m);
          return '<li class="entry"><div class="entry-main"><span class="entry-name">' + esc(m.name) + '</span>' +
            '<span class="entry-sub">' + esc(m.items.map(function (i) { return i.name; }).join(', ')) + '</span></div>' +
            '<span class="entry-kcal">' + num(t.kcal) + '<small>kcal</small></span>' +
            '<button type="button" class="btn btn-soft btn-sm" data-use-meal="' + esc(m.id) + '">Add</button></li>';
        }).join('') + '</ul>';
        api.body.addEventListener('click', function (e) {
          var tab = e.target.closest('[data-ptab]');
          if (tab) {
            var which = tab.getAttribute('data-ptab');
            api.body.querySelectorAll('[data-ptab]').forEach(function (b) { b.classList.toggle('is-on', b === tab); });
            api.body.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== which; });
            return;
          }
          var use = e.target.closest('[data-use-meal]');
          if (use) {
            var meal = S.data.savedMeals.find(function (m) { return m.id === use.getAttribute('data-use-meal'); });
            if (meal) logSavedMeal(meal, o.date, o.meal);
          }
        });
      }
    });
  }

  function logSavedMeal(meal, date, mealId) {
    var entries = meal.items.map(function (it, i) { var e = S.itemToEntry(it, date, mealId); e.ts += i; return e; });
    return S.addEntries(entries).then(function () {
      U.toast('“' + meal.name + '” added to ' + mealLabel(mealId) + ' · ' + U.relDate(date));
      refresh();
    }).catch(fail);
  }

  /** o = { food, mode: 'log'|'edit'|'collect', date, meal, entry, item, onDone } */
  function openFoodDetail(o) {
    var food = o.food, src = o.entry || o.item;
    var options = food.servings.map(function (s) { return { label: s.label, factor: s.factor }; });
    var sel = 0, grams = '', qty = src ? src.qty : 1;
    if (src) {
      sel = options.findIndex(function (s) { return s.label === src.serving.label && Math.abs(s.factor - src.serving.factor) < 1e-6; });
      if (sel < 0) {
        if (food.gramBasis > 0) { sel = 'custom'; grams = Math.round(src.serving.factor * food.gramBasis * 10) / 10; }
        else { options.push(src.serving); sel = options.length - 1; }
      }
    }
    var withMeta = o.mode !== 'collect';
    var date = (o.entry && o.entry.date) || o.date || S.today();
    var meal = (o.entry && o.entry.meal) || o.meal || 'breakfast';
    var unit = food.unit || 'g';

    var body = '<form novalidate data-form>' +
      '<p class="est-note">' + icon('info', 15) + '<span>' + (food.source === 'custom' ? 'Custom food — nutrition values were entered by you.' : EST_NOTE) + '</span></p>' +
      (withMeta ? '<div class="grid-2">' +
        '<label class="field"><span>Date</span><input class="input" type="date" name="date" value="' + date + '" max="' + S.today() + '" required></label>' +
        '<label class="field"><span>Meal</span><select class="input" name="meal">' + MEALS.map(function (m) { return opt(m.id, m.label, m.id === meal); }).join('') + '</select></label></div>' : '') +
      '<label class="field"><span>Serving size</span><select class="input" name="serving">' +
        options.map(function (s, i) { return opt(i, s.label, sel === i); }).join('') +
        (food.gramBasis > 0 ? opt('custom', 'Custom amount (' + unit + ')…', sel === 'custom') : '') + '</select></label>' +
      '<label class="field" data-grams' + (sel === 'custom' ? '' : ' hidden') + '><span>Amount per serving (' + unit + ')</span><input class="input" type="number" inputmode="decimal" name="grams" min="1" max="2000" step="any" value="' + grams + '"></label>' +
      '<div class="field"><span id="qty-l">Quantity (number of servings)</span><div class="stepper">' +
        '<button type="button" class="icon-btn" data-step="-0.5" aria-label="Decrease quantity">' + icon('minus') + '</button>' +
        '<input class="input" type="number" inputmode="decimal" name="qty" min="0.25" max="50" step="any" value="' + qty + '" aria-labelledby="qty-l">' +
        '<button type="button" class="icon-btn" data-step="0.5" aria-label="Increase quantity">' + icon('plus') + '</button></div></div>' +
      '<div class="nutri" data-nutri aria-live="polite"></div>' +
      '<p class="form-error" data-error role="alert" hidden></p></form>';
    var cta = o.mode === 'edit' ? 'Save changes' : o.mode === 'collect' ? (o.item ? 'Update item' : 'Add to meal') : 'Add to log';

    U.openModal({
      title: food.name, body: body,
      footer: '<button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="button" class="btn btn-primary" data-save>' + cta + '</button>',
      onMount: function (api) {
        var form = $('[data-form]', api.body), err = $('[data-error]', api.body), nutri = $('[data-nutri]', api.body);
        function read() {
          var sv = form.serving.value, serving;
          if (sv === 'custom') {
            var g = parseFloat(form.grams.value);
            if (!(g >= 1 && g <= 2000)) return { error: 'Enter an amount between 1 and 2000 ' + unit + '.', field: form.grams };
            serving = { label: g1(g) + ' ' + unit, factor: g / food.gramBasis };
          } else serving = options[+sv];
          var q = parseFloat(form.qty.value);
          if (!(q >= 0.25 && q <= 50)) return { error: 'Quantity must be between 0.25 and 50.', field: form.qty };
          var out = { serving: serving, qty: Math.round(q * 100) / 100 };
          if (withMeta) {
            if (!validDate(form.date.value)) return { error: 'Choose a valid date.', field: form.date };
            if (form.date.value > S.today()) return { error: 'You can only log food for today or earlier.', field: form.date };
            out.date = form.date.value; out.meal = form.meal.value;
          }
          return out;
        }
        function update() {
          $('[data-grams]', api.body).hidden = form.serving.value !== 'custom';
          var r = read();
          var t = r.serving && r.qty ? S.calc(food.base, r.serving.factor, r.qty) : null;
          nutri.innerHTML = t ? '<div class="nutri-kcal"><b>' + num(t.kcal) + '</b><span>kcal</span></div>' +
            '<div class="nutri-macros">' + [['Protein', t.protein, C.protein], ['Carbs', t.carbs, C.carbs], ['Fats', t.fat, C.fat]].map(function (m) {
              return '<div><i style="background:' + m[2] + '"></i><span>' + m[0] + '</span><b>' + g1(m[1]) + ' g</b></div>';
            }).join('') + '</div>' : '<p class="muted small">Enter a serving and quantity to see nutrition.</p>';
          err.hidden = true;
        }
        form.addEventListener('input', update);
        form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
        api.body.addEventListener('click', function (e) {
          var st = e.target.closest('[data-step]'); if (!st) return;
          var q = parseFloat(form.qty.value) || 0;
          form.qty.value = U.clamp(Math.round((q + parseFloat(st.getAttribute('data-step'))) * 100) / 100, 0.25, 50);
          update();
        });
        function save() {
          var r = read();
          if (r.error) { err.textContent = r.error; err.hidden = false; if (r.field) r.field.focus(); return; }
          var p;
          if (o.mode === 'edit') {
            p = S.updateEntry(o.entry.id, { date: r.date, meal: r.meal, serving: r.serving, qty: r.qty }).then(function () { U.toast('Entry updated'); });
          } else if (o.mode === 'collect') {
            if (o.onDone) o.onDone(S.makeItem(food, r.serving, r.qty));
            p = Promise.resolve();
          } else {
            p = S.addEntries([S.itemToEntry(S.makeItem(food, r.serving, r.qty), r.date, r.meal)]).then(function () {
              U.toast(food.name + ' added to ' + mealLabel(r.meal) + (r.date === S.today() ? '' : ' · ' + U.relDate(r.date)));
            });
          }
          p.then(function () { api.close(); refresh(); }).catch(fail);
        }
        api.foot.querySelector('[data-save]').addEventListener('click', save);
        update();
      }
    });
  }

  function editEntry(id) {
    var e = S.data.entries.find(function (x) { return x.id === id; });
    if (!e) return U.toast('That entry no longer exists.', { error: true });
    var food = S.findFood(e.foodId) || {
      id: e.foodId, name: e.name, base: e.base, servings: [e.serving], gramBasis: 0, unit: 'g',
      source: e.estimated !== false ? 'db' : 'custom'
    };
    // Keep the nutrition the entry was logged with, even if the food was edited later.
    food = Object.assign({}, food, { name: e.name, base: e.base });
    openFoodDetail({ food: food, mode: 'edit', entry: e });
  }

  // Reads and validates a numeric field. Collects errors instead of throwing.
  function readNum(input, label, min, max, errs, o) {
    o = o || {};
    var raw = input.value.trim();
    input.removeAttribute('aria-invalid');
    if (raw === '') {
      if (o.optional) return null;
      errs.push({ msg: label + ' is required.', el: input }); input.setAttribute('aria-invalid', 'true'); return null;
    }
    var v = Number(raw);
    if (!isFinite(v) || v < min || v > max || (o.int && v % 1 !== 0)) {
      errs.push({ msg: label + ' must be ' + (o.int ? 'a whole number ' : '') + 'between ' + min + ' and ' + max + '.', el: input });
      input.setAttribute('aria-invalid', 'true'); return null;
    }
    return v;
  }
  function showErrors(errEl, errs) {
    if (!errs.length) { errEl.hidden = true; return false; }
    errEl.textContent = errs.map(function (e) { return e.msg; }).join(' ');
    errEl.hidden = false; errs[0].el.focus();
    return true;
  }

  function openFoodForm(existing, o) {
    o = o || {};
    var c = existing || { name: o.name || '', category: 'My foods', diet: 'veg', servingLabel: '', servingGrams: '', kcal: '', protein: '', carbs: '', fat: '' };
    function f(label, name, attrs, value, hint) {
      return '<label class="field"><span>' + label + '</span><input class="input" name="' + name + '" value="' + esc(value == null ? '' : value) + '" ' + attrs + '>' + (hint ? '<small class="muted">' + hint + '</small>' : '') + '</label>';
    }
    var numAttrs = 'type="number" inputmode="decimal" min="0" step="any"';
    U.openModal({
      title: existing ? 'Edit custom food' : 'New custom food', focus: !existing,
      body: '<form novalidate data-form>' +
        f('Food name', 'name', 'type="text" maxlength="60" required autofocus placeholder="e.g. Homemade granola"', c.name) +
        '<div class="grid-2">' +
          f('Serving description', 'servingLabel', 'type="text" maxlength="30" required placeholder="e.g. 1 bowl"', c.servingLabel) +
          f('Serving weight (g) — optional', 'servingGrams', numAttrs, c.servingGrams || '') +
        '</div>' +
        '<label class="field"><span>Dietary type</span><select class="input" name="diet">' + ['vegan', 'veg', 'egg', 'nonveg'].map(function (d) { return opt(d, DIET_NAME[d], c.diet === d); }).join('') + '</select></label>' +
        '<fieldset class="fieldset"><legend>Nutrition per serving</legend><div class="grid-2">' +
          f('Calories (kcal)', 'kcal', numAttrs + ' required', c.kcal) + f('Protein (g)', 'protein', numAttrs + ' required', c.protein) +
          f('Carbohydrates (g)', 'carbs', numAttrs + ' required', c.carbs) + f('Fats (g)', 'fat', numAttrs + ' required', c.fat) +
        '</div><p class="muted small" data-hint></p></fieldset>' +
        '<p class="form-error" data-error role="alert" hidden></p></form>',
      footer: '<button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="button" class="btn btn-primary" data-save>' + (existing ? 'Save changes' : 'Create food') + '</button>',
      onMount: function (api) {
        var form = $('[data-form]', api.body), err = $('[data-error]', api.body), hint = $('[data-hint]', api.body);
        function updateHint() {
          var p = +form.protein.value || 0, cb = +form.carbs.value || 0, ft = +form.fat.value || 0;
          hint.textContent = (p || cb || ft) ? 'These macros add up to roughly ' + Math.round(p * 4 + cb * 4 + ft * 9) + ' kcal.' : '';
        }
        form.addEventListener('input', updateHint); updateHint();
        function save() {
          var errs = [];
          var name = form.elements.name.value.trim(), label = form.servingLabel.value.trim();
          [form.elements.name, form.servingLabel].forEach(function (i) { i.removeAttribute('aria-invalid'); });
          if (!name) { errs.push({ msg: 'Food name is required.', el: form.elements.name }); form.elements.name.setAttribute('aria-invalid', 'true'); }
          if (!label) { errs.push({ msg: 'Serving description is required.', el: form.servingLabel }); form.servingLabel.setAttribute('aria-invalid', 'true'); }
          var grams = readNum(form.servingGrams, 'Serving weight', 1, 5000, errs, { optional: true });
          var kcal = readNum(form.kcal, 'Calories', 0, 5000, errs);
          var protein = readNum(form.protein, 'Protein', 0, 500, errs);
          var carbs = readNum(form.carbs, 'Carbohydrates', 0, 1000, errs);
          var fat = readNum(form.fat, 'Fats', 0, 500, errs);
          var dup = S.data.customFoods.some(function (x) { return x.id !== c.id && x.name.toLowerCase() === name.toLowerCase(); });
          if (name && dup) errs.push({ msg: 'You already have a custom food with this name.', el: form.elements.name });
          if (showErrors(err, errs)) return;
          S.saveCustomFood({
            id: c.id, name: name, category: 'My foods', diet: form.diet.value, servingLabel: label + (grams ? ' (' + g1(grams) + ' g)' : ''),
            servingGrams: grams || 0, kcal: kcal, protein: protein, carbs: carbs, fat: fat
          }).then(function () {
            U.toast(existing ? 'Custom food updated' : 'Custom food created');
            api.close(); if (o.onSaved) o.onSaved(); refresh();
          }).catch(fail);
        }
        form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
        api.foot.querySelector('[data-save]').addEventListener('click', save);
      }
    });
  }
  // Strip the "(35 g)" suffix we append so the edit form shows what the user typed.
  function customForEdit(c) {
    var copy = Object.assign({}, c);
    if (c.servingGrams) copy.servingLabel = c.servingLabel.replace(/\s*\([\d.]+ g\)$/, '');
    return copy;
  }

  function openMealBuilder(existing, seedItems) {
    var draft = existing ? JSON.parse(JSON.stringify(existing)) : { name: '', items: seedItems ? JSON.parse(JSON.stringify(seedItems)) : [] };
    U.openModal({
      title: existing ? 'Edit saved meal' : 'New saved meal', focus: !existing && !seedItems,
      body: '<form novalidate data-form><label class="field"><span>Meal name</span><input class="input" name="name" type="text" maxlength="60" required autofocus placeholder="e.g. Weekday lunch thali" value="' + esc(draft.name) + '"></label></form>' +
        '<div data-items></div>' +
        '<button type="button" class="btn btn-soft" data-add>' + icon('plus', 16) + 'Add food</button>' +
        '<p class="form-error" data-error role="alert" hidden></p>',
      footer: '<button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="button" class="btn btn-primary" data-save>Save meal</button>',
      onMount: function (api) {
        var form = $('[data-form]', api.body), box = $('[data-items]', api.body), err = $('[data-error]', api.body);
        function draw() {
          var t = S.mealTotals(draft);
          box.innerHTML = draft.items.length ? '<ul class="entries">' + draft.items.map(function (it, i) {
            var n = S.calc(it.base, it.serving.factor, it.qty);
            return '<li class="entry"><div class="entry-main"><span class="entry-name">' + esc(it.name) + '</span><span class="entry-sub">' + esc(g1(it.qty) + ' × ' + it.serving.label) + '</span></div>' +
              '<span class="entry-kcal">' + num(n.kcal) + '<small>kcal</small></span><span class="entry-actions">' +
              '<button type="button" class="icon-btn" data-edit-item="' + i + '" aria-label="Edit ' + esc(it.name) + '">' + icon('edit', 18) + '</button>' +
              '<button type="button" class="icon-btn" data-del-item="' + i + '" aria-label="Remove ' + esc(it.name) + '">' + icon('trash', 18) + '</button></span></li>';
          }).join('') + '</ul><p class="meal-total">Total: <b>' + num(t.kcal) + ' kcal</b> · P ' + g1(t.protein) + ' g · C ' + g1(t.carbs) + ' g · F ' + g1(t.fat) + ' g</p>'
            : '<div class="empty"><p>No foods in this meal yet.</p></div>';
        }
        draw();
        api.body.addEventListener('click', function (e) {
          if (e.target.closest('[data-add]')) return openPicker({ mode: 'collect', onCollect: function (item) { draft.items.push(item); err.hidden = true; draw(); } });
          var d = e.target.closest('[data-del-item]');
          if (d) { draft.items.splice(+d.getAttribute('data-del-item'), 1); return draw(); }
          var ed = e.target.closest('[data-edit-item]');
          if (ed) {
            var i = +ed.getAttribute('data-edit-item'), it = draft.items[i];
            var food = Object.assign({}, S.findFood(it.foodId) || { id: it.foodId, servings: [it.serving], gramBasis: 0, unit: 'g', source: it.estimated !== false ? 'db' : 'custom' }, { name: it.name, base: it.base });
            openFoodDetail({ food: food, mode: 'collect', item: it, onDone: function (item) { draft.items[i] = item; draw(); } });
          }
        });
        function save() {
          var name = form.elements.name.value.trim();
          if (!name) { err.textContent = 'Give this meal a name.'; err.hidden = false; form.elements.name.focus(); return; }
          if (!draft.items.length) { err.textContent = 'Add at least one food to the meal.'; err.hidden = false; return; }
          draft.name = name; delete draft.sample;
          S.saveMeal(draft).then(function () { U.toast('Meal saved'); api.close(); refresh(); }).catch(fail);
        }
        form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
        api.foot.querySelector('[data-save]').addEventListener('click', save);
      }
    });
  }

  function openLogMeal(meal) {
    var hour = new Date().getHours();
    var guess = hour < 11 ? 'breakfast' : hour < 16 ? 'lunch' : hour < 19 ? 'snack' : 'dinner';
    var t = S.mealTotals(meal);
    U.openModal({
      title: 'Log “' + meal.name + '”',
      body: '<form novalidate data-form><p class="muted">' + meal.items.length + (meal.items.length === 1 ? ' item' : ' items') + ' · ' + num(t.kcal) + ' kcal</p><div class="grid-2">' +
        '<label class="field"><span>Date</span><input class="input" type="date" name="date" value="' + S.today() + '" max="' + S.today() + '" required></label>' +
        '<label class="field"><span>Meal</span><select class="input" name="meal">' + MEALS.map(function (m) { return opt(m.id, m.label, m.id === guess); }).join('') + '</select></label></div>' +
        '<p class="form-error" data-error role="alert" hidden></p></form>',
      footer: '<button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="button" class="btn btn-primary" data-save>Add to log</button>',
      onMount: function (api) {
        var form = $('[data-form]', api.body), err = $('[data-error]', api.body);
        function save() {
          var d = form.date.value;
          if (!validDate(d) || d > S.today()) { err.textContent = 'Choose a valid date that is today or earlier.'; err.hidden = false; form.date.focus(); return; }
          logSavedMeal(meal, d, form.meal.value).then(function () { api.close(); });
        }
        form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
        api.foot.querySelector('[data-save]').addEventListener('click', save);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // Views
  // ════════════════════════════════════════════════════════════════════
  var VIEWS = {}, AFTER = {};

  function pageHead(title, sub, right) {
    return '<header class="page-head"><div><h1>' + title + '</h1>' + (sub ? '<p class="muted">' + sub + '</p>' : '') + '</div>' + (right || '') + '</header>';
  }

  // ── Dashboard ──────────────────────────────────────────────────────
  VIEWS.dashboard = function () {
    var t = S.today(), g = goals(), tot = S.totalsOn(t), entries = S.entriesOn(t);
    var profile = S.setting('profile'), flags = S.setting('flags');
    var h = new Date().getHours();
    var greet = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    var left = g.kcal - tot.kcal;
    var water = S.waterTotal(t);
    var mealsWith = MEALS.filter(function (m) { return entries.some(function (e) { return e.meal === m.id; }); }).length;

    var summary;
    if (!entries.length) summary = 'Nothing logged yet today. Add your first meal whenever you\'re ready.';
    else {
      summary = 'You\'ve logged ' + entries.length + (entries.length === 1 ? ' item' : ' items') + ' across ' + mealsWith + (mealsWith === 1 ? ' meal' : ' meals') +
        ' — ' + num(tot.kcal) + ' kcal so far, about ' + U.pct(tot.kcal, g.kcal) + '% of your daily energy goal. ' +
        'Protein is at ' + U.pct(tot.protein, g.protein) + '% of your goal and you\'ve had ' + num(water) + ' ml of water (' + U.pct(water, g.water) + '%).' +
        (left < 0 ? ' You\'ve gone past your energy goal — goals are a guide, and some days simply need more.' : '');
    }

    var week = [], byDate = S.totalsByDate();
    for (var i = 6; i >= 0; i--) {
      var d = S.addDays(t, -i), v = byDate[d] ? byDate[d].kcal : 0;
      week.push({ label: U.fmtDate(d, { weekday: 'short' }), value: v, tip: num(v) + ' kcal', tipLabel: U.relDate(d), strong: i === 0, action: 'goto-day', date: d });
    }

    return pageHead(esc(greet + (profile.name ? ', ' + profile.name : '')), U.fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long' }),
        '<button type="button" class="btn btn-primary" data-action="add-food" data-date="' + t + '">' + icon('plus', 18) + 'Log food</button>') +
      (flags.sampleBanner ? '<div class="banner"><span>' + icon('spark', 18) + '</span><p><b>You\'re looking at sample data.</b> Explore freely, then clear it to start your own log.</p>' +
        '<div class="row-gap"><button type="button" class="btn btn-soft btn-sm" data-action="remove-sample">Clear sample data</button><button type="button" class="btn btn-ghost btn-sm" data-action="dismiss-banner">Keep it</button></div></div>' : '') +
      '<div class="dash">' +
        '<section class="card cal-card"><header class="card-head"><h3>Calories</h3><button type="button" class="link" data-action="goto-day" data-date="' + t + '">Open log</button></header>' +
          '<div class="cal-body">' + U.ring({
            id: 'ring-kcal', value: tot.kcal, goal: g.kcal, size: 188, stroke: 14, from: '#ff6b70', to: '#c8262c',
            aria: tot.kcal + ' of ' + g.kcal + ' kilocalories',
            center: '<span class="ring-value">' + num(tot.kcal) + '</span><span class="ring-sub">of ' + num(g.kcal) + ' kcal</span>'
          }) +
          '<div class="cal-stats">' + tile('Eaten', num(tot.kcal), 'kcal') + tile('Daily goal', num(g.kcal), 'kcal') +
            tile(left >= 0 ? 'Remaining' : 'Above goal', num(Math.abs(left)), 'kcal') + '</div></div></section>' +
        '<section class="card macro-card"><header class="card-head"><h3>Macros</h3><span class="muted small">today</span></header><div class="macros">' + macroMeters(tot, g) + '</div></section>' +
        waterCard(t) +
        '<section class="card meals-card"><header class="card-head"><h3>Meals today</h3><span class="muted small">' + entries.length + ' logged</span></header><ul class="meal-list">' +
          MEALS.map(function (m) {
            var list = entries.filter(function (e) { return e.meal === m.id; }), mt = S.sum(list);
            return '<li><button type="button" class="meal-link" data-action="goto-day" data-date="' + t + '"><span class="meal-name">' + m.label + '</span>' +
              '<span class="meal-items">' + (list.length ? esc(list.map(function (e) { return e.name; }).join(', ')) : 'Not logged yet') + '</span></button>' +
              '<span class="meal-kcal">' + (list.length ? num(mt.kcal) + '<small>kcal</small>' : '—') + '</span>' +
              '<button type="button" class="icon-btn icon-btn-soft" data-action="add-food" data-date="' + t + '" data-meal="' + m.id + '" aria-label="Add food to ' + m.label + '">' + icon('plus', 18) + '</button></li>';
          }).join('') + '</ul></section>' +
        '<section class="card summary-card"><header class="card-head"><h3>Daily summary</h3></header><p class="summary-text">' + esc(summary) + '</p>' +
          '<h4 class="sub-h">Where today\'s energy came from</h4>' + energySplit(tot, 'Log a meal to see the split between protein, carbs and fats.') + '</section>' +
        '<section class="card week-card"><header class="card-head"><div><h3>Calories, last 7 days</h3><p class="muted small">Tap a day to open it</p></div><a class="link" href="#/analytics">Analytics</a></header>' +
          U.columns({ data: week, goal: g.kcal, goalLabel: 'Goal ' + num(g.kcal), color: C.kcal, height: 170, aria: 'Calories for the last 7 days' }) + '</section>' +
      '</div>';
  };

  // ── Food log ───────────────────────────────────────────────────────
  function dateNav(date, prefix) {
    var isToday = date >= S.today();
    return '<div class="date-nav">' +
      '<button type="button" class="icon-btn icon-btn-soft" data-action="' + prefix + '-shift" data-by="-1" aria-label="Previous day">' + icon('left') + '</button>' +
      '<label class="date-pick"><span>' + esc(U.relDate(date)) + '</span>' +
      '<input class="input" type="date" data-change="' + prefix + '-date" value="' + date + '" max="' + S.today() + '" aria-label="Choose date"></label>' +
      '<button type="button" class="icon-btn icon-btn-soft" data-action="' + prefix + '-shift" data-by="1" aria-label="Next day"' + (isToday ? ' disabled' : '') + '>' + icon('right') + '</button>' +
      (isToday ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-action="' + prefix + '-today">Today</button>') + '</div>';
  }
  function dayTiles(date) {
    var t = S.totalsOn(date), g = goals();
    return '<div class="tiles">' + tile('Calories', num(t.kcal), 'kcal', U.pct(t.kcal, g.kcal) + '% of goal') + tile('Protein', g1(t.protein), 'g', U.pct(t.protein, g.protein) + '% of goal') +
      tile('Carbs', g1(t.carbs), 'g', U.pct(t.carbs, g.carbs) + '% of goal') + tile('Fats', g1(t.fat), 'g', U.pct(t.fat, g.fat) + '% of goal') + '</div>';
  }
  VIEWS.log = function () {
    var d = state.date;
    return pageHead('Food log', 'Add, edit and remove what you ate.',
        '<button type="button" class="btn btn-primary" data-action="add-food" data-date="' + d + '">' + icon('plus', 18) + 'Add food</button>') +
      dateNav(d, 'log') + dayTiles(d) +
      '<div class="log-grid"><div class="stack">' + dayLog(d) + '</div><div class="stack">' + waterCard(d) +
      '<p class="est-note">' + icon('info', 15) + '<span>' + EST_NOTE + '</span></p></div></div>';
  };

  // ── History ────────────────────────────────────────────────────────
  VIEWS.history = function () {
    var hs = state.hist, t = S.today(), g = goals(), byDate = S.totalsByDate();
    var y = +hs.month.slice(0, 4), m = +hs.month.slice(5, 7) - 1;
    var first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    var lead = (first.getDay() + 6) % 7; // Monday first
    var cells = '';
    for (var i = 0; i < lead; i++) cells += '<span class="cal-cell is-blank"></span>';
    for (var d = 1; d <= days; d++) {
      var ds = S.ymd(new Date(y, m, d)), tot = byDate[ds];
      var ratio = tot ? tot.kcal / g.kcal : 0;
      var lvl = !tot ? 0 : ratio < 0.5 ? 1 : ratio < 0.8 ? 2 : ratio < 1.05 ? 3 : 4;
      cells += '<button type="button" class="cal-cell lvl-' + lvl + (ds === hs.selected ? ' is-selected' : '') + (ds === t ? ' is-today' : '') + '" data-action="hist-select" data-date="' + ds + '"' +
        (ds > t ? ' disabled' : '') + ' aria-pressed="' + (ds === hs.selected) + '" aria-label="' + esc(U.fmtDate(ds, { day: 'numeric', month: 'long' }) + (tot ? ', ' + tot.kcal + ' kilocalories, ' + tot.count + ' items' : ', nothing logged')) + '">' +
        '<span class="cal-num">' + d + '</span><span class="cal-kcal">' + (tot ? num(tot.kcal) : '') + '</span></button>';
    }
    var monthLabel = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    var sel = hs.selected, water = S.waterTotal(sel);
    return pageHead('History', 'Look back at any day and fix entries if needed.') +
      '<div class="hist-grid"><section class="card cal-month"><header class="card-head">' +
        '<button type="button" class="icon-btn icon-btn-soft" data-action="hist-month" data-by="-1" aria-label="Previous month">' + icon('left') + '</button>' +
        '<h3 aria-live="polite">' + esc(monthLabel) + '</h3>' +
        '<button type="button" class="icon-btn icon-btn-soft" data-action="hist-month" data-by="1" aria-label="Next month"' + (hs.month >= t.slice(0, 7) ? ' disabled' : '') + '>' + icon('right') + '</button></header>' +
        '<div class="cal-week">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
        '<div class="cal-grid">' + cells + '</div>' +
        '<div class="cal-legend"><span>Less</span><i class="lvl-1"></i><i class="lvl-2"></i><i class="lvl-3"></i><i class="lvl-4"></i><span>More energy logged, relative to your goal</span></div></section>' +
      '<div class="stack"><section class="card"><header class="card-head"><div><h3>' + esc(U.relDate(sel)) + '</h3><p class="muted small">' + esc(U.fmtDate(sel, { day: 'numeric', month: 'long', year: 'numeric' })) + ' · ' + num(water) + ' ml water</p></div>' +
        '<button type="button" class="btn btn-soft btn-sm" data-action="add-food" data-date="' + sel + '">' + icon('plus', 16) + 'Add food</button></header>' + dayTiles(sel) +
        '<h4 class="sub-h">Energy split</h4>' + energySplit(S.totalsOn(sel), 'Nothing was logged on this day.') + '</section>' +
      dayLog(sel) + waterCard(sel) + '</div></div>';
  };

  // ── Analytics ──────────────────────────────────────────────────────
  function periodDates() {
    var a = state.an, n = a.range === 'day' ? 1 : a.range === 'week' ? 7 : 30, out = [];
    for (var i = n - 1; i >= 0; i--) out.push(S.addDays(a.anchor, -i));
    return out;
  }
  function mealHistoryRows() {
    var a = state.an, dates = periodDates(), from = dates[0], to = dates[dates.length - 1];
    var q = a.q.trim().toLowerCase();
    var rows = S.data.entries.filter(function (e) {
      return e.date >= from && e.date <= to && (a.meal === 'all' || e.meal === a.meal) && (!q || e.name.toLowerCase().indexOf(q) >= 0);
    });
    var by = {
      'new': function (x, y) { return y.date.localeCompare(x.date) || y.ts - x.ts; },
      old: function (x, y) { return x.date.localeCompare(y.date) || x.ts - y.ts; },
      kcal: function (x, y) { return y.kcal - x.kcal; },
      protein: function (x, y) { return y.protein - x.protein; },
      name: function (x, y) { return x.name.localeCompare(y.name); }
    };
    return rows.sort(by[a.sort] || by['new']);
  }
  function mealHistoryList() {
    var rows = mealHistoryRows();
    return '<p class="muted small" aria-live="polite">' + rows.length + (rows.length === 1 ? ' entry' : ' entries') + '</p>' +
      (rows.length ? '<ul class="entries">' + rows.map(function (e) { return entryRow(e, true); }).join('') + '</ul>' : '<div class="empty"><p>No meals match this period and filter.</p></div>');
  }

  VIEWS.analytics = function () {
    var a = state.an, g = goals(), t = S.today(), dates = periodDates(), byDate = S.totalsByDate();
    var n = dates.length, step = a.range === 'day' ? 1 : a.range === 'week' ? 7 : 30;
    var label = n === 1 ? U.relDate(a.anchor) + ' · ' + U.fmtDate(a.anchor, { day: 'numeric', month: 'short', year: 'numeric' })
      : U.fmtDate(dates[0], { day: 'numeric', month: 'short' }) + ' – ' + U.fmtDate(a.anchor, { day: 'numeric', month: 'short', year: 'numeric' });
    var controls = '<div class="filter-row"><div class="segmented" role="tablist" aria-label="Period">' + [['day', 'Day'], ['week', 'Week'], ['month', '30 days']].map(function (r) {
        return '<button type="button" role="tab" aria-selected="' + (a.range === r[0]) + '" class="' + (a.range === r[0] ? 'is-on' : '') + '" data-action="an-range" data-range="' + r[0] + '">' + r[1] + '</button>';
      }).join('') + '</div><div class="period">' +
      '<button type="button" class="icon-btn icon-btn-soft" data-action="an-shift" data-by="' + (-step) + '" aria-label="Previous period">' + icon('left') + '</button>' +
      '<span aria-live="polite">' + esc(label) + '</span>' +
      '<button type="button" class="icon-btn icon-btn-soft" data-action="an-shift" data-by="' + step + '" aria-label="Next period"' + (a.anchor >= t ? ' disabled' : '') + '>' + icon('right') + '</button></div></div>';

    var body;
    if (n === 1) {
      var tot = byDate[a.anchor] || { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      var entries = S.entriesOn(a.anchor);
      var perMeal = MEALS.map(function (m) {
        var mt = S.sum(entries.filter(function (e) { return e.meal === m.id; }));
        return { label: m.label, value: mt.kcal, valueLabel: num(mt.kcal) + ' kcal', tip: num(mt.kcal) + ' kcal', tipLabel: m.label + ' · ' + mt.count + (mt.count === 1 ? ' item' : ' items') };
      });
      body = '<div class="tiles">' + tile('Calories', num(tot.kcal), 'kcal', U.pct(tot.kcal, g.kcal) + '% of goal') + tile('Protein', g1(tot.protein), 'g', U.pct(tot.protein, g.protein) + '% of goal') +
          tile('Carbs', g1(tot.carbs), 'g', U.pct(tot.carbs, g.carbs) + '% of goal') + tile('Fats', g1(tot.fat), 'g', U.pct(tot.fat, g.fat) + '% of goal') + '</div>' +
        '<div class="an-grid"><section class="card"><header class="card-head"><h3>Calories by meal</h3></header>' + U.hbars({ data: perMeal, color: C.kcal }) + '</section>' +
        '<section class="card"><header class="card-head"><h3>Macros vs goal</h3></header><div class="macros">' + macroMeters(tot, g) + '</div></section>' +
        '<section class="card"><header class="card-head"><h3>Energy split</h3></header>' + energySplit(tot, 'Nothing was logged on this day.') + '</section></div>';
    } else {
      var series = dates.map(function (d) { return { date: d, t: byDate[d] || { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 }, water: S.waterTotal(d) }; });
      var logged = series.filter(function (s) { return s.t.count > 0; });
      var avg = function (k) { return logged.length ? logged.reduce(function (x, s) { return x + s.t[k]; }, 0) / logged.length : 0; };
      var sumT = { protein: avg('protein'), carbs: avg('carbs'), fat: avg('fat') };
      var xl = function (d) { return n === 7 ? U.fmtDate(d, { weekday: 'short' }) : String(+d.slice(8)); };
      var chart = function (key, unit, color, goal, height, title) {
        return U.columns({
          data: series.map(function (s) {
            var v = s.t[key];
            return { label: xl(s.date), value: v, tip: (unit === 'kcal' ? num(v) : g1(v)) + ' ' + unit, tipLabel: U.fmtDate(s.date), strong: s.date === t };
          }), goal: goal, goalLabel: 'Goal ' + num(goal), color: color, height: height, labelEvery: n === 7 ? 1 : 5, aria: title
        });
      };
      var sortKey = a.tsort, dir = a.tdir;
      var tableRows = series.slice().sort(function (x, y) {
        var av = sortKey === 'date' ? x.date : sortKey === 'water' ? x.water : x.t[sortKey];
        var bv = sortKey === 'date' ? y.date : sortKey === 'water' ? y.water : y.t[sortKey];
        return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      });
      var th = function (key, text) {
        var on = sortKey === key;
        return '<th' + (on ? ' aria-sort="' + (dir > 0 ? 'ascending' : 'descending') + '"' : '') + '><button type="button" data-action="an-tsort" data-key="' + key + '">' + text + (on ? (dir > 0 ? ' ↑' : ' ↓') : '') + '</button></th>';
      };
      body = '<div class="tiles tiles-5">' + tile('Avg calories', num(avg('kcal')), 'kcal', 'per logged day') + tile('Avg protein', g1(avg('protein')), 'g', 'goal ' + g.protein + ' g') +
          tile('Avg carbs', g1(avg('carbs')), 'g', 'goal ' + g.carbs + ' g') + tile('Avg fats', g1(avg('fat')), 'g', 'goal ' + g.fat + ' g') + tile('Days logged', logged.length, '/ ' + n) + '</div>' +
        '<section class="card"><header class="card-head"><div><h3>Calories per day</h3><p class="muted small">kcal · tap a bar for details</p></div></header>' + chart('kcal', 'kcal', C.kcal, g.kcal, 220, 'Calories per day') + '</section>' +
        '<div class="an-grid">' + [['protein', 'Protein'], ['carbs', 'Carbohydrates'], ['fat', 'Fats']].map(function (m) {
          return '<section class="card"><header class="card-head"><div><h3>' + m[1] + '</h3><p class="muted small">grams per day</p></div></header>' + chart(m[0], 'g', C[m[0]], g[m[0]], 150, m[1] + ' per day') + '</section>';
        }).join('') + '</div>' +
        '<section class="card"><header class="card-head"><div><h3>Average energy split</h3><p class="muted small">Share of calories from each macro on logged days</p></div></header>' + energySplit(sumT, 'Nothing was logged in this period.') + '</section>' +
        '<section class="card"><header class="card-head"><div><h3>Daily summaries</h3><p class="muted small">Tap a column heading to sort, or a date to open that day</p></div></header><div class="table-wrap"><table class="table"><thead><tr>' +
          th('date', 'Date') + th('kcal', 'Calories') + th('protein', 'Protein') + th('carbs', 'Carbs') + th('fat', 'Fats') + th('water', 'Water') + '</tr></thead><tbody>' +
          tableRows.map(function (s) {
            return '<tr><td><button type="button" class="link" data-action="goto-day" data-date="' + s.date + '">' + esc(U.fmtDate(s.date)) + '</button></td>' +
              (s.t.count ? '<td>' + num(s.t.kcal) + '</td><td>' + g1(s.t.protein) + ' g</td><td>' + g1(s.t.carbs) + ' g</td><td>' + g1(s.t.fat) + ' g</td>' : '<td class="muted" colspan="4">Nothing logged</td>') +
              '<td>' + (s.water ? num(s.water) + ' ml' : '—') + '</td></tr>';
          }).join('') + '</tbody></table></div></section>';
    }

    return pageHead('Analytics', 'Daily and weekly patterns in what you eat.') + controls + body +
      '<section class="card"><header class="card-head"><div><h3>Meal history</h3><p class="muted small">Every entry in this period</p></div></header>' +
        '<div class="filters filters-mh">' +
          '<label><span>Search</span><input class="input" type="search" data-input="an-q" placeholder="Food name" value="' + esc(a.q) + '"></label>' +
          '<label><span>Meal</span><select class="input" data-change="an-meal">' + opt('all', 'All meals', a.meal === 'all') + MEALS.map(function (m) { return opt(m.id, m.label, a.meal === m.id); }).join('') + '</select></label>' +
          '<label><span>Sort by</span><select class="input" data-change="an-sort">' + [['new', 'Newest first'], ['old', 'Oldest first'], ['kcal', 'Calories: high to low'], ['protein', 'Protein: high to low'], ['name', 'Name A–Z']].map(function (o) { return opt(o[0], o[1], a.sort === o[0]); }).join('') + '</select></label>' +
        '</div><div id="mh-list">' + mealHistoryList() + '</div></section>';
  };

  // ── Library ────────────────────────────────────────────────────────
  VIEWS.library = function () {
    var tab = state.lib.tab, body;
    if (tab === 'database') body = '<section class="card"><div id="lib-browser"></div></section>';
    else if (tab === 'custom') {
      var cf = S.data.customFoods.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      body = '<section class="card"><header class="card-head"><div><h3>My foods</h3><p class="muted small">Foods you created with your own nutrition values</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="new-food">' + icon('plus', 16) + 'New food</button></header>' +
        (cf.length ? '<ul class="entries">' + cf.map(function (c) {
          return '<li class="entry"><div class="entry-main"><span class="entry-name"><span class="diet-dot diet-' + esc(c.diet) + '"></span> ' + esc(c.name) + '</span>' +
            '<span class="entry-sub">' + esc(c.servingLabel) + ' · P ' + g1(c.protein) + ' · C ' + g1(c.carbs) + ' · F ' + g1(c.fat) + ' g</span></div>' +
            '<span class="entry-kcal">' + num(c.kcal) + '<small>kcal</small></span><span class="entry-actions">' +
            '<button type="button" class="btn btn-soft btn-sm" data-action="log-food" data-id="' + esc(c.id) + '">Log</button>' +
            '<button type="button" class="icon-btn" data-action="edit-food" data-id="' + esc(c.id) + '" aria-label="Edit ' + esc(c.name) + '">' + icon('edit', 18) + '</button>' +
            '<button type="button" class="icon-btn" data-action="delete-food" data-id="' + esc(c.id) + '" aria-label="Delete ' + esc(c.name) + '">' + icon('trash', 18) + '</button></span></li>';
        }).join('') + '</ul>' : '<div class="empty"><p>No custom foods yet. Create one for anything that isn\'t in the database.</p></div>') + '</section>';
    } else {
      var meals = S.data.savedMeals.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      body = '<section class="card"><header class="card-head"><div><h3>Saved meals</h3><p class="muted small">Combinations you eat often, ready to log in one tap</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-action="new-meal">' + icon('plus', 16) + 'New meal</button></header>' +
        (meals.length ? '<div class="meal-cards">' + meals.map(function (m) {
          var t = S.mealTotals(m);
          return '<article class="saved-meal"><h4>' + esc(m.name) + '</h4><p class="saved-kcal">' + num(t.kcal) + ' kcal <span class="muted">· P ' + g1(t.protein) + ' · C ' + g1(t.carbs) + ' · F ' + g1(t.fat) + ' g</span></p>' +
            '<ul>' + m.items.map(function (i) { return '<li>' + esc(g1(i.qty) + ' × ' + i.name) + '</li>'; }).join('') + '</ul>' +
            '<div class="row-gap"><button type="button" class="btn btn-soft btn-sm" data-action="log-meal" data-id="' + esc(m.id) + '">' + icon('plus', 16) + 'Log meal</button>' +
            '<button type="button" class="icon-btn" data-action="edit-meal" data-id="' + esc(m.id) + '" aria-label="Edit ' + esc(m.name) + '">' + icon('edit', 18) + '</button>' +
            '<button type="button" class="icon-btn" data-action="delete-meal" data-id="' + esc(m.id) + '" aria-label="Delete ' + esc(m.name) + '">' + icon('trash', 18) + '</button></div></article>';
        }).join('') + '</div>' : '<div class="empty"><p>No saved meals yet. Build one here, or use “Save meal” on any meal in your food log.</p></div>') + '</section>';
    }
    return pageHead('Foods & meals', 'Browse the Indian food database, and manage your own foods and meals.') +
      '<div class="tabs" role="tablist">' + [['database', 'Food database'], ['custom', 'My foods (' + S.data.customFoods.length + ')'], ['meals', 'Saved meals (' + S.data.savedMeals.length + ')']].map(function (x) {
        return '<button type="button" role="tab" aria-selected="' + (tab === x[0]) + '" class="tab' + (tab === x[0] ? ' is-on' : '') + '" data-action="lib-tab" data-tab="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div>' + body;
  };
  AFTER.library = function (view) {
    var host = $('#lib-browser', view);
    if (!host) return;
    if (!state.lib.browser) state.lib.browser = newBrowserState();
    mountBrowser(host, state.lib.browser, function (food) {
      var h = new Date().getHours();
      openFoodDetail({ food: food, mode: 'log', date: S.today(), meal: h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner' });
    });
    var search = $('input[type="search"]', host);
    if (search) search.removeAttribute('autofocus');
  };

  // ── Profile ────────────────────────────────────────────────────────
  VIEWS.profile = function () {
    var p = S.setting('profile'), g = goals(), sizes = S.setting('waterSizes'), t = S.today();
    var dates = S.data.entries.map(function (e) { return e.date; }).sort();
    var first = dates[0] || t;
    var hasSample = ['entries', 'water', 'customFoods', 'savedMeals'].some(function (k) { return S.data[k].some(function (x) { return x.sample; }); });
    function f(label, name, value, attrs, hint) {
      return '<label class="field"><span>' + label + '</span><input class="input" name="' + name + '" value="' + esc(value) + '" ' + attrs + '>' + (hint ? '<small class="muted">' + hint + '</small>' : '') + '</label>';
    }
    var numA = 'type="number" inputmode="numeric" step="1" required';
    return pageHead('Profile & goals', 'Your details stay on this device.') +
      '<div class="profile-grid"><form class="card" data-submit="save-profile" novalidate><header class="card-head"><h3>About you</h3></header>' +
        '<div class="grid-2">' + f('Name', 'name', p.name, 'type="text" maxlength="40" autocomplete="given-name" placeholder="What should we call you?"') +
          f('Age', 'age', p.age, numA + ' min="5" max="110"') + '</div>' +
        '<div class="grid-2"><label class="field"><span>Dietary preference</span><select class="input" name="diet">' + DIETS.map(function (d) { return opt(d.id, d.label, p.diet === d.id); }).join('') + '</select><small class="muted">Sets the default diet filter when you search foods.</small></label>' +
          '<label class="field"><span>Activity level</span><select class="input" name="activity">' + ACTIVITY.map(function (d) { return opt(d.id, d.label, p.activity === d.id); }).join('') + '</select></label></div>' +
        '<header class="card-head card-head-inner"><div><h3>Daily nutrition goals</h3><p class="muted small">Flexible guides, not limits. Adjust them to suit you.</p></div>' +
          '<button type="button" class="btn btn-soft btn-sm" data-action="suggest-goals">' + icon('spark', 16) + 'Suggest for my age</button></header>' +
        '<div class="grid-2">' + f('Calories (kcal)', 'kcal', g.kcal, numA) + f('Protein (g)', 'protein', g.protein, numA) +
          f('Carbohydrates (g)', 'carbs', g.carbs, numA) + f('Fats (g)', 'fat', g.fat, numA) + f('Water (ml)', 'water', g.water, numA) + '</div>' +
        '<p class="note" data-goal-note>' + icon('info', 15) + '<span>' + goalNote(p.age) + '</span></p>' +
        '<p class="form-error" data-error role="alert" hidden></p>' +
        '<div class="form-actions"><button type="submit" class="btn btn-primary">Save profile & goals</button></div></form>' +

      '<div class="stack"><section class="card"><header class="card-head"><div><h3>Water serving sizes</h3><p class="muted small">Quick-add buttons shown on the water tracker</p></div></header>' +
        '<div class="chips">' + sizes.map(function (ml) {
          return '<span class="chip chip-static">' + ml + ' ml<button type="button" data-action="remove-water-size" data-ml="' + ml + '" aria-label="Remove ' + ml + ' ml">' + icon('x', 13) + '</button></span>';
        }).join('') + '</div>' +
        '<form class="inline-form" data-submit="add-water-size" novalidate><label class="sr-only" for="ws-new">New serving size in millilitres</label>' +
        '<input id="ws-new" class="input" name="ml" type="number" inputmode="numeric" min="50" max="2000" step="1" placeholder="e.g. 350"><button type="submit" class="btn btn-soft">Add size</button></form></section>' +

      '<section class="card"><header class="card-head"><div><h3>Export your data</h3><p class="muted small">Download your logs as CSV files for a spreadsheet</p></div></header>' +
        '<form data-export novalidate><div class="grid-2">' + f('From', 'from', first, 'type="date" max="' + t + '" required') + f('To', 'to', t, 'type="date" max="' + t + '" required') + '</div>' +
        '<p class="form-error" data-error role="alert" hidden></p>' +
        '<div class="row-gap wrap"><button type="button" class="btn btn-soft" data-action="export" data-kind="food">' + icon('download', 16) + 'Food log (CSV)</button>' +
        '<button type="button" class="btn btn-soft" data-action="export" data-kind="water">' + icon('download', 16) + 'Water log (CSV)</button></div></form></section>' +

      '<section class="card"><header class="card-head"><div><h3>Your data</h3><p class="muted small">' + S.data.entries.length + ' food entries · ' + S.data.water.length + ' water logs · stored ' +
        (S.backendKind() === 'indexeddb' ? 'in this browser (IndexedDB)' : 'in this browser (fallback storage)') + '</p></div></header>' +
        '<div class="row-gap wrap">' + (hasSample ? '<button type="button" class="btn btn-soft" data-action="remove-sample">Clear sample data</button>'
          : '<button type="button" class="btn btn-soft" data-action="load-sample">Load sample data</button>') +
        '<button type="button" class="btn btn-danger-ghost" data-action="clear-all">' + icon('trash', 16) + 'Erase everything</button></div></section>' +
      '<p class="est-note">' + icon('info', 15) + '<span>' + EST_NOTE + ' NutriTrack is a personal logging tool, not medical advice.</span></p></div></div>';
  };
  function goalNote(age) {
    return age < 18
      ? 'Growing bodies need plenty of energy and variety. Treat these numbers as a rough guide only, and talk to a parent, guardian or doctor before changing how you eat.'
      : 'Suggested goals are general reference ranges for your age and activity level — a starting point, not a prescription. Everyone\'s needs differ.';
  }

  // ════════════════════════════════════════════════════════════════════
  // CSV export
  // ════════════════════════════════════════════════════════════════════
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s; // stop spreadsheet formula injection
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function download(name, rows) {
    var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  }
  function exportCsv(kind, from, to) {
    var rows, list;
    if (kind === 'food') {
      list = S.data.entries.filter(function (e) { return e.date >= from && e.date <= to; })
        .sort(function (a, b) { return a.date.localeCompare(b.date) || a.ts - b.ts; });
      rows = [['Date', 'Meal', 'Food', 'Serving', 'Quantity', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Values']];
      list.forEach(function (e) { rows.push([e.date, mealLabel(e.meal), e.name, e.serving.label, e.qty, e.kcal, e.protein, e.carbs, e.fat, e.estimated !== false ? 'Estimate' : 'User-entered']); });
    } else {
      list = S.data.water.filter(function (w) { return w.date >= from && w.date <= to; })
        .sort(function (a, b) { return a.date.localeCompare(b.date) || a.ts - b.ts; });
      rows = [['Date', 'Time', 'Amount (ml)']];
      list.forEach(function (w) { rows.push([w.date, new Date(w.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }), w.ml]); });
    }
    if (!list.length) return 0;
    download('nutritrack-' + kind + '-log-' + from + '-to-' + to + '.csv', rows);
    return list.length;
  }

  // ════════════════════════════════════════════════════════════════════
  // Actions
  // ════════════════════════════════════════════════════════════════════
  function guessMeal() { var h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner'; }
  function go(route) { if (location.hash !== '#/' + route) location.hash = '#/' + route; else render(true); }

  var ACTIONS = {
    'add-food': function (el) { openPicker({ mode: 'log', date: el.dataset.date || S.today(), meal: el.dataset.meal || guessMeal() }); },
    'edit-entry': function (el) { editEntry(el.dataset.id); },
    'delete-entry': function (el) {
      var e = S.data.entries.find(function (x) { return x.id === el.dataset.id; });
      if (!e) return;
      S.deleteEntries([e.id]).then(function () {
        refresh();
        U.toast(e.name + ' removed', { actionLabel: 'Undo', onAction: function () { S.addEntries([e]).then(refresh).catch(fail); } });
      }).catch(fail);
    },
    'save-meal-from': function (el) {
      var items = S.entriesOn(el.dataset.date).filter(function (e) { return e.meal === el.dataset.meal; }).map(function (e) {
        return { foodId: e.foodId, name: e.name, serving: e.serving, qty: e.qty, base: e.base, estimated: e.estimated };
      });
      if (items.length) openMealBuilder(null, items);
    },
    'add-water': function (el) {
      S.addWater(el.dataset.date, +el.dataset.ml).then(function (w) {
        refresh();
        U.toast(w.ml + ' ml added', { actionLabel: 'Undo', onAction: function () { S.deleteWater(w.id).then(refresh).catch(fail); } });
      }).catch(fail);
    },
    'del-water': function (el) { S.deleteWater(el.dataset.id).then(refresh).catch(fail); },
    'goto-day': function (el) { if (el.dataset.date) { state.date = el.dataset.date; go('log'); } },

    'log-shift': function (el) { var d = S.addDays(state.date, +el.dataset.by); if (d <= S.today()) { state.date = d; refresh(); } },
    'log-today': function () { state.date = S.today(); refresh(); },

    'hist-month': function (el) {
      var y = +state.hist.month.slice(0, 4), m = +state.hist.month.slice(5, 7) - 1 + (+el.dataset.by);
      var d = new Date(y, m, 1), ms = S.ymd(d).slice(0, 7);
      if (ms > S.today().slice(0, 7)) return;
      state.hist.month = ms; refresh();
    },
    'hist-select': function (el) { state.hist.selected = el.dataset.date; refresh(); },

    'an-range': function (el) { state.an.range = el.dataset.range; refresh(); },
    'an-shift': function (el) {
      var d = S.addDays(state.an.anchor, +el.dataset.by), t = S.today();
      state.an.anchor = d > t ? t : d; refresh();
    },
    'an-tsort': function (el) {
      var a = state.an, k = el.dataset.key;
      if (a.tsort === k) a.tdir = -a.tdir; else { a.tsort = k; a.tdir = -1; }
      refresh();
    },

    'lib-tab': function (el) { state.lib.tab = el.dataset.tab; refresh(); },
    'new-food': function () { openFoodForm(null); },
    'edit-food': function (el) { var c = S.data.customFoods.find(function (x) { return x.id === el.dataset.id; }); if (c) openFoodForm(customForEdit(c)); },
    'log-food': function (el) { var f = S.findFood(el.dataset.id); if (f) openFoodDetail({ food: f, mode: 'log', date: S.today(), meal: guessMeal() }); },
    'delete-food': function (el) {
      var c = S.data.customFoods.find(function (x) { return x.id === el.dataset.id; });
      if (!c) return;
      U.confirm({ title: 'Delete custom food?', message: '“' + c.name + '” will be removed from your foods. Entries you already logged with it are kept.', confirmLabel: 'Delete', danger: true })
        .then(function (ok) { if (ok) return S.deleteCustomFood(c.id).then(function () { U.toast('Custom food deleted'); refresh(); }); }).catch(fail);
    },
    'new-meal': function () { openMealBuilder(null); },
    'edit-meal': function (el) { var m = S.data.savedMeals.find(function (x) { return x.id === el.dataset.id; }); if (m) openMealBuilder(m); },
    'log-meal': function (el) { var m = S.data.savedMeals.find(function (x) { return x.id === el.dataset.id; }); if (m) openLogMeal(m); },
    'delete-meal': function (el) {
      var m = S.data.savedMeals.find(function (x) { return x.id === el.dataset.id; });
      if (!m) return;
      U.confirm({ title: 'Delete saved meal?', message: '“' + m.name + '” will be removed. Your food log is not affected.', confirmLabel: 'Delete', danger: true })
        .then(function (ok) { if (ok) return S.deleteMeal(m.id).then(function () { U.toast('Saved meal deleted'); refresh(); }); }).catch(fail);
    },

    'suggest-goals': function (el) {
      var form = el.closest('form'), errs = [], err = $('[data-error]', form);
      var age = readNum(form.age, 'Age', 5, 110, errs, { int: true });
      if (showErrors(err, errs)) return;
      var s = S.suggestGoals(age, form.activity.value);
      ['kcal', 'protein', 'carbs', 'fat', 'water'].forEach(function (k) { form[k].value = s[k]; form[k].removeAttribute('aria-invalid'); });
      $('[data-goal-note] span', form).textContent = goalNote(age);
      U.toast('Suggested goals filled in — review them, then save.');
    },
    'remove-water-size': function (el) {
      var sizes = S.setting('waterSizes').filter(function (x) { return x !== +el.dataset.ml; });
      if (!sizes.length) return U.toast('Keep at least one serving size.', { error: true });
      S.setSetting('waterSizes', sizes).then(refresh).catch(fail);
    },
    'export': function (el) {
      var form = el.closest('form'), err = $('[data-error]', form), from = form.from.value, to = form.to.value;
      var msg = !validDate(from) || !validDate(to) ? 'Choose a valid start and end date.' : from > to ? 'The start date must be on or before the end date.' : '';
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
      try {
        var n = exportCsv(el.dataset.kind, from, to);
        if (!n) U.toast('There is nothing to export in that date range.', { error: true });
        else U.toast('Exported ' + n + (n === 1 ? ' row' : ' rows') + ' to CSV');
      } catch (e) { fail(new Error('The export could not be created.')); }
    },
    'remove-sample': function () {
      U.confirm({ title: 'Clear sample data?', message: 'This removes the example meals, water logs, custom foods and saved meals. Anything you added or edited yourself is kept.', confirmLabel: 'Clear sample data' })
        .then(function (ok) { if (ok) return S.removeSampleData().then(function () { U.toast('Sample data cleared'); refresh(); }); }).catch(fail);
    },
    'load-sample': function () { S.seed().then(function () { U.toast('Sample data loaded'); refresh(); }).catch(fail); },
    'dismiss-banner': function () { var f = S.setting('flags'); f.sampleBanner = false; S.setSetting('flags', f).then(refresh).catch(fail); },
    'clear-all': function () {
      U.confirm({ title: 'Erase everything?', message: 'This permanently deletes all food entries, water logs, custom foods, saved meals, your profile and goals from this device. It cannot be undone.', confirmLabel: 'Erase everything', danger: true })
        .then(function (ok) { if (ok) return S.clearAll().then(function () { state.lib.browser = null; U.toast('All data erased'); refresh(); }); }).catch(fail);
    }
  };

  var SUBMITS = {
    'add-water-custom': function (form) {
      var v = Number(form.ml.value);
      if (!form.ml.value.trim() || !isFinite(v) || v < 1 || v > 5000 || v % 1 !== 0) {
        form.ml.setAttribute('aria-invalid', 'true'); form.ml.focus();
        return U.toast('Enter a whole number of millilitres between 1 and 5000.', { error: true });
      }
      S.addWater(form.dataset.date, v).then(function (w) {
        refresh();
        U.toast(w.ml + ' ml added', { actionLabel: 'Undo', onAction: function () { S.deleteWater(w.id).then(refresh).catch(fail); } });
      }).catch(fail);
    },
    'add-water-size': function (form) {
      var v = Number(form.ml.value), sizes = S.setting('waterSizes');
      if (!form.ml.value.trim() || !isFinite(v) || v < 50 || v > 2000 || v % 1 !== 0) { form.ml.focus(); return U.toast('Enter a size between 50 and 2000 ml.', { error: true }); }
      if (sizes.indexOf(v) >= 0) return U.toast('That size is already in the list.', { error: true });
      if (sizes.length >= 6) return U.toast('You can keep up to 6 serving sizes. Remove one first.', { error: true });
      sizes.push(v); sizes.sort(function (a, b) { return a - b; });
      S.setSetting('waterSizes', sizes).then(function () { U.toast(v + ' ml added'); refresh(); }).catch(fail);
    },
    'save-profile': function (form) {
      var errs = [], err = $('[data-error]', form);
      var age = readNum(form.age, 'Age', 5, 110, errs, { int: true });
      var min = S.minKcal(age == null ? 25 : age);
      var kcal = readNum(form.kcal, 'Calories', 500, 6000, errs, { int: true });
      if (kcal != null && kcal < min) {
        errs.push({ msg: 'A calorie goal below ' + min + ' kcal is too low to be a healthy everyday target' + (age < 18 ? ' at your age' : '') + '. Try “Suggest for my age” for a reasonable starting point.', el: form.kcal });
        form.kcal.setAttribute('aria-invalid', 'true');
      }
      var g = {
        kcal: kcal,
        protein: readNum(form.protein, 'Protein', 10, 400, errs, { int: true }),
        carbs: readNum(form.carbs, 'Carbohydrates', 20, 900, errs, { int: true }),
        fat: readNum(form.fat, 'Fats', 10, 300, errs, { int: true }),
        water: readNum(form.water, 'Water', 500, 6000, errs, { int: true })
      };
      if (showErrors(err, errs)) return;
      var p = { name: form.elements.name.value.trim().slice(0, 40), age: age, diet: form.diet.value, activity: form.activity.value };
      Promise.all([S.setSetting('profile', p), S.setSetting('goals', g)]).then(function () {
        state.lib.browser = null; U.toast('Profile and goals saved'); refresh();
      }).catch(fail);
    }
  };

  var CHANGES = {
    'log-date': function (el) {
      if (validDate(el.value) && el.value <= S.today()) { state.date = el.value; refresh(); }
      else { U.toast('Choose today or an earlier date.', { error: true }); refresh(); }
    },
    'an-meal': function (el) { state.an.meal = el.value; $('#mh-list').innerHTML = mealHistoryList(); },
    'an-sort': function (el) { state.an.sort = el.value; $('#mh-list').innerHTML = mealHistoryList(); }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    var fn = ACTIONS[el.dataset.action];
    if (fn) fn(el, e);
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.cchart-col[data-action]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('submit', function (e) {
    var name = e.target.getAttribute('data-submit');
    if (!name) return;
    e.preventDefault();
    if (SUBMITS[name]) SUBMITS[name](e.target);
  });
  document.addEventListener('change', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-change');
    if (k && CHANGES[k]) CHANGES[k](e.target);
  });
  document.addEventListener('input', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('data-input') === 'an-q') { state.an.q = e.target.value; $('#mh-list').innerHTML = mealHistoryList(); }
  });

  // ════════════════════════════════════════════════════════════════════
  // Routing & boot
  // ════════════════════════════════════════════════════════════════════
  function render(fresh) {
    var view = $('#view');
    U.hideTip();
    view.className = 'view view-' + state.route + (fresh ? ' fresh' : '');
    view.innerHTML = VIEWS[state.route]();
    if (AFTER[state.route]) AFTER[state.route](view);
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === state.route;
      a.classList.toggle('is-on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var nav = NAV.find(function (n) { return n.id === state.route; });
    document.title = (nav ? nav.long + ' · ' : '') + 'NutriTrack';
    var p = S.setting('profile');
    var av = $('#avatar'); if (av) av.textContent = (p.name || 'N').trim().charAt(0).toUpperCase() || 'N';
    if (fresh) window.scrollTo(0, 0);
  }
  function refresh() { render(false); }

  function onRoute() {
    var r = location.hash.replace(/^#\/?/, '');
    state.route = NAV.some(function (n) { return n.id === r; }) ? r : 'dashboard';
    render(true);
  }

  function boot() {
    var link = function (n, cls) {
      return '<a class="' + cls + '" href="#/' + n.id + '" data-nav="' + n.id + '">' + icon(n.icon, 22) + '<span>' + (cls === 'side-link' ? n.long : n.label) + '</span></a>';
    };
    $('#side-nav').innerHTML = NAV.map(function (n) { return link(n, 'side-link'); }).join('');
    $('#bottom-nav').innerHTML = NAV.filter(function (n) { return n.id !== 'profile'; }).map(function (n) { return link(n, 'tab-link'); }).join('');
    S.init().then(function (kind) {
      document.body.classList.remove('is-loading');
      window.addEventListener('hashchange', onRoute);
      onRoute();
      if (kind !== 'indexeddb') U.toast('This browser is blocking IndexedDB, so NutriTrack is using fallback storage. Data may not persist in private mode.', { error: true, duration: 7000 });
      // Roll the "today" views over if the app is left open past midnight.
      var lastDay = S.today();
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && S.today() !== lastDay) { lastDay = S.today(); state.date = lastDay; state.an.anchor = lastDay; state.hist.selected = lastDay; state.hist.month = lastDay.slice(0, 7); refresh(); }
      });
    }).catch(function (err) {
      document.body.classList.remove('is-loading');
      $('#view').innerHTML = '<div class="card fatal"><h2>NutriTrack could not start</h2><p class="muted">Your browser storage could not be opened. Try reloading the page, or use a normal (non-private) browser window.</p><p class="muted small">' + esc(err && err.message) + '</p><button type="button" class="btn btn-primary" onclick="location.reload()">Reload</button></div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
