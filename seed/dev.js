// DEVELOPMENT SEED — test accounts and test data. Never run against production.
// Dev-only credentials below exist solely for local testing.
import { run, one } from '../server/db/db.js';
import { config } from '../server/config.js';
import { createUser } from '../server/domain/auth.js';
import { getSetting, setSetting } from '../server/domain/settings.js';

export const DEV_USERS = [
  { email: 'owner@viapasta.test', name: 'Dev Owner', role: 'owner', password: 'dev-owner-password-2026' },
  { email: 'manager@viapasta.test', name: 'Dev Manager', role: 'manager', password: 'dev-manager-password-2026' },
  { email: 'staff@viapasta.test', name: 'Dev Staff', role: 'staff', password: 'dev-staff-password-2026' },
];

export async function seedDev({ enableTestFeatures = true } = {}) {
  if (config.isProd) throw new Error('Refusing to run the development seed in production');
  for (const u of DEV_USERS) {
    if (!await one('SELECT 1 FROM users WHERE email = ?', u.email)) await createUser(u);
  }
  if (!enableTestFeatures) return;
  const branch = await one('SELECT * FROM branches ORDER BY id LIMIT 1');
  if (!await one('SELECT 1 FROM delivery_zones LIMIT 1')) {
    await run(`INSERT INTO delivery_zones (branch_id, name_en, name_ar, kind, geometry, fee_minor, min_order_minor, free_over_minor, eta_minutes)
         VALUES (?,?,?,?,?,?,?,?,?)`, branch.id, 'TEST zone (3 km)', 'منطقة تجريبية (٣ كم)', 'radius', JSON.stringify({ km: 3 }), 1000, 3000, 8000, 40);
  }
  if (!await one('SELECT 1 FROM coupons LIMIT 1')) {
    await run(`INSERT INTO coupons (code, kind, value, min_subtotal_minor, max_discount_minor, usage_limit, per_customer_limit, terms_en, terms_ar)
         VALUES (?,?,?,?,?,?,?,?,?)`, 'TEST10', 'percent', 1000, 2000, 1500, 100, 1, 'TEST coupon: 10% off orders over SAR 20, max SAR 15.', 'كود تجريبي: خصم ١٠٪ للطلبات فوق ٢٠ ريال، بحد أقصى ١٥ ريال.');
    await run(`INSERT INTO coupons (code, kind, value, usage_limit, terms_en, terms_ar) VALUES (?,?,?,?,?,?)`, 'TESTONE', 'fixed', 500, 1, 'TEST coupon: SAR 5 off, single use.', 'كود تجريبي: خصم ٥ ريال لاستخدام واحد.');
  }
  const f = await getSetting('fulfillment');
  await setSetting('fulfillment', { ...f, delivery: { ...f.delivery, enabled: true } });
  const p = await getSetting('payments');
  await setSetting('payments', { ...p, online: { ...p.online, enabled: true }, pay_on_delivery: { ...p.pay_on_delivery, enabled: true } });
}
