// Stylised menu illustrations (flat vector art, clearly not photographs).
// Each owner-uploaded photo replaces the illustration for that item.
// Browser-safe; returns SVG markup strings.

const C = {
  bowl: '#FFFFFF', bowlShade: '#EADFD0', rim: '#A8322A', rimDeep: '#7A231D', basil: '#2E5B3F', basilLight: '#4F8A5B',
  penne: '#F1C76A', penneDark: '#D9A441', noodle: '#F3D27E', noodleDark: '#DDB257',
  alfredo: '#F6E7C8', alfredoDark: '#E7CF9F', mex: '#D9572B', mexDark: '#B33F1C', pesto: '#5E8F3E', pestoDark: '#3F6B2A',
  tomato: '#C0392B', tomatoDark: '#962A1F', cheese: '#F2C94C', cheeseDark: '#D9A932',
  chicken: '#E9C38F', chickenDark: '#C99A5E', shrimp: '#F08A5D', shrimpDark: '#D2643A', beef: '#6B3A26', tuna: '#C9A88C',
  pepperRed: '#D63B2F', pepperGreen: '#4C8A3A', fried: '#D9963A', friedDark: '#B5762A', potato: '#E9B85A', potatoSkin: '#B07A3C',
  mozz: '#FFF6DE', paper: '#FFFFFF', ink: '#2B201B', shadow: 'rgba(42,27,21,.14)', cream: '#FBF6EE',
};

function wrap(inner, label, viewBox = '0 0 200 160') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${label}" focusable="false">${inner}</svg>`;
}

function shadow(cx = 100, cy = 146, rx = 78) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="7" fill="${C.shadow}"/>`;
}

/** A wide pasta bowl seen at three-quarter view; `fill` draws the food inside the opening. */
function bowl(fill) {
  return `${shadow(100, 146, 80)}
    <path d="M18 78 q4 58 82 62 q78 -4 82 -62z" fill="${C.bowl}"/>
    <path d="M24 92 q10 40 76 44 q66 -4 76 -44" fill="none" stroke="${C.bowlShade}" stroke-width="5"/>
    <path d="M30 112 q20 18 70 20 q50 -2 70 -20" fill="none" stroke="${C.rim}" stroke-width="3" opacity=".85"/>
    <ellipse cx="100" cy="78" rx="82" ry="22" fill="${C.bowlShade}"/>
    <ellipse cx="100" cy="78" rx="74" ry="18" fill="${C.cream}"/>
    <g>${fill}</g>
    <ellipse cx="100" cy="78" rx="82" ry="22" fill="none" stroke="${C.rim}" stroke-width="2.5"/>`;
}

/** Short pasta tubes (penne) piled in the bowl. */
function penne(seed = 1) {
  const out = [];
  for (let i = 0; i < 14; i++) {
    const a = (i * 47 + seed * 13) % 360;
    const x = 48 + ((i * 53 + seed * 7) % 104);
    const y = 64 + ((i * 29 + seed * 11) % 22);
    out.push(`<g transform="rotate(${a % 70 - 35} ${x} ${y})"><rect x="${x - 11}" y="${y - 4}" width="22" height="8" rx="3" fill="${C.penne}"/><path d="M${x - 7} ${y - 4} l-3 8 M${x - 1} ${y - 4} l-3 8 M${x + 5} ${y - 4} l-3 8" stroke="${C.penneDark}" stroke-width="1.2"/></g>`);
  }
  return out.join('');
}

/** Long pasta (spaghetti or fettuccine) twirled into a nest. */
function nest(width = 3, color = C.noodle, dark = C.noodleDark) {
  const rings = [];
  for (let i = 0; i < 6; i++) {
    const rx = 58 - i * 8, ry = 15 - i * 2;
    rings.push(`<ellipse cx="${100 + (i % 2) * 3}" cy="${74 - i * 1.5}" rx="${rx}" ry="${ry}" fill="none" stroke="${i % 2 ? dark : color}" stroke-width="${width}"/>`);
  }
  rings.push(`<path d="M52 80 q20 -16 48 -6 q26 8 46 -8" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`);
  return rings.join('');
}

function sauce(color, dark) {
  return `<path d="M62 76 q12 -10 26 -4 q12 -8 26 -1 q12 -6 22 4 q-4 10 -22 10 q-16 5 -30 1 q-16 3 -22 -10z" fill="${color}" opacity=".9"/>
    <path d="M60 72 q10 -4 18 0 M104 70 q8 -3 16 1" stroke="${dark}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
}

