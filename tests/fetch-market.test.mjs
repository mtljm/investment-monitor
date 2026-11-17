import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchMarketJson} from '../scripts/fetch-market.mjs';
const response=(status=200,after=null)=>({ok:status===200,status,headers:{get:()=>after},json:async()=>({price:100})});
test('일시적 HTTP 오류만 1초·2초 대기 후 재시도하고 성공 시 중단한다',async()=>{
 const delays=[],events=[];let calls=0;
 const out=await fetchMarketJson('https://example.test',{fetcher:async()=>response(++calls<3?503:200),sleep:async ms=>delays.push(ms),onRetry:e=>events.push(e.nextAttempt)});
 assert.deepEqual(out,{price:100});assert.equal(calls,3);assert.deepEqual(delays,[1000,2000]);assert.deepEqual(events,[2,3]);
});
test('네트워크·타임아웃은 재시도하며 3회 초과하지 않는다',async()=>{
 for(const error of [new TypeError('fetch failed'),Object.assign(new Error('timeout'),{name:'TimeoutError'})]){
  let calls=0;
  await assert.rejects(fetchMarketJson('https://example.test',{fetcher:async()=>{calls++;throw error;},sleep:async()=>{}}));
  assert.equal(calls,3);
 }
});
test('인증·잘못된 티커·잘못된 JSON은 즉시 실패하고 긴 Retry-After를 앞당기지 않는다',async()=>{
 for(const [status,after] of [[401,null],[403,null],[404,null],[429,'60']]){
  let calls=0;await assert.rejects(fetchMarketJson('https://example.test',{fetcher:async()=>{calls++;return response(status,after);},sleep:async()=>assert.fail('should not retry')}));assert.equal(calls,1);
 }
 let calls=0;await assert.rejects(fetchMarketJson('https://example.test',{fetcher:async()=>{calls++;return {...response(),json:async()=>{throw new SyntaxError('bad json');}};},sleep:async()=>assert.fail('should not retry')}));assert.equal(calls,1);
});
test('짧은 Retry-After는 존중하며 정상 응답은 재시도하지 않는다',async()=>{
 let calls=0;const delays=[];
 await fetchMarketJson('https://example.test',{fetcher:async()=>response(++calls===1?429:200,'2'),sleep:async ms=>delays.push(ms)});
 assert.equal(calls,2);assert.deepEqual(delays,[2000]);
});
