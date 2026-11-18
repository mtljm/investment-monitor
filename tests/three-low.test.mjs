import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
import {validateThreeLow} from '../scripts/three-low-config.mjs';import {publicData} from '../scripts/prepare-pages.mjs';import {changedMarket} from '../scripts/pages-mode.mjs';
const config=validateThreeLow(JSON.parse(await readFile(new URL('../config/three-low.json',import.meta.url),'utf8')));
const source=(await readFile(new URL('../templates/three-low.js',import.meta.url),'utf8')).split('// THREE_LOW_MODEL_START')[1].split('// THREE_LOW_MODEL_END')[0];
const calculate=vm.runInNewContext(source+';calculateThreeLow');
function fixture(){
 const row=(symbol,values)=>({symbol,status:'ok',...values});
 return {rows:[row('^TNX',{close:3.8,sma50:4,history:Array.from({length:21},(_,i)=>({time:i+1,close:i===20?3.8:4.1}))}),row('^GSPC',{close:120,sma200:100}),row('QQQ',{close:110,sma50:100,change_20d_pct:2}),row('^VIX',{close:20}),row('AAPL',{group:'대형주',close:115,sma20:110,sma50:105,sma200:100,rsi14:55,change_20d_pct:5,volume_ratio:1.2,obv_flow20:5})],three_low:{rows:[row('DX-Y.NYB',{group:'시장지표',close:90,sma50:100,change_20d_pct:-2}),row('CL=F',{group:'시장지표',close:60,sma50:70,change_20d_pct:-8})]}};
}
test('3저·위험회피·기술 6개 모두 충족해야 포착한다',()=>{
 const out=calculate(fixture(),config);assert.equal(out.count,3);assert.equal(out.riskReady,true);assert.equal(out.readyCount,1);
 const a=out.candidates.find(r=>r.symbol==='AAPL');assert.equal(a.score,6);assert.equal(a.relative,3);assert.equal(a.ready,true);assert.equal(out.metrics[2].delta,-30);
});
test('하락 방향과 SMA50을 함께 확인하며 수익률 대신 금리 bp를 계산한다',()=>{
 const f=fixture();f.rows[0].close=3.9;let out=calculate(f,config);assert.equal(out.metrics[2].delta,-20);assert.equal(out.metrics[2].passed,true);
 f.three_low.rows[0].close=101;out=calculate(f,config);assert.equal(out.count,2);assert.equal(out.readyCount,0);
 f.three_low.rows[0].close=90;f.three_low.rows[0].change_20d_pct=.1;assert.equal(calculate(f,config).count,2);
});
test('3저라도 위험회피·과열·거래량 부족이면 포착하지 않는다',()=>{
 for(const [symbol,field,value] of [['^VIX','close',30],['^GSPC','close',90],['QQQ','change_20d_pct',-2],['AAPL','rsi14',70],['AAPL','volume_ratio',1],['AAPL','obv_flow20',-1]]){
  const f=fixture();f.rows.find(r=>r.symbol===symbol)[field]=value;assert.equal(calculate(f,config).readyCount,0);
 }
});
test('미수집·오래된 값·0 평균·20일 이력 부족·수집 지연은 보류한다',()=>{
 const f=fixture();assert.equal(calculate({...f,three_low:undefined},config).available,false);
 assert.equal(calculate(f,config,{fresh:r=>r?.status==='ok'&&r.symbol!=='CL=F'}).readyCount,0);
 assert.equal(calculate(f,config,{blocked:true}).available,false);
 f.rows[0].history=[];assert.equal(calculate(f,config).available,false);
 const bad=fixture();bad.three_low.rows[0].sma50=0;assert.equal(calculate(bad,config).available,false);
});
test('3저 추가 지표는 별도 공개 필드로 보존하고 기존 43개 범위를 바꾸지 않는다',()=>{
 const f=fixture();f.three_low.rows[0].token='PRIVATE';const out=publicData({...f,rows:[],three_low:{...f.three_low,collected_at_utc:'2026-11-18T00:00:00Z'}});
 assert.equal(out.rows.length,0);assert.equal(out.three_low.rows.length,2);assert.ok(!JSON.stringify(out).includes('PRIVATE'));
 assert.equal(changedMarket(['config/three-low.json']),'us');
 assert.throws(()=>publicData({rows:[],three_low:{rows:[{symbol:'OTHER',group:'시장지표'}]}}));
 const bad=structuredClone(config);bad.rsi_max=20;assert.throws(()=>validateThreeLow(bad));
});
