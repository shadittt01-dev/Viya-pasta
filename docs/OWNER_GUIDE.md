# دليل المالك — Owner guide

<div dir="rtl">

## الدخول
افتح `/admin` في المتصفح وسجّل الدخول ببريدك وكلمة المرور. يمكن تغيير لغة اللوحة من أسفل القائمة.

## استقبال الطلبات (أهم شاشة)
- **الطلبات → جديدة / في المطبخ**: كل طلب جديد يظهر بإطار عنابي. فعّل «تنبيه صوتي» و«إشعارات المتصفح» على جهاز الكاونتر.
- اضغط **قبول** واختر وقت التجهيز (دقائق) — يرى العميل الوقت المتوقع مباشرة. أو **رفض** واكتب السبب (يظهر للعميل).
- بعد القبول: **بدء التجهيز** ← **جاهز** ← **تم الاستلام**. صفحة العميل تتحدث تلقائيًا.
- عند الدفع في الكاونتر اضغط **دُفع نقدًا** أو **دُفع بالبطاقة**.
- **طباعة** تطبع تذكرة المطبخ.
- الطلبات المدفوعة أونلاين لا تظهر في المطبخ إلا بعد تأكيد البنك.

## نفاد صنف
في **المنيو** فعّل «نفد» بجانب الصنف — يتوقف الطلب عليه فورًا. يمكن أيضًا إدخال كمية «المخزون» ليتوقف تلقائيًا عند الصفر.

## تعديل الأسعار والأوصاف والصور
**المنيو → تعديل**. التعديلات تُحفظ كمسودة ولا يراها العملاء حتى تضغط **نشر**. استخدم **معاينة** لرؤيتها قبل النشر. لرفع صورة يجب تأكيد أن لديك حق استخدامها وأنها تُظهر المنتج الفعلي.

## ساعات العمل والإغلاق
**ساعات العمل**: إذا كان وقت الإغلاق بعد منتصف الليل (مثل 17:00–03:00) فاكتبه كما هو. علّم «مؤكد» عند التأكد. أضف **إغلاقًا مؤقتًا** للأعياد أو الصيانة.

## إيقاف الطلب أونلاين مؤقتًا
**التشغيل والدفع → الطلب أونلاين → إلغاء «استقبال الطلبات مفعّل»**.

## العروض والكوبونات
**العروض والكوبونات**: أنشئ الكوبون (نسبة أو مبلغ أو توصيل مجاني، حد أدنى، عدد الاستخدامات، لكل عميل، تاريخ البداية والنهاية)، ثم أنشئ حملة (شريط إعلان أو بانر أو عرض) واربطها بالكوبون، ثم **نشر**. التواريخ بتوقيت ينبع.

## رموز QR
**رموز QR**: اختر الصفحة واللغة، وحمّل PNG أو SVG أو نسخة الطباعة. أعد إنشاء الرموز بعد تشغيل النطاق الرسمي وقبل الطباعة، وجرّب مسحها بالجوال.

## الموظفون
**الموظفون**: «موظف» يرى الطلبات ويغيّر التوفر فقط، «مدير» يعدّل المنيو والعروض ويرى التقارير، «مالك» كل شيء بما فيه الدفع والموظفون. عطّل حساب أي موظف يغادر.

## التقارير
**التقارير**: الإيرادات من الطلبات المقبولة والمكتملة فقط، الأكثر طلبًا، الطلبات حسب الساعة. يمكن تصدير الطلبات CSV.

</div>

---

## Signing in
Open `/admin` and sign in. Switch the dashboard language at the bottom of the menu.

## Taking orders (the main screen)
- **Orders → New / In the kitchen**: new orders have a red border. Turn on **Sound alert** and **Browser notifications** on the counter device.
- **Accept** with a prep time (the customer sees the estimate at once), or **Reject** with a reason (shown to the customer).
- Then **Start preparing → Mark ready → Collected**. The customer's page updates by itself.
- When the customer pays at the counter press **Paid cash** or **Paid card**. **Print** prints a kitchen ticket.
- Online-paid orders reach the kitchen only after the payment is confirmed by the bank.

## Something sold out
**Menu** → tick **Sold out** next to the item (takes effect immediately), or type a **Stock** number so it stops at zero automatically.

## Prices, descriptions, photos
**Menu → Edit**. Changes are drafts until you press **Publish**; use **Preview** first. Uploading a photo requires confirming you have the right to use it and that it shows the actual product.

## Hours and closures
**Hours**: write overnight hours as they are (17:00–03:00). Tick **Confirmed** once checked. Add a **temporary closure** for holidays.

## Pause online ordering
**Operations & payments → Online ordering → untick "Accept online orders"**.

## Offers and coupons
Create the coupon (percent / fixed / free delivery, minimum, total and per-customer limits, start/end), then a campaign (announcement bar, home hero or offer) linked to it, then **Publish**. Times are Yanbu time. Countdowns appear only for real end times.

## QR codes
Choose the page and language; download PNG, SVG or the print card. Regenerate on the live domain before printing and test-scan with a phone.

## Staff
**Staff**: *staff* see orders and availability; *managers* edit the menu and offers and see reports; *owners* can do everything including payments and staff. Deactivate anyone who leaves (their sessions end immediately).

## Design
**Design** lets you browse 480 looks, previews them, and saves them as a draft. Use **Preview site with draft**, then **Publish**. **Restore defaults** brings back the original Via Pasta look.

## If something goes wrong
- Site down: ask your technical contact to check the server (`systemctl status viapasta`).
- Wrong change published: Dashboard → **Audit log** shows who changed what, with the previous values.
- Lost data: backups are restored as described in `docs/DEPLOY.md`.