const TOP = {
  chicken: () => [[70, 66, -10], [96, 60, 8], [122, 66, -4], [84, 76, 12], [112, 76, -14]].map(([x, y, r]) =>
    `<g transform="rotate(${r} ${x} ${y})"><rect x="${x - 9}" y="${y - 5}" width="18" height="10" rx="3" fill="${C.chicken}"/><path d="M${x - 6} ${y - 2} h12 M${x - 6} ${y + 2} h12" stroke="${C.chickenDark}" stroke-width="1.4"/></g>`).join(''),
  shrimp: () => [[72, 66], [100, 60], [128, 68], [88, 78], [116, 78]].map(([x, y], i) =>
    `<g transform="rotate(${i * 50} ${x} ${y})"><path d="M${x - 9} ${y} a9 9 0 1 1 9 9" fill="none" stroke="${C.shrimp}" stroke-width="6" stroke-linecap="round"/><path d="M${x - 6} ${y - 4} l3 3 M${x - 2} ${y - 7} l2 4 M${x + 3} ${y - 7} l0 4" stroke="${C.shrimpDark}" stroke-width="1.2"/></g>`).join(''),
  veg: () => [[70, 64, C.pepperRed], [92, 72, C.pepperGreen], [112, 62, C.pepperRed], [130, 72, C.pepperGreen], [84, 60, C.tomato], [104, 80, C.basilLight]].map(([x, y, c]) =>
    `<rect x="${x - 5}" y="${y - 4}" width="10" height="8" rx="2" fill="${c}" transform="rotate(${x % 40 - 20} ${x} ${y})"/>`).join(''),
  beef: () => [[66, 66], [82, 60], [98, 68], [114, 60], [130, 68], [90, 78], [110, 78], [74, 76], [122, 76]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="5" fill="${C.beef}"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="1.6" fill="#8A4E35"/>`).join(''),
  tuna: () => [[72, 66], [94, 60], [116, 64], [132, 72], [86, 76], [108, 78]].map(([x, y]) =>
    `<path d="M${x - 8} ${y} q4 -6 8 -2 q4 -5 8 1 q-2 6 -8 4 q-6 3 -8 -3z" fill="${C.tuna}"/>`).join(''),
  cheese: () => [[70, 62], [92, 70], [116, 62], [132, 72], [82, 78], [106, 80]].map(([x, y], i) =>
    `<path d="M${x - 7} ${y + 3} l7 -9 l7 9z" fill="${i % 2 ? C.cheese : C.cheeseDark}"/>`).join(''),
  basil: () => [[92, 58, -20], [106, 56, 25]].map(([x, y, r]) =>
    `<g transform="rotate(${r} ${x} ${y})"><path d="M${x - 8} ${y} q8 -9 16 0 q-8 7 -16 0z" fill="${C.basil}"/><path d="M${x - 6} ${y} h12" stroke="${C.basilLight}" stroke-width="1"/></g>`).join(''),
};

/** Pasta dish: kind = 'penne' | 'spaghetti' | 'fettuccine'; sauce colours; toppings. */
export function pastaSvg({ kind = 'penne', sauceColor = C.alfredo, sauceDark = C.alfredoDark, toppings = [] }, label) {
  const base = kind === 'spaghetti' ? nest(2.5) : kind === 'fettuccine' ? nest(5, '#F0CF7A', '#DDB257') : penne(3);
  const parts = [base, sauce(sauceColor, sauceDark), ...toppings.map((t) => TOP[t]()), TOP.basil()];
  return wrap(bowl(parts.join('')), label);
}

function pastaBalls(label) {
  const balls = [[70, 74], [100, 68], [130, 74], [85, 86], [115, 86], [100, 80]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="15" fill="${C.fried}"/><circle cx="${x}" cy="${y}" r="15" fill="none" stroke="${C.friedDark}" stroke-width="2"/>
     <path d="M${x - 8} ${y - 4} q4 -3 8 0 M${x - 2} ${y + 5} q4 -3 8 0" stroke="${C.friedDark}" stroke-width="1.5" fill="none"/>
     <circle cx="${x - 5}" cy="${y - 6}" r="3" fill="#F2C27A" opacity=".8"/>`).join('');
  return wrap(`${bowl(`<path d="M50 80 q20 6 50 4 q30 2 50 -4" stroke="${C.tomato}" stroke-width="6" fill="none" stroke-linecap="round"/>${balls}`)}`, label);
}

