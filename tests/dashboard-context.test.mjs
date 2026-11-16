import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardContext,compareSignals,signalKind} from '../scripts/dashboard-context.mjs';
import {indicatorHistory} from '../scripts/chart-series.mjs';
const row={group:'대형주',symbol:'A',snapshot_rank:1,status:'ok',bar_time_utc:'2026-11-17T14:30:00Z',close:110,sma20:105,sma50:100,sma200:90,rsi14:71,bb_percent_b:101,change_1d_pct:2};
test('RSI/추세/밴드 경계와 이전 고정 지지·저항을 비교한다',()=>{
 const e=compareSignals(row,{...row,close:100,sma20:101,rsi14:69,bb_percent_b:100,support:95,resistance:108});
 assert.deepEqual(e.map(e=>e.kind),['up','heat','heat','up']);
 assert.match(e.at(-1).text,/108.00/);
 assert.equal(compareSignals({...row,close:110,fibonacci:{support:{price:120}}},{...row,support:100}).some(e=>/지지선/.test(e.text)),false);
 assert.equal(signalKind('과열 주의 · 추격 신중'),'heat');assert.equal(signalKind('약세·과매도 · 반전 확인'),'oversold');
});
test('첫 수집/동일일 재배포는 이전 날짜로 위장하지 않고 다음 날짜에만 비교한다',()=>{
 const first=dashboardContext({rows:[row]});assert.equal(first.data.rows[0].changes.available,false);
 const same=dashboardContext({rows:[{...row,rsi14:75}]},first.history);assert.equal(same.data.rows[0].changes.available,false);assert.equal(same.history.days.length,1);
 const next=dashboardContext({rows:[{...row,bar_time_utc:'2026-11-18T14:30:00Z',rsi14:29}]},same.history);
 assert.equal(next.data.rows[0].changes.baseline_day,'2026-11-17');assert.ok(next.data.rows[0].changes.events.some(e=>e.kind==='oversold'));
 assert.equal(next.history.days.length,2);
});
test('이력은 90일 이하로 보관하고 임의 필드는 제거한다',()=>{
 const days=Array.from({length:90},(_,i)=>({day:new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),rows:[{...row,token:'SECRET'}]}));
 const out=dashboardContext({rows:[row]},{version:1,days});assert.equal(out.history.days.length,90);assert.ok(!JSON.stringify(out.history).includes('SECRET'));
 assert.throws(()=>dashboardContext({rows:[row]},{version:2,days:[]}));
});
test('SMA200은 90개 표시 범위 이전 이력까지 사용하며 밴드 값은 정렬된다',()=>{
 const h=indicatorHistory(Array.from({length:220},(_,i)=>({time:i+1,close:i+1})));
 assert.equal(h.length,90);assert.equal(h.at(-1).sma200,120.5);assert.equal(h.at(-1).sma20,210.5);
 assert.equal(h[0].sma200,null);assert.ok(Math.abs(h.at(-1).bb_upper-(210.5+2*Math.sqrt(33.25)))<1e-8);
});
