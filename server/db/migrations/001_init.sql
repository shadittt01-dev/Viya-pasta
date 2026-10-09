-- Via Pasta — initial schema.
-- Money columns are INTEGER minor units of settings.currency (SAR → halalas).
-- Times are ISO-8601 UTC strings unless the column name ends in _local.

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,              -- JSON
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE branches (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  address_en TEXT NOT NULL DEFAULT '',
  address_ar TEXT NOT NULL DEFAULT '',
  plus_code TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  phone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  maps_url TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  pickup_note_en TEXT NOT NULL DEFAULT '',
  pickup_note_ar TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE opening_hours (
  id INTEGER PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),   -- 0 = Sunday
  opens_local TEXT NOT NULL CHECK (opens_local GLOB '[0-2][0-9]:[0-5][0-9]'),
  closes_local TEXT NOT NULL CHECK (closes_local GLOB '[0-2][0-9]:[0-5][0-9]'), -- <= opens means next day
  confirmed INTEGER NOT NULL DEFAULT 0
) STRICT;
CREATE INDEX opening_hours_branch ON opening_hours(branch_id, weekday);

CREATE TABLE closures (
  id INTEGER PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  reason_en TEXT NOT NULL DEFAULT '',
  reason_ar TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  window_from_local TEXT,           -- optional availability window, e.g. breakfast
  window_to_local TEXT,
  background_preset TEXT,           -- optional category-specific pattern preset id
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  desc_en TEXT NOT NULL DEFAULT '',
  desc_ar TEXT NOT NULL DEFAULT '',
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  kcal INTEGER,                      -- NULL = not published / unknown
  portion_en TEXT NOT NULL DEFAULT '',
  portion_ar TEXT NOT NULL DEFAULT '',
  illustration TEXT NOT NULL DEFAULT '',
  image_path TEXT,                   -- owner-uploaded photo; replaces illustration
  image_alt_en TEXT NOT NULL DEFAULT '',
  image_alt_ar TEXT NOT NULL DEFAULT '',
  badges TEXT NOT NULL DEFAULT '[]', -- owner-confirmed labels only
  allergens TEXT,                    -- NULL until verified by owner
  active INTEGER NOT NULL DEFAULT 1,
  sold_out INTEGER NOT NULL DEFAULT 0,
  stock_qty INTEGER,                 -- NULL = not stock-tracked
  sort INTEGER NOT NULL DEFAULT 0,
  needs_review TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX items_category ON items(category_id, sort);

CREATE TABLE item_branch (
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  price_minor INTEGER,               -- NULL = use item price
  sold_out INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (item_id, branch_id)
) STRICT;

CREATE TABLE modifier_groups (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  min_select INTEGER NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select INTEGER NOT NULL DEFAULT 1 CHECK (max_select >= 1),
  sort INTEGER NOT NULL DEFAULT 0,
  CHECK (max_select >= min_select)
) STRICT;

CREATE TABLE modifiers (
  id INTEGER PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  price_minor INTEGER NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  kcal INTEGER,
  is_default INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sold_out INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE delivery_zones (
  id INTEGER PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('radius','polygon')),
  geometry TEXT NOT NULL,            -- JSON: {"km":3} or {"points":[[lat,lng],...]}
  fee_minor INTEGER NOT NULL DEFAULT 0,
  min_order_minor INTEGER NOT NULL DEFAULT 0,
  free_over_minor INTEGER,
  eta_minutes INTEGER NOT NULL DEFAULT 40,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE coupons (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  kind TEXT NOT NULL CHECK (kind IN ('percent','fixed','free_delivery')),
  value INTEGER NOT NULL DEFAULT 0,  -- percent: basis points; fixed: minor units
  min_subtotal_minor INTEGER NOT NULL DEFAULT 0,
  max_discount_minor INTEGER,
  eligible_item_ids TEXT,            -- JSON array or NULL = whole order
  branch_ids TEXT,                   -- JSON array or NULL = all branches
  starts_at TEXT,
  ends_at TEXT,
  usage_limit INTEGER,
  per_customer_limit INTEGER,
  combinable INTEGER NOT NULL DEFAULT 0,
  terms_en TEXT NOT NULL DEFAULT '',
  terms_ar TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('announcement','hero','offer')),
  title_en TEXT NOT NULL DEFAULT '',
  title_ar TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  body_ar TEXT NOT NULL DEFAULT '',
  cta_en TEXT NOT NULL DEFAULT '',
  cta_ar TEXT NOT NULL DEFAULT '',
  cta_href TEXT NOT NULL DEFAULT '',
  image_desktop TEXT,
  image_mobile TEXT,
  coupon_id INTEGER REFERENCES coupons(id),
  branch_ids TEXT,
  starts_at TEXT,
  ends_at TEXT,
  show_countdown INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  priority INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  access_hash TEXT NOT NULL,          -- sha256 of the customer's status token
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  lang TEXT NOT NULL DEFAULT 'ar',
  order_status TEXT NOT NULL,
  fulfillment_status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('pickup','delivery')),
  scheduled_for TEXT,                 -- NULL = as soon as possible
  promised_at TEXT,                   -- estimate set by the kitchen on acceptance
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_note TEXT NOT NULL DEFAULT '',
  address TEXT,                       -- JSON for delivery
  delivery_zone_id INTEGER,
  payment_method TEXT NOT NULL,
  currency TEXT NOT NULL,
  subtotal_minor INTEGER NOT NULL,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  delivery_fee_minor INTEGER NOT NULL DEFAULT 0,
  service_fee_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  tax_mode TEXT NOT NULL DEFAULT 'none',
  total_minor INTEGER NOT NULL,
  coupon_id INTEGER REFERENCES coupons(id),
  coupon_code TEXT,
  whatsapp_handoff TEXT NOT NULL DEFAULT 'none',  -- none | offered | opened (never "sent")
  stock_released INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT                     -- unpaid online orders
) STRICT;
CREATE INDEX orders_created ON orders(created_at);
CREATE INDEX orders_status ON orders(order_status, created_at);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  unit_price_minor INTEGER NOT NULL,   -- base + options at time of order
  qty INTEGER NOT NULL CHECK (qty > 0),
  options TEXT NOT NULL DEFAULT '[]',  -- JSON snapshot [{id,name_en,name_ar,price_minor}]
  note TEXT NOT NULL DEFAULT '',
  discount_minor INTEGER NOT NULL DEFAULT 0,
  line_total_minor INTEGER NOT NULL,
  kcal INTEGER
) STRICT;

