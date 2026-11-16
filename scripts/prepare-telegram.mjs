import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createZip} from './create-zip.mjs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function makeBrief(data){
  if(!Array.isArray(data.rows)||!Number.isFinite(Date.parse(data.collected_at_utc)))
    throw new Error('수집 보고서가 올바르지 않습니다.');
  const number=v=>Number.isFinite(v)?v.toFixed(2):'미확인';
  const percent=v=>Number.isFinite(v)?(v>0?'+':'')+v.toFixed(2)+'%':'미확인';
  const failures=data.rows.filter(r=>r.status!=='ok');
  const stockCount=data.rows.filter(r=>r.group==='대형주').length;
  const indexDate=data.rows.find(r=>r.symbol==='^GSPC')?.bar_time_utc?.slice(0,10)||'미확인';
  const lines=['미국 시장 오전 브리핑',data.collected_at_kst,
    '지수 최근 봉 기준: '+indexDate,''];
  for(const r of data.rows.filter(r=>['지수','시장지표'].includes(r.group))){
    let change=percent(r.change_1d_pct);
    if(r.symbol==='^VIX')change=number(r.change)+' pt';
    if(r.symbol==='^TNX')change=number(r.change*100)+' bp';
    lines.push(r.name+': '+number(r.close)+' '+r.unit+' ('+change+')');
  }
  const sectors=data.rows.filter(r=>r.group==='섹터 ETF');
  if(sectors.length){
    lines.push('','미국 섹터 ETF · 전일 대비');
    for(const r of sectors)lines.push(r.symbol+' '+r.name+' '+percent(r.change_1d_pct));
  }
  lines.push('','대형주 '+stockCount+'개 / 전체 '+data.rows.length+'개 · 실패 '+failures.length+'개',
    '휴장일에는 최근 거래일 자료입니다. 마지막 봉과 수집 시각을 구분해 확인하세요.',
    'ZIP을 내려받아 압축 해제 후 dashboard.html을 여세요.');
  return lines.join('\n');
}
export async function prepareBrief(){
  const data=JSON.parse(await readFile(resolve(root,'reports/latest.json'),'utf8'));
  const summary=makeBrief(data);
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short'}).format(new Date(data.collected_at_utc));
  const out=resolve(root,'delivery');await mkdir(out,{recursive:true});
  await writeFile(resolve(out,'briefing.txt'),summary+'\n');
  const zip=resolve(out,'market-brief-'+date+'.zip');
  await rm(zip,{force:true});
  const files=[['dashboard.html',resolve(root,'dashboard.html')],['briefing.txt',resolve(out,'briefing.txt')],
    ['latest.json',resolve(root,'reports/latest.json')],['latest.md',resolve(root,'reports/latest.md')]];
  const entries=await Promise.all(files.map(async([name,path])=>({name,bytes:await readFile(path)})));
  await writeFile(zip,createZip(entries));
  await writeFile(resolve(out,'manifest.json'),JSON.stringify({
    file:'market-brief-'+date+'.zip',caption:summary.slice(0,1024),
    collected_at_utc:data.collected_at_utc
  }));
  console.log('브리핑 ZIP 생성 완료');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  prepareBrief().catch(()=>{console.error('브리핑 ZIP 생성 실패. 현재 수집 결과를 확인하세요.');process.exitCode=1;});
