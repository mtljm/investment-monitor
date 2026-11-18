import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {validateSectorWeights,readDashboardTemplate} from '../scripts/dashboard-template.mjs';
const config=JSON.parse(await readFile(new URL('../config/sector-weights.json',import.meta.url),'utf8'));
const now=Date.parse('2026-11-17T00:00:00Z');
test('11개 섹터·합계·날짜·출처를 검증하고 표시 순서를 정리한다',()=>{
 const valid=validateSectorWeights(config,now);assert.equal(valid.items.length,11);assert.equal(valid.asOf,config.asOf);
 assert.equal(valid.items[0][0],'XLK');assert.ok(Math.abs(valid.items.reduce((s,r)=>s+r[2],0)-100)<.15);
 for(const change of [c=>c.items.pop(),c=>c.items[0][2]=0,c=>c.items[0][2]=50,c=>c.items[1][0]=c.items[0][0],c=>c.asOf='2026-02-30',c=>c.asOf='2027-01-01',c=>c.source='javascript:alert(1)']){
  const bad=structuredClone(config);change(bad);assert.throws(()=>validateSectorWeights(bad,now));
 }
});
test('하나의 설정으로 히트맵과 기준일을 생성하고 오래된 비중을 표시한다',async()=>{
 const html=await readDashboardTemplate();assert.ok(!html.includes('__SECTOR_WEIGHTS__'));
 const source=html.match(/const sectorWeights=[\s\S]*?(?=let data=)/)?.[0];assert.ok(source);
 const els=Object.fromEntries(['sector-overview','sector-weight-date','sector-weight-source','sector-weight-status'].map(id=>[id,{clientWidth:345,style:{},innerHTML:'',textContent:''}]));
 const ctx={document:{activeElement:null},$:id=>els[id],data:{rows:[]},stale:()=>false,esc:String,pct:String,Date:class extends Date{static now(){return Date.parse('2027-01-01T00:00:00Z');}}};
 vm.runInNewContext(source+';renderSectors();',ctx);
 assert.equal(els['sector-weight-date'].textContent,config.asOf);
 assert.match(els['sector-weight-status'].textContent,/갱신 확인 필요/);
 assert.equal((els['sector-overview'].innerHTML.match(/<button/g)||[]).length,11);
});

