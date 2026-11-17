import test from 'node:test';import assert from 'node:assert/strict';
import {high52} from '../scripts/high52.mjs';
const day=86400;
const bars=Array.from({length:730},(_,i)=>({time:(19000+i)*day+14*3600,close:80,high:100}));
test('장중 고점과 현재 종가로 계산하고 동률은 최근 날짜를 쓴다',()=>{
 const out=high52(bars);assert.equal(out.high_52w,100);assert.ok(Math.abs(out.drawdown_52w_pct+20)<1e-10);assert.equal(out.high_52w_time_utc,new Date(bars.at(-1).time*1000).toISOString());
});
test('252봉이 아닌 364일 달력 창이며 창 밖 고점은 제외한다',()=>{
 const b=structuredClone(bars);b.at(-365).high=200;b.at(-300).high=120;
 assert.equal(high52(b).high_52w,120);assert.ok(Math.abs(high52(b).drawdown_52w_pct+33.333333333)<1e-6);
});
test('짧은 상장 이력·고가 누락·이상값은 52주 값으로 꾸미지 않는다',()=>{
 assert.equal(high52(bars.slice(-200)).high_52w,null);
 const b=structuredClone(bars);b.at(-2).high=null;assert.equal(high52(b).high_52w_complete,false);
 b.at(-2).high=70;assert.equal(high52(b).drawdown_52w_pct,null);
 assert.equal(high52([]).high_52w,null);
});

test('과거 종가가 비어도 유효한 장중 고점은 포함한다',()=>{
 const b=structuredClone(bars);b.at(-100).close=null;b.at(-100).high=160;
 assert.equal(high52(b).high_52w,160);assert.equal(high52(b).drawdown_52w_pct,-50);
});
