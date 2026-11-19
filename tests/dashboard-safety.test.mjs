import {readDashboardTemplate} from '../scripts/dashboard-template.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {publicHtml} from '../scripts/prepare-pages.mjs';
const template=await readDashboardTemplate();
const helpers=template.split('// BEGIN DASHBOARD SAFETY HELPERS')[1]?.split('// END DASHBOARD SAFETY HELPERS')[0];
assert.ok(helpers,'browser safety helpers must exist');
const ctx=vm.createContext({});
vm.runInContext(helpers,ctx);
const invoke=(fn,...args)=>vm.runInContext(`${fn}(...${JSON.stringify(args)})`,ctx);
const ms=s=>Date.parse(s);
test('scheduled collection: before due, one-hour grace, delayed, recovered and invalid timestamp',()=>{
 const input={collected_at_utc:'2026-11-16T22:38:00Z'};
 assert.equal(invoke('collectionHealth',input,ms('2026-11-17T22:36:00Z')).late,false);
 assert.equal(invoke('collectionHealth',input,ms('2026-11-17T22:37:00Z')).pending,true);
 assert.equal(invoke('collectionHealth',input,ms('2026-11-17T23:36:59Z')).late,false);
 assert.equal(invoke('collectionHealth',input,ms('2026-11-17T23:37:00Z')).late,true);
 assert.equal(invoke('collectionHealth',{collected_at_utc:'2026-11-17T22:39:00Z'},ms('2026-11-17T23:37:00Z')).late,false);
 assert.equal(invoke('collectionHealth',{collected_at_utc:'bad'},ms('2026-11-17T23:37:00Z')).invalid,true);
 assert.equal(invoke('collectionHealth',{collected_at_utc:'2026-11-20T00:00:00Z'},ms('2026-11-17T23:37:00Z')).invalid,true);
});
test('US daily bars: missing one session warns; weekends, holidays, DST and preclose do not',()=>{
 const row={group:'대형주',status:'ok',bar_time_utc:'2026-11-16T14:30:00Z'};
 assert.equal(invoke('priceHealth',row,ms('2026-11-17T22:30:00Z')),'stale');
 assert.equal(invoke('priceHealth',row,ms('2026-11-17T15:00:00Z')),'current');
 assert.equal(invoke('expectedMarketDay',ms('2026-11-16T00:00:00Z')),'2026-11-13');
 assert.equal(invoke('expectedMarketDay',ms('2026-11-26T23:00:00Z')),'2026-11-25');
 assert.equal(invoke('expectedMarketDay',ms('2026-04-03T22:00:00Z')),'2026-04-02');
 assert.equal(invoke('expectedMarketDay',ms('2026-07-03T22:00:00Z')),'2026-07-02');
 assert.equal(invoke('expectedMarketDay',ms('2026-06-22T20:59:00Z')),'2026-06-18');
 assert.equal(invoke('expectedMarketDay',ms('2026-06-22T21:00:00Z')),'2026-06-22');
 assert.equal(invoke('expectedMarketDay',ms('2027-12-31T23:00:00Z')),'2027-12-31');
 assert.equal(invoke('expectedMarketDay',ms('2029-06-01T23:00:00Z')),null);
 assert.equal(invoke('priceHealth',{...row,bar_time_utc:'bad'},ms('2026-11-17T23:00:00Z')),'unknown');
 assert.equal(invoke('priceHealth',{...row,status:'error'},ms('2026-11-17T23:00:00Z')),'error');
});
test('CSV keeps negative and positive numeric cells while guarding formula text and escaping CSV',()=>{
 assert.equal(invoke('csvCell',-3.5),'-3.5');
 assert.equal(invoke('csvCell',0),'0');
 assert.equal(invoke('csvCell',1.25),'1.25');
 assert.equal(invoke('csvCell',null),'""');
 for(const text of ['=1+1','+cmd','-cmd','@SUM(A1)','  =1+1','\t=1+1','\n=1+1'])assert.ok(invoke('csvCell',text).startsWith('"\''));
 assert.equal(invoke('csvCell','A,"B"\nC'),'"A,""B""\nC"');
});
test('public page wires safety helpers and shows the current schedule',()=>{
 const html=publicHtml(template,{collected_at_utc:'2026-11-17T00:00:00Z',rows:[]});
 assert.ok(html.includes('매일 오전 7시 37분 목표'));
 assert.ok(!html.includes('매일 오전 8시'));
 assert.ok(html.includes('row.map(csvCell)'));
 assert.ok(html.includes('setInterval(updateFreshness,60000)'));
 const code=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code);assert.doesNotThrow(()=>new vm.Script(code));
});

test('BTC daily freshness uses a 36-hour clock even on US weekends and holidays',()=>{
 const row={group:'시장지표',symbol:'BTC-USD',status:'ok',bar_time_utc:'2026-11-14T00:00:00Z'};
 assert.equal(invoke('priceHealth',row,ms('2026-11-15T11:59:00Z')),'current');
 assert.equal(invoke('priceHealth',row,ms('2026-11-15T12:01:00Z')),'stale');
});


