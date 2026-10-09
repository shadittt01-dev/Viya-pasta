// PRODUCTION SEED — verified business facts only (see docs/RESEARCH.md).
// Anything not confirmed by the owner is either switched off or listed in
// needs_review so the dashboard flags it. Safe to run once on an empty DB.
import { run, one, tx } from '../server/db/db.js';
import { setSetting, DEFAULTS } from '../server/domain/settings.js';

const SAR = (n) => Math.round(n * 100);

// Menu as published on the restaurant's Google Maps listing (prices in SAR).
// The listing shows separate lines per protein (e.g. Chicken Alfredo 25, Shrimp
// Alfredo 32, Vegetable Alfredo 21); here each sauce is one dish with a required
// protein choice (no default, because the price differs) priced so every
// combination matches the listing exactly.
// Arabic names are translations made for the site (listing names are English)
// and calories are not published — both are flagged for owner review.
const AR_REVIEW = 'Arabic name translated for the site — owner to confirm';
const KCAL_REVIEW = 'calories not published — required on Saudi menus, owner to supply';
const PROTEIN3 = (veg = 21) => [{ name_en: 'Protein', name_ar: 'البروتين', min: 1, max: 1, options: [
  { name_en: 'Vegetable', name_ar: 'خضار', price: 0 },
  { name_en: 'Chicken', name_ar: 'دجاج', price: 25 - veg },
  { name_en: 'Shrimp', name_ar: 'روبيان', price: 32 - veg }] }];