function basket(label, pieces) {
  return wrap(`${shadow(100, 146, 70)}<path d="M34 96 h132 l-14 46 h-104z" fill="${C.rim}"/><path d="M34 96 h132" stroke="${C.rimDeep}" stroke-width="6"/>
    <g>${pieces}</g>
    <path d="M40 112 h120 M44 126 h112" stroke="#fff" stroke-width="2" stroke-dasharray="6 6" opacity=".7"/>`, label);
}

const wedges = () => [[56, 80, -30], [76, 72, -12], [98, 68, 6], [120, 72, 20], [140, 82, 34], [88, 84, -4], [112, 86, 12]].map(([x, y, r]) =>
  `<g transform="rotate(${r} ${x} ${y})"><path d="M${x - 8} ${y + 18} L${x} ${y - 20} L${x + 8} ${y + 18}z" fill="${C.potato}"/><path d="M${x + 4} ${y - 2} L${x + 8} ${y + 18}" stroke="${C.potatoSkin}" stroke-width="4"/></g>`).join('');

const mozzSticks = () => [[54, 72, -14], [80, 66, -5], [106, 66, 5], [132, 72, 14]].map(([x, y, r]) =>
  `<g transform="rotate(${r} ${x} ${y + 20})"><rect x="${x - 10}" y="${y}" width="20" height="46" rx="8" fill="${C.fried}"/><rect x="${x - 6}" y="${y - 6}" width="12" height="10" rx="4" fill="${C.mozz}"/><path d="M${x - 6} ${y + 14} h12 M${x - 6} ${y + 28} h12" stroke="${C.friedDark}" stroke-width="1.5"/></g>`).join('');

function canSvg(label) {
  return wrap(`${shadow(100, 146, 34)}<rect x="74" y="40" width="52" height="102" rx="9" fill="${C.basil}"/>
    <rect x="74" y="40" width="52" height="12" rx="6" fill="#D9D2C7"/><rect x="74" y="130" width="52" height="12" rx="6" fill="#D9D2C7"/>
    <path d="M74 70 q26 14 52 0 v30 q-26 14 -52 0z" fill="#fff" opacity=".9"/><circle cx="100" cy="86" r="8" fill="${C.rim}"/>`, label);
}

function waterSvg(label) {
  return wrap(`${shadow(100, 146, 26)}<rect x="88" y="26" width="24" height="12" rx="3" fill="${C.basil}"/>
    <path d="M84 40 h32 q8 10 8 24 v72 q0 8 -8 8 h-32 q-8 0 -8 -8 v-72 q0 -14 8 -24z" fill="#E4F0EC" stroke="#9FC1B3" stroke-width="2"/>
    <rect x="76" y="82" width="48" height="26" fill="#fff"/><path d="M90 96 q10 -10 20 0" stroke="${C.basil}" stroke-width="3" fill="none"/>`, label);
}

export const ILLUSTRATIONS = {
  'pasta-alfredo': (l) => pastaSvg({ kind: 'penne', sauceColor: C.alfredo, sauceDark: C.alfredoDark, toppings: ['chicken'] }, l),
  'pasta-mex': (l) => pastaSvg({ kind: 'penne', sauceColor: C.mex, sauceDark: C.mexDark, toppings: ['veg'] }, l),
  'pasta-pesto': (l) => pastaSvg({ kind: 'penne', sauceColor: C.pesto, sauceDark: C.pestoDark, toppings: ['chicken'] }, l),
  'pasta-fettuccine': (l) => pastaSvg({ kind: 'fettuccine', sauceColor: C.alfredo, sauceDark: C.alfredoDark, toppings: ['shrimp'] }, l),
  'pasta-bolognese': (l) => pastaSvg({ kind: 'spaghetti', sauceColor: C.tomato, sauceDark: C.tomatoDark, toppings: ['beef'] }, l),
  'pasta-tuna': (l) => pastaSvg({ kind: 'penne', sauceColor: C.tomato, sauceDark: C.tomatoDark, toppings: ['tuna'] }, l),
  'pasta-cheese': (l) => pastaSvg({ kind: 'penne', sauceColor: C.cheese, sauceDark: C.cheeseDark, toppings: ['cheese'] }, l),
  'pasta-ball': (l) => pastaBalls(l),
  wedges: (l) => basket(l, wedges()),
  'mozzarella-sticks': (l) => basket(l, mozzSticks()),
  'soft-drink': (l) => canSvg(l),
  water: (l) => waterSvg(l),
};

export function illustration(key, label = '') {
  const f = ILLUSTRATIONS[key];
  const safe = String(label).replace(/[<>&"]/g, '');
  return f ? f(safe) : wrap(`<rect x="40" y="40" width="120" height="80" rx="12" fill="#F2E9DA"/>`, safe);
}
