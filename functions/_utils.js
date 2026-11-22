const COOKIE_NAME = 'ab_session';
const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

async function hmacSign(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const bytes = new Uint8Array(sig);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return b64urlEncode(bin);
}

async function makeToken(secret, extra) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL;
  const payload = b64urlEncode(JSON.stringify(Object.assign({ exp }, extra || {})));
  const sig = await hmacSign(secret, payload);
  return payload + '.' + sig;
}

async function verifyToken(secret, token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = await hmacSign(secret, payload);
  if (sig !== expected) return null;
  try {
    const json = JSON.parse(b64urlDecode(payload));
    if (typeof json.exp !== 'number') return null;
    if (Math.floor(Date.now() / 1000) > json.exp) return null;
    return json;
  } catch (e) {
    return null;
  }
}

// The admins that may sign in: ADMIN_PASSWORD (main) and ADMIN_PASSWORD_2
// (second admin). Each one can have its own display name.
function getAdmins(env) {
  const admins = [];
  if (env.ADMIN_PASSWORD) admins.push({ name: env.ADMIN_NAME || 'Admin', password: env.ADMIN_PASSWORD });
  if (env.ADMIN_PASSWORD_2) admins.push({ name: env.ADMIN_NAME_2 || 'Admin 2', password: env.ADMIN_PASSWORD_2 });
  if (env.ADMIN_PASSWORD_3) admins.push({ name: env.ADMIN_NAME_3 || 'Admin 3', password: env.ADMIN_PASSWORD_3 });
  return admins;
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

// returns { authed: true, name } or { authed: false }
async function getSession(request, env) {
  const secret = env.AUTH_SECRET || env.ADMIN_PASSWORD || 'change-me-please';
  const token = getCookie(request, COOKIE_NAME);
  const payload = await verifyToken(secret, token);
  if (!payload) return { authed: false };
  return { authed: true, name: payload.name || 'Admin' };
}

async function isAuthed(request, env) {
  const session = await getSession(request, env);
  return session.authed;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }, headers || {})
  });
}

function unauthorized() { return json({ error: 'Unauthorized' }, 401); }
function badRequest(msg) { return json({ error: msg || 'Bad request' }, 400); }
function serverError(msg) { return json({ error: msg || 'Server error' }, 500); }

function setSessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TOKEN_TTL}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || ('post-' + Date.now());
}

export {
  COOKIE_NAME, makeToken, verifyToken, getCookie, isAuthed, getSession, getAdmins,
  json, unauthorized, badRequest, serverError,
  setSessionCookie, clearSessionCookie, slugify
};