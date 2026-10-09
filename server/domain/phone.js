// Phone normalisation. Saudi mobiles are accepted in local (05XXXXXXXX) or
// international (+9665XXXXXXXX) form; other countries in E.164.
import crypto from 'node:crypto';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function toLatinDigits(s) {
  return String(s ?? '').replace(/[٠-٩]/g, (d) => ARABIC_DIGITS.indexOf(d)).replace(/[۰-۹]/g, (d) => PERSIAN_DIGITS.indexOf(d));
}

export function normalizePhone(input, defaultCountry = 'SA') {
  let s = toLatinDigits(input).replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (defaultCountry === 'SA') {
    if (/^05\d{8}$/.test(s)) s = `+966${s.slice(1)}`;
    else if (/^5\d{8}$/.test(s)) s = `+966${s}`;
    else if (/^9665\d{8}$/.test(s)) s = `+${s}`;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return null;
  if (s.startsWith('+966') && !/^\+9665\d{8}$/.test(s)) return null; // Saudi numbers must be mobiles
  return s;
}

/** Display format: +966 55 461 5386 */
export function formatPhone(e164) {
  const m = /^\+966(5\d)(\d{3})(\d{4})$/.exec(e164 || '');
  return m ? `+966 ${m[1]} ${m[2]} ${m[3]}` : e164 || '';
}

/** Local dial format used on Saudi signage: 055 461 5386 */
export function formatPhoneLocal(e164) {
  const m = /^\+966(5\d)(\d{3})(\d{4})$/.exec(e164 || '');
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164 || '';
}

export function customerKey(e164, secret) {
  return crypto.createHmac('sha256', secret || 'customer-key').update(e164).digest('hex');
}

/** Masked for staff lists and logs: +966 55 *** **86 */
export function maskPhone(e164) {
  if (!e164) return '';
  return `${e164.slice(0, 6)} *** **${e164.slice(-2)}`;
}
