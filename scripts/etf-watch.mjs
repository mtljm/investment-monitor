import {fetchMarketJson} from './fetch-market.mjs';
export function validateEtfWatch(config,existing=[]){
 const seen=new Set(),reserved=new Set(existing.map(r=>r.symbol));
 if(!Array.isArray(config?.candidates)||config.candidates.length<5||config.candidates.length>24)throw Error('ETF 후보는 5~24개여야 합니다.');
 for(const r of config.candidates){
  if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(r.symbol)||seen.has(r.symbol)||reserved.has(r.symbol)||!r.name||!r.concept_name||!r.description||!/^[a-z_]{3,40}$/.test(r.concept)||/leveraged|inverse|bull|bear|2x|3x/i.test(r.name))throw Error('중복 또는 지원하지 않는 ETF 후보');
  seen.add(r.symbol);
 }
 if(new Set(config.candidates.map(r=>r.concept)).size<5)throw Error('ETF 컨셉은 최소 5개가 필요합니다.');
 return config.candidates;
}
export function selectVolumeEtfs(rows,limit=5){
 const valid=rows.filter(r=>r.status==='ok'&&Number.isFinite(r.dollar_volume)&&r.dollar_volume>0&&/^\d{4}-\d{2}-\d{2}$/.test(r.volume_day||''));
 const day=valid.map(r=>r.volume_day).sort().at(-1),concepts=new Set(),chosen=[];
 for(const r of valid.filter(r=>r.volume_day===day).sort((a,b)=>b.dollar_volume-a.dollar_volume||a.symbol.localeCompare(b.symbol))){
  if(concepts.has(r.concept))continue;concepts.add(r.concept);chosen.push(r);if(chosen.length===Math.min(5,limit))break;
 }
 return {day,rows:chosen,valid_count:valid.filter(r=>r.volume_day===day).length};
}
export async function collectEtfWatch(config,existing,collector,get=fetchMarketJson){
 const candidates=validateEtfWatch(config,existing),scans=new Array(candidates.length);let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{while(cursor<candidates.length){const i=cursor++,item=candidates[i];try{
  const body=await get('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(item.symbol)+'?range=5d&interval=1d');
  const result=body.chart?.result?.[0],quote=result?.indicators?.quote?.[0];
  const bars=(result?.timestamp||[]).map((time,i)=>({time,volume:quote?.volume?.[i],close:quote?.close?.[i]})).filter(r=>Number.isFinite(r.time)&&Number.isFinite(r.close)&&Number.isFinite(r.volume)&&r.volume>0).sort((a,b)=>a.time-b.time);
  const last=bars.at(-1);if(!last)throw Error('거래량 없음');
  scans[i]={...item,status:'ok',volume:last.volume,dollar_volume:last.close*last.volume,volume_day:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(last.time*1000))};
 }catch{scans[i]={...item,status:'error'};}}}));
 const selected=selectVolumeEtfs(scans),base={checked_at_utc:new Date().toISOString(),candidate_count:candidates.length,valid_count:selected.valid_count,ranking_method:'close_times_volume_usd',volume_day:selected.day};
 if(selected.rows.length<5)return {...base,status:'error',rows:[]};
 const items=selected.rows.map((r,i)=>({...r,group:'거래량 ETF',unit:'USD',selection_rank:i+1,ranking_volume:r.volume,ranking_dollar_volume:r.dollar_volume}));
 const rows=await collector(items,4);
 if(rows.some(r=>r.status!=='ok'||!Number.isFinite(Date.parse(r.bar_time_utc))||new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(r.bar_time_utc))!==selected.day))return {...base,status:'error',rows:[]};
 return {...base,status:'ok',rows};
}
export function mergeEtfWatch(old,incoming){
 if(!incoming)return old;
 return incoming.status==='ok'?{...incoming,last_success_at_utc:incoming.checked_at_utc}:old?.rows?.length?{...old,status:'stale',last_success_at_utc:old.last_success_at_utc||(old.status==='ok'?old.checked_at_utc:undefined),checked_at_utc:incoming.checked_at_utc}:incoming;
}

