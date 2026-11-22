import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';
import { onRequestGet, onRequestPost, cairoDay, shiftDay } from '../functions/api/visitors.js';
import { makeToken } from '../functions/_utils.js';

const HOST = 'https://abubakr-english.pages.dev';
const SECRET = 'unit-test-only-not-a-live-secret';
function db() {
  const sqlite = new DatabaseSync(':memory:');
  let queries = 0;
  const prepare = (sql, values=[]) => ({
    bind(...args) { return prepare(sql, args); },
    async run() { queries++; return sqlite.prepare(sql).run(...values); },
    async first() { queries++; return sqlite.prepare(sql).get(...values) || null; }
  });
  return { sqlite, prepare, async batch(stmts) { return Promise.all(stmts.map(s => s.run())); }, get queries() { return queries; } };
}
function post(id, base=HOST, origin=base, extra={}) {
  return new Request(base+'/api/visitors', { method:'POST', headers:{Origin:origin,'Content-Type':'application/json',...extra}, body:JSON.stringify({visitorId:id}) });
}
const id1='00000000-0000-4000-8000-000000000001';
const id2='00000000-0000-4000-8000-000000000002';
const id3='00000000-0000-4000-8000-000000000003';
async function authReq(base=HOST) {
  const token = await makeToken(SECRET,{name:'Test admin'});
  return new Request(base+'/api/visitors',{headers:{Cookie:'ab_session='+encodeURIComponent(token)}});
}

test('Cairo day and last-seven-calendar-day boundary, including DST',()=>{
  assert.equal(cairoDay(Date.parse('2026-11-22T21:59:59Z')),'2026-11-22');
  assert.equal(cairoDay(Date.parse('2026-11-22T22:00:00Z')),'2026-11-23');
  assert.equal(cairoDay(Date.parse('2026-07-01T21:00:00Z')),'2026-07-02');
  assert.equal(shiftDay('2026-03-02',-6),'2026-02-24');
});
test('unauthorized GET has no counts and never accesses DB',async()=>{
  const DB=db();const res=await onRequestGet({request:new Request(HOST+'/api/visitors'),env:{DB,AUTH_SECRET:SECRET}});
  assert.equal(res.status,401);assert.equal(DB.queries,0);
  assert.equal((await res.json()).today,undefined);
  assert.equal(res.headers.get('Cache-Control'),'no-store');
});
test('preview POST never writes; authorized preview GET never reads DB',async()=>{
  const DB=db();const env={DB,AUTH_SECRET:SECRET};
  assert.equal((await onRequestPost({request:post(id1,'https://branch.example.pages.dev'),env})).status,204);
  assert.equal((await onRequestGet({request:await authReq('https://branch.example.pages.dev'),env})).status,503);
  assert.equal(DB.queries,0);
});
test('cross-origin, wrong type, malformed JSON and invalid identifiers rejected',async()=>{
  const DB=db();const env={DB};
  assert.equal((await onRequestPost({request:post(id1,HOST,'https://bad.example'),env})).status,403);
  assert.equal((await onRequestPost({request:post(id1,HOST,HOST,{'Content-Type':'text/plain'}),env})).status,403);
  assert.equal((await onRequestPost({request:post('bad'),env})).status,400);
  assert.equal((await onRequestPost({request:post(id1,HOST,HOST,{'Content-Length':'1000'}),env})).status,413);
  assert.equal(DB.queries,0);
});
test('real SQLite: repeated visits and tabs deduplicated; week, online, cleanup correct',async()=>{
  const DB=db();const env={DB,AUTH_SECRET:SECRET};
  for(const id of [id1,id1,id2]) assert.equal((await onRequestPost({request:post(id),env})).status,204);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) AS n FROM visitor_days').get().n,2);
  const now=Math.floor(Date.now()/1000),today=cairoDay(Date.now());
  DB.sqlite.prepare('UPDATE visitor_days SET last_seen = ? WHERE visitor_id = ?').run(now-121,id2);
  DB.sqlite.prepare('INSERT INTO visitor_days VALUES (?,?,?)').run(id1,shiftDay(today,-3),now-86400*3);
  DB.sqlite.prepare('INSERT INTO visitor_days VALUES (?,?,?)').run(id3,shiftDay(today,-6),now-86400*6);
  DB.sqlite.prepare('INSERT INTO visitor_days VALUES (?,?,?)').run('old',shiftDay(today,-9),now-86400*9);
  await onRequestPost({request:post(id1),env});
  const res=await onRequestGet({request:await authReq(),env});
  assert.equal(res.status,200);
  const data=await res.json();assert.equal(data.today,2);assert.equal(data.week,3);assert.equal(data.online,1);
  assert.equal(DB.sqlite.prepare("SELECT COUNT(*) AS n FROM visitor_days WHERE visitor_id='old'").get().n,0);
  assert.equal(data.timezone,'Africa/Cairo');
  const cols=DB.sqlite.prepare('PRAGMA table_info(visitor_days)').all().map(x=>x.name);
  assert.deepEqual(cols,['visitor_id','day','last_seen']);
});
test('DB errors return unavailable rather than misleading zero counts',async()=>{
  const DB={async batch(){throw new Error('offline')},prepare(){return {}}};
  assert.equal((await onRequestPost({request:post(id1),env:{DB}})).status,503);
  assert.equal((await onRequestGet({request:await authReq(),env:{DB,AUTH_SECRET:SECRET}})).status,503);
});
