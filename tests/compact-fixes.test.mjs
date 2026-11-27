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
 let refreshed=0,pulse=0;const notice={parentElement:{setAttribute(){},classList:{toggle(){}}}};
 const ctx={$:id=>['asia','gurus','overview'].includes(id)?{hidden:true}:notice,data:{rows:[]},renderCollectionStatus(){},collectionStats:()=>({stale:0,unknown:0,error:0,retained:0}),renderSectors:()=>refreshed++,renderOverviewPulse:()=>pulse++,renderTemperature(){},collectionHealth:()=>({expectedDay:'2026-11-17'}),priceHealth(){},localTime:()=>''};
 vm.runInNewContext(fn+';updateFreshness();',ctx);assert.equal(refreshed,1);assert.equal(pulse,1);
});

test('핵심 요약은 최신 집계와 후보만 확인으로 표시하고 지연·날짜 불일치를 보류한다',async()=>{
 const source=await readFile(new URL('../templates/overview-layout.js',import.meta.url),'utf8');const el={innerHTML:''};let health={expectedDay:'2026-11-25',late:false,invalid:false};
 const ctx={$:()=>el,data:{market_breadth:{status:'ok',history:[{day:'2026-11-25'}]},leaders:{day:'2026-11-25',valid:199,expected:201,candidates:[{},{}]}},collectionHealth:()=>health,displayRows:()=>[],collectionSummary:()=>'',esc:String};
 vm.runInNewContext(source+';renderOverviewPulse();',ctx);assert.match(el.innerHTML,/집계 확인/);assert.match(el.innerHTML,/2개/);
 health.late=true;vm.runInNewContext('renderOverviewPulse();',ctx);assert.match(el.innerHTML,/확인 필요/);assert.match(el.innerHTML,/기준일 확인/);assert.ok(!el.innerHTML.includes('>2개<'));
 health.late=false;health.expectedDay='2026-11-26';vm.runInNewContext('renderOverviewPulse();',ctx);assert.match(el.innerHTML,/기준일 확인/);
});
