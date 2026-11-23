// REVERSAL_MODEL_START
const REVERSAL_RULES={correctionPct:8,strongDayPct:1,minRallyDay:4,holdDays:3,baseDays:5,baseRangePct:8,breadthPct:60,minStocks:15,vixLimit:25};
function reversalBars(row,asOf){
 const seen=new Set();
 return (row?.status==='ok'&&Array.isArray(row.history)?row.history:[]).filter(p=>{
  if(!Number.isFinite(p.time)||!Number.isFinite(p.close)||p.close<=0)return false;
  const date=new Date(p.time*1000);if(!Number.isFinite(date.getTime()))return false;
  const day=date.toISOString().slice(0,10);if(day>asOf||seen.has(day))return false;seen.add(day);return true;
 }).sort((a,b)=>a.time-b.time);
}
function reversalDay(bar){return bar?new Date(bar.time*1000).toISOString().slice(0,10):null;}
function reversalWeekFriday(day){const d=new Date(day+'T12:00:00Z');const dow=d.getUTCDay();d.setUTCDate(d.getUTCDate()+(5-(dow||7)));return d.toISOString().slice(0,10);}
function completedReversalWeeks(bars,asOf,today){
 const weeks=new Map();
 for(const b of bars){const friday=reversalWeekFriday(reversalDay(b));if(!(friday<today||friday===today&&asOf>=friday))continue;
  const w=weeks.get(friday)||{day:friday,low:Infinity,close:null,valid:true,count:0};w.low=Math.min(w.low,b.low);w.valid&&=Number.isFinite(b.low)&&b.low>0;w.close=b.close;w.count++;weeks.set(friday,w);
 }
 // The first group may begin halfway through a week because history is capped.
 return [...weeks.values()].slice(1);
}
function reversalAttempt(bars,proxy){
 const rules=REVERSAL_RULES,volumes=new Map(proxy.map(b=>[reversalDay(b),b.volume]));
 let anchor=null,start=null,ftd=null,failed=null,early=null;
 for(let i=20;i<bars.length;i++){
  const b=bars[i],prior=bars[i-1],day=reversalDay(b),previousPeak=Math.max(...bars.slice(i-20,i).map(p=>p.close));
  if(![b.low,prior.low].every(v=>Number.isFinite(v)&&v>0))continue;
  if(anchor===null&&(b.close<=previousPeak*(1-rules.correctionPct/100)||(b.close/prior.close-1)*100<=-3))anchor={low:b.low,index:i};
  if(anchor===null)continue;
  if(b.low<anchor.low){if(start!==null||ftd)failed={day,reason:'반등 기준 저점 하향 이탈'};anchor={low:b.low,index:i};start=null;ftd=null;early=null;continue;}
  let invalidated=false;
  if(ftd&&i>ftd.index&&b.low<ftd.low){failed={day,reason:'거래량 동반 상승일 저점 하향 이탈'};ftd=null;invalidated=true;}
  if(start===null&&i>anchor.index&&b.close>prior.close)start=i;
  if(start===null)continue;
  const rallyDay=i-start+1,change=(b.close/prior.close-1)*100,volume=volumes.get(day),previousVolume=volumes.get(reversalDay(prior));
  const strong=change>=rules.strongDayPct&&Number.isFinite(volume)&&volume>0&&Number.isFinite(previousVolume)&&previousVolume>0&&volume>previousVolume;
  if(strong&&rallyDay===3)early={day,change};
  if(strong&&rallyDay>=rules.minRallyDay&&!ftd&&!invalidated)ftd={day,index:i,low:b.low,change,volumeRatio:volume/previousVolume};
 }
 return {anchor,start,rallyDay:start===null?0:bars.length-start,ftd:ftd?{...ftd,heldDays:bars.length-1-ftd.index}:null,failed,early};
}
function calculateReversal(rows,asOf,today){
 const finite=Number.isFinite,rules=REVERSAL_RULES;
 const breadthRows=rows.filter(r=>r.group==='대형주'&&Number.isInteger(r.snapshot_rank)&&r.snapshot_rank>=1&&r.snapshot_rank<=20).map(r=>reversalBars(r,asOf)).filter(b=>b.length>=6&&reversalDay(b.at(-1))===asOf&&finite(b.at(-1).sma20)&&b.at(-1).sma20>0);
 const breadthUp=breadthRows.filter(b=>b.at(-1).close>b.at(-1).sma20&&b.at(-1).close>b.at(-6).close).length;
 const breadth={pass:breadthRows.length>=rules.minStocks?breadthUp/breadthRows.length*100>=rules.breadthPct:null,text:breadthUp+' / '+breadthRows.length+'개 · SMA20 위 + 5일 상승'};
 const vixBars=reversalBars(rows.find(r=>r.symbol==='^VIX'),asOf),v=vixBars.at(-1),vix={pass:vixBars.length>=6&&reversalDay(v)===asOf?v.close<rules.vixLimit&&v.close<vixBars.at(-6).close:null,text:v?'종가 '+v.close.toFixed(2)+' · 25 미만 + 5일 전보다 하락':'VIX 일봉 부족'};
 const indices=[['^GSPC','SPY','S&P 500'],['^NDX','QQQ','나스닥 100']].map(([symbol,proxySymbol,name])=>{
  const bars=reversalBars(rows.find(r=>r.symbol===symbol),asOf),proxy=reversalBars(rows.find(r=>r.symbol===proxySymbol),asOf),last=bars.at(-1);
  if(bars.length<30||reversalDay(last)!==asOf||bars.some(b=>!finite(b.low)||b.low<=0))return {symbol,name,proxySymbol,label:'자료 부족',checks:[],missing:true,day:reversalDay(last)};
  const recent=bars.slice(-5),prior=bars.slice(-20,-5),floor=Math.min(...prior.map(b=>b.low)),low=Math.min(...recent.map(b=>b.low));
  const range=(Math.max(...recent.map(b=>b.close))/Math.min(...recent.map(b=>b.close))-1)*100;
  const base={pass:low>=floor&&range<=rules.baseRangePct,text:'최근 5일 저점 '+low.toFixed(2)+' / 앞선 15일 저점 '+floor.toFixed(2)+' · 종가 범위 '+range.toFixed(1)+'%'};
  const maReady=bars.slice(-6).every(b=>finite(b.sma20)&&b.sma20>0);
  const recovery={pass:maReady?bars.slice(-3).every(b=>b.close>b.sma20)&&last.sma20>=bars.at(-6).sma20:null,text:maReady?'마감 '+last.close.toFixed(2)+' / SMA20 '+last.sma20.toFixed(2)+' · 5일 전 SMA20 '+bars.at(-6).sma20.toFixed(2)+' · 3일 연속 상회 필요':'SMA20 이력 부족'};
  const attempt=reversalAttempt(bars,proxy),volumeReady=proxy.length>=30&&bars.slice(20).every(b=>{const p=proxy.find(p=>reversalDay(p)===reversalDay(b));return p&&finite(p.volume)&&p.volume>0;});
  const ftd={pass:volumeReady?!!attempt.ftd&&attempt.ftd.heldDays>=rules.holdDays:null,text:attempt.ftd?attempt.ftd.day+' 후보 (+'+attempt.ftd.change.toFixed(2)+'%, 거래량 '+attempt.ftd.volumeRatio.toFixed(2)+'배) · 이후 '+attempt.ftd.heldDays+'거래일 저점 유지':attempt.early?'3일째 급등 '+attempt.early.day+' · 확인 조건 제외':attempt.rallyDay?'반등 시도 '+attempt.rallyDay+'일째 · 거래량 동반 상승 대기':'반등 시도 대기'};
  const weeks=completedReversalWeeks(bars,asOf,today),w=weeks.at(-1),prev=weeks.at(-2);
  const weeklyReady=weeks.length>=5&&weeks.slice(-5).every(w=>w.valid);
  const weekly={pass:weeklyReady?w.close>prev.close&&w.low>=prev.low&&w.close>weeks.slice(-4).reduce((s,w)=>s+w.close,0)/4:null,text:weeklyReady?'완료 주봉 '+w.day+' 주 · 종가 '+prev.close.toFixed(2)+' → '+w.close.toFixed(2)+' / 저가 '+prev.low.toFixed(2)+' → '+w.low.toFixed(2)+' · 4주 평균 상회 필요':'완료 주봉 부족'};
  const checks=[{name:'바닥 유지',...base},{name:'일봉 추세 회복',...recovery},{name:'거래량 동반 상승 유지',...ftd},{name:'대형주 확산',...breadth},{name:'주봉 확인',...weekly},{name:'변동성 완화',...vix}];
  const passed=checks.filter(c=>c.pass===true).length,unknown=checks.some(c=>c.pass===null);
  const recentFailure=attempt.failed&&bars.slice(-5).some(b=>reversalDay(b)===attempt.failed.day);
  const label=recentFailure?'저점 이탈 · 실패 경계':unknown?'자료 확인 필요':passed===6?'상승 근거 누적':passed>=3?'추가 확인 중':attempt.rallyDay?'반등 시도 · 확인 부족':'바닥 확인 대기';
  return {symbol,name,proxySymbol,label,checks,passed,attempt,day:asOf,missing:false,week:w?.day};
 });
 return {indices,asOf};
}
// REVERSAL_MODEL_END
function renderReversal(){
 const el=$('reversal-monitor');if(!el)return;const wasOpen=el.querySelector('details')?.open===true;
 const health=collectionHealth(data,Date.now()),asOf=health.expectedDay;
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/New_York',dateStyle:'short'}).format(new Date());
 if(!asOf||health.invalid||health.late){el.innerHTML='<h3>상승 전환 확인 보류</h3><p>수집 시각·최근 마감 거래일을 확인한 뒤 평가합니다.</p>';return;}
 const current=data.rows.filter(r=>priceHealth(r,Date.now())==='current');
 const result=calculateReversal(current,asOf,today);
 el.innerHTML='<div class="reversal-intro"><span class="eyebrow">TREND CONFIRMATION</span><h3>반등보다, 이어지는 증거를 확인하세요.</h3><p>과매도와 하루 급등은 추세 전환의 충분조건이 아닙니다. 마감 일봉 '+esc(asOf)+'까지 · 진행 중인 일봉과 주봉 제외</p></div><div class="reversal-grid">'+result.indices.map(r=>'<article class="reversal-card"><div class="reversal-card-head"><h3>'+esc(r.name)+'</h3><span>'+esc(r.label)+'</span></div>'+(r.missing?'<p>저가·거래량을 포함한 최신 일봉이 필요합니다. 다음 수집 후 확인하세요.</p>':'<p class="reversal-count">확인 '+r.passed+' / 6개 · 수익 확률이 아닙니다.</p><ul>'+r.checks.map(c=>'<li><strong><span class="reversal-state">'+(c.pass===null?'?':c.pass?'✓':'○')+'</span>'+esc(c.name)+'<span>'+(c.pass===null?'자료 부족':c.pass?'충족':'대기')+'</span></strong><p>'+esc(c.text)+'</p></li>').join('')+'</ul>'+(r.attempt.failed?'<p class="reversal-warning">최근 실패 기록 '+esc(r.attempt.failed.day)+' · '+esc(r.attempt.failed.reason)+'</p>':'')+'<p class="reversal-proxy">거래량: '+esc(r.proxySymbol)+' 대용 · 해당 지수의 공식 FTD 판정이 아닙니다.</p>')+'</article>').join('')+'</div><details class="reversal-method"><summary>원문 해석·판정 기준·한계</summary><p>사용자 제공 글에서 ‘자본 보전, 하루 반등과 전환 구분, 일간 기록·주간 판단’ 원칙을 추출했습니다. V자 반등의 빈도·횡보 확률·정규분포 가정과 2025년 4월 사례의 재현성은 검증하지 않았습니다.</p><p>바닥 유지: 최근 5일 저가가 앞선 15일 최저가 이상이며 5일 종가 범위가 8% 이하. 일봉 회복: 3일 연속 SMA20 위이며 SMA20이 5거래일 전 이상. 확산: 순위 상위 20개 중 유효 표본 최소 15개, 그중 60% 이상이 SMA20 위·5일 상승. 변동성: VIX 마감값 25 미만이면서 5일 전보다 하락.</p><p>자체 반등 조건: 앞선 20일 최고 종가 대비 8% 이상 조정 또는 하루 −3% 이하 하락 후 저가를 기준으로, 첫 상승 종가를 반등 1일째로 셉니다. 기준 저가를 깨면 재시작합니다. 4일째 이후 지수 +1% 이상·대용 ETF 거래량 전일 초과가 후보이며, 후보일 저가를 이후 3거래일 유지해야 충족합니다. 후보일 저가 이탈 시 실패로 기록합니다. 3일째 급등은 별도 관찰만 하며 확인 조건에 넣지 않습니다.</p><p>주봉: 미국 현지 날짜 기준 완료된 주만 이용합니다. 전주보다 종가 상승·저가 유지·4주 종가 평균 위를 함께 봅니다. 휴일 주간은 주말 이후 확정하며 이력 시작의 부분 주는 제외합니다. 지수 간 합산 매수 신호는 만들지 않습니다. 조건·기간·임계값은 자체 설정으로 백테스트되지 않았으며, ‘상승 근거 누적’도 이후 상승이나 손실 방지를 보장하지 않습니다.</p><p>일봉 이력은 최근 90개로 제한되어 이전 반등의 시작·실패가 누락될 수 있습니다. ‘바닥 유지’는 관찰 조건이며 바닥 확정이나 V자·횡보 예측이 아닙니다. 전체 시장 폭 대신 대형주 표본을 쓰고, 거래량은 SPY·QQQ 대용입니다. 원문의 RARE DAY 3 FTD를 자동 재현하거나 공식 IBD FTD를 판정하지 않습니다.</p><p><a href="https://www.schwab.com/learn/story/how-to-read-stock-charts-and-trading-patterns" target="_blank" rel="noopener noreferrer">추세 확인 개념 · Charles Schwab</a> · <a href="https://www.aaii.com/journal/article/the-big-picture-how-to-determine-the-stock-market-s-direction" target="_blank" rel="noopener noreferrer">후속 상승일 개념 · AAII</a></p></details>';
 if(wasOpen)el.querySelector('details').open=true;
}
