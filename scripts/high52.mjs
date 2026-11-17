// A rolling 52-week window = 364 calendar dates ending on the latest valid bar date.
export function high52(input){
 const empty={high_52w:null,high_52w_time_utc:null,drawdown_52w_pct:null,high_52w_complete:false};
 const bars=input.filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close)&&b.close>0).sort((a,b)=>a.time-b.time);
 if(!bars.length)return empty;
 const last=bars.at(-1),day=86400,start=Math.floor(last.time/day)*day-363*day;
 const observed=input.filter(b=>Number.isFinite(b.time)&&b.time<=last.time).sort((a,b)=>a.time-b.time);
 if(Math.floor(observed[0].time/day)>start/day)return empty;
 const window=observed.filter(b=>b.time>=start);
 if(window.some(b=>!Number.isFinite(b.high)||b.high<=0||(Number.isFinite(b.close)&&b.high<b.close)))return empty;
 const peak=window.reduce((a,b)=>b.high>=a.high?b:a);
 return {high_52w:peak.high,high_52w_time_utc:new Date(peak.time*1000).toISOString(),drawdown_52w_pct:(last.close/peak.high-1)*100,high_52w_complete:true};
}
