import {mergeGurus} from './gurus.mjs';
import {assertCompleteAsia} from './collect-asia.mjs';
import {readFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
import {readPublishedSnapshot} from './reuse-pages.mjs';import {dashboardContext} from './dashboard-context.mjs';import {readDashboardTemplate} from './dashboard-template.mjs';import {writePublicSite} from './prepare-pages.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
function checkFresh(incoming,old,label){const at=Date.parse(incoming?.collected_at_utc);if(!Number.isFinite(at)||!Array.isArray(incoming.rows)||!incoming.rows.length)throw Error(label+' 새 보고서 오류');if(Number.isFinite(Date.parse(old?.collected_at_utc))&&at<Date.parse(old.collected_at_utc))throw Error(label+' 게시 자료보다 오래된 수집 결과');}
export function mergeMarketSnapshots(market,published,{us,asia,gurus}={}){
 if(!['us','asia','all','reuse','gurus'].includes(market))throw Error('지원하지 않는 업데이트 대상');
 if(!published?.data||!published.history)throw Error('최신 게시 스냅샷 필요');
 if(market==='reuse')return published;
 if(market==='gurus')return {data:{...published.data,gurus:mergeGurus(published.data.gurus,gurus)},history:published.history};
 if(market==='asia'){checkFresh(asia,published.data.asia,'아시아');assertCompleteAsia(asia);return {data:{...published.data,asia},history:published.history};}
 checkFresh(us,published.data,'미국');
 if(market==='all'){checkFresh(asia,published.data.asia,'아시아');assertCompleteAsia(asia);}
 const context=dashboardContext(us,published.history);
 return {data:{...context.data,asia:market==='all'?asia:published.data.asia,...(gurus?{gurus:mergeGurus(published.data.gurus,gurus)}:published.data.gurus?{gurus:published.data.gurus}:{})},history:context.history};
}
export async function main(){
 const market=process.env.PUBLISH_MARKET;
 const published=await readPublishedSnapshot(process.env.PAGES_BASE_URL);
 const us=['us','all'].includes(market)?JSON.parse(await readFile(resolve(root,'reports/latest.json'),'utf8')):undefined;
 const asia=['asia','all'].includes(market)?JSON.parse(await readFile(resolve(root,'reports/asia-latest.json'),'utf8')):undefined;
 const gurus=['gurus','all'].includes(market)?JSON.parse(await readFile(resolve(root,'reports/gurus-latest.json'),'utf8')):undefined;
 const result=mergeMarketSnapshots(market,published,{us,asia,gurus});
 await writePublicSite(await readDashboardTemplate(),result.data,result.history);
 const snapshot=await readFile(resolve(root,'public-site/latest.json'));
 const hash=createHash('sha256').update(snapshot).digest('hex');
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'snapshot_hash='+hash+'\n');
 console.log('게시 범위 '+market+' · 미국 '+result.data.collected_at_utc+' · 아시아 '+(result.data.asia?.collected_at_utc||'없음'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});

