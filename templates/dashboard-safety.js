// BEGIN DASHBOARD SAFETY HELPERS
// NYSE published full-day holidays, 2026–2028. Exceptional closures require a calendar update.
const marketHolidays={
 2026:['01-01','01-19','02-16','04-03','05-25','06-19','07-03','09-07','11-26','12-25'],
 2027:['01-01','01-18','02-15','03-26','05-31','06-18','07-05','09-06','11-25','12-24'],
 2028:['01-17','02-21','04-14','05-29','06-19','07-04','09-04','11-23','12-25']
};
function dateParts(time,zone){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(time)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));}
function expectedMarketDay(now=Date.now()){
 const p=dateParts(now,'America/New_York');
 let d=new Date(Date.UTC(+p.year,+p.month-1,+p.day));
 // Wait until 17:00 ET to allow the regular-session daily bar to settle.
 if(+p.hour<17)d.setUTCDate(d.getUTCDate()-1);
 for(let i=0;i<14;i++,d.setUTCDate(d.getUTCDate()-1)){
  const year=d.getUTCFullYear(),key=d.toISOString().slice(0,10);
  if(!marketHolidays[year])return null;
  if(![0,6].includes(d.getUTCDay())&&!marketHolidays[year].includes(key.slice(5)))return key;
 }
 return null;
}
function collectionHealth(input,now=Date.now()){
 const p=dateParts(now,'Asia/Seoul');
 let due=Date.UTC(+p.year,+p.month-1,+p.day,7-9,15);
 if(now<due)due-=86400000;
 const collected=Date.parse(input.collected_at_utc);
 const valid=Number.isFinite(collected)&&collected<=now+300000;
 const behind=valid&&collected<due;
 return {invalid:!valid,late:behind&&now>=due+3600000,pending:behind&&now<due+3600000,due,expectedDay:expectedMarketDay(now)};
}
function priceHealth(row,now=Date.now()){
 if(row.status!=='ok')return 'error';
 const time=Date.parse(row.bar_time_utc);
 if(!Number.isFinite(time)||time>now+300000)return 'unknown';
 if(row.market_region==='ASIA')return now-time>4*86400000?'stale':'current';
 if(row.symbol==='BTC-USD')return now-time>36*3600000?'stale':'current';
 if(['지수','대형주','지수 ETF','섹터 ETF'].includes(row.group)){
  const expected=expectedMarketDay(now);
  if(!expected)return 'unknown';
  const p=dateParts(time,'America/New_York');
  return [p.year,p.month,p.day].join('-')<expected?'stale':'current';
 }
 // Rates, FX and volatility series have distinct calendars; use an age warning only.
 return now-time>4*86400000?'stale':'current';
}
function csvCell(value){
 if(typeof value==='number')return Number.isFinite(value)?String(value):'';
 let text=String(value??'');
 if(/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
// END DASHBOARD SAFETY HELPERS
