import {execFileSync} from 'node:child_process';
import {appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const sharedFiles=new Set(['scripts/monitor.mjs','scripts/fetch-market.mjs','scripts/high52.mjs','scripts/technical-indicators.mjs','scripts/chart-series.mjs','scripts/market-analysis.mjs']);
const usFiles=new Set(['config/monitor.json','scripts/dashboard-context.mjs']);
const asiaFiles=new Set(['config/asia.json','scripts/collect-asia.mjs']);
export function changedMarket(files){
 const gurus=files.some(p=>['config/gurus.json','scripts/collect-gurus.mjs'].includes(p));
 if(gurus)return files.some(p=>sharedFiles.has(p)||usFiles.has(p)||asiaFiles.has(p))?'all':'gurus';
 if(files.some(p=>sharedFiles.has(p)))return 'all';
 const us=files.some(p=>usFiles.has(p)),asia=files.some(p=>asiaFiles.has(p));
 return us&&asia?'all':us?'us':asia?'asia':'reuse';
}
export function pagesMode(event,files=[],refresh=true){
 if(event==='schedule')return 'collect';
 if(event==='workflow_dispatch')return refresh?'collect':'reuse';
 if(event!=='push')throw Error('지원하지 않는 배포 이벤트');
 return changedMarket(files)==='reuse'?'reuse':'collect';
}
export async function main(){
 const event=process.env.GITHUB_EVENT_NAME;let files=[];
 if(event==='push'){
  const before=process.env.BEFORE_SHA;
  if(!/^[a-f0-9]{40}$/.test(before||'')||/^0+$/.test(before))throw Error('변경 전 커밋을 확인할 수 없습니다. 수동 수집으로 실행하세요.');
  try{execFileSync('git',['cat-file','-e',before],{stdio:'ignore'});}catch{execFileSync('git',['fetch','--no-tags','--depth=1','origin',before],{stdio:'inherit'});}
  files=execFileSync('git',['diff','--name-only',before,'HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 }
 const mode=pagesMode(event,files,process.env.REFRESH_DATA!=='false');
 const market=event==='workflow_dispatch'?(process.env.PUBLISH_MARKET||'reuse'):event==='push'?changedMarket(files):'us';
 if(!['us','asia','all','reuse','gurus'].includes(market))throw Error('지원하지 않는 업데이트 대상');
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'mode='+mode+'\nmarket='+market+'\n');
 console.log('업데이트 범위: '+market);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});