export const MENU = [
  {
    slug: 'pasta', name_en: 'Pasta', name_ar: 'الباستا', items: [
      { slug: 'alfredo', name_en: 'Alfredo', name_ar: 'ألفريدو', price: 21, kcal: null, illustration: 'pasta-alfredo',
        desc_en: 'Pasta in Alfredo sauce — with vegetables, chicken or shrimp', desc_ar: 'باستا بصوص الألفريدو — مع خضار أو دجاج أو روبيان',
        groups: PROTEIN3(), review: [AR_REVIEW, KCAL_REVIEW, 'pasta shape not listed'] },
      { slug: 'mex', name_en: 'Mex Sauce', name_ar: 'صوص مكس', price: 21, kcal: null, illustration: 'pasta-mex',
        desc_en: 'Pasta in Mex sauce — with vegetables, chicken or shrimp', desc_ar: 'باستا بصوص المكس — مع خضار أو دجاج أو روبيان',
        groups: PROTEIN3(), review: [AR_REVIEW, KCAL_REVIEW, 'sauce description not listed'] },
      { slug: 'pesto', name_en: 'Pesto', name_ar: 'بيستو', price: 21, kcal: null, illustration: 'pasta-pesto',
        desc_en: 'Pasta in pesto sauce — with vegetables, chicken or shrimp', desc_ar: 'باستا بصوص البيستو — مع خضار أو دجاج أو روبيان',
        groups: PROTEIN3(), review: [AR_REVIEW, KCAL_REVIEW] },
      { slug: 'fettuccine', name_en: 'Fettuccine', name_ar: 'فوتشيني', price: 25, kcal: null, illustration: 'pasta-fettuccine',
        desc_en: 'Fettuccine with chicken or shrimp', desc_ar: 'فوتشيني مع دجاج أو روبيان',
        groups: [{ name_en: 'Protein', name_ar: 'البروتين', min: 1, max: 1, options: [
          { name_en: 'Chicken', name_ar: 'دجاج', price: 0 }, { name_en: 'Shrimp', name_ar: 'روبيان', price: 7 }] }],
        review: [AR_REVIEW, KCAL_REVIEW, 'sauce not listed'] },
      { slug: 'spaghetti-bolognese', name_en: 'Spaghetti Bolognese with Beef', name_ar: 'سباغيتي بولونيز باللحم', price: 25, kcal: null, illustration: 'pasta-bolognese',
        desc_en: 'Spaghetti with beef Bolognese sauce', desc_ar: 'سباغيتي بصوص البولونيز باللحم', review: [AR_REVIEW, KCAL_REVIEW] },
      { slug: 'tona-rosso', name_en: 'Tona Rosso', name_ar: 'تونا روسو', price: 21, kcal: null, illustration: 'pasta-tuna',
        desc_en: '', desc_ar: '', review: [AR_REVIEW, KCAL_REVIEW, 'name spelled as listed; ingredients not listed'] },
      { slug: 'three-cheese-pasta', name_en: '3 Cheese Pasta', name_ar: 'باستا ٣ أجبان', price: 21, kcal: null, illustration: 'pasta-cheese',
        desc_en: 'Pasta with three cheeses', desc_ar: 'باستا بثلاثة أنواع من الأجبان', review: [AR_REVIEW, KCAL_REVIEW, 'cheeses not listed'] },
    ],
  },
  {
    slug: 'starters', name_en: 'Starters & sides', name_ar: 'المقبلات', items: [
      { slug: 'pasta-ball', name_en: 'Pasta Ball', name_ar: 'باستا بول', price: 19, kcal: null, illustration: 'pasta-ball',
        desc_en: '', desc_ar: '', review: [AR_REVIEW, KCAL_REVIEW, 'portion and ingredients not listed'] },
      { slug: 'potato-wedges', name_en: 'Potato Wedges', name_ar: 'بطاطس ودجز', price: 9, kcal: null, illustration: 'wedges',
        desc_en: '', desc_ar: '', review: [AR_REVIEW, KCAL_REVIEW] },
      { slug: 'mozzarella-sticks', name_en: 'Mozzarella Sticks', name_ar: 'أصابع موزاريلا', price: 12, kcal: null, illustration: 'mozzarella-sticks',
        desc_en: '', desc_ar: '', review: [AR_REVIEW, KCAL_REVIEW, 'piece count not listed'] },
    ],
  },
  {
    slug: 'drinks', name_en: 'Drinks', name_ar: 'المشروبات', items: [
      { slug: 'soft-drink', name_en: 'Soft Drink', name_ar: 'مشروب غازي', price: 3, kcal: null, illustration: 'soft-drink',
        desc_en: '', desc_ar: '', review: ['flavours/brands not listed', KCAL_REVIEW] },
      { slug: 'water', name_en: 'Water', name_ar: 'ماء', price: 1, kcal: null, illustration: 'water', desc_en: '', desc_ar: '' },
    ],
  },
];

