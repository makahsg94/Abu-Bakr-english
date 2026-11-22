import { isAuthed, getSession, getAdmins, json, badRequest, makeToken, setSessionCookie } from '../_utils.js';

// length-independent comparison of two strings
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// --- brute-force protection: 5 failed logins per IP -> 10 minute block ---
const MAX_FAILS = 5;
const BLOCK_SECONDS = 600;

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

async function ensureAttemptsTable(env) {
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, fails INTEGER NOT NULL DEFAULT 0, blocked_until INTEGER)'
  ).run();
}

async function readAttempts(env, ip) {
  const row = await env.DB.prepare('SELECT fails, blocked_until FROM login_attempts WHERE ip = ?').bind(ip).first();
  if (!row) return { fails: 0, blockedUntil: 0 };
  return { fails: row.fails || 0, blockedUntil: row.blocked_until || 0 };
}

async function recordFailure(env, ip, fails, now) {
  // after MAX_FAILS failures, reset the counter and block the IP for BLOCK_SECONDS
  if (fails >= MAX_FAILS) {
    await env.DB.prepare(
      'INSERT INTO login_attempts (ip, fails, blocked_until) VALUES (?, 0, ?) ON CONFLICT(ip) DO UPDATE SET fails = 0, blocked_until = excluded.blocked_until'
    ).bind(ip, now + BLOCK_SECONDS).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO login_attempts (ip, fails, blocked_until) VALUES (?, ?, NULL) ON CONFLICT(ip) DO UPDATE SET fails = excluded.fails'
    ).bind(ip, fails).run();
  }
}

async function clearAttempts(env, ip) {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?').bind(ip).run();
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch (e) { return badRequest('Invalid JSON'); }
  const password = (body && body.password) ? String(body.password) : '';
  if (!password) return badRequest('Password required');

  // rate limit: refuse while this IP is blocked (best-effort; DB errors never lock anyone out)
  const ip = clientIp(request);
  const now = Math.floor(Date.now() / 1000);
  let attempts = { fails: 0, blockedUntil: 0 };
  try {
    await ensureAttemptsTable(env);
    attempts = await readAttempts(env, ip);
    if (attempts.blockedUntil > now) {
      const wait = attempts.blockedUntil - now;
      return json({ error: 'Too many attempts. Try again in ' + Math.ceil(wait / 60) + ' minutes.' }, 429, { 'Retry-After': String(wait) });
    }
  } catch (e) { /* rate limiting is best-effort */ }

  const admins = getAdmins(env);
  if (!admins.length) return json({ error: 'ADMIN_PASSWORD not configured' }, 500);

  const matched = admins.find(function (a) { return safeEqual(password, a.password); });
  if (!matched) {
    try { await recordFailure(env, ip, attempts.fails + 1, now); } catch (e) { /* best-effort */ }
    return json({ error: 'Invalid password' }, 401);
  }

  try { await clearAttempts(env, ip); } catch (e) { /* best-effort */ }
  const secret = env.AUTH_SECRET || env.ADMIN_PASSWORD;
  const token = await makeToken(secret, { name: matched.name });
  return new Response(JSON.stringify({ ok: true, name: matched.name }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': setSessionCookie(token)
    }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const session = await getSession(request, env);
  return json({ authed: session.authed, name: session.name || null });
}
