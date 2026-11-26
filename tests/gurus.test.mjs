import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filingList,chooseFiling,parseHoldings,collectManager} from '../scripts/collect-gurus.mjs';
import {publicGurusData,mergeGurus} from '../scripts/gurus.mjs';
import {mergeMarketSnapshots} from '../scripts/build-market-site.mjs';
import {changedMarket,scheduledMarket} from '../scripts/pages-mode.mjs';
function row(period,kind,accession,value=100){return '<tr><td data-order="'+period+'"><a href="/13f/'+accession+'-test">Q3</a></td><td>1</td><td data-order="'+value+'">100</td><td>A</td><td>'+kind+'</td><td data-order="2026-11-16">11/16/2026</td><td>'+accession+'</td></tr>';}
const positions={data:[['AAA','A Inc','COM','001',60,60,6,null,null],['AAA','A Inc','COM','001',20,20,2,null,null],['BBB','B Inc','COM','002',20,20,4,null,null],['OPT','Options','COM','003',10,10,1,null,'CALL']]};
test('13F 목록에서 최신 분기·정정본을 고르고 추가 공시 합산은 보류한다',()=>{
 const list=filingList(row('2026-09-30','13F-HR','000000000026000001')+row('2026-06-30','13F-HR','000000000026000002'));
 assert.equal(chooseFiling(list).period,'2026-09-30');
 assert.equal(chooseFiling([...list,{...list[0],kind:'RESTATEMENT',accession:'000000000026000003'}]).kind,'RESTATEMENT');
 assert.throws(()=>chooseFiling([...list,{...list[0],kind:'NEW HOLDINGS'}]));assert.throws(()=>filingList('<html>changed</html>'));
});
test('천달러 단위를 변환하고 옵션 제외·동일 CUSIP 합산 후 비중을 계산한다',()=>{
 const out=parseHoldings(positions,100000);assert.equal(out.total_usd,100000);assert.equal(out.excluded_count,1);assert.equal(out.holdings.length,2);assert.equal(out.holdings[0].shares,8);assert.equal(out.holdings[0].weight_pct,80);
 assert.equal(parseHoldings(positions,110000).total_usd,100000);
 assert.throws(()=>parseHoldings(positions,100000000));assert.throws(()=>parseHoldings({data:[[1,2]]},1));
});
test('연속 분기만 비교하며 신규·주식수 변화를 수익률로 해석하지 않는다',async()=>{
 const html=row('2026-09-30','13F-HR','000000000026000001')+row('2026-06-30','13F-HR','000000000026000002');
 const result=await collectManager({id:'test',cik:'123',path:'test'},async u=>u.includes('/manager/')?html:JSON.stringify(u.endsWith('000001')?{data:[['AAA','A','COM','001',100,100,20,null,null]]}:{data:[['AAA','A','COM','001',100,100,10,null,null]]}));
 assert.equal(result.prior_date,'2026-06-30');assert.equal(result.holdings[0].change_pct,100);assert.equal(result.holdings[0].change,'increase');assert.match(result.sec_url,/sec.gov/);
});
test('수집 실패 시 이전 기관 자료를 유지하고 공개 필드만 내보낸다',()=>{
 const good={checked_at_utc:'2026-11-18T00:00:00Z',managers:[{id:'test',name:'Test',status:'ok',total_usd:100,holdings:[{symbol:'A',name:'A',value_usd:100,weight_pct:100,token:'PRIVATE'}],token:'PRIVATE'}]};
 assert.ok(!JSON.stringify(publicGurusData(good)).includes('PRIVATE'));
 const out=mergeGurus(good,{checked_at_utc:'2026-11-19T00:00:00Z',managers:[{id:'test',status:'error',holdings:[]}]});assert.equal(out.managers[0].status,'stale');assert.equal(out.managers[0].holdings[0].symbol,'A');
 const published={data:{rows:[],collected_at_utc:'2026-11-18T00:00:00Z',asia:{rows:[]},gurus:good},history:{version:1,days:[]}};
 const merged=mergeMarketSnapshots('gurus',published,{gurus:good});assert.equal(merged.data.rows,published.data.rows);assert.equal(merged.history,published.history);assert.equal(merged.data.asia,published.data.asia);
 assert.equal(changedMarket(['config/gurus.json']),'gurus');assert.equal(changedMarket(['scripts/collect-gurus.mjs','config/asia.json']),'all');
});
test('13F 주간 갱신은 공통 잠금을 공유하며 시세 수집을 요구하지 않는다',async()=>{
 const schedule=await readFile(new URL('../.github/workflows/daily-pages.yml',import.meta.url),'utf8');
 assert.match(schedule,/0 23 \* \* 5/);assert.equal(scheduledMarket('0 23 * * 5'),'gurus');assert.match(schedule,/publish-market.yml/);
});