export const CONTENT = {
  'home.hero.title': ['Pasta, made your way, in Yanbu.', 'باستا على ذوقك في ينبع.', 1],
  'home.hero.sub': ['Alfredo, pesto, Mex sauce, Bolognese and our pasta balls. Order ahead and pick it up hot.', 'ألفريدو، بيستو، صوص مكس، بولونيز والباستا بول. اطلب مسبقًا واستلمها حارة.', 1],
  'about.lead': ['Italian pasta on Cordoba Street.', 'باستا إيطالية في شارع قرطبة.', 1],
  'about.body': [
    'Via Pasta is an Italian pasta restaurant on Cordoba Street in Yanbu.\n\nThe menu is built around a few sauces — Alfredo, pesto, Mex, Bolognese — each with your choice of vegetables, chicken or shrimp, plus fettuccine, Tona Rosso, three-cheese pasta and our pasta balls. Sides are potato wedges and mozzarella sticks.\n\nEat in, take it away, or order ahead here and collect it at the counter.',
    'ڤيا باستا مطعم باستا إيطالي في شارع قرطبة بينبع.\n\nالمنيو مبني على صوصات قليلة — ألفريدو، بيستو، مكس، بولونيز — وكل صوص مع اختيارك من الخضار أو الدجاج أو الروبيان، بالإضافة إلى الفوتشيني والتونا روسو وباستا الأجبان الثلاثة والباستا بول. ومن المقبلات: بطاطس ودجز وأصابع موزاريلا.\n\nكُل في المطعم، أو خذها معك، أو اطلب مسبقًا من هنا واستلم من الكاونتر.', 1],
  'faq.items': [
    JSON.stringify([
      ['How does ordering on this site work?', 'Choose your dishes, pick a pickup time and place the order. Show your order number at the counter on Cordoba Street.'],
      ['When are you open?', 'See the opening hours on the Visit us page. Times are Yanbu time.'],
      ['How do I pay?', 'Pay at the counter when you collect your order. Nothing is charged online.'],
      ['Can I choose chicken, shrimp or vegetables?', 'Yes — Alfredo, pesto and Mex sauce dishes come with your choice; the price updates when you choose.'],
      ['Can I change or cancel my order?', 'Call us with your order number as soon as possible.'],
    ]),
    JSON.stringify([
      ['كيف أطلب من الموقع؟', 'اختر أطباقك، حدّد وقت الاستلام وأرسل الطلب. اعرض رقم طلبك عند الكاونتر في شارع قرطبة.'],
      ['متى تفتحون؟', 'تجد ساعات العمل في صفحة «زورونا». الأوقات بتوقيت ينبع.'],
      ['كيف أدفع؟', 'الدفع عند الكاونتر وقت الاستلام. لا يُخصم أي مبلغ أونلاين.'],
      ['أقدر أختار دجاج أو روبيان أو خضار؟', 'نعم — أطباق الألفريدو والبيستو وصوص المكس تأتي مع اختيارك، والسعر يتحدث مباشرة.'],
      ['أقدر أعدّل أو ألغي طلبي؟', 'اتصل بنا برقم طلبك بأسرع وقت.'],
    ]), 1],
  'policy.privacy': [
    'What we collect: your name, mobile number, the items you order, your chosen pickup time and any note you add. For delivery orders, the address and map location you provide.\n\nWhy: only to prepare your order, hand it over and contact you about it. We do not use your details for marketing unless you separately agree.\n\nAnalytics: we count page visits and ordering steps without cookies and without your name or number.\n\nPayments: if online payment is offered, card details are entered on the payment provider’s page; we never see or store card numbers.\n\nRetention and requests: contact the restaurant to ask about, correct or delete your details.',
    'ما نجمعه: اسمك، رقم جوالك، الأصناف المطلوبة، وقت الاستلام وأي ملاحظة تضيفها. ولطلبات التوصيل: العنوان والموقع الذي تحدده.\n\nالغرض: تجهيز طلبك وتسليمه والتواصل معك بخصوصه فقط. لا نستخدم بياناتك للتسويق إلا بموافقة منفصلة منك.\n\nالتحليلات: نحسب زيارات الصفحات وخطوات الطلب بدون كوكيز وبدون اسمك أو رقمك.\n\nالدفع: إذا توفر الدفع أونلاين فإن بيانات البطاقة تُدخل في صفحة مزوّد الدفع؛ لا نطّلع على أرقام البطاقات ولا نحفظها.\n\nالطلبات والاستفسارات: تواصل مع المطعم للاستفسار عن بياناتك أو تصحيحها أو حذفها.', 1],
  'policy.terms': [
    'Orders placed on this site are requests to the restaurant. An order is confirmed when its status shows “Accepted”.\n\nPrices are those shown at checkout and are checked by our system when you place the order. If a price or item changes before you order, you will be asked to review the new total.\n\nPickup times are estimates. Please collect your order at the time you chose.\n\nPayment is made at the counter when you collect, unless the checkout shows another option.',
    'الطلبات المرسلة من هذا الموقع هي طلبات للمطعم، ويُعد الطلب مؤكدًا عندما تظهر حالته «تم القبول».\n\nالأسعار هي المعروضة عند إتمام الطلب ويتحقق منها نظامنا عند الإرسال. إذا تغيّر سعر أو صنف قبل الإرسال سيُطلب منك مراجعة الإجمالي الجديد.\n\nأوقات الاستلام تقديرية. يُرجى استلام طلبك في الوقت الذي اخترته.\n\nالدفع عند الكاونتر وقت الاستلام ما لم تظهر طريقة أخرى عند إتمام الطلب.', 1],
};

