// Kelvane 01 configurator: options, price, the shareable link, and the hand-over to the 3D scene.
// Everything on the page works without WebGL; the 3D view is added on top when it is available.
import { createScene } from './scene.js';
import { CATALOGUE, DEFAULTS, cleanText, readConfig, writeConfig, lidIsSteel, priceLines, money } from './config.js';

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// Query switches for testing: ?still (no motion) and ?nowebgl (flat artwork only).
const query = new URLSearchParams(location.search);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || query.has('still');

/* ------------------------------------------------------------------ */
/* Page state                                                          */
/* ------------------------------------------------------------------ */
const form = $('#config');
const config = readConfig(query);
let scene = null;

function fillLines(list, lines) {
  list.textContent = '';
  for (const line of lines) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = line.label;
    dd.textContent = money(line.amount, line.base);
    row.append(dt, dd);
    list.append(row);
  }
}

/** Write the configuration into every part of the page that shows it. */
function render() {
  const c = CATALOGUE;
  const colour = c.colour[config.colour];
  const boot = c.boot[config.boot];
  const text = config.text.trim();

  $('#now-colour').textContent = colour.name;
  $('#colour-text').textContent = colour.text;
  $('#now-boot').textContent = boot.name;
  $('#boot-text').textContent = config.boot === 'none'
    ? 'Without the boot the bottle stands on its steel base. A boot can be added later for $6.'
    : 'The boot stops the bottle ringing on a desk and sliding on a wet counter.';
  $('#now-text').textContent = text ? `“${text}”` : 'None';
  $('#lidfinish-group').hidden = config.colour === 'steel';

  const { lines, total } = priceLines(config);
  fillLines($('#lines'), lines);
  $('#total').textContent = `$${total}`;
  $('#ship').textContent = text
    ? 'Engraved bottles leave the workshop within five working days. Shipping is free.'
    : 'Leaves the workshop within two working days. Shipping is free.';

  // The flat artwork follows along, for the moments and the browsers without 3D.
  root.style.setProperty('--finish', colour.hex || colour.flat);
  root.style.setProperty('--print', colour.print);
  root.style.setProperty('--lid', lidIsSteel(config) ? c.colour.steel.flat : colour.hex);
  root.style.setProperty('--boot', boot.hex || 'transparent');
  $('#p-boot').style.display = config.boot === 'none' ? 'none' : '';
  $('#p-loop').style.display = config.lid === 'loop' ? '' : 'none';

  const lidWords = `${c.lid[config.lid].name.toLowerCase()} lid${lidIsSteel(config) && config.colour !== 'steel' ? ' in brushed steel' : ''}`;
  $('#stage').setAttribute('aria-label',
    `Kelvane 01, ${c.size[config.size].name}, in ${colour.name.toLowerCase()}, with a ${lidWords}`
    + (config.boot === 'none' ? ' and no boot' : ` and a ${boot.name.toLowerCase()} boot`)
    + (text ? `, engraved “${text}”` : '') + '. Use the arrow keys to turn it.');

  const qs = writeConfig(config);
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

/** Push the whole configuration to the 3D scene. */
function applyToScene() {
  if (!scene) return;
  const c = CATALOGUE;
  scene.setSize(config.size === '900');
  scene.setBody(c.colour[config.colour].hex);
  scene.setLid(config.lid, lidIsSteel(config) ? null : c.colour[config.colour].hex);
  scene.setBoot(c.boot[config.boot].hex);
  scene.setEngraving(config.text);
}

function setView(name) {
  $$('#views button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  if (!scene) return;
  scene.setView(name);
  if (name !== 'full') $('#hint').classList.add('is-gone'); // close-ups fill the space the hint sits in
}

// Set the form controls from the starting configuration (it may have come from a shared link).
for (const key of ['size', 'colour', 'lid', 'lidfinish', 'boot']) {
  const input = form.querySelector(`input[name="${key}"][value="${config[key]}"]`);
  if (input) input.checked = true;
}
form.elements.text.value = config.text;
render();

form.addEventListener('change', (event) => {
  const { name, value } = event.target;
  if (!Object.hasOwn(DEFAULTS, name) || name === 'text') return;
  config[name] = value;
  render();
  applyToScene();
  if (!scene) return;
  // Bring the part that just changed into view.
  if (name === 'colour') { setView('full'); scene.spin(); }
  else if (name === 'size') setView('full');
  else if (name === 'lid' || name === 'lidfinish') setView('lid');
  else if (name === 'boot') setView('base');
});

const textInput = form.elements.text;
textInput.addEventListener('input', () => {
  const cleaned = cleanText(textInput.value);
  if (cleaned !== textInput.value) textInput.value = cleaned;
  config.text = cleaned;
  render();
  if (scene) { scene.setEngraving(cleaned); if (cleaned.trim()) setView('mark'); }
});
textInput.addEventListener('focus', () => { if (scene && config.text.trim()) setView('mark'); });

$$('#views button').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));

