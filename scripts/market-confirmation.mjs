import {fetchMarketJson} from './fetch-market.mjs';
import {createHash} from 'node:crypto';
export const BREADTH_SOURCE='https://www.wsj.com/market-data/stocks/marketsdiary';
export function closedCutoff(now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 const d=new Date(p.year+'-'+p.month+'-'+p.day+'T12:00:00Z');if(+p.hour<17)d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);
}
export function parseBreadth(input,cutoff){
 const payload=input?.data,match=/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), ([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(payload?.timestamp||'');
 const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
 if(!match||!months.includes(match[1]))throw Error('시장 폭 기준일 형식 오류');
 const d=new Date(Date.UTC(+match[3],months.indexOf(match[1]),+match[2])),day=d.toISOString().slice(0,10);
 if(d.getUTCDate()!==+match[2]||day>cutoff||[0,6].includes(d.getUTCDay()))throw Error('시장 폭 마감 전 또는 잘못된 기준일');
 const number=value=>typeof value==='string'&&/^\d{1,3}(,\d{3})*$|^\d+$/.test(value)?Number(value.replaceAll(',','')):NaN;
 const exchanges=['NYSE','NASDAQ'].map(exchange=>{
  const tables=(payload.instrumentSets||[]).filter(t=>t.headerFields?.[0]?.label===exchange);if(tables.length!==1)throw Error('시장 폭 거래소 누락·중복');
  const field=id=>{const items=tables[0].instruments.filter(r=>r.id===id&&!r.name.includes('*'));if(items.length!==1)throw Error('전체 거래량 필드 누락·중복');return number(items[0].latestClose);};
  const up=field('advvolume'),down=field('declvolume'),total=field('totalvolume');
  if(![up,down,total].every(Number.isSafeInteger)||up<0||down<0||up+down<=0||total<up+down)throw Error('시장 폭 거래량 오류');
  return {exchange,up,down,total};
 });
 return {day,exchanges};
}
export async function collectBreadth(now=new Date(),get=fetchMarketJson){
 const checked_at_utc=now.toISOString();
 try{const url=new URL(BREADTH_SOURCE);url.searchParams.set('id',JSON.stringify({application:'WSJ',marketsDiaryType:'diaries'}));url.searchParams.set('type','mdc_marketsdiary');
  const snapshot=parseBreadth(await get(url.href),closedCutoff(now));return {status:'ok',checked_at_utc,source:BREADTH_SOURCE,history:[snapshot]};
 }catch{return {status:'error',checked_at_utc,source:BREADTH_SOURCE,history:[]};}
}
export function publicBreadth(input){
 const history=(input?.history||[]).slice(-90).map(s=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s.day)||!Number.isFinite(Date.parse(s.day+'T12:00:00Z'))||new Date(s.day+'T12:00:00Z').toISOString().slice(0,10)!==s.day||!Array.isArray(s.exchanges)||s.exchanges.length!==2)throw Error('시장 폭 저장 형식 오류');
  const exchanges=['NYSE','NASDAQ'].map(exchange=>{const values=s.exchanges.filter(r=>r.exchange===exchange);if(values.length!==1)throw Error('시장 폭 거래소 오류');const r=values[0];if(![r.up,r.down,r.total].every(Number.isSafeInteger)||r.up<0||r.down<0||r.up+r.down<=0||r.total<r.up+r.down)throw Error('시장 폭 저장 거래량 오류');return {exchange,up:r.up,down:r.down,total:r.total};});return {day:s.day,exchanges};
 });
 return {status:input?.status==='ok'?'ok':'error',checked_at_utc:input?.checked_at_utc,source:BREADTH_SOURCE,history};
}
export function mergeBreadth(old,incoming){
 const previous=publicBreadth(old),next=publicBreadth(incoming),archive=new Map(previous.history.map(s=>[s.day,s]));
 if(next.status==='ok')for(const s of next.history)archive.set(s.day,s);
 return publicBreadth({...next,history:[...archive.values()].sort((a,b)=>a.day.localeCompare(b.day)).slice(-90)});
}
const day=p=>new Date(p.time*1000).toISOString().slice(0,10);
export function scanLeaders(allRows,cutoff){
 const stocks=allRows.filter(r=>r.group==='대형주'),bench=allRows.find(r=>r.symbol==='SPY');
 const clean=r=>(r?.status==='ok'&&Array.isArray(r.history)?r.history:[]).filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.close)&&p.close>0&&day(p)<=cutoff).sort((a,b)=>a.time-b.time);
 const spy=clean(bench),asOf=spy.length?day(spy.at(-1)):null,universe_key=createHash('sha256').update(stocks.map(r=>r.symbol).sort().join(',')).digest('hex');
 const histories=new Map(stocks.map(r=>[r.symbol,clean(r)]));
 function evaluate(r,date){
  const b=histories.get(r.symbol).filter(p=>day(p)<=date),p=spy.filter(p=>day(p)<=date),last=b.at(-1);
  if(b.length<60||p.length<21||day(last)!==date||day(p.at(-1))!==date||day(b.at(-21))!==day(p.at(-21))||![last.sma50,last.sma200,b.at(-21).sma50].every(v=>Number.isFinite(v)&&v>0)||b.slice(-60).some(p=>!Number.isFinite(p.high)||p.high<=0)||b.slice(-25).some(p=>!Number.isFinite(p.volume)||p.volume<0))return null;
  const change5=(last.close/b.at(-6).close-1)*100,change20=(last.close/b.at(-21).close-1)*100,spy20=(p.at(-1).close/p.at(-21).close-1)*100,relative20=change20-spy20;
  const high60=Math.max(...b.slice(-60).map(p=>p.high)),highGap=(last.close/high60-1)*100;
  let volumeConfirmation=false;for(let i=b.length-5;i<b.length;i++){const average=b.slice(i-20,i).reduce((s,p)=>s+p.volume,0)/20;if(average>0&&b[i].close>b[i-1].close&&b[i].volume>=average*1.2)volumeConfirmation=true;}
  const checks=[last.close>last.sma50&&last.sma50>last.sma200&&last.sma50>=b.at(-21).sma50,relative20>=3,highGap>=-10,change5>0,volumeConfirmation];
  return {symbol:r.symbol,name:r.name,close:last.close,relative20,change5,highGap,volumeConfirmation,passed:checks.filter(Boolean).length,candidate:checks.every(Boolean)};
 }
 const history=spy.slice(-10).map(p=>{const date=day(p),results=stocks.map(r=>evaluate(r,date)),valid=results.filter(Boolean);return {day:date,universe_key,expected:stocks.length,valid:valid.length,valid_symbols:valid.map(r=>r.symbol).sort(),candidates:valid.filter(r=>r.candidate).map(r=>r.symbol).sort()};});
 const current=asOf?stocks.map(r=>evaluate(r,asOf)).filter(Boolean):[];
 return publicLeaders({day:asOf,universe_key,expected:stocks.length,valid:current.length,unavailable:stocks.filter(r=>!current.some(c=>c.symbol===r.symbol)).map(r=>r.symbol),candidates:current.filter(r=>r.candidate).sort((a,b)=>b.relative20-a.relative20),history});
}
export function publicLeaders(input){
 if(!input||input.expected>220||!Number.isInteger(input.expected)||input.expected<0||!Number.isInteger(input.valid)||input.valid<0||input.valid>input.expected)throw Error('주도주 표본 형식 오류');
 const symbols=items=>{if(!Array.isArray(items)||items.length>220||items.some(s=>typeof s!=='string'||!/^[A-Z][A-Z0-9.-]{0,14}$/.test(s))||new Set(items).size!==items.length)throw Error('주도주 종목 형식 오류');return [...items];};
 const candidates=(input.candidates||[]).slice(0,220).map(r=>{if(!symbols([r.symbol])||typeof r.name!=='string'||!['close','relative20','change5','highGap','passed'].every(k=>Number.isFinite(r[k])))throw Error('주도주 지표 오류');return Object.fromEntries(['symbol','name','close','relative20','change5','highGap','passed','volumeConfirmation','candidate'].map(k=>[k,r[k]]));});
 const history=(input.history||[]).slice(-90).map(h=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(h.day)||!Number.isInteger(h.expected)||h.expected<0||h.expected>220||!Number.isInteger(h.valid)||h.valid<0||h.valid>h.expected||typeof h.universe_key!=='string'||h.universe_key.length>64)throw Error('주도주 이력 형식 오류');return {day:h.day,universe_key:h.universe_key,expected:h.expected,valid:h.valid,valid_symbols:symbols(h.valid_symbols||[]),candidates:symbols(h.candidates)};});
 return {day:input.day,universe_key:String(input.universe_key||'').slice(0,64),expected:input.expected,valid:input.valid,unavailable:symbols(input.unavailable||[]),candidates,history};
}
