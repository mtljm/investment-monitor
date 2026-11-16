import test from 'node:test';
import assert from 'node:assert/strict';
import {technicalIndicators} from '../scripts/technical-indicators.mjs';
test('Wilder RSI 공개 예제의 초기값과 다음 평활값',()=>{
 const prices=[44.34,44.09,44.15,43.61,44.33,44.83,45.1,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28,46];
 assert.ok(Math.abs(technicalIndicators(prices.slice(0,15)).rsi14-70.464135)<0.00001);
 assert.ok(Math.abs(technicalIndicators(prices).rsi14-66.249619)<0.00001);
});
test('상승·하락·횡보와 부족한 이력',()=>{
 assert.equal(technicalIndicators(Array.from({length:80},(_,i)=>i+1)).rsi14,100);
 assert.equal(technicalIndicators(Array.from({length:80},(_,i)=>100-i)).rsi14,0);
 const flat=technicalIndicators(Array(80).fill(10));
 assert.equal(flat.rsi14,50);assert.equal(flat.macd,0);assert.equal(flat.macd_signal,0);
 assert.equal(flat.bb_upper,10);assert.equal(flat.bb_lower,10);assert.equal(flat.bb_percent_b,null);
 assert.equal(technicalIndicators([1,2]).rsi14,null);
 assert.equal(technicalIndicators(Array(25).fill(1)).macd,null);
 assert.equal(technicalIndicators(Array(33).fill(1)).macd_signal,null);
});
test('선형 가격의 MACD와 볼린저를 독립 기대값으로 검증',()=>{
 const v=technicalIndicators(Array.from({length:60},(_,i)=>i+1));
 assert.ok(Math.abs(v.macd-7)<1e-10);assert.ok(Math.abs(v.macd_signal-7)<1e-10);
 assert.ok(Math.abs(v.macd_histogram)<1e-10);
 assert.equal(v.bb_middle,50.5);assert.ok(Math.abs(v.bb_upper-(50.5+2*Math.sqrt(33.25)))<1e-10);
});
