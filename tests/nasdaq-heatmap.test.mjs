import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import {validateNasdaqWeights,readDashboardTemplate} from '../scripts/dashboard-template.mjs';
const config=JSON.parse(await readFile(new URL('../config/nasdaq-sector-weights.json',import.meta.url),'utf8'));
test('NDX weights retain zero industries, reject invalid sources and negative weights',()=>{
 const valid=validateNasdaqWeights(config);assert.equal(valid.items.filter(r=>r[2]>0).length,9);assert.equal(valid.items.reduce((n,r)=>n+r[2],0),100);
 for(const modify of [c=>c.items[0][2]=-1,c=>c.items[0][2]=40,c=>c.items.pop(),c=>c.items[0][0]='UNKNOWN',c=>c.source='https://example.com/',c=>c.asOf='2099-01-01']){const bad=structuredClone(config);modify(bad);assert.throws(()=>validateNasdaqWeights(bad));}
});
test('NDX map uses its own areas and metadata, omits zero tiles and greys missing quotes',async()=>{
 const html=await readDashboardTemplate();assert.ok(!html.includes('__NASDAQ_WEIGHTS__'));assert.match(html,/실제 수익률이 아닙니다/);
 const src=html.match(/const sectorWeights=[\s\S]*?(?=let data=)/)[0];
 const els=Object.fromEntries(['sector','nasdaq'].flatMap(p=>['overview','weight-date','weight-source','weight-status'].map(k=>[p+'-'+k,{clientWidth:960,style:{},innerHTML:'',textContent:''}])));
 const ctx={document:{activeElement:null},$:id=>els[id],data:{rows:[{symbol:'XLK',status:'ok',change_1d_pct:2}]},stale:()=>false,esc:String,pct:String};
 vm.runInNewContext(src+';renderSectors();globalThis.rects=sectorRects(nasdaqWeights.items.filter(r=>r[2]>0),0,0,100,100);',ctx);
 assert.equal((els['nasdaq-overview'].innerHTML.match(/<button/g)||[]).length,9);assert.equal((els['sector-overview'].innerHTML.match(/<button/g)||[]).length,11);
 assert.equal(els['nasdaq-weight-date'].textContent,config.asOf);assert.equal(els['nasdaq-weight-source'].href,config.source);assert.match(els['nasdaq-overview'].innerHTML,/시세 미확인/);
 for(const r of ctx.rects)assert.ok(Math.abs(r.w*r.h-r.item[2]*100)<.00001);
});

