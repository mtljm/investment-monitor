import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pagesMode} from '../scripts/pages-mode.mjs';
import {readPublishedSnapshot} from '../scripts/reuse-pages.mjs';
import {writePublicSite} from '../scripts/prepare-pages.mjs';
const data={collected_at_utc:'2026-11-16T22:16:00Z',rows:[{group:'대형주',symbol:'TEST',status:'ok',close:100,changes:{available:true,baseline_day:'2026-11-13',current_day:'2026-11-16',events:[{kind:'up',text:'상승 정렬 전환'}]}}],briefing:{compared:1,event_count:1,events:[{symbol:'TEST',kind:'up',text:'상승 정렬 전환'}]}};
const history={version:1,days:[{day:'2026-11-16',rows:[{symbol:'TEST',close:100}]}]};
function server(files){const calls=[];return {calls,fetch:async url=>{calls.push(url.pathname);const body=files[url.pathname.split('/').at(-1)];return {ok:body!==undefined,status:body===undefined?404:200,text:async()=>body};}};}
test('정기·수동 기본·수집 로직 변경만 새 시세를 수집한다',()=>{
 assert.equal(pagesMode('schedule'), 'collect');
 assert.equal(pagesMode('workflow_dispatch'), 'collect');
 assert.equal(pagesMode('workflow_dispatch',[],false), 'reuse');
 for(const path of ['templates/dashboard.css','templates/dashboard.js','scripts/render-dashboard.mjs','scripts/prepare-pages.mjs','.github/workflows/daily-pages.yml'])assert.equal(pagesMode('push',[path]),'reuse');
 for(const path of ['config/monitor.json','scripts/monitor.mjs','scripts/high52.mjs','scripts/dashboard-context.mjs'])assert.equal(pagesMode('push',['templates/dashboard.html',path]),'collect');
});
test('게시 JSON과 이력을 재사용하고 수집 시각·신호를 유지한다',async()=>{
 const mock=server({'latest.json':JSON.stringify({version:1,data}),'history.json':JSON.stringify(history)});
 const result=await readPublishedSnapshot('https://example.github.io/monitor/',mock.fetch);
 assert.equal(result.data.collected_at_utc,data.collected_at_utc);
 assert.deepEqual(result.data.rows[0].changes,data.rows[0].changes);
 assert.deepEqual(result.history,history);
 assert.deepEqual(mock.calls,['/monitor/latest.json','/monitor/history.json']);
 const out=await mkdtemp(join(tmpdir(),'pages-reuse-'));
 try{
  await writePublicSite('<script id="monitor-data" type="application/json">__MONITOR_DATA__</script>',result.data,result.history,out);
  const stored=JSON.parse(await readFile(join(out,'latest.json'),'utf8'));
  assert.equal(stored.data.collected_at_utc,data.collected_at_utc);
  assert.deepEqual(stored.history,history);
  assert.deepEqual(JSON.parse(await readFile(join(out,'history.json'),'utf8')),history);
 }finally{await rm(out,{recursive:true,force:true});}
});
test('결합 스냅샷은 같은 배포의 이력만 사용하고 별도 이력을 요청하지 않는다',async()=>{
 const mock=server({'latest.json':JSON.stringify({version:1,data,history}),'history.json':'잘못된 별도 이력'});
 const result=await readPublishedSnapshot('https://example.github.io/monitor/',mock.fetch);
 assert.deepEqual(result.history,history);assert.deepEqual(mock.calls,['/monitor/latest.json']);
 const bad=server({'latest.json':JSON.stringify({version:1,data,history:null}),'history.json':JSON.stringify(history)});
 await assert.rejects(readPublishedSnapshot('https://example.github.io/monitor/',bad.fetch),/비교 이력/);
});
test('전환 첫 배포는 기존 HTML에서 복구하고 오류 시 재수집 없이 중단한다',async()=>{
 const mock=server({'index.html':'<script id="monitor-data" type="application/json">'+JSON.stringify(data)+'</script>','history.json':JSON.stringify(history)});
 assert.equal((await readPublishedSnapshot('https://example.github.io/monitor/',mock.fetch)).data.collected_at_utc,data.collected_at_utc);
 assert.deepEqual(mock.calls,['/monitor/latest.json','/monitor/index.html','/monitor/history.json']);
 const broken=server({'latest.json':'{"version":2}','history.json':JSON.stringify(history)});
 await assert.rejects(readPublishedSnapshot('https://example.github.io/monitor/',broken.fetch),/버전/);
 const fail=async()=>({ok:false,status:503});
 await assert.rejects(readPublishedSnapshot('https://example.github.io/monitor/',fail),/503/);
 await assert.rejects(readPublishedSnapshot('https://example.github.io/monitor/',server({'latest.json':JSON.stringify({version:1,data})}).fetch),/history.json/);
});
