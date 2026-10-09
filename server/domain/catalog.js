// Menu loading with branch-specific pricing/availability and optional draft preview.
import { all, one, parseJson } from '../db/db.js';
import { zonedParts, parseHHMM } from '../../shared/hours.js';

export const DRAFTABLE = {
  item: { table: 'items', fields: ['name_en', 'name_ar', 'desc_en', 'desc_ar', 'price_minor', 'kcal', 'portion_en', 'portion_ar', 'image_path', 'image_alt_en', 'image_alt_ar', 'badges', 'allergens', 'active', 'sort', 'category_id', 'illustration'] },
  category: { table: 'categories', fields: ['name_en', 'name_ar', 'window_from_local', 'window_to_local', 'background_preset', 'active', 'sort'] },
  modifier_group: { table: 'modifier_groups', fields: ['name_en', 'name_ar', 'min_select', 'max_select', 'sort'] },
  modifier: { table: 'modifiers', fields: ['name_en', 'name_ar', 'price_minor', 'kcal', 'is_default', 'active', 'sort'] },
};

async function allDrafts() {
  const map = new Map();
  for (const r of await all('SELECT entity, entity_id, patch FROM drafts')) {
    if (!map.has(r.entity)) map.set(r.entity, new Map());
    map.get(r.entity).set(Number(r.entity_id), parseJson(r.patch, {}));
  }
  return map;
}

function overlay(rows, entity, drafts) {
  if (!drafts) return rows;
  const d = drafts.get(entity) || new Map();
  return rows.map((r) => (d.has(r.id) ? { ...r, ...d.get(r.id) } : r));
}

function windowOpen(cat, nowMs, tz) {
  if (!cat.window_from_local || !cat.window_to_local) return true;
  const p = zonedParts(new Date(nowMs), tz);
  const now = p.h * 60 + p.mi;
  const f = parseHHMM(cat.window_from_local), t = parseHHMM(cat.window_to_local);
  const from = f.h * 60 + f.mi, to = t.h * 60 + t.mi;
  return from < to ? now >= from && now < to : now >= from || now < to;
}

/**
 * Load the catalog for a branch.
 * opts: { preview: bool (apply drafts), includeInactive: bool (admin), nowMs, tz }
 */
export async function loadCatalog(branchId, opts = {}) {
  const { preview = false, includeInactive = false, nowMs = Date.now(), tz = 'Asia/Riyadh' } = opts;
  const [catRows, itemRows, groupRows, modRows, ibRows, drafts] = await Promise.all([
    all('SELECT * FROM categories ORDER BY sort, id'), all('SELECT * FROM items ORDER BY sort, id'),
    all('SELECT * FROM modifier_groups ORDER BY sort, id'), all('SELECT * FROM modifiers ORDER BY sort, id'),
    all('SELECT * FROM item_branch WHERE branch_id = ?', branchId), preview ? allDrafts() : null,
  ]);
  const cats = overlay(catRows, 'category', drafts);
  const items = overlay(itemRows, 'item', drafts);
  const groups = overlay(groupRows, 'modifier_group', drafts);
  const mods = overlay(modRows, 'modifier', drafts);
  const branchRows = new Map(ibRows.map((r) => [r.item_id, r]));

  const optionsByGroup = new Map();
  for (const m of mods) {
    if (!includeInactive && !m.active) continue;
    const list = optionsByGroup.get(m.group_id) || [];
    list.push({ ...m, available: Boolean(m.active && !m.sold_out) });
    optionsByGroup.set(m.group_id, list);
  }
  const groupsByItem = new Map();
  for (const g of groups) {
    const list = groupsByItem.get(g.item_id) || [];
    list.sort((a, b) => a.sort - b.sort);
    list.push({ ...g, options: (optionsByGroup.get(g.id) || []).sort((a, b) => a.sort - b.sort || a.id - b.id) });
    groupsByItem.set(g.item_id, list.sort((a, b) => a.sort - b.sort || a.id - b.id));
  }

  const catById = new Map(cats.map((c) => [c.id, { ...c, open: windowOpen(c, nowMs, tz), items: [] }]));
  const itemsById = new Map();
  for (const it of items.sort((a, b) => a.sort - b.sort || a.id - b.id)) {
    const cat = catById.get(it.category_id);
    if (!cat) continue;
    const br = branchRows.get(it.id);
    const priceMinor = br && br.price_minor !== null && br.price_minor !== undefined ? br.price_minor : it.price_minor;
    const outOfStock = it.stock_qty !== null && it.stock_qty !== undefined && it.stock_qty <= 0;
    const soldOut = Boolean(it.sold_out || (br && br.sold_out) || outOfStock);
    const activeHere = Boolean(it.active && cat.active && (!br || br.active));
    if (!includeInactive && !activeHere) continue;
    const full = {
      ...it,
      price_minor: priceMinor,
      badges: typeof it.badges === 'string' ? parseJson(it.badges, []) : it.badges || [],
      allergens: typeof it.allergens === 'string' ? parseJson(it.allergens, null) : it.allergens ?? null,
      needs_review: parseJson(it.needs_review, []),
      sold_out: soldOut,
      category_open: cat.open,
      available: activeHere && !soldOut && cat.open,
      groups: groupsByItem.get(it.id) || [],
    };
    cat.items.push(full);
    itemsById.set(it.id, full);
  }
  const categories = [...catById.values()].filter((c) => includeInactive || (c.active && c.items.length));
  return { categories, itemsById };
}

export async function getItemBySlug(branchId, slug, opts) {
  const { itemsById } = await loadCatalog(branchId, opts);
  for (const it of itemsById.values()) if (it.slug === slug) return it;
  return null;
}

export function defaultBranch() {
  return one('SELECT * FROM branches WHERE active = 1 ORDER BY sort, id LIMIT 1');
}

export function branchById(id) {
  return one('SELECT * FROM branches WHERE id = ? AND active = 1', id);
}

export function branchHours(branchId) {
  return all('SELECT weekday, opens_local, closes_local, confirmed FROM opening_hours WHERE branch_id = ? ORDER BY weekday, opens_local', branchId);
}

export function branchClosures(branchId) {
  return all('SELECT starts_at, ends_at, reason_en, reason_ar FROM closures WHERE branch_id = ? AND ends_at > ?', branchId, new Date(Date.now() - 86400000).toISOString());
}

/** Public JSON shape for the browser (no internal fields). */
export function publicCatalog(cat, lang) {
  return cat.categories.map((c) => ({
    id: c.id, slug: c.slug, name: lang === 'ar' ? c.name_ar : c.name_en, open: c.open,
    items: c.items.map((i) => publicItem(i, lang)),
  }));
}

export function publicItem(i, lang) {
  const ar = lang === 'ar';
  return {
    id: i.id, slug: i.slug, name: ar ? i.name_ar : i.name_en, desc: ar ? i.desc_ar : i.desc_en,
    price: i.price_minor, kcal: i.kcal, portion: ar ? i.portion_ar : i.portion_en,
    image: i.image_path || null, illustration: i.illustration, alt: (ar ? i.image_alt_ar : i.image_alt_en) || '',
    badges: i.badges, available: i.available, soldOut: i.sold_out, categoryOpen: i.category_open,
    groups: i.groups.map((g) => ({
      id: g.id, name: ar ? g.name_ar : g.name_en, min: g.min_select, max: g.max_select,
      options: g.options.map((o) => ({ id: o.id, name: ar ? o.name_ar : o.name_en, price: o.price_minor, kcal: o.kcal, isDefault: Boolean(o.is_default), available: o.available })),
    })),
  };
}
