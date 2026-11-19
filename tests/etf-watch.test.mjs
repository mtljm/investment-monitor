import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {validateEtfWatch,selectVolumeEtfs,collectEtfWatch,mergeEtfWatch} from '../scripts/etf-watch.mjs';
import {publicData} from '../scripts/prepare-pages.mjs';import {changedMarket} from '../scripts/pages-mode.mjs';
const config=JSON.parse(await readFile(new URL('../config/etf-watch.json',import.meta.url),'utf8'));
const scan=(symbol,concept,volume,day='2026-11-18')=>({symbol,concept,volume,dollar_volume:volume,volume_day:day,status:'ok'});
test('추정 거래대금 순으로 컨셉당 하나씩 최대 5개를 선택하며 오래된 봉은 섞지 않는다',()=>{
 const rows=[scan('A','bitcoin',100),scan('B','bitcoin',90),scan('C','credit',80),scan('D','gold',70),scan('E','long_bond',60),scan('F','cash',50),scan('G','oil',40),scan('OLD','other',999,'2026-11-17'),scan('BAD','bad',null)];
 rows.push({...scan('HIGH','oil',1),dollar_volume:200});const out=selectVolumeEtfs(rows);assert.deepEqual(out.rows.map(r=>r.symbol),['HIGH','A','C','D','E']);assert.equal(out.day,'2026-11-18');assert.equal(new Set(out.rows.map(r=>r.concept)).size,5);
});
test('기존 ETF·중복 티커·레버리지·컨셉 부족은 후보 설정에서 거부한다',()=>{
 assert.equal(validateEtfWatch(config,[]).length,16);
 assert.throws(()=>validateEtfWatch(config,[{symbol:config.candidates[0].symbol}]));
 for(const change of [c=>c.candidates[1].symbol=c.candidates[0].symbol,c=>c.candidates[0].name='3x Leveraged ETF',c=>c.candidates.forEach(r=>r.concept='same')]){const bad=structuredClone(config);change(bad);assert.throws(()=>validateEtfWatch(bad));}
});
test('거래량 조회 후 선정된 5개만 전체 지표를 수집한다',async()=>{
 let collected=0,calls=0;
 const result=await collectEtfWatch(config,[],async items=>{collected=items.length;return items.map(r=>({...r,status:'ok',bar_time_utc:'2026-11-18T14:30:00Z',close:100}));},async()=>{calls++;return {chart:{result:[{timestamp:[Date.parse('2026-11-18T14:30:00Z')/1000],indicators:{quote:[{close:[100],volume:[1000+calls]}]}}]}};});
 assert.equal(result.ranking_method,'close_times_volume_usd');assert.ok(result.rows.every(r=>r.ranking_dollar_volume>0));assert.equal(calls,16);assert.equal(collected,5);assert.equal(result.status,'ok');assert.equal(result.rows.length,5);assert.equal(new Set(result.rows.map(r=>r.concept)).size,5);
});
test('수집 실패는 기존 선정 자료를 유지하고 공개 필드만 보존한다',async()=>{
 const old={status:'ok',rows:[{group:'거래량 ETF',symbol:'TLT',concept:'long_bond',description:'장기국채',volume:100,token:'PRIVATE'}]};
 const failed=await collectEtfWatch(config,[],async()=>assert.fail('should not collect history'),async()=>{throw Error('offline');});
 assert.equal(failed.status,'error');const merged=mergeEtfWatch(old,failed);assert.equal(merged.status,'stale');assert.equal(merged.rows[0].symbol,'TLT');
 const out=publicData({rows:[],etf_watch:merged});assert.equal(out.etf_watch.rows[0].volume,100);assert.equal(out.etf_watch.rows[0].description,'장기국채');assert.ok(!JSON.stringify(out).includes('PRIVATE'));
 assert.equal(changedMarket(['config/etf-watch.json']),'us');
 assert.throws(()=>publicData({rows:[],etf_watch:{rows:[...old.rows,...old.rows]}}));
});
