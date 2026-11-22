import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const script=readFileSync(new URL('../assets/visitor-tracker.js',import.meta.url),'utf8');
function browser(options={}) {
  const calls=[],events={},timers=[];const storage=new Map();
  const ctx={location:{hostname:'abubakr-english.pages.dev',pathname:'/'},navigator:{},
    document:{visibilityState:'visible',addEventListener:(name,cb)=>events[name]=cb},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},Date,JSON,Number,
    setInterval:cb=>timers.push(cb),fetch:async(...args)=>{calls.push(args);return {status:204}},...options};
  vm.runInNewContext(script,ctx);
  return {calls,events,timers,storage,ctx};
}
test('heartbeat sends only random ID, no identity or page data, shared storage throttles',async()=>{
  const b=browser();await Promise.resolve();
  assert.equal(b.calls.length,1);
  assert.deepEqual(JSON.parse(b.calls[0][1].body),{visitorId:'00000000-0000-4000-8000-000000000001'});
  assert.equal(b.calls[0][1].credentials,'omit');
  await b.timers[0]();assert.equal(b.calls.length,1);
  b.ctx.document.visibilityState='hidden';await b.events.visibilitychange();assert.equal(b.calls.length,1);
});
test('preview, admin, DNT and GPC visitors are not tracked',()=>{
  for(const opt of [{location:{hostname:'preview.pages.dev',pathname:'/'}},
    {location:{hostname:'abubakr-english.pages.dev',pathname:'/admin'}},
    {navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}}]) {
    const b=browser(opt);assert.equal(b.calls.length,0);assert.equal(b.timers.length,0);
  }
});
test('blocked storage never breaks public pages',()=>{
  const b=browser({localStorage:{getItem(){throw new Error('blocked')}}});assert.equal(b.calls.length,0);
});
