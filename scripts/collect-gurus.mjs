import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function filingList(html){
 const out=[];
 for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)){
  const cells=[...row[1].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/g)];
  if(cells.length!==7)continue;
  const href=cells[0][2].match(/href="(\/13f\/[^"]+)"/)?.[1],period=cells[0][1].match(/data-order="(\d{4}-\d{2}-\d{2})"/)?.[1],filed=cells[5][1].match(/data-order="(\d{4}-\d{2}-\d{2})"/)?.[1];
  const accession=clean(cells[6][2]),kind=clean(cells[4][2]),value=Number(cells[2][1].match(/data-order="([\d.]+)"/)?.[1]);
  if(href&&period&&filed&&/^\d{18}$/.test(accession)&&Number.isFinite(value)&&value>0)out.push({href,period,filed,accession,kind,reported_usd:value*1000});
 }
 if(!out.length)throw Error('13F 공시 목록 형식 오류');
 return out.sort((a,b)=>b.period.localeCompare(a.period)||b.filed.localeCompare(a.filed));
}
export function chooseFiling(list,period){
 const target=period||list[0]?.period,rows=list.filter(r=>r.period===target);
 const full=rows.find(r=>r.kind==='RESTATEMENT')||rows.find(r=>r.kind==='13F-HR');
 if(!full||rows.some(r=>r.kind==='NEW HOLDINGS'&&r.filed>=full.filed))throw Error('정정·추가 공시 원문 확인 필요');
 return full;
}
export function parseHoldings(payload,reportedUsd){
 if(!Array.isArray(payload?.data)||!payload.data.length||payload.data.length>10000)throw Error('13F 보유종목 형식 오류');
 let all=0,excluded=0;const grouped=new Map();
 for(const row of payload.data){
  if(!Array.isArray(row)||row.length!==9||!Number.isFinite(row[4])||row[4]<0)throw Error('13F 금액·단위 확인 필요');
  const value=row[4]*1000;all+=value;
  if(row[8]||row[7]!==null||!Number.isFinite(row[6])||row[6]<0){excluded++;continue;}
  if(typeof row[1]!=='string'||typeof row[3]!=='string')throw Error('13F 종목 식별 오류');
  const key=row[3]+'|'+row[2],old=grouped.get(key);
  if(old){old.value_usd+=value;old.shares+=row[6];}else grouped.set(key,{symbol:row[0]||'',name:row[1],class:row[2]||'',cusip:row[3],value_usd:value,shares:row[6]});
 }
 const holdings=[...grouped.values()].sort((a,b)=>b.value_usd-a.value_usd),total=holdings.reduce((n,h)=>n+h.value_usd,0);
 if(!Number.isFinite(reportedUsd)||reportedUsd<=0||Math.min(Math.abs(all-reportedUsd),Math.abs(total-reportedUsd))/reportedUsd>.01)throw Error('13F 합계 불일치 · 데이터 단위/누락 확인 필요');
 if(!total)throw Error('13F 주식수 기준 보유 없음');
 return {holdings:holdings.map(h=>({...h,weight_pct:h.value_usd/total*100})),total_usd:total,excluded_count:excluded};
}
function previousQuarter(period){const d=new Date(period+'T00:00:00Z');return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-2,0)).toISOString().slice(0,10);}
export async function collectManager(manager,get){
 const list=filingList(await get('https://13f.info/manager/'+manager.path)),latest=chooseFiling(list);
 const current=parseHoldings(JSON.parse(await get('https://13f.info/data/13f/'+latest.accession)),latest.reported_usd);
 let prior,priorDate=null;
 try{const p=chooseFiling(list,previousQuarter(latest.period));prior=parseHoldings(JSON.parse(await get('https://13f.info/data/13f/'+p.accession)),p.reported_usd);priorDate=p.period;}catch{ /* Comparison stays unavailable; current holdings remain valid. */ }
 const key=h=>h.cusip+'|'+h.class,old=new Map((prior?.holdings||[]).map(h=>[key(h),h]));
 const holdings=current.holdings.map(h=>{const p=old.get(key(h));return {...h,change:!prior?null:!p?'new':h.shares>p.shares?'increase':h.shares<p.shares?'decrease':'same',change_pct:p?.shares>0?(h.shares/p.shares-1)*100:null};});
 const now=new Date().toISOString(),a=latest.accession,accession=a.slice(0,10)+'-'+a.slice(10,12)+'-'+a.slice(12);
 return {...manager,status:'ok',checked_at_utc:now,report_date:latest.period,filed_date:latest.filed,prior_date:priorDate,comparison:!!prior,...current,holdings,reported_usd:latest.reported_usd,source_url:'https://13f.info'+latest.href,sec_url:'https://www.sec.gov/Archives/edgar/data/'+Number(manager.cik)+'/'+a+'/'+accession+'-index.html',exited:prior?.holdings.filter(h=>!holdings.some(v=>key(v)===key(h))).map(h=>({symbol:h.symbol,name:h.name,cusip:h.cusip}))||[]};
}
export async function main(){
 const {managers}=JSON.parse(await readFile(resolve(root,'config/gurus.json'),'utf8'));
 if(!Array.isArray(managers)||!managers.length||managers.length>8)throw Error('13F 기관 설정 오류');
 const get=async url=>{await sleep(400);const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('13F HTTP '+r.status);const s=await r.text();if(s.length>3000000)throw Error('13F 응답 크기 초과');return s;};
 const results=[];
 for(const m of managers){try{results.push(await collectManager(m,get));console.log(m.id+' 13F 수집 성공');}catch{results.push({...m,status:'error',checked_at_utc:new Date().toISOString(),holdings:[]});console.warn(m.id+' 13F 수집 실패 · 기존 자료 유지');}}
 await mkdir(resolve(root,'reports'),{recursive:true});await writeFile(resolve(root,'reports/gurus-latest.json'),JSON.stringify({checked_at_utc:new Date().toISOString(),managers:results}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