export async function seedBusiness() {
  if (await one('SELECT 1 FROM branches LIMIT 1')) return { skipped: true };
  return await tx(async () => {
    // Re-check under the write lock: two fresh server instances may start at once.
    if (await one('SELECT 1 FROM branches LIMIT 1')) return { skipped: true };
    const b = await run(`INSERT INTO branches (slug, name_en, name_ar, address_en, address_ar, plus_code, lat, lng, phone, whatsapp, maps_url, timezone, pickup_note_en, pickup_note_ar)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      'yanbu', 'Yanbu', 'ينبع', 'Cordoba Street, Al Jamiyah Al Arabiyah, Yanbu 41912', 'شارع قرطبة، الجمعية العربية، ينبع 41912', '33RQ+PF', 24.0918125, 38.0886875,
      '+966591929969', '', 'https://www.google.com/maps/search/?api=1&query=24.0918125,38.0886875', 'Asia/Riyadh',
      'Collect at the counter — give your order number.', 'الاستلام من الكاونتر — اذكر رقم طلبك.');
    const branchId = Number(b.lastInsertRowid);
    for (let wd = 0; wd < 7; wd++) {
      // Only the closing time (2 AM) is published; the opening time is a placeholder until the owner confirms.
      await run('INSERT INTO opening_hours (branch_id, weekday, opens_local, closes_local, confirmed) VALUES (?,?,?,?,?)', branchId, wd, '13:00', '02:00', 0);
    }
    for (const [ci, cat] of MENU.entries()) {
      const c = await run('INSERT INTO categories (slug, name_en, name_ar, sort) VALUES (?,?,?,?)', cat.slug, cat.name_en, cat.name_ar, ci);
      for (const [ii, it] of cat.items.entries()) {
        const r = await run(`INSERT INTO items (category_id, slug, name_en, name_ar, desc_en, desc_ar, price_minor, kcal, portion_en, portion_ar, illustration, image_alt_en, image_alt_ar, needs_review, sort)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          Number(c.lastInsertRowid), it.slug, it.name_en, it.name_ar, it.desc_en, it.desc_ar, SAR(it.price), it.kcal, it.portion_en || '', it.portion_ar || '',
          it.illustration, `Illustration of ${it.name_en}`, `رسم توضيحي لـ ${it.name_ar}`, JSON.stringify(it.review || []), ii);
        const itemId = Number(r.lastInsertRowid);
        for (const [gi, g] of (it.groups || []).entries()) {
          const gr = await run('INSERT INTO modifier_groups (item_id, name_en, name_ar, min_select, max_select, sort) VALUES (?,?,?,?,?,?)', itemId, g.name_en, g.name_ar, g.min, g.max, gi);
          for (const [oi, o] of g.options.entries()) {
            await run('INSERT INTO modifiers (group_id, name_en, name_ar, price_minor, is_default, sort) VALUES (?,?,?,?,?,?)',
              Number(gr.lastInsertRowid), o.name_en, o.name_ar, SAR(o.price), o.def ? 1 : 0, oi);
          }
        }
      }
    }
    for (const [key, [en, ar, review]] of Object.entries(CONTENT)) {
      await run('INSERT INTO content_blocks (key, value_en, value_ar, needs_review) VALUES (?,?,?,?)', key, en, ar, review);
    }
    await setSetting('business', {
      ...DEFAULTS.business,
      socials: [],
      confirmed: { hours: false, delivery: false, payments: false, whatsapp: false, vat: false, logo: false, arabic_name: false, address: false },
    });
    await setSetting('whatsapp', { mode: 'off', number: '+966591929969', verified: false });
    return { branchId };
  });
}