/* ------------------------------------------------------------------ */
/* Cart and link                                                       */
/* ------------------------------------------------------------------ */
const cart = $('#cart');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const { lines, total } = priceLines(config);
  fillLines($('#cart-lines'), lines);
  $('#cart-total').textContent = `$${total}`;
  if (typeof cart.showModal === 'function') cart.showModal();
});
cart.addEventListener('click', (event) => { if (event.target === cart) cart.close(); }); // a click on the backdrop

const copyButton = $('#copy');
const copyLabel = copyButton.textContent;
let copyTimer = 0;
copyButton.addEventListener('click', async () => {
  let done = false;
  try { await navigator.clipboard.writeText(location.href); done = true; } catch (error) {
    // Older browsers, and pages that may not use the clipboard directly: copy from a hidden field.
    const field = document.createElement('textarea');
    field.value = location.href;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(field);
    field.select();
    try { done = document.execCommand('copy'); } catch (error2) { done = false; }
    field.remove();
    copyButton.focus();
  }
  copyButton.textContent = done ? 'Link copied' : 'Copy the address from the address bar';
  copyButton.classList.toggle('is-done', done);
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { copyButton.textContent = copyLabel; copyButton.classList.remove('is-done'); }, 2400);
});

/* ------------------------------------------------------------------ */
/* 3D view                                                             */
/* ------------------------------------------------------------------ */
const stage = $('#stage');
const canvas = $('#canvas');

function webglAvailable() {
  if (query.has('nowebgl')) return false;
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch (error) { return false; }
}

function bindTurning() {
  let dragging = false, lastX = 0, lastY = 0;
  const hint = $('#hint');
  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragging = true; lastX = event.clientX; lastY = event.clientY;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    scene.turn((event.clientX - lastX) * 0.009, (event.clientY - lastY) * 0.004);
    lastX = event.clientX; lastY = event.clientY;
    hint.classList.add('is-gone');
  });
  const stop = () => { dragging = false; stage.classList.remove('is-dragging'); };
  stage.addEventListener('pointerup', stop);
  stage.addEventListener('pointercancel', stop);
  stage.addEventListener('keydown', (event) => {
    const step = { ArrowLeft: [-0.35, 0], ArrowRight: [0.35, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[event.key];
    if (!step) return;
    event.preventDefault();
    scene.turn(step[0], step[1]);
    hint.classList.add('is-gone');
  });
}

async function start3d() {
  if (!webglAvailable()) { root.classList.add('no-webgl'); return; }
  try {
    const THREE = await import(THREE_URL);
    scene = await createScene(THREE, canvas, { reducedMotion });
    const narrow = window.matchMedia('(max-width: 920px)');
    const fit = () => {
      // Keep the bottle clear of the brand at the top and the view buttons at the bottom.
      scene.setInsets(narrow.matches ? 44 : 64, narrow.matches ? 66 : 140);
      scene.resize(stage.clientWidth, stage.clientHeight);
    };
    fit();
    new ResizeObserver(fit).observe(stage);
    applyToScene();
    scene.snap();
    await scene.prepare();
    scene.onFirstFrame(() => root.classList.add('is-live'));
    scene.wake();
    bindTurning();
    new IntersectionObserver(([entry]) => scene.setVisible(entry.isIntersecting && !document.hidden)).observe(stage);
    document.addEventListener('visibilitychange', () => scene.setVisible(!document.hidden));
    window.kelvane = scene; // handy when testing from the console
  } catch (error) {
    console.error('3D view unavailable:', error);
    scene = null;
    root.classList.add('no-webgl');
  }
}

// The options are usable straight away. The 3D view starts once the page has loaded and the
// browser has a quiet moment, so it never competes with the first paint.
function whenIdle(run) {
  const idle = () => (window.requestIdleCallback ? requestIdleCallback(run, { timeout: 600 }) : setTimeout(run, 60));
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}
whenIdle(start3d);
