import test from 'node:test';
import assert from 'node:assert/strict';
import {publicData,publicHtml} from '../scripts/prepare-pages.mjs';
const input={collected_at_utc:'2026-11-17T00:00:00Z',token:'PRIVATE',rows:[
 {group:'대형주',symbol:'TEST',name:'Test',unit:'USD',status:'error',error:'SECRET',
  account:'SECRET',source:'PRIVATE',history:[{time:1,close:10,token:'SECRET'}]}]};
test('시장 표시 필드만 내보낸다',()=>{
 const out=JSON.stringify(publicData(input));assert.ok(!out.includes('PRIVATE'));assert.ok(!out.includes('SECRET'));
 assert.throws(()=>publicData({rows:[{group:'보유 자산'}]}));
});

test('분석 및 피보나치 표시값은 유지하고 중첩 추가 필드는 제외한다',()=>{
 const out=publicData({...input,rows:[{...input.rows[0],analysis:{verdict:'혼조',summary:'설명',token:'PRIVATE',cards:[{title:'추세',state:'혼조',value:'10',meaning:'평균',account:'SECRET'}]},fibonacci:{direction:'up',high:20,low:10,token:'SECRET',levels:[{ratio:.5,price:15,token:'PRIVATE'}],support:{ratio:.5,price:15,account:'SECRET'}}}]}).rows[0];
 assert.equal(out.analysis.verdict,'혼조');assert.equal(out.fibonacci.levels[0].price,15);
 assert.ok(!JSON.stringify(out).includes('PRIVATE'));assert.ok(!JSON.stringify(out).includes('SECRET'));
});
test('개인 운용 문구와 스크립트 삽입을 제거한다',()=>{
 const template='<aside><div class="side-note">80% 장기<div>nested</div></div></aside><script type="application/json">__MONITOR_DATA__</script>';
 const html=publicHtml(template,{...input,rows:[{...input.rows[0],name:'</script><script>alert(1)</script>'}]});
 assert.ok(!html.includes('80% 장기'));assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('Test')===false);
});

