import {readAsiaReport} from './collect-asia.mjs';
import {readDashboardTemplate} from './dashboard-template.mjs';
import {publicData,writePublicSite} from './prepare-pages.mjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function embeddedData(html){
 const json=html.match(/<script\s+id="monitor-data"\s+type="application\/json">([\s\S]*?)<\/script>/)?.[1];
 if(!json)throw Error('게시된 HTML에서 시장 데이터를 찾지 못했습니다.');
 return JSON.parse(json);
}
export function validateSnapshot(data,history){
 if(!Number.isFinite(Date.parse(data?.collected_at_utc))||!Array.isArray(data?.rows)||!data.rows.length)throw Error('재사용할 시장 데이터가 올바르지 않습니다.');
 if(history?.version!==1||!Array.isArray(history.days)||history.days.length>90||history.days.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d?.day)||!Array.isArray(d.rows)||d.rows.length>22))throw Error('재사용할 비교 이력이 올바르지 않습니다.');
 return {data:publicData(data),history};
}
export async function readPublishedSnapshot(base,fetcher=fetch){
 const url=new URL(base);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.github.io')||url.search||url.hash)throw Error('Pages 공개 주소를 확인하세요.');
 if(!url.pathname.endsWith('/'))url.pathname+='/';
 async function get(path,max){
  const target=new URL(path,url);target.searchParams.set('run',process.env.GITHUB_RUN_ID||Date.now().toString());
  const response=await fetcher(target,{signal:AbortSignal.timeout(20000),cache:'no-store'});
  if(response.status===404&&path==='latest.json')return null;
  if(!response.ok)throw Error('게시된 '+path+' 재사용 실패: HTTP '+response.status);
  const body=await response.text();if(body.length>max)throw Error('게시 데이터 크기 초과');return body;
 }
 // The first deployment after migration can recover the old embedded snapshot.
 // Network/format errors stop deployment; they never trigger a fresh quote fetch.
 const snapshot=await get('latest.json',4000000);
 let data,history;
 if(snapshot===null)data=embeddedData(await get('index.html',5000000));
 else{const envelope=JSON.parse(snapshot);if(envelope.version!==1)throw Error('지원하지 않는 시장 데이터 버전');data=envelope.data;history=envelope.history;}
 // New snapshots contain both from one deployment; old snapshots migrate once.
 if(history===undefined)history=JSON.parse(await get('history.json',2000000));
 return validateSnapshot(data,history);
}
export async function main(){
 const {data,history}=await readPublishedSnapshot(process.env.PAGES_BASE_URL);
 await writePublicSite(await readDashboardTemplate(),{...data,asia:await readAsiaReport(data.asia)},history);
 console.log('화면만 배포 · 기존 수집 시각 유지: '+data.collected_at_utc);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
