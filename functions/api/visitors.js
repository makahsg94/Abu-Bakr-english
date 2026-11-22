import { isAuthed } from '../_utils.js';

export const PRODUCTION_HOST = 'abubakr-english.pages.dev';
const DAY_MS = 86400000;
const ready = new WeakMap();

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra
  } });
}

// Calendar dates, including daylight saving, are evaluated in Cairo.
export function cairoDay(time) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(time));
  const part = type => p.find(x => x.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDay(day, offset) {
  return new Date(Date.parse(day + 'T12:00:00Z') + offset * DAY_MS).toISOString().slice(0, 10);
}
async function ensureSchema(db) {
  if (!ready.has(db)) {
    const promise = db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS visitor_days (visitor_id TEXT NOT NULL, day TEXT NOT NULL, last_seen INTEGER NOT NULL, PRIMARY KEY(visitor_id, day))'),
      db.prepare('CREATE INDEX IF NOT EXISTS visitor_days_day ON visitor_days(day)'),
      db.prepare('CREATE INDEX IF NOT EXISTS visitor_days_seen ON visitor_days(last_seen)')
    ]).catch(err => { ready.delete(db); throw err; });
    ready.set(db, promise);
  }
  await ready.get(db);
}
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  // Branch previews share the configured D1 binding: never write preview traffic.
  if (url.hostname !== PRODUCTION_HOST) return new Response(null, { status: 204 });
  if (request.headers.get('Origin') !== url.origin ||
      !/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) {
    return json({ error: 'Same-origin JSON required' }, 403);
  }
  if (Number(request.headers.get('Content-Length') || 0) > 256) return json({ error: 'Payload too large' }, 413);
  let body;
  try {
    const text = await request.text();
    if (text.length > 256) return json({ error: 'Payload too large' }, 413);
    body = JSON.parse(text);
  } catch { return json({ error: 'Invalid JSON' }, 400); }
  const id = body && body.visitorId;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return json({ error: 'Invalid visitor ID' }, 400);
  }
  try {
    await ensureSchema(env.DB);
    const now = Date.now();
    const day = cairoDay(now);
    await env.DB.batch([
      env.DB.prepare('INSERT INTO visitor_days (visitor_id, day, last_seen) VALUES (?, ?, ?) ON CONFLICT(visitor_id, day) DO UPDATE SET last_seen = MAX(last_seen, excluded.last_seen)')
        .bind(id, day, Math.floor(now / 1000)),
      env.DB.prepare('DELETE FROM visitor_days WHERE day < ?').bind(shiftDay(day, -7))
    ]);
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch { return json({ error: 'Visitor stats unavailable' }, 503); }
}
export async function onRequestGet({ request, env }) {
  // Gate every count server-side, before any database or preview logic.
  try { if (!(await isAuthed(request, env))) return json({ error: 'Unauthorized' }, 401); }
  catch { return json({ error: 'Unauthorized' }, 401); }
  if (new URL(request.url).hostname !== PRODUCTION_HOST) {
    return json({ error: 'Tracking is disabled on previews', preview: true }, 503);
  }
  try {
    await ensureSchema(env.DB);
    const now = Date.now();
    const day = cairoDay(now);
    const since = shiftDay(day, -6); // today plus six previous Cairo calendar days
    const result = await env.DB.prepare(`SELECT
      COUNT(DISTINCT CASE WHEN day = ? THEN visitor_id END) AS today,
      COUNT(DISTINCT CASE WHEN day >= ? THEN visitor_id END) AS week,
      COUNT(DISTINCT CASE WHEN last_seen >= ? THEN visitor_id END) AS online
      FROM visitor_days WHERE day >= ?`).bind(day, since, Math.floor(now / 1000) - 120, since).first();
    return json({ today: Number(result?.today || 0), week: Number(result?.week || 0),
      online: Number(result?.online || 0), timezone: 'Africa/Cairo', updatedAt: new Date(now).toISOString() });
  } catch { return json({ error: 'Visitor stats unavailable' }, 503); }
}
