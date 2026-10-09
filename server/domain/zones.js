// Delivery coverage: radius (km from branch) or polygon zones, evaluated on the server.
import { all, parseJson } from '../db/db.js';

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371.0088;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Ray-casting point-in-polygon; points are [lat, lng]. */
export function pointInPolygon(lat, lng, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [yi, xi] = points[i], [yj, xj] = points[j];
    const intersect = (yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function validLatLng(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export async function zonesForBranch(branchId) {
  return (await all('SELECT * FROM delivery_zones WHERE branch_id = ? AND active = 1 ORDER BY sort, id', branchId))
    .map((z) => ({ ...z, geometry: parseJson(z.geometry, {}) }));
}

/** First matching zone (zones are ordered, so inner zones should sort first). */
export async function matchZone(branch, lat, lng, zones = null) {
  if (!validLatLng(lat, lng)) return null;
  zones = zones || await zonesForBranch(branch.id);
  for (const z of zones) {
    if (z.kind === 'radius' && validLatLng(branch.lat, branch.lng)) {
      if (haversineKm(branch.lat, branch.lng, lat, lng) <= Number(z.geometry.km)) return z;
    } else if (z.kind === 'polygon' && Array.isArray(z.geometry.points) && z.geometry.points.length >= 3) {
      if (pointInPolygon(lat, lng, z.geometry.points)) return z;
    }
  }
  return null;
}
