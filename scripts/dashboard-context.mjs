const number=Number.isFinite;
const targets=rows=>rows.filter(r=>['^GSPC','^NDX'].includes(r.symbol)||(r.group==='대형주'&&r.snapshot_rank<=20));
const day=r=>typeof r.bar_time_utc==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(r.bar_time_utc)?r.bar_time_utc.slice(0,10):null;
const trend=r=>[r.close,r.sma20,r.sma50,r.sma200].every(number)?r.close>r.sma20&&r.sma20>r.sma50&&r.sma50>r.sma200?'up':r.close<r.sma20&&r.sma20<r.sma50&&r.sma50<r.sma200?'down':'mixed':'unknown';
export function signalKind(text){
 if(/과열|과매수/.test(text))return 'heat';
 if(/과매도/.test(text))return 'oversold';
 if(/상승 우위|상승 정렬|상승 추세|순증|상단/.test(text))return 'up';
 if(/하락 우위|하락 정렬|하락 추세|순감|하단|약세/.test(text))return 'down';
 return 'neutral';
}
export function compareSignals(now,old){
 const out=[];
 const add=(kind,text)=>out.push({kind,text});
 if(!old||now.status!=='ok')return out;
 const nt=trend(now),ot=trend(old);
 if(nt!==ot&&nt==='up'&&ot!=='unknown')add('up','상승 정렬 전환');
 if(nt!==ot&&nt==='down'&&ot!=='unknown')add('down','하락 정렬 전환');
 if(number(now.rsi14)&&number(old.rsi14)){
  if(now.rsi14>=70&&old.rsi14<70)add('heat','RSI 70 이상 진입');
  if(now.rsi14<70&&old.rsi14>=70)add('neutral','RSI 과열 구간 이탈');
  if(now.rsi14<=30&&old.rsi14>30)add('oversold','RSI 30 이하 진입');
  if(now.rsi14>30&&old.rsi14<=30)add('neutral','RSI 과매도 구간 이탈');
 }
 if(number(now.bb_percent_b)&&number(old.bb_percent_b)){
  if(now.bb_percent_b>100&&old.bb_percent_b<=100)add('heat','볼린저 상단 이탈');
  if(now.bb_percent_b<0&&old.bb_percent_b>=0)add('down','볼린저 하단 이탈');
 }
 // Compare the same previous level on both days; a re-anchored Fibonacci level is not a price breakout.
 if(number(old.support)&&old.close>=old.support&&now.close<old.support)add('down','이전 지지선 '+old.support.toFixed(2)+' 하향 이탈');
 if(number(old.resistance)&&old.close<=old.resistance&&now.close>old.resistance)add('up','이전 저항선 '+old.resistance.toFixed(2)+' 상향 돌파');
 return out;
}
export function dashboardContext(input,previous={version:1,days:[]}){
 if(previous.version!==1||!Array.isArray(previous.days)||previous.days.length>90)throw Error('비교 이력 형식 오류');
 const allowed=new Set(targets(input.rows).map(r=>r.symbol));
 const cleanRow=r=>{
  if(!r||typeof r.symbol!=='string'||!allowed.has(r.symbol))return null;
  const safe={symbol:r.symbol,status:'ok'};
  for(const k of ['close','sma20','sma50','sma200','rsi14','bb_percent_b','support','resistance'])safe[k]=number(r[k])?r[k]:null;
  return safe;
 };
 const archive=new Map();
 for(const entry of previous.days){
  if(!entry||!/^\d{4}-\d{2}-\d{2}$/.test(entry.day)||!Array.isArray(entry.rows)||entry.rows.length>22)throw Error('비교 이력 날짜/종목 오류');
  archive.set(entry.day,{day:entry.day,rows:entry.rows.map(cleanRow).filter(Boolean)});
 }
 const rows=input.rows.map(r=>{
  if(!allowed.has(r.symbol))return r;
  const d=day(r);
  const candidates=[...archive.values()].filter(e=>d&&e.day<d).sort((a,b)=>b.day.localeCompare(a.day));
  let old=null,baseline=null;
  for(const entry of candidates){const item=entry.rows.find(v=>v.symbol===r.symbol&&number(v.close));if(item){old=item;baseline=entry.day;break;}}
  return {...r,changes:{baseline_day:baseline,current_day:d,events:compareSignals(r,old),available:!!old&&r.status==='ok'}};
 });
 for(const r of targets(rows).filter(r=>r.status==='ok'&&day(r))){
  const d=day(r),entry=archive.get(d)||{day:d,rows:[]};
  const snap=cleanRow({...r,support:r.fibonacci?.support?.price,resistance:r.fibonacci?.resistance?.price});
  entry.rows=entry.rows.filter(v=>v.symbol!==r.symbol);entry.rows.push(snap);archive.set(d,entry);
 }
 const stocks=rows.filter(r=>r.group==='대형주'&&r.snapshot_rank<=20&&r.status==='ok');
 const events=targets(rows).flatMap(r=>(r.changes?.events||[]).map(e=>({symbol:r.symbol,...e})));
 const briefing={tracked:stocks.length,rising:stocks.filter(r=>r.change_1d_pct>0).length,falling:stocks.filter(r=>r.change_1d_pct<0).length,uptrend:stocks.filter(r=>trend(r)==='up').length,downtrend:stocks.filter(r=>trend(r)==='down').length,hot:stocks.filter(r=>r.rsi14>=70&&number(r.rsi14)).length,oversold:stocks.filter(r=>r.rsi14<=30&&number(r.rsi14)).length,compared:targets(rows).filter(r=>r.changes?.available).length,event_count:events.length,events:events.slice(0,8)};
 return {data:{...input,rows,briefing},history:{version:1,days:[...archive.values()].sort((a,b)=>a.day.localeCompare(b.day)).slice(-90)}};
}
