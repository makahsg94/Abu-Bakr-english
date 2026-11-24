import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
function worker(){
 const events={},puts=[]; const cache={async addAll(urls){puts.push(...urls)},async match(){return null},async put(req){puts.push(req.url)}};
 const ctx={self:{location:{origin:'https://example.com'},clients:{async claim(){}},addEventListener:(name,cb)=>events[name]=cb},
 caches:{async open(){return cache},async keys(){return ['unrelated-cache','ab-pwa-static-v0']},async delete(key){puts.push('delete:'+key)}},URL,
 fetch:async()=>({ok:true,type:'basic',redirected:false,headers:new Headers({'Content-Type':'image/png'}),clone(){return this}})};
 vm.runInNewContext(read('sw.js'),ctx);return {events,puts};
}
test('manifest has required local icons, valid sizes, launch scope and standalone display',()=>{
 const m=JSON.parse(read('manifest.webmanifest'));assert.equal(m.display,'standalone');assert.equal(m.scope,'/');assert.equal(m.start_url,'/');assert.ok(m.name&&m.short_name);
 for(const size of [192,512]){const icon=m.icons.find(x=>x.sizes===`${size}x${size}`&&x.purpose==='any');assert.ok(icon);const b=fs.readFileSync(new URL(icon.src.slice(1),root));assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size)}
});
test('never intercepts admin, API, login, navigation, third parties, mutations or query variants',()=>{
 const {events}=worker();
 for(const [path,method,mode] of [['/admin','GET','navigate'],['/admin.html','GET','cors'],['/api/login','GET','cors'],['/api/posts','GET','cors'],['/api/visitors','POST','cors'],['/','GET','navigate'],['/assets/quick-post.js','GET','cors'],['/assets/favicon-192.png?private=1','GET','cors'],['https://other.example/assets/favicon-192.png','GET','cors'],['/assets/favicon-192.png','POST','cors']]){
  let handled=false;events.fetch({request:{url:new URL(path,'https://example.com').href,method,mode},respondWith(){handled=true}});assert.equal(handled,false,path);
 }
});
test('only allowlisted static icon responses enter the app cache',async()=>{
 const {events,puts}=worker();let response;
 events.fetch({request:{url:'https://example.com/assets/favicon-192.png',method:'GET',mode:'cors'},respondWith(p){response=p}});
 await response;assert.deepEqual(puts,['https://example.com/assets/favicon-192.png']);
});
test('update cleans only this apps old caches, installation only precaches icons',async()=>{
 const {events,puts}=worker();let p;events.install({waitUntil(x){p=x}});await p;assert.ok(puts.every(x=>x.startsWith('/assets/')&&x.endsWith('.png')));
 events.activate({waitUntil(x){p=x}});await p;assert.ok(puts.includes('delete:ab-pwa-static-v0'));assert.ok(!puts.includes('delete:unrelated-cache'));
});
test('registration and manifest on public pages only, CSP not weakened',()=>{
 for(const name of fs.readdirSync(root).filter(x=>x.endsWith('.html')&&!x.startsWith('google'))){const s=read(name);if(name==='admin.html'){assert.ok(!s.includes('pwa-register'));continue}assert.ok(s.includes('rel="manifest"'),name);assert.ok(s.includes('/assets/pwa-register-v1.js'),name)}
 const h=read('_headers');assert.ok(h.includes("script-src 'self' 'unsafe-inline'"));assert.ok(h.includes('/sw.js'));assert.ok(!h.includes('script-src *'));
});
