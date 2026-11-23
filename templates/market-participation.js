// PARTICIPATION_MODEL_START
function breadthThrust(report,exchange,asOf,holidays){
 const snapshots=(report?.history||[]).filter(s=>s.day<=asOf&&s.exchanges?.some(r=>r.exchange===exchange)).sort((a,b)=>a.day.localeCompare(b.day));
 if(!snapshots.length)return {known:false,label:'마감 집계 없음',dates:[],observed:0};
 const map=new Map(snapshots.map(s=>[s.day,s.exchanges.find(r=>r.exchange===exchange)]));
 const dates=[];let observed=0,lastDown=null,gaps=0;const d=new Date(snapshots[0].day+'T12:00:00Z');
 for(let guard=0;guard<200&&d.toISOString().slice(0,10)<=asOf;guard++,d.setUTCDate(d.getUTCDate()+1)){
  const day=d.toISOString().slice(0,10),calendar=holidays[d.getUTCFullYear()];
  if(!calendar)return {known:false,label:'거래일 달력 확인 필요',dates:[],observed};
  if([0,6].includes(d.getUTCDay())||calendar.includes(day.slice(5)))continue;
  const r=map.get(day);if(!r){dates.length=0;gaps++;continue;}observed++;
  if(r.down>=10*r.up&&r.down>0){dates.length=0;lastDown=day;}
  else if(r.up>=10*r.down&&r.up>0)dates.push(day);
 }
 const latest=map.get(asOf);if(!latest)return {known:false,label:'최신 마감 집계 대기',dates:[],observed,gaps,latest:snapshots.at(-1)};
 const repeat=dates.length>=2;
 return {known:true,latest:{day:asOf,...latest},upDay:latest.up>=10*latest.down&&latest.up>0,downDay:latest.down>=10*latest.up&&latest.down>0,repeat,dates:dates.slice(-2),observed,gaps,lastDown,label:repeat?'10:1 상승일 2회 이상 확인':dates.length?'10:1 상승일 1회 · 반복 대기':'10:1 상승 확인 대기'};
}
function leadershipChange(report,asOf,previousDay){
 if(!report||report.day!==asOf)return {known:false,label:'최신 마감 분석 대기'};
 const current=report.history?.find(h=>h.day===asOf),previous=report.history?.filter(h=>h.day<asOf).sort((a,b)=>b.day.localeCompare(a.day))[0];
 if(previousDay&&previous?.day!==previousDay)return {known:false,label:'비교 보류 · 직전 거래일 누락',current,previous};
 if(!current||!previous||current.valid<current.expected*.9||previous.valid<previous.expected*.9||current.universe_key!==previous.universe_key||!Array.isArray(current.valid_symbols)||current.valid_symbols.length!==current.valid||!Array.isArray(previous.valid_symbols)||previous.valid_symbols.length!==previous.valid||[...current.valid_symbols].sort().join(',')!==[...previous.valid_symbols].sort().join(','))return {known:false,label:'비교 보류 · 표본·이력 확인 필요',current,previous};
 const before=new Set(previous.candidates),now=new Set(current.candidates);
 return {known:true,label:now.size>before.size?'주도주 후보 증가':now.size<before.size?'주도주 후보 감소':'주도주 후보 수 유지',coverage:current.valid,count:now.size,previousCount:before.size,delta:now.size-before.size,entered:[...now].filter(s=>!before.has(s)),exited:[...before].filter(s=>!now.has(s)),previousDay:previous.day,current,previous};
}
// PARTICIPATION_MODEL_END
function renderParticipation(){
 const el=$('participation-monitor');if(!el)return;const wasOpen=el.querySelector('details')?.open===true;const health=collectionHealth(data),asOf=health.expectedDay;
 if(!asOf||health.invalid||health.late){el.innerHTML='<h3>시장 참여 확인 보류</h3><p>미국장 수집 시각과 거래일을 확인해 주세요.</p>';return;}
 const breadth=data.market_breadth,leaders=data.leaders;
 const cards=['NYSE','NASDAQ'].map(exchange=>{
  const r=breadthThrust(breadth,exchange,asOf,marketHolidays),latest=r.latest;
  const row=latest?.exchanges?latest.exchanges.find(x=>x.exchange===exchange):latest;
  const ratio=row?(row.down===0?'하락 거래량 0':num(row.up/row.down,2)+' : 1'):'—';
  return '<article class="reversal-card"><div class="reversal-card-head"><h3>'+exchange+'</h3><span>'+esc(r.label)+'</span></div><p class="participation-ratio">'+ratio+'</p><p>상승 거래량 ÷ 하락 거래량</p>'+(row?'<p class="participation-meta">기준일 '+esc(latest.day)+' · 상승 '+num(row.up,0)+'주 / 하락 '+num(row.down,0)+'주</p>':'')+'<p class="participation-meta">10:1 상승일 '+(r.known?(r.upDay?'해당':'미해당'):'확인 보류')+' · 10:1 하락일 '+(r.known?(r.downDay?'해당':'미해당'):'확인 보류')+'</p>'+(r.dates.length?'<p>확인된 상승일: '+r.dates.map(esc).join(' · ')+'</p>':'')+'<p class="participation-meta">관측 '+r.observed+'거래일'+(r.gaps?' · 중간 누락 '+r.gaps+'일: 누락 전후 반복 연결 안 함':'')+' · 기록 시작 전 신호는 미확인</p>'+(breadth?.status!=='ok'?'<p class="reversal-warning">최근 집계 수집 실패·미수집. 이전 자료가 있으면 유지하며 최신 여부를 확인하세요.</p>':'')+'</article>';
 }).join('');
 const prior=new Date(asOf+'T12:00:00Z');let previousDay=null;for(let i=0;i<14;i++){prior.setUTCDate(prior.getUTCDate()-1);const key=prior.toISOString().slice(0,10);if(!marketHolidays[prior.getUTCFullYear()])break;if(![0,6].includes(prior.getUTCDay())&&!marketHolidays[prior.getUTCFullYear()].includes(key.slice(5))){previousDay=key;break;}}
 const change=previousDay?leadershipChange(leaders,asOf,previousDay):{known:false,label:'거래일 확인 필요'},candidates=leaders?.day===asOf?leaders.candidates||[]:[];
 el.innerHTML='<div class="reversal-intro"><span class="eyebrow">BREADTH & LEADERSHIP</span><h3>상승이 시장 전체와 새 후보로 퍼지는가?</h3><p>NYSE·Nasdaq 상장 종목의 상승·하락 거래량 집계와, 별도의 대형주 후보군을 구분해 확인합니다.</p></div><div class="reversal-grid">'+cards+'</div><p class="participation-meta">집계 출처: <a href="https://www.wsj.com/market-data/stocks/marketsdiary" target="_blank" rel="noopener noreferrer">WSJ Markets Diary · FactSet / Dow Jones Market Data</a> · 별표 없는 전체 거래량 필드 · NYSE 자체 체결량 한정 필드 제외 · 두 시장을 미국 전체 단일 비율로 합산하지 않음</p><article class="reversal-card"><div class="reversal-card-head"><h3>새로운 주도주 후보</h3><span>'+esc(change.label)+'</span></div><p class="participation-ratio">'+(leaders?.day===asOf?candidates.length:'—')+'<small>개 후보</small></p><p class="participation-meta">상위 200개 대형주 + 버크셔 중 유효 '+(leaders?.valid??0)+' / '+(leaders?.expected??201)+'개 · ETF 제외 · 목록 기준일 '+esc(data.universe_date||'미확인')+'</p>'+(leaders?.unavailable?.length?'<p class="participation-meta">분석 제외(이력·지표·수집 상태 확인): '+esc(leaders.unavailable.join(', '))+'</p>':'')+(change.known?'<p>동일 유효 '+change.coverage+'개 표본 · 이전 거래일 '+esc(change.previousDay)+' 대비 '+change.previousCount+' → '+change.count+'개 ('+(change.delta>0?'+':'')+change.delta+')</p><p>새 진입: '+esc(change.entered.join(', ')||'없음')+'<br>이탈: '+esc(change.exited.join(', ')||'없음')+'</p>':'<p>자료가 빠졌거나 비교 표본이 달라지면 후보 수의 증가·감소를 확정하지 않습니다.</p>')+(candidates.length?'<div class="table-scroll"><table class="leader-table"><thead><tr><th>후보 종목</th><th>20일 SPY 대비</th><th>60일 고점 대비</th><th>5일 변화</th></tr></thead><tbody>'+candidates.map(r=>'<tr><td><a href="https://finance.yahoo.com/quote/'+encodeURIComponent(r.symbol)+'/" target="_blank" rel="noopener noreferrer">'+esc(r.symbol)+'</a><span class="company">'+esc(r.name)+'</span></td><td>'+num(r.relative20)+'%p</td><td>'+pct(r.highGap)+'</td><td>'+pct(r.change5)+'</td></tr>').join('')+'</tbody></table></div>':'<p>현재 조건을 모두 충족한 후보가 없습니다. 미수집 상태라면 분석을 기다려 주세요.</p>')+'<p class="participation-meta">최근 완료 10거래일 후보 수: '+(leaders?.history||[]).map(h=>esc(h.day)+': '+h.candidates.length+(h.valid<h.expected?' (부분 표본)':'')).join(' · ')+'</p></article><details class="reversal-method"><summary>10:1 반복·주도주 후보 기준과 한계</summary><p>거래량은 거래대금·종목 수가 아닌 주식 수입니다. 상승 거래량 ≥ 하락 거래량 × 10인 날을 상승일, 반대를 하락일로 기록합니다. 90개 저장 일자 안에서 중간 10:1 하락일 없이 상승일이 두 번 나오면 반복으로 표시합니다. 반드시 연속 이틀일 필요는 없습니다. 거래일 누락이 있으면 연결을 끊고 이후 새로 두 번 확인해야 합니다. 이력은 수집 시작일부터 축적하며 과거 반복을 추정하지 않습니다.</p><p>주도주 후보는 ① 종가 &gt; SMA50 &gt; SMA200, SMA50이 20일 전 이상 ② 20일 수익률이 SPY보다 3%p 이상 높음 ③ 최근 60일 장중 고점 대비 하락 10% 이내 ④ 5일 상승 ⑤ 최근 5일 중 상승일 거래량이 직전 20일 평균의 1.2배 이상인 날 존재, 모두 충족해야 합니다. RS 백분위나 기업 실적 평가가 아닌 자체 기술 조건입니다. 마감 일봉만 사용합니다.</p><p>주도주 비교는 현재의 같은 200개 목록과 버크셔를 고정해 과거 완료 10일을 역산합니다. 과거 당시의 시가총액 구성 종목을 재현한 백테스트가 아니며 생존·선정 편향이 있습니다. 대상 중 90% 이상이 유효하고 직전 거래일과 유효 종목 구성이 정확히 같을 때만 해당 동일 표본의 증감·진입·이탈을 표시합니다. 분석 제외 종목을 포함한 전체 대상의 증감으로 해석하지 마세요. 미국 전체에서 새로운 주도주를 발굴한 결과가 아닙니다.</p><p>두 기능은 기존 상승 확인 6개 조건과 별도의 관찰표이며 매수 지시·성공 확률이 아닙니다. 집계 공급자의 종목 범위·분류·수정과 지연·누락에 영향을 받습니다.</p></details>';
 if(wasOpen)el.querySelector('details').open=true;
}
