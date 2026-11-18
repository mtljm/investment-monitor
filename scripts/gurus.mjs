const text=(v,max=200)=>typeof v==='string'?v.slice(0,max):'';
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v:null;
const number=v=>Number.isFinite(v)&&v>=0?v:null;
function link(v,host){try{const u=new URL(v);return u.protocol==='https:'&&u.hostname===host?u.href:null;}catch{return null;}}
export function publicGurusData(input){
 if(!input||!Array.isArray(input.managers)||input.managers.length>8)throw Error('13F 보고서 형식 오류');
 return {checked_at_utc:text(input.checked_at_utc,30),managers:input.managers.map(m=>({
  id:text(m.id,40),name:text(m.name),reference:text(m.reference),cik:text(m.cik,10),status:['ok','stale','error'].includes(m.status)?m.status:'error',
  checked_at_utc:text(m.checked_at_utc,30),report_date:date(m.report_date),filed_date:date(m.filed_date),prior_date:date(m.prior_date),
  source_url:link(m.source_url,'13f.info'),sec_url:link(m.sec_url,'www.sec.gov'),
  total_usd:number(m.total_usd),reported_usd:number(m.reported_usd),excluded_count:number(m.excluded_count),comparison:m.comparison===true,
  holdings:(Array.isArray(m.holdings)?m.holdings:[]).slice(0,1000).map(h=>({symbol:text(h.symbol,20),name:text(h.name),class:text(h.class,60),cusip:text(h.cusip,12),value_usd:number(h.value_usd),shares:number(h.shares),weight_pct:number(h.weight_pct),change_pct:Number.isFinite(h.change_pct)?h.change_pct:null,change:['new','increase','decrease','same'].includes(h.change)?h.change:null})),
  exited:(Array.isArray(m.exited)?m.exited:[]).slice(0,100).map(h=>({symbol:text(h.symbol,20),name:text(h.name),cusip:text(h.cusip,12)}))
 }))};
}
export function mergeGurus(old,incoming){
 const safe=publicGurusData(incoming);
 const managers=safe.managers.map(m=>{
  if(m.status==='ok'&&m.holdings.length&&m.total_usd>0)return m;
  const previous=old?.managers?.find(p=>p.id===m.id&&p.holdings?.length);
  return previous?{...previous,status:'stale',checked_at_utc:m.checked_at_utc}:m;
 });
 return publicGurusData({...safe,managers});
}
