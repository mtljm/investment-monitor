import test from 'node:test';
import assert from 'node:assert/strict';
import {priceVolumeIndicators,assessTechnical} from '../scripts/market-analysis.mjs';
const bars=Array.from({length:60},(_,i)=>({time:i+1,close:100+i,high:101+i,low:99+i,volume:100}));
test('상승 고저 범위, 피보나치 비율과 현재 구간, OBV를 독립 기대값으로 확인',()=>{
 const v=priceVolumeIndicators(bars);
 assert.equal(v.obv,5900);assert.equal(v.obv_change20,2000);assert.equal(v.obv_flow20,100);
 assert.equal(v.fibonacci.low,99);assert.equal(v.fibonacci.high,160);assert.equal(v.fibonacci.direction,'up');
 assert.equal(v.fibonacci.levels.find(l=>l.ratio===.382).price,160-61*.382);
 assert.equal(v.fibonacci.support.ratio,.236);assert.equal(v.fibonacci.resistance.ratio,0);
 assert.ok(Math.abs(v.ema20-149.5)<1e-9);
});
test('하락/동일 종가의 OBV 처리, 결측 거래량과 평탄/짧은 피보나치',()=>{
 const down=bars.map((b,i)=>({...b,close:159-i,high:160-i,low:158-i}));
 assert.equal(priceVolumeIndicators(down).obv_change20,-2000);
 assert.equal(priceVolumeIndicators(down).fibonacci.direction,'down');
 assert.equal(priceVolumeIndicators(bars.map(b=>({...b,close:100,high:100,low:100}))).fibonacci,null);
 assert.equal(priceVolumeIndicators(bars.slice(0,59)).fibonacci,null);
 assert.equal(priceVolumeIndicators(bars.map(b=>({...b,volume:0}))).obv,null);
 assert.equal(priceVolumeIndicators(bars.map((b,i)=>({...b,volume:i===30?null:100}))).obv,null);
 assert.equal(priceVolumeIndicators(bars.map(b=>({...b,close:120}))).obv,0);
});
test('종합 평가: 과열/과매도/이력 부족/거래량 충돌과 지수 ETF 대용',()=>{
 const row={status:'ok',close:110,sma20:105,sma50:100,sma200:90,rsi14:60,bb_percent_b:80,obv_flow20:-20};
 assert.equal(assessTechnical(row).verdict,'상승 추세 · 추세 관찰');
 assert.match(assessTechnical(row).summary,/엇갈/);
 assert.match(assessTechnical({...row,rsi14:75}).verdict,/과열/);
 assert.match(assessTechnical({...row,rsi14:25}).verdict,/과매도/);
 assert.equal(assessTechnical({...row,sma200:null}).verdict,'분석 자료 부족');
 assert.equal(assessTechnical({...row,status:'error'}).cards.length,0);
 const a=assessTechnical(row,{status:'ok',symbol:'SPY',obv:1000,obv_change20:10,obv_flow20:5});
 assert.match(a.cards[3].meaning,/SPY ETF/);assert.equal(a.cards[3].state,'20일 OBV 순증');
});