CREATE TABLE order_events (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  field TEXT NOT NULL,                 -- order_status | fulfillment_status | payment_status | note
  from_value TEXT,
  to_value TEXT,
  actor TEXT NOT NULL,                 -- customer | system | user:<id> | provider:<name>
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX order_events_order ON order_events(order_id, id);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL,
  provider_ref TEXT,                   -- invoice / payment id at the provider
  status TEXT NOT NULL,                -- initiated | pending | paid | failed | cancelled | refunded
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  checkout_url TEXT,
  last_event_at TEXT,
  raw TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (provider, provider_ref)
) STRICT;

CREATE TABLE webhook_events (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  type TEXT NOT NULL,
  occurred_at TEXT,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  outcome TEXT NOT NULL DEFAULT 'received',
  UNIQUE (provider, event_id)
) STRICT;

CREATE TABLE coupon_redemptions (
  id INTEGER PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  customer_key TEXT NOT NULL,          -- sha256 of normalised phone; never the phone itself
  released INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (coupon_id, order_id)
) STRICT;

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','staff')),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login_at TEXT
) STRICT;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                 -- sha256 of the cookie token
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL
) STRICT;

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before TEXT,
  after TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX audit_created ON audit_log(created_at);

CREATE TABLE drafts (
  entity TEXT NOT NULL,                -- item | category | modifier | modifier_group | content | theme
  entity_id TEXT NOT NULL,
  patch TEXT NOT NULL,                 -- JSON of changed fields
  user_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (entity, entity_id)
) STRICT;

CREATE TABLE content_blocks (
  key TEXT PRIMARY KEY,                -- e.g. home.hero.title
  value_en TEXT NOT NULL DEFAULT '',
  value_ar TEXT NOT NULL DEFAULT '',
  needs_review INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE assets (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  mime TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  bytes INTEGER NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  rights_note TEXT NOT NULL DEFAULT '',
  uploaded_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE notification_outbox (
  id INTEGER PRIMARY KEY,
  channel TEXT NOT NULL,               -- webhook | whatsapp_cloud | log
  dedupe_key TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE analytics_events (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  props TEXT NOT NULL DEFAULT '{}',    -- never contains names, phones or addresses
  day TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX analytics_day ON analytics_events(day, name);
