/*
 * Portfolio swarm: an original, dependency-free interpretation of the
 * build-as-you-scroll idea seen in DhvanilPatel/swarm-cursors and Joel Califa's
 * Swarm. No extension APIs, DOM snapshots, remote scripts, or sound required.
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.className = 'swarm-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const controls = document.createElement('div');
  controls.className = 'swarm-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Swarm animation');
  controls.innerHTML = '<button type="button" class="swarm-replay">✦ Replay build</button><button type="button" class="swarm-toggle" aria-pressed="false">Pause swarm</button>';
  document.body.append(canvas, controls);
  const replay = controls.querySelector('.swarm-replay');
  const toggle = controls.querySelector('.swarm-toggle');
  const selector = '.hero .tag,.hero h1 .line,.hero .role,.hero .lead,.hero .cta a,.portrait,.sec-head h2,.about-grid .big,.stat,.edu,.card,.tl-wrap,.meter,.svc,#contact h2,#contact .cta';
  const targets = [...document.querySelectorAll(selector)];
  const colors = ['#ffc400', '#4d7cff', '#2fd38a', '#ff758f', '#b89aff', '#42d9df'];
  const names = ['Editor', 'Motion', 'Colorist', 'Director', 'Sound', 'Camera'];
  const cursors = colors.slice(0, innerWidth < 600 ? 4 : 6).map((color, i) => ({
    color, name: names[i], x: innerWidth * .5, y: innerHeight * .46, task: null
  }));
  const queue = [];
  const seen = new Set();
  const pointer = {x: innerWidth * .5, y: innerHeight * .46, at: -Infinity};
  let frame = 0, lastFrame = 0, idleUntil = 0, paused = false;
  try { paused = localStorage.getItem('portfolio-swarm-paused') === 'true'; } catch {}

  const visible = el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < innerHeight - 64 && r.bottom > 60 && getComputedStyle(el).display !== 'none';
  };
  const ease = t => 1 - Math.pow(1 - t, 3);
  const clamp = t => Math.min(1, Math.max(0, t));
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function wake() {
    if (!frame && !paused && !reduced.matches && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function clearTasks() {
    queue.length = 0;
    for (const cursor of cursors) {
      cursor.task?.animation.cancel();
      cursor.task = null;
    }
    cancelAnimationFrame(frame);
    frame = 0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
  function syncControls() {
    toggle.textContent = paused ? 'Resume swarm' : 'Pause swarm';
    toggle.setAttribute('aria-pressed', String(paused));
    canvas.hidden = paused;
  }
  function enqueue(el) {
    if (paused || reduced.matches || document.hidden || seen.has(el) || !visible(el)) return;
    seen.add(el);
    queue.push(el);
    wake();
  }
  function start(cursor, el, now) {
    const vertical = el.matches('.portrait,.card,.tl-wrap,.edu');
    const duration = el.matches('.line') ? 1200 : 950;
    const animation = el.animate([
      {clipPath: vertical ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)', offset: 0},
      {clipPath: vertical ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)', offset: .24},
      {clipPath: 'inset(0 0 0 0)', offset: 1}
    ], {duration, easing: vertical ? 'ease-in-out' : 'steps(28, end)'});
    cursor.task = {el, animation, start: now, duration, vertical, fromX: cursor.x, fromY: cursor.y};
  }
  function label(text, x, y, color, dark = false) {
    ctx.font = '10px ui-monospace, monospace';
    const w = ctx.measureText(text).width + 12;
    x = Math.max(3, Math.min(x, innerWidth - w - 3));
    y = Math.max(14, Math.min(y, innerHeight - 66));
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 11, w, 18);
    ctx.fillStyle = dark ? '#0b0b0d' : '#fff';
    ctx.fillText(text, x + 6, y + 1);
  }
  function box(r, progress, color, vertical) {
    const outline = ease(clamp(progress / .24));
    const w = r.width * outline, h = r.height * outline;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = .65;
    ctx.strokeRect(r.left, r.top, w, h);
    ctx.fillStyle = color;
    for (const [x, y] of [[r.left, r.top], [r.left + w, r.top], [r.left, r.top + h], [r.left + w, r.top + h]]) {
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    if (progress > .24) {
      const p = clamp((progress - .24) / .76);
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      if (vertical) {
        const y = r.top + r.height * p;
        ctx.moveTo(Math.max(0, r.left - 20), y);
        ctx.lineTo(Math.min(innerWidth, r.right + 20), y);
      } else {
        const x = r.left + r.width * p;
        ctx.moveTo(x, Math.max(48, r.top - 20));
        ctx.lineTo(x, Math.min(innerHeight - 64, r.bottom + 20));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    label(`${Math.round(w)} × ${Math.round(h)}`, r.left, r.top - 9, color, true);
  }
  function arrow(cursor, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cursor.x, cursor.y);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(2, 19); ctx.lineTo(7, 13);
    ctx.lineTo(13, 22); ctx.lineTo(17, 19); ctx.lineTo(11, 10); ctx.lineTo(19, 9); ctx.closePath();
    ctx.fillStyle = cursor.color; ctx.fill();
    ctx.strokeStyle = '#0b0b0d'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = alpha;
    label(cursor.name, cursor.x + 15, cursor.y + 30, cursor.color, true);
    ctx.globalAlpha = 1;
  }
  function draw(now) {
    frame = 0;
    if (paused || reduced.matches || document.hidden) return;
    // Decorative drawing is capped at 30fps; DOM animation uses the browser compositor.
    if (now - lastFrame < 32) { wake(); return; }
    lastFrame = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const modalOpen = document.querySelector('.modal.open');
    let working = false;
    cursors.forEach((cursor, i) => {
      if (cursor.task && (!visible(cursor.task.el) || modalOpen)) {
        cursor.task.animation.cancel();
        cursor.task = null;
      }
      if (!cursor.task && !modalOpen) {
        while (queue.length) {
          const el = queue.shift();
          if (visible(el)) { start(cursor, el, now); break; }
        }
      }
      if (cursor.task) {
        const task = cursor.task, r = task.el.getBoundingClientRect();
        const p = clamp((now - task.start) / task.duration);
        if (p >= 1) {
          task.animation.cancel(); cursor.task = null; idleUntil = now + 1300;
        } else {
          working = true;
          box(r, p, cursor.color, task.vertical);
          const travel = ease(clamp(p / .24));
          const build = clamp((p - .24) / .76);
          const x = task.vertical ? r.right : r.left + r.width * build;
          const y = task.vertical ? r.top + r.height * build : r.bottom;
          cursor.x = task.fromX + (x - task.fromX) * travel;
          cursor.y = task.fromY + (y - task.fromY) * travel;
          arrow(cursor, 1);
          return;
        }
      }
      const until = Math.max(idleUntil, pointer.at + 1600);
      if (until > now && !modalOpen) {
        const angle = i * Math.PI * 2 / cursors.length + now * .00035;
        const radius = innerWidth < 600 ? 34 : 65;
        const x = Math.max(20, Math.min(innerWidth - 75, pointer.x + Math.cos(angle) * radius));
        const y = Math.max(65, Math.min(innerHeight - 110, pointer.y + Math.sin(angle) * radius * .6));
        cursor.x += (x - cursor.x) * .13;
        cursor.y += (y - cursor.y) * .13;
        arrow(cursor, clamp((until - now) / 500) * .8);
        working = true;
      }
    });
    if (working || queue.length) wake();
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) enqueue(entry.target); });
  }, {threshold: .12, rootMargin: '-55px 0px -70px 0px'});
  targets.forEach(el => observer.observe(el));
  replay.addEventListener('click', () => {
    if (reduced.matches) return;
    paused = false; syncControls(); clearTasks();
    try { localStorage.setItem('portfolio-swarm-paused', 'false'); } catch {}
    targets.filter(visible).forEach(el => { seen.delete(el); enqueue(el); });
  });
  toggle.addEventListener('click', () => {
    paused = !paused; syncControls(); clearTasks();
    try { localStorage.setItem('portfolio-swarm-paused', String(paused)); } catch {}
    if (!paused) targets.filter(visible).forEach(el => { seen.delete(el); enqueue(el); });
  });
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || e.target.closest('.swarm-controls,.modal')) return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.at = performance.now(); wake();
  }, {passive: true});
  addEventListener('resize', () => { clearTasks(); size(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearTasks();
    else targets.filter(visible).forEach(enqueue);
  });
  reduced.addEventListener('change', () => {
    clearTasks();
    if (!reduced.matches) targets.filter(visible).forEach(el => { seen.delete(el); enqueue(el); });
  });
  size(); syncControls();
})();
