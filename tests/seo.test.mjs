import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSitemap,SITE} from '../functions/_sitemap.js';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
test('public metadata is absolute, unique and on working origin; no fake hreflang',()=>{
 for(const name of fs.readdirSync(root).filter(x=>x.endsWith('.html')&&x!=='admin.html'&&!x.startsWith('google'))){
  const s=read(name);assert.equal((s.match(/<link[^>]*rel="canonical"/g)||[]).length,1,name);
  assert.ok(s.includes('name="description"'),name);assert.ok(s.includes('property="og:image" content="https://abubakr-english.pages.dev/'),name);
  assert.ok(!s.includes('hreflang='),name);
  assert.ok(s.includes('rel="canonical" href="https://abubakr-english.pages.dev/'),name);
 }
});
test('sitemap includes published posts only, escapes URLs, uses canonical routes and no fake static lastmod',async()=>{
 const xml=await buildSitemap({DB:{prepare:sql=>({async all(){assert.ok(sql.includes('published = 1'));return {results:[{slug:'test & sample',created_at:'2026-10-21'}]}}})}});
 assert.equal(SITE,'https://abubakr-english.pages.dev');
 assert.ok(xml.includes('/post?slug=test%20%26%20sample'));assert.ok(!xml.includes('.html'));
 assert.ok(xml.includes('/daily-challenge'));assert.equal((xml.match(/<lastmod>/g)||[]).length,1);
});
test('all literal image sources exist, have dimensions and originals preserved',()=>{
 for(const name of fs.readdirSync(root).filter(x=>x.endsWith('.html')&&x!=='admin.html'&&!x.startsWith('google'))){
  const s=read(name);for(const tag of s.match(/<img\b[^>]*>/gi)||[]){const src=/\bsrc="([^"]+)"/.exec(tag)?.[1];if(!src||!src.startsWith('assets/'))continue;
   assert.ok(fs.existsSync(new URL(src,root)),name+':'+src);assert.ok(/\bwidth=/.test(tag)&&/\bheight=/.test(tag),name+':'+src);
  }
 }
 assert.ok(read('index.html').includes('fetchpriority="high"'));assert.ok(read('assets/fireworks-v2.js').includes('prefers-reduced-motion'));
});
test('teacher identity is visible in initial HTML in both languages and schema names agree',()=>{
 const s=read('index.html'), title=/<title>(.*?)<\/title>/.exec(s)[1];
 assert.ok(title.includes('Abu Bakr Mukhtar')&&title.includes('أبو بكر مختار'));
 assert.match(s,/<h1>Learn English with<br><em>Abu Bakr Mukhtar<\/em><\/h1>/);
 assert.match(s,/<p class="teacher-name-ar" lang="ar" dir="rtl" translate="no">أبو بكر مختار، مدرس لغة إنجليزية أونلاين<\/p>/);
 const data=[...s.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1]));
 const person=data.find(x=>x['@type']==='Person'),site=data.find(x=>x['@type']==='WebSite');
 assert.equal(site.name,person.name);assert.equal(site.url,person.url);
 assert.ok(person.alternateName.includes('أبو بكر مختار'));assert.ok(site.alternateName.includes('ابو بكر مختار'));
 assert.equal(site.publisher['@id'],person['@id']);
 assert.ok(s.includes('"Learn English with": "تعلم الإنجليزية مع"'));
 assert.ok(!s.includes('hreflang='));
});
