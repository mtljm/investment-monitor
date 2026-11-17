import {execFileSync} from 'node:child_process';
import {appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const collectionFiles=new Set(['config/monitor.json','scripts/monitor.mjs','scripts/fetch-market.mjs','scripts/high52.mjs','scripts/technical-indicators.mjs','scripts/chart-series.mjs','scripts/market-analysis.mjs','scripts/dashboard-context.mjs']);
export function pagesMode(event,files=[],refresh=true){
 if(event==='schedule')return 'collect';
 if(event==='workflow_dispatch')return refresh?'collect':'reuse';
 if(event!=='push')throw Error('지원하지 않는 배포 이벤트');
 return files.some(p=>collectionFiles.has(p))?'collect':'reuse';
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
 if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'mode='+mode+'\n');
 console.log(mode==='collect'?'새 시세 수집 후 배포':'게시된 데이터와 비교 이력을 재사용해 화면만 배포');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
