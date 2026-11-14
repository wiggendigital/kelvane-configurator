// Kelvane 01 configurator: the catalogue and the sums. No page or 3D code in here,
// so it can be tested on its own (see tests/config.test.js).

/* ------------------------------------------------------------------ */
/* The catalogue: every choice, its price and its words                */
/* ------------------------------------------------------------------ */
export const CATALOGUE = {
  size: {
    600: { name: '600 ml', price: 58 },
    900: { name: '900 ml', price: 68 },
  },
  colour: {
    glacier: { name: 'Glacier', hex: '#a9bcc6', print: '#727f85', text: 'A pale blue-grey powder coat, close to the colour of glacial meltwater.' },
    ember: { name: 'Ember', hex: '#c2552d', print: '#83391e', text: 'A burnt terracotta orange. It is the easiest one to spot at the bottom of a bag.' },
    moss: { name: 'Moss', hex: '#56653f', print: '#999f92', text: 'A dark olive green. Of all the finishes, it shows scuffs and fingerprints the least.' },
    dune: { name: 'Dune', hex: '#d6c5a5', print: '#90856f', text: 'A warm sand beige. It absorbs the least heat, so it stays cooler to hold in the sun.' },
    basalt: { name: 'Basalt', hex: '#34373d', print: '#8f9092', text: 'A charcoal that is nearly black, with a fine grain you can see up close.' },
    steel: { name: 'Bare steel', hex: null, flat: '#c3c8cc', print: '#5b6066', text: 'Brushed stainless steel with no coating. It picks up fine scratches over the years, and many people like it better for that.' },
  },
  lid: {
    loop: { name: 'Carry loop', price: 0 },
    flat: { name: 'Flat cap', price: 0 },
  },
  lidfinish: {
    match: { name: 'body colour', price: 0 },
    steel: { name: 'brushed steel', price: 4 },
  },
  boot: {
    black: { name: 'Black', hex: '#17181c', price: 0 },
    stone: { name: 'Stone', hex: '#b9b4a8', price: 0 },
    clay: { name: 'Clay', hex: '#94614a', price: 0 },
    none: { name: 'No boot', hex: null, price: -6 },
  },
  engraving: { price: 9, max: 16 },
};

export const DEFAULTS = { size: '600', colour: 'glacier', lid: 'loop', lidfinish: 'match', boot: 'black', text: '' };

/** Keep letters, digits, spaces and a few marks; collapse runs of spaces; cut to length. */
export function cleanText(value) {
  return value.replace(/[^\p{L}\p{N} .&'’+-]/gu, '').replace(/\s+/g, ' ').replace(/^ /, '').slice(0, CATALOGUE.engraving.max);
}

/** Read a configuration from a query string, ignoring anything that is not in the catalogue. */
export function readConfig(params) {
  const config = { ...DEFAULTS };
  for (const key of ['size', 'colour', 'lid', 'lidfinish', 'boot']) {
    const value = params.get(key);
    if (value !== null && Object.hasOwn(CATALOGUE[key], value)) config[key] = value;
  }
  config.text = cleanText(params.get('text') || '').trim();
  return config;
}

/** The query string for a configuration. Default choices are left out, so links stay short. */
export function writeConfig(config) {
  const params = new URLSearchParams();
  for (const key of Object.keys(DEFAULTS)) {
    const value = key === 'text' ? config.text.trim() : config[key];
    if (value !== DEFAULTS[key]) params.set(key, value);
  }
  return params.toString();
}

/** A bare steel body has a steel lid already, so the lid finish is no longer a choice. */
export const lidIsSteel = (config) => config.colour === 'steel' || config.lidfinish === 'steel';

/** Price lines and the total for a configuration. */
export function priceLines(config) {
  const c = CATALOGUE;
  const lines = [];
  lines.push({ label: `Kelvane 01, ${c.size[config.size].name}`, amount: c.size[config.size].price, base: true });
  lines.push({ label: `Colour: ${c.colour[config.colour].name}`, amount: 0 });
  const lidExtra = config.colour !== 'steel' && config.lidfinish === 'steel';
  lines.push({
    label: `Lid: ${c.lid[config.lid].name}${lidExtra ? ', brushed steel' : ''}`,
    amount: c.lid[config.lid].price + (lidExtra ? c.lidfinish.steel.price : 0),
  });
  lines.push({ label: config.boot === 'none' ? 'No silicone boot' : `Boot: ${c.boot[config.boot].name}`, amount: c.boot[config.boot].price });
  const text = config.text.trim();
  if (text) lines.push({ label: `Engraving: “${text}”`, amount: c.engraving.price });
  return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) };
}

export function money(amount, base = false) {
  if (base) return `$${amount}`;
  if (amount === 0) return 'Included';
  return amount > 0 ? `+$${amount}` : `−$${-amount}`;
}
