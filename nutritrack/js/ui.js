/* NutriTrack – UI primitives: escaping, formatting, icons, toasts, modals, tooltips, charts. */
(function () {
  'use strict';

  // ── Escaping & formatting ──────────────────────────────────────────
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function num(n) { return Math.round(n).toLocaleString('en-IN'); }
  function g1(n) { var v = Math.round(n * 10) / 10; return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)); }
  function pct(v, goal) { return goal > 0 ? Math.round((v / goal) * 100) : 0; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function fmtDate(ymd, opts) {
    var p = ymd.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString('en-IN', opts || { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function relDate(ymd) {
    var S = window.NT.store, t = S.today();
    if (ymd === t) return 'Today';
    if (ymd === S.addDays(t, -1)) return 'Yesterday';
    return fmtDate(ymd, { weekday: 'long', day: 'numeric', month: 'short' });
  }

  // ── Icons (inline SVG, stroke style) ───────────────────────────────
  var PATHS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    log: '<path d="M7 3v8a2.5 2.5 0 0 0 5 0V3"/><path d="M9.5 3v18"/><path d="M17 3c-1.7 1.5-2.5 3.7-2.5 6.5V13H17"/><path d="M17 3v18"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/><path d="M9 7.5h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1.2-3.6 4.2-5.5 8-5.5s6.800 1.900 8 5.500"/>',
    drop: '<path d="M12 3c3.500 4.200 6 7.400 6 10.500a6 6 0 0 1-12 0C6 10.400 8.500 7.200 12 3z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6.500 7l1 13h9l1-13M10 11v5M14 11v5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.500 6.500 4 4"/>',
    search: '<circle cx="11" cy="11" r="6.500"/><path d="m16 16 4.500 4.500"/>',
    left: '<path d="m14.500 5-7 7 7 7"/>',
    right: '<path d="m9.500 5 7 7-7 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    download: '<path d="M12 4v11M7.500 11 12 15.500 16.500 11M4.500 20h15"/>',
    check: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
    bookmark: '<path d="M6.500 3.500h11V21L12 17l-5.500 4z"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.500 2.500M15.500 15.500 18 18M18 6l-2.500 2.500M8.500 15.500 6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v.500"/>'
  };
  function icon(name, size) {
    var s = size || 20;
    return '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (PATHS[name] || '') + '</svg>';
  }

  // ── Toasts ─────────────────────────────────────────────────────────
  function toast(msg, opts) {
    opts = opts || {};
    var host = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast' + (opts.error ? ' is-error' : '');
    el.setAttribute('role', opts.error ? 'alert' : 'status');
    var span = document.createElement('span'); span.textContent = msg; el.appendChild(span);
    if (opts.actionLabel && opts.onAction) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'toast-action'; b.textContent = opts.actionLabel;
      b.addEventListener('click', function () { remove(); opts.onAction(); });
      el.appendChild(b);
    }
    host.appendChild(el);
    while (host.children.length > 3) host.removeChild(host.firstChild);
    var timer = setTimeout(remove, opts.duration || (opts.onAction ? 5500 : 2800));
    function remove() { clearTimeout(timer); if (el.parentNode) el.parentNode.removeChild(el); }
  }

  // ── Modal stack ────────────────────────────────────────────────────
  var stack = [];
  function openModal(o) {
    var host = document.getElementById('modals');
    var wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML =
      '<div class="modal' + (o.wide ? ' modal-wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '">' +
        '<header class="modal-head"><h2>' + esc(o.title) + '</h2>' +
        '<button type="button" class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button></header>' +
        '<div class="modal-body">' + (o.body || '') + '</div>' +
        (o.footer ? '<footer class="modal-foot">' + o.footer + '</footer>' : '') +
      '</div>';
    var prevFocus = document.activeElement;
    var api = {
      el: wrap,
      body: wrap.querySelector('.modal-body'),
      foot: wrap.querySelector('.modal-foot'),
      close: function () {
        var i = stack.indexOf(api);
        if (i < 0) return;
        stack.splice(i, 1);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        if (!stack.length) document.body.classList.remove('modal-open');
        if (o.onClose) o.onClose();
        if (prevFocus && prevFocus.focus && document.contains(prevFocus)) { try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }
    };
    var downOnBackdrop = false;
    wrap.addEventListener('pointerdown', function (e) { downOnBackdrop = e.target === wrap; });
    wrap.addEventListener('click', function (e) {
      if ((e.target === wrap && downOnBackdrop) || e.target.closest('[data-close]')) api.close();
    });
    host.appendChild(wrap);
    stack.push(api);
    document.body.classList.add('modal-open');
    if (o.onMount) o.onMount(api);
    var auto = wrap.querySelector('[autofocus]');
    // Avoid popping the keyboard open on touch devices unless explicitly requested.
    if (auto && (o.focus || !matchMedia('(pointer: coarse)').matches)) auto.focus();
    else wrap.querySelector('.modal').setAttribute('tabindex', '-1'), wrap.querySelector('.modal').focus({ preventScroll: true });
    return api;
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && stack.length) { e.preventDefault(); stack[stack.length - 1].close(); }
  });

  function confirmDialog(o) {
    return new Promise(function (resolve) {
      var done = false;
      var m = openModal({
        title: o.title,
        body: '<p class="confirm-text">' + esc(o.message) + '</p>',
        footer: '<button type="button" class="btn btn-ghost" data-close>Cancel</button>' +
                '<button type="button" class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-ok autofocus>' + esc(o.confirmLabel || 'Confirm') + '</button>',
        onClose: function () { if (!done) resolve(false); },
        onMount: function (api) {
          api.foot.querySelector('[data-ok]').addEventListener('click', function () { done = true; resolve(true); api.close(); });
        }
      });
      return m;
    });
  }

  // ── Tooltip (hover, focus and tap) ─────────────────────────────────
  var tipEl = null, tipTarget = null;
  function showTip(target) {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    tipTarget = target;
    tipEl.textContent = '';
    var v = document.createElement('strong'); v.textContent = target.getAttribute('data-tip');
    var l = document.createElement('span'); l.textContent = target.getAttribute('data-tip-label') || '';
    tipEl.appendChild(v); tipEl.appendChild(l);
    tipEl.classList.add('is-on');
    var r = target.getBoundingClientRect(), tr = tipEl.getBoundingClientRect();
    var anchor = target.querySelector('.bar') || target;
    var ar = anchor.getBoundingClientRect();
    var x = clamp(r.left + r.width / 2 - tr.width / 2, 8, window.innerWidth - tr.width - 8);
    var y = Math.max(8, Math.min(ar.top, r.bottom - 12) - tr.height - 8);
    tipEl.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('is-on'); tipTarget = null; }
  document.addEventListener('pointerover', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (t) showTip(t); else if (tipTarget && e.pointerType === 'mouse') hideTip();
  });
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t); });
  document.addEventListener('focusin', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t); });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('pointerdown', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) hideTip();
  });
  window.addEventListener('scroll', hideTip, true);

  // ── Charts ─────────────────────────────────────────────────────────
  /** Circular progress ring. */
  function ring(o) {
    var size = o.size || 180, sw = o.stroke || 14, r = (size - sw) / 2, c = 2 * Math.PI * r;
    var frac = o.goal > 0 ? clamp(o.value / o.goal, 0, 1) : 0;
    var off = c * (1 - frac);
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(o.aria || '') + '">' +
        '<defs><linearGradient id="' + o.id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + o.from + '"/><stop offset="1" stop-color="' + o.to + '"/></linearGradient></defs>' +
        '<circle class="ring-track" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + sw + '" fill="none"/>' +
        (frac > 0 ? '<circle class="ring-fill" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + sw + '" fill="none" stroke="url(#' + o.id + ')" stroke-linecap="round" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" style="--circ:' + c.toFixed(2) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' : '') +
      '</svg><div class="ring-center">' + (o.center || '') + '</div></div>';
  }

  /** Linear meter: fill + track of the same hue. */
  function meter(o) {
    var p = o.goal > 0 ? clamp((o.value / o.goal) * 100, 0, 100) : 0;
    return '<div class="meter" style="--c:' + o.color + '" role="img" aria-label="' + esc(o.aria || '') + '"><div class="meter-fill" style="width:' + p.toFixed(1) + '%"></div></div>';
  }

  function niceMax(v) {
    if (v <= 0) return 10;
    var pow = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / pow;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 8 ? 8 : 10;
    return step * pow;
  }

  /**
   * Column chart. o = { data:[{label, value, tip, tipLabel, strong, action}], goal, goalLabel,
   *                    color, height, unit, labelEvery, aria }
   */
  function columns(o) {
    var vals = o.data.map(function (d) { return d.value; });
    var top = niceMax(Math.max.apply(null, vals.concat([o.goal || 0, 1])) * 1.08);
    var ticks = [0, top / 4, top / 2, (top * 3) / 4, top];
    var every = o.labelEvery || 1;
    var h = '<div class="cchart" style="--h:' + (o.height || 180) + 'px;--c:' + o.color + '" role="group" aria-label="' + esc(o.aria || '') + '">';
    h += '<div class="cchart-plot">';
    ticks.forEach(function (t) {
      h += '<div class="cchart-grid" style="bottom:' + ((t / top) * 100).toFixed(2) + '%"><span>' + num(t) + '</span></div>';
    });
    if (o.goal > 0) {
      h += '<div class="cchart-goal" style="bottom:' + ((o.goal / top) * 100).toFixed(2) + '%"><span>' + esc(o.goalLabel || 'Goal') + '</span></div>';
    }
    h += '<div class="cchart-cols' + (o.data.length > 10 ? ' is-dense' : '') + '">';
    o.data.forEach(function (d, i) {
      var p = clamp((d.value / top) * 100, 0, 100);
      h += '<div class="cchart-col' + (d.strong ? ' is-strong' : '') + '" tabindex="0" data-tip="' + esc(d.tip) + '" data-tip-label="' + esc(d.tipLabel || '') + '"' +
        (d.action ? ' data-action="' + esc(d.action) + '" data-date="' + esc(d.date || '') + '"' : '') + '>' +
        '<div class="bar" style="height:' + p.toFixed(2) + '%;animation-delay:' + Math.min(i * 22, 400) + 'ms"></div></div>';
    });
    h += '</div></div><div class="cchart-x' + (o.data.length > 10 ? ' is-dense' : '') + '">';
    o.data.forEach(function (d, i) {
      h += '<span class="' + (d.strong ? 'is-strong' : '') + '">' + ((i % every === 0 || d.strong) ? esc(d.label) : '') + '</span>';
    });
    return h + '</div></div>';
  }

  /** Horizontal bars. o = { data:[{label, value, tip, tipLabel}], color, unit } */
  function hbars(o) {
    var max = Math.max.apply(null, o.data.map(function (d) { return d.value; }).concat([1]));
    return '<div class="hbars" style="--c:' + o.color + '">' + o.data.map(function (d, i) {
      return '<div class="hbar-row" tabindex="0" data-tip="' + esc(d.tip) + '" data-tip-label="' + esc(d.tipLabel || '') + '">' +
        '<span class="hbar-label">' + esc(d.label) + '</span>' +
        '<span class="hbar-track"><span class="hbar-fill" style="width:' + ((d.value / max) * 100).toFixed(1) + '%;animation-delay:' + i * 60 + 'ms"></span></span>' +
        '<span class="hbar-val">' + esc(d.valueLabel) + '</span></div>';
    }).join('') + '</div>';
  }

  /** Thin segmented bar + legend: one whole split into parts. parts:[{label,value,color,detail}] */
  function segments(parts, emptyText) {
    var total = parts.reduce(function (a, p) { return a + p.value; }, 0);
    if (total <= 0) return '<div class="seg seg-empty"></div><p class="muted small">' + esc(emptyText || 'Nothing logged yet.') + '</p>';
    var bar = '<div class="seg" role="img" aria-label="' + esc(parts.map(function (p) { return p.label + ' ' + Math.round((p.value / total) * 100) + '%'; }).join(', ')) + '">' +
      parts.map(function (p) {
        var share = (p.value / total) * 100;
        return p.value > 0 ? '<span tabindex="0" style="flex:' + share.toFixed(2) + ' 0 0;background:' + p.color + '" data-tip="' + Math.round(share) + '%" data-tip-label="' + esc(p.label + (p.detail ? ' · ' + p.detail : '')) + '"></span>' : '';
      }).join('') + '</div>';
    var legend = '<ul class="legend">' + parts.map(function (p) {
      return '<li><i style="background:' + p.color + '"></i><span>' + esc(p.label) + '</span><b>' + Math.round((p.value / total) * 100) + '%</b></li>';
    }).join('') + '</ul>';
    return bar + legend;
  }

  window.NT = window.NT || {};
  window.NT.ui = {
    esc: esc, num: num, g1: g1, pct: pct, clamp: clamp, fmtDate: fmtDate, relDate: relDate, icon: icon,
    toast: toast, openModal: openModal, confirm: confirmDialog, hideTip: hideTip,
    ring: ring, meter: meter, columns: columns, hbars: hbars, segments: segments
  };
})();
