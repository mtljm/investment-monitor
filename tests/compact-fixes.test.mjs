import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {changedMarket} from '../scripts/pages-mode.mjs';
import {assertCompleteAsia} from '../scripts/collect-asia.mjs';
import {mergeMarketSnapshots} from '../scripts/build-market-site.mjs';
test('변경 파일을 미국·아시아·공통 수집으로 구분한다',()=>{
 for(const p of ['config/asia.json','scripts/collect-asia.mjs'])assert.equal(changedMarket([p]),'asia');
 for(const p of ['config/monitor.json','scripts/dashboard-context.mjs'])assert.equal(changedMarket([p]),'us');
 for(const p of ['scripts/monitor.mjs','scripts/high52.mjs','scripts/fetch-market.mjs','scripts/technical-indicators.mjs'])assert.equal(changedMarket([p]),'all');
 assert.equal(changedMarket(['config/asia.json','config/monitor.json']),'all');
 assert.equal(changedMarket(['templates/dashboard.js','tests/asia.test.mjs']),'reuse');
});
test('아시아 일부·전체 실패와 유효 가격 누락은 게시 전에 차단한다',()=>{
 const valid={collected_at_utc:'2026-11-18T08:30:00Z',rows:[{symbol:'A',status:'ok',close:10}]};
 assert.doesNotThrow(()=>assertCompleteAsia(valid));
 const published={data:{collected_at_utc:'2026-11-17T22:15:00Z',rows:[],asia:{...valid,collected_at_utc:'2026-11-17T08:30:00Z'}},history:{version:1,days:[]}};
 for(const rows of [[],[{symbol:'A',status:'error'}],[valid.rows[0],{symbol:'B',status:'error'}],[{symbol:'A',status:'ok',close:null}]]){
  assert.throws(()=>assertCompleteAsia({...valid,rows}));
  assert.throws(()=>mergeMarketSnapshots('asia',published,{asia:{...valid,rows}}));
 }
 assert.equal(published.data.asia.collected_at_utc,'2026-11-17T08:30:00Z');
});
const safety=await readFile(new URL('../templates/dashboard-safety.js',import.meta.url),'utf8');
const health=vm.runInNewContext(safety+';asiaCollectionHealth');
test('아시아 평일 17:30 예정·18:30 지연 경고와 주말·복구를 판단한다',()=>{
 const old={collected_at_utc:'2026-11-17T08:31:00Z'};
 assert.equal(health(old,Date.parse('2026-11-18T08:29:00Z')).late,false);
 assert.equal(health(old,Date.parse('2026-11-18T08:30:00Z')).pending,true);
 assert.equal(health(old,Date.parse('2026-11-18T09:30:00Z')).late,true);
 assert.equal(health({collected_at_utc:'2026-11-18T08:31:00Z'},Date.parse('2026-11-18T09:30:00Z')).late,false);
 assert.equal(health({collected_at_utc:'2026-11-20T08:31:00Z'},Date.parse('2026-11-22T12:00:00Z')).late,false);
 assert.equal(health(old,Date.parse('2026-11-23T09:30:00Z')).late,true);
 assert.equal(health({collected_at_utc:'bad'},Date.parse('2026-11-18T09:30:00Z')).invalid,true);
 assert.equal(health({collected_at_utc:'2026-11-19T08:30:00Z'},Date.parse('2026-11-18T09:30:00Z')).invalid,true);
});
test('주기적 갱신 검사에서 히트맵 상태도 갱신한다',async()=>{
 const js=await readFile(new URL('../templates/dashboard.js',import.meta.url),'utf8');
 const fn='function updateFreshness(){'+js.split('function updateFreshness(){')[1].split('function visibleRows(){')[0];
 let refreshed=0;const notice={parentElement:{setAttribute(){},classList:{toggle(){}}}};
 const ctx={$:id=>['asia','gurus','overview'].includes(id)?{hidden:true}:notice,data:{rows:[]},renderCollectionStatus(){},collectionStats:()=>({stale:0,unknown:0,error:0,retained:0}),renderSectors:()=>refreshed++,renderTemperature(){},collectionHealth:()=>({expectedDay:'2026-11-17'}),priceHealth(){},localTime:()=>''};
 vm.runInNewContext(fn+';updateFreshness();',ctx);assert.equal(refreshed,1);
});
