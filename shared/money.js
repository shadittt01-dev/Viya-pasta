// Currency-aware money helpers. All amounts are integers in the currency's
// minor unit (SAR: halalas, exponent 2; KWD: fils, exponent 3; JPY: exponent 0).
// Browser-safe: no Node imports.

export const CURRENCY_EXPONENTS = {
  SAR: 2, AED: 2, QAR: 2, OMR: 3, BHD: 3, KWD: 3, JOD: 3, EGP: 2,
  USD: 2, EUR: 2, GBP: 2, JPY: 0, KRW: 0, TND: 3, IQD: 0, LBP: 0,
};

export function exponentOf(currency) {
  const e = CURRENCY_EXPONENTS[currency];
  if (e === undefined) throw new Error(`Unsupported currency: ${currency}`);
  return e;
}

export function assertMinor(n, label = 'amount') {
  if (!Number.isSafeInteger(n)) throw new Error(`${label} must be an integer in minor units, got ${n}`);
  return n;
}

/** Parse a decimal string like "24" or "24.50" into minor units without floats. */
export function parseMajor(value, currency) {
  const exp = exponentOf(currency);
  const s = String(value).trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`Invalid amount: ${value}`);
  const neg = s.startsWith('-');
  const [int, frac = ''] = s.replace('-', '').split('.');
  if (frac.length > exp) throw new Error(`Too many decimals for ${currency}: ${value}`);
  const minor = Number(int) * 10 ** exp + Number((frac + '0'.repeat(exp)).slice(0, exp) || 0);
  return neg ? -minor : minor;
}

/** Minor units → plain decimal string ("24.00"). */
export function toMajorString(minor, currency) {
  assertMinor(minor);
  const exp = exponentOf(currency);
  if (exp === 0) return String(minor);
  const neg = minor < 0;
  const abs = String(Math.abs(minor)).padStart(exp + 1, '0');
  const out = `${abs.slice(0, -exp)}.${abs.slice(-exp)}`;
  return neg ? `-${out}` : out;
}

/**
 * Locale-aware display. Whole amounts drop the decimals ("SAR 24") the way
 * the printed menu does; fractional amounts show the currency's full exponent.
 */
export function formatMoney(minor, currency, locale = 'en') {
  const exp = exponentOf(currency);
  const whole = minor % 10 ** exp === 0;
  const loc = locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-SA';
  const nf = new Intl.NumberFormat(loc, {
    style: 'currency', currency, currencyDisplay: locale === 'ar' ? 'symbol' : 'code',
    minimumFractionDigits: whole ? 0 : exp, maximumFractionDigits: exp,
  });
  return nf.format(minor / 10 ** exp).replace(/ /g, ' ');
}

export function sum(list) {
  return list.reduce((a, b) => assertMinor(a) + assertMinor(b), 0);
}

/** Multiply by a basis-point rate (1500 = 15%) with round-half-up. */
export function applyRateBp(minor, rateBp) {
  return Math.floor((minor * rateBp + 5000) / 10000);
}

/** VAT portion contained in a tax-inclusive gross amount. */
export function inclusiveTaxPortion(grossMinor, rateBp) {
  if (!rateBp) return 0;
  return grossMinor - Math.floor((grossMinor * 10000 + Math.floor((10000 + rateBp) / 2)) / (10000 + rateBp));
}
