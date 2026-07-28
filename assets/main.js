/* ============================================================
   FRAMER'S CORNER
   1  shop hours / open-closed
   2  mobile menu
   3  page chrome — progress hairline, sticky call bar
   4  scroll reveals
   5  parallax engine — hero teardown, band drift, gallery wall
   6  review carousel
   7  the shop, on an actual map
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer:coarse)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ==========================================================
     1 — open / closed indicator
     ========================================================== */
  var HOURS = { 0: [11, 17], 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [10, 18] };
  var NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function fmt(h) { var s = h % 12 === 0 ? 12 : h % 12; return s + (h < 12 ? ' am' : ' pm'); }

  (function status() {
    var now = new Date(), d = now.getDay(), t = now.getHours() + now.getMinutes() / 60;
    var o = HOURS[d][0], c = HOURS[d][1], open = t >= o && t < c;
    var text, shut = false;

    if (open) {
      text = 'Open now · until ' + fmt(c);
    } else {
      shut = true;
      text = t < o
        ? 'Opens ' + fmt(o) + ' today'
        : 'Closed · opens ' + fmt(HOURS[(d + 1) % 7][0]) + ' ' + NAMES[(d + 1) % 7];
    }

    ['statusText', 'statusTextMenu'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.textContent = text;
    });
    if (shut) ['dot', 'dotMenu'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.classList.add('dot--shut');
    });

    /* rows are grouped (Mon–Fri, Sat, Sun) — light up the one today falls in */
    $$('#hoursTable tr[data-days]').forEach(function (tr) {
      if (tr.dataset.days.split(',').indexOf(String(d)) > -1) tr.classList.add('today');
    });
  })();

  /* ==========================================================
     2 — mobile menu
     ========================================================== */
  (function menu() {
    var burger = $('#burger'), panel = $('#menu');
    if (!burger || !panel) return;
    var open = false;

    function set(next) {
      if (next === open) return;
      open = next;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('is-locked', open);

      if (open) {
        panel.hidden = false;
        /* let the browser see the hidden state before transitioning out of it */
        requestAnimationFrame(function () { panel.classList.add('is-open'); });
      } else {
        panel.classList.remove('is-open');
        var done = function () { if (!open) panel.hidden = true; };
        reduce ? done() : setTimeout(done, 380);
      }
    }

    burger.addEventListener('click', function () { set(!open); });
    $$('a', panel).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { set(false); burger.focus(); }
    });
    window.matchMedia('(min-width:1121px)').addEventListener('change', function (e) {
      if (e.matches) set(false);
    });
  })();

  /* ==========================================================
     3 — page chrome: progress hairline + sticky call bar
     runs regardless of motion preference
     ========================================================== */
  (function chrome() {
    var prog = $('#prog'), bar = $('#callbar'), hero = $('.hero'), visit = $('#visit');
    if (!prog && !bar) return;
    var heroBottom = 0, visitTop = 0, docMax = 1, frame = 0;

    function measure() {
      var vh = window.innerHeight;
      heroBottom = hero ? hero.offsetTop + hero.offsetHeight : vh;
      visitTop = visit ? visit.offsetTop : Infinity;
      docMax = Math.max(1, document.documentElement.scrollHeight - vh);
    }

    function paint() {
      frame = 0;
      var y = window.scrollY;
      if (prog) prog.style.width = Math.min(100, (y / docMax) * 100) + '%';
      if (bar) {
        /* up once the hero is behind you, down again at the visit block —
           the phone number is already the loudest thing on screen there */
        var show = y > heroBottom - window.innerHeight * 0.5 &&
                   y < visitTop - window.innerHeight * 0.55;
        bar.classList.toggle('is-up', show);
        bar.setAttribute('aria-hidden', String(!show));
      }
    }

    function onScroll() { if (!frame) frame = requestAnimationFrame(paint); }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); paint(); });
    window.addEventListener('load', function () { measure(); paint(); });
    measure(); paint();
  })();

  /* ==========================================================
     4 — scroll reveals
     ========================================================== */
  (function reveals() {
    var items = $$('.rise');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || reduce) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var sibs = [].indexOf.call(e.target.parentElement.children, e.target);
        e.target.style.transitionDelay = Math.min(sibs, 5) * 70 + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ==========================================================
     5 — parallax engine
     ========================================================== */
  (function parallax() {
    if (reduce) return;

    var hero    = $('.hero');
    var stick   = $('.hero__stick');
    var copy    = $('.hero__copy');
    var stage   = $('.hero__stage');
    var stack   = $('#stack');
    var layers  = $$('.layer');
    var labels  = $$('.layer__label');
    var readout = $('#readout');
    var reads   = $$('.readout__item');
    var field   = $('#bandField');
    var band    = $('.band');
    var pieces  = $$('.piece[data-speed]');
    if (!hero || !layers.length) return;

    /* touch momentum already lags; ease less so it doesn't feel like syrup */
    var EASE = coarse ? 0.4 : 0.16;
    /* how far each layer travels when the frame comes apart, front to back */
    var SPREAD = [-300, -150, 0, 150, 300];
    /* the spread was drawn against a 552px-tall stack — scale it to whatever
       the stack actually is, so a phone gets the same gesture, not a smaller one */
    var BASE = 552;

    var heroTop = 0, heroH = 1, bandTop = 0, bandH = 1, stackH = BASE, travel = 320;
    var target = 0, current = 0, running = false, readIdx = -1;
    var lift = 0;   /* phones only: how far the stage rises as the copy bows out */

    function measure() {
      heroTop = hero.offsetTop;
      heroH   = hero.offsetHeight;
      if (band) { bandTop = band.offsetTop; bandH = band.offsetHeight; }
      if (stack) stackH = stack.getBoundingClientRect().height || BASE;
      travel = Math.min(320, window.innerWidth * 0.42);

      /* on the stacked phone layout the copy sits above the frame, so the
         layers have nowhere to fly. Work out how far the stage has to rise
         to sit centred between the rail and the read-out once the copy goes. */
      lift = 0;
      if (copy && stage && stick && readout && getComputedStyle(readout).display !== 'none') {
        var t = stage.style.transform;
        stage.style.transform = 'none';
        var stickR = stick.getBoundingClientRect();
        var stackR = (stack || stage).getBoundingClientRect();
        var readR  = readout.getBoundingClientRect();
        stage.style.transform = t;

        var railH  = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail')) || 52;
        var want   = (railH + (readR.top - stickR.top)) / 2;          /* the free band's centre */
        var have   = stackR.top - stickR.top + stackR.height / 2;     /* where the frame sits now */
        lift = Math.max(0, have - want);
      }
      if (!lift && copy && stage) {   /* rotated back to the wide layout — hand it all back */
        copy.style.opacity = copy.style.transform = copy.style.pointerEvents = '';
        stage.style.transform = '';
      }

      /* pieces are mid-transform — clear, read, restore */
      pieces.forEach(function (el) {
        var t = el.style.transform;
        el.style.transform = 'none';
        el._top = el.getBoundingClientRect().top + window.scrollY;
        el._h = el.offsetHeight;
        el.style.transform = t;
      });
    }

    function apply() {
      var vh = window.innerHeight;
      var p = (current - heroTop) / Math.max(1, heroH - vh);
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      var ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

      /* --- phones: the copy hands the screen over --- */
      if (lift && copy && stage) {
        var f = Math.min(1, ease / 0.32);
        copy.style.opacity = String(1 - f);
        copy.style.transform = 'translate3d(0,' + (-20 * f) + 'px,0)';
        copy.style.pointerEvents = f > 0.85 ? 'none' : '';
        stage.style.transform = 'translate3d(0,' + (-lift * f) + 'px,0)';
      }

      /* --- the frame comes apart --- */
      var k = stackH / BASE;
      layers.forEach(function (el) {
        var order = parseInt(el.dataset.layer, 10);   /* 1 = glazing (front) … 5 = moulding */
        var y     = ease * SPREAD[order - 1] * k;
        var scale = 1 + ease * (0.12 - order * 0.028);
        var rot   = ease * (order - 3) * 1.6;
        el.style.transform = 'translate3d(0,' + y + 'px,0) scale(' + scale + ') rotate(' + rot + 'deg)';
      });
      labels.forEach(function (l) {
        l.style.opacity = Math.max(0, Math.min(1, (ease - 0.35) / 0.3));
        l.style.transform = 'translateY(-50%) translateX(' + ((1 - ease) * 14) + 'px)';
      });

      /* --- phones read the same call-outs one at a time --- */
      if (reads.length) {
        var i = Math.min(reads.length - 1, Math.floor(ease * reads.length * 0.999));
        if (i !== readIdx) {
          readIdx = i;
          reads.forEach(function (r, n) { r.classList.toggle('on', n === i); });
        }
      }

      /* --- drifting corner field behind the reviews --- */
      if (field && band) {
        var bt = bandTop - current;
        if (bt < vh && bt + bandH > 0) {
          field.style.transform = 'translate3d(0,' + (((vh - bt) / (vh + bandH)) * -160) + 'px,0)';
        }
      }

      /* --- gallery wall: pieces rise at their own rate --- */
      pieces.forEach(function (el) {
        var top = el._top - current;
        if (top < vh && top + el._h > 0) {
          var q = (vh - top) / (vh + el._h) - 0.5;
          el.style.transform = 'translate3d(0,' + (q * parseFloat(el.dataset.speed) * travel) + 'px,0)';
        }
      });
    }

    function tick() {
      current += (target - current) * EASE;
      if (Math.abs(target - current) < 0.4) { current = target; running = false; }
      apply();
      if (running) requestAnimationFrame(tick);
    }

    function onScroll() {
      target = window.scrollY;
      if (!running) { running = true; requestAnimationFrame(tick); }
    }

    var rt;
    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        measure();
        target = current = window.scrollY;
        apply();
      }, 120);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('load', function () { measure(); apply(); });

    measure();
    target = current = window.scrollY;
    apply();
  })();

  /* ==========================================================
     6 — review carousel
     ========================================================== */
  (function reviews() {
    var track = $('#revTrack');
    if (!track) return;
    var cards = [].slice.call(track.children);
    var prev = $('#revPrev'), next = $('#revNext'), count = $('#revCount');
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var idx = 0, timer = null, resume = null, raf = 0;

    function centerOf(i) { return cards[i].offsetLeft - (track.clientWidth - cards[i].clientWidth) / 2; }

    function nearest() {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = Infinity;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function paint() {
      cards.forEach(function (c, i) {
        c.classList.toggle('is-near', i === idx);
        /* the dimmed neighbours are decoration — keep them out of the reading order */
        c.setAttribute('aria-hidden', String(i !== idx));
      });
      count.textContent = pad(idx + 1) + ' / ' + pad(cards.length);
    }
    function go(i, jump) {
      idx = (i + cards.length) % cards.length;
      track.scrollTo({ left: centerOf(idx), behavior: (jump || reduce) ? 'auto' : 'smooth' });
      paint();
    }

    track.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var n = nearest();
        if (n !== idx) { idx = n; paint(); }
      });
    }, { passive: true });

    prev.addEventListener('click', function () { go(idx - 1); hold(); });
    next.addEventListener('click', function () { go(idx + 1); hold(); });

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); hold(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); go(idx - 1); hold(); }
    });

    /* click-and-drag for mouse users; touch keeps native momentum scrolling */
    var down = false, startX = 0, startL = 0, moved = 0;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') { hold(); return; }
      down = true; moved = 0; startX = e.clientX; startL = track.scrollLeft;
      track.classList.add('dragging'); track.setPointerCapture(e.pointerId); hold();
    });
    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      moved = e.clientX - startX;
      track.scrollLeft = startL - moved;
    });
    function release() {
      if (!down) return;
      down = false; track.classList.remove('dragging');
      go(nearest(), true);
    }
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('click', function (e) { if (Math.abs(moved) > 6) e.preventDefault(); }, true);

    /* autoplay — stops the moment anyone touches it, restarts after a lull */
    function play() { if (reduce) return; stop(); timer = setInterval(function () { go(idx + 1); }, 6500); }
    function stop() { clearInterval(timer); timer = null; }
    function hold() { stop(); clearTimeout(resume); resume = setTimeout(play, 11000); }

    track.addEventListener('pointerenter', stop);
    track.addEventListener('pointerleave', function () { if (!down) hold(); });
    track.addEventListener('touchstart', hold, { passive: true });
    track.addEventListener('focusin', stop);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : hold(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? play() : stop(); });
      }, { threshold: 0.25 }).observe(track);
    } else { play(); }

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { go(idx, true); }, 120);
    });
    paint();
  })();

  /* ==========================================================
     7 — the shop, on an actual map
     ========================================================== */
  function initMap() {
    var SHOP = [40.8588185, -74.3412202];   /* 22 US-46 W, Pine Brook NJ */
    var box = $('#map'), el = $('#mapCanvas');
    if (!box || !el) return;
    if (!window.L) { box.classList.add('is-offline'); return; }

    var hint = $('#mapHint'), gate = $('#mapGate');

    var map = L.map(el, {
      center: SHOP,
      zoom: 16,
      scrollWheelZoom: false,        /* don't hijack the page scroll */
      dragging: !coarse,             /* on a phone, a swipe is a swipe until asked otherwise */
      tap: !coarse,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    L.marker(SHOP, {
      icon: L.divIcon({
        className: '',
        html: '<div class="pin"><span class="pin__ring"></span><span class="pin__dot"></span>' +
              '<span class="pin__tag">Framer\'s Corner<em>22 US-46 W</em></span></div>',
        iconSize: [0, 0]
      }),
      keyboard: true,
      title: "Framer's Corner, 22 US-46 W, Pine Brook NJ"
    }).addTo(map);

    if (coarse && gate) {
      if (hint) hint.style.display = 'none';
      gate.hidden = false;
      gate.addEventListener('click', function () {
        map.dragging.enable();
        map.touchZoom.enable();
        gate.hidden = true;
        map.invalidateSize();
      });
    } else {
      /* wheel zoom only after the map is clicked, then release on mouse-out */
      map.on('click focus', function () {
        map.scrollWheelZoom.enable();
        if (hint) hint.classList.add('gone');
      });
      map.on('mouseout', function () { map.scrollWheelZoom.disable(); });
    }

    /* keep the shop centred when the container resizes */
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { map.invalidateSize(); map.setView(SHOP); }, 150);
    });
  }

  if (window.L) initMap();
  else window.addEventListener('load', initMap);
})();
