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
test('개인 운용 문구와 스크립트 삽입을 제거한다',()=>{
 const template='<aside><div class="side-note">80% 장기<div>nested</div></div></aside><script type="application/json">__MONITOR_DATA__</script>';
 const html=publicHtml(template,{...input,rows:[{...input.rows[0],name:'</script><script>alert(1)</script>'}]});
 assert.ok(!html.includes('80% 장기'));assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('Test')===false);
});
