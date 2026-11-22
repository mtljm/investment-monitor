'use strict';
let data=JSON.parse(document.getElementById('monitor-data').textContent);
let group='대형주',sortKey='snapshot_rank',ascending=true,stockLimit=20;
try{const saved=Number(localStorage.getItem('investment-monitor-stock-limit'));if([20,50,100,200].includes(saved))stockLimit=saved;}catch{}
const $=id=>document.getElementById(id),num=(v,d=2)=>Number.isFinite(v)?new Intl.NumberFormat('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cls=v=>Number.isFinite(v)?v>0?'positive':v<0?'negative':'neutral':'neutral';
const pct=v=>Number.isFinite(v)?(v>0?'+':'')+num(v)+'%':'—';
function history(r){return (Array.isArray(r.history)?r.history:[]).filter(p=>p&&Number.isFinite(p.close)&&Number.isFinite(p.time)&&Number.isFinite(new Date(p.time*1000).getTime()));}
function chart(r,large=false){
 if(large)return detailChart(r);
 const h=history(r),w=large?720:230,height=large?220:46;
 if(h.length<2)return '<div class="neutral" style="font-size:11px;padding:15px 0">가격 이력이 없습니다.</div>';
 const values=h.map(p=>p.close),lo=Math.min(...values),hi=Math.max(...values),span=hi-lo||1;
 const points=h.map((p,i)=>[(i/(h.length-1))*(w-8)+4,8+(1-(p.close-lo)/span)*(height-20)]);
 const path=points.map((p,i)=>(i?'L':'M')+p.map(n=>n.toFixed(2)).join(',')).join(' ');
 const color=values.at(-1)>=values[0]?'#c63d45':'#2867bd';
 let grid='';
 if(large)for(let i=0;i<3;i++){const y=12+i*(height-24)/2;grid+='<line x1="4" y1="'+y+'" x2="'+(w-4)+'" y2="'+y+'" stroke="#e9edf0" stroke-dasharray="3 5"/>';}
 const area=path+' L'+(w-4)+','+height+' L4,'+height+' Z';
 return '<svg class="'+(large?'chart':'spark')+'" viewBox="0 0 '+w+' '+height+'" role="img" aria-label="'+esc(r.name)+' 최근 '+h.length+'개 일봉 가격 흐름" preserveAspectRatio="none">'+grid+'<path d="'+area+'" fill="'+color+'" opacity=".055"/><path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="'+(large?2:1.6)+'" vector-effect="non-scaling-stroke"/></svg>'+(large?'<div class="table-foot"><span>'+new Date(h[0].time*1000).toISOString().slice(0,10)+'</span><span>범위 '+num(lo)+' – '+num(hi)+' / Close 기준</span><span>'+new Date(h.at(-1).time*1000).toISOString().slice(0,10)+'</span></div>':'');
}
function high52Text(r){return Number.isFinite(r.drawdown_52w_pct)?'52주 고점 대비 '+pct(r.drawdown_52w_pct):r.high_52w_complete===false?'52주 이력 부족·고가 확인':'52주 지표 미수집';}
function high52Meta(r){return Number.isFinite(r.high_52w)?'52주 장중 고점 '+num(r.high_52w)+' '+(r.unit||'')+' · '+String(r.high_52w_time_utc||'').slice(0,10):'전체 52주 이력과 유효 고가가 있어야 계산합니다.';}
function gap(r){return Number.isFinite(r.close)&&Number.isFinite(r.sma20)&&r.sma20!==0?(r.close/r.sma20-1)*100:null;}
function stale(r){return ['stale','unknown','retained'].includes(priceHealth(r));}
function badge(r){const h=priceHealth(r);return h==='retained'?'<span class="badge down">이전 자료 유지</span>':h==='error'?'<span class="badge down">수집 실패</span>':h==='unknown'?'<span class="badge down">거래일 판단 불가</span>':h==='stale'?'<span class="badge down">거래일 확인</span>':'<span class="badge">최신 확인</span>';}
function localTime(s){if(!s)return '미확인';const d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:true})+' KST':'미확인';}
function render(){
 const available=data.rows.filter(r=>r.group==='대형주').length;
 if(stockLimit>available)stockLimit=[200,100,50,20].find(n=>n<=available)||20;
 $('stock-limit').value=String(stockLimit);
 $('scope-note').textContent=available<200?'현재 배포는 상위 '+available+'개 데이터입니다. 50·100·200 메뉴는 유지하며, 해당 범위 데이터가 배포되면 사용할 수 있습니다.':'최대 200개 데이터가 포함되어 있습니다.';
 [...$('stock-limit').options].forEach(o=>o.disabled=Number(o.value)>available);

 const rows=data.rows;
 updateFreshness();
 $('universe-date').textContent='대형주 목록 기준일 '+(data.universe_date||'미확인')+' · 미국 기업 시가총액 상위 '+available+'개 수집 · 순위 목록은 최대 200개';
 $('indices').innerHTML=rows.filter(r=>r.group==='지수').map(r=>'<article class="index-card" data-symbol="'+esc(r.symbol)+'" tabindex="0" role="button" aria-label="'+esc(r.name)+' 상세"><div class="card-title">'+esc(r.name)+'<span>'+esc(r.symbol)+'</span></div><div class="value">'+num(r.close)+'</div><div class="change '+cls(r.change_1d_pct)+'">'+pct(r.change_1d_pct)+' <span class="neutral">전일 대비</span></div>'+chart(r)+'<div class="high52-index" title="'+esc(high52Meta(r))+'">'+esc(high52Text(r))+'</div><div class="stamp">'+esc((r.bar_time_utc||'미확인').slice(0,10))+' · '+(r.status==='ok'?'일봉': '수집 실패')+'</div></article>').join('');
 $('macros').innerHTML=rows.filter(r=>r.group==='시장지표').map(r=>{
  const v=r.symbol==='^TNX'?r.change*100:r.symbol==='^VIX'?r.change:r.change_1d_pct;
  const unit=r.symbol==='^TNX'?' bp':r.symbol==='^VIX'?' pt':'%';
  return '<article class="macro" data-symbol="'+esc(r.symbol)+'" tabindex="0" role="button" aria-label="'+esc(r.name)+' 시계열과 지표 상세" data-macro-symbol="'+esc(r.symbol)+'"><div><span class="label">'+esc(r.name)+(r.symbol==='BTC-USD'?' · BTC/USD':'')+'</span><div class="value">'+num(r.close)+'<span class="unit">'+esc(r.unit)+'</span></div></div><div class="change '+cls(v)+'">'+(Number.isFinite(v)?(v>0?'+':'')+num(v)+unit:'—')+'<span class="macro-basis">'+(r.symbol==='BTC-USD'?'UTC 일봉 대비 · 수집 시점 가격':'전일 대비')+'</span></div><div class="macro-history">'+chart(r)+'<div class="macro-metrics"><span>RSI 14 <b>'+num(r.rsi14)+'</b></span><span>SMA20 이격 <b class="'+cls(gap(r))+'">'+pct(gap(r))+'</b></span></div><span class="macro-open">최근 '+history(r).length+'개 일봉 · 그래프·지표 확대 ↗</span></div><small class="macro-stamp">'+(r.status==='ok'?'시세 '+esc(localTime(r.quote_time_utc||r.bar_time_utc)):'수집 실패')+'</small></article>';
 }).join('');
 renderSectors();
 renderCollectionStatus();
 renderTable();
 renderAnalysis();
 renderBriefing();
 renderAsia();
 renderGurus();
}
function renderCollectionStatus(){
 const s=collectionStats(data);
 $('status').innerHTML='<div class="progress-row"><span>미국시장 수집 구성</span><span>'+collectionSummary()+'</span></div><div class="progress-row"><span>최신 거래일 확인 / 전체</span><span>'+s.current+' / '+s.total+'</span></div><div class="progress-row"><span>이전 자료 유지</span><span>'+s.retained+'개</span></div><div class="progress-row"><span>수집 실패 / 거래일 확인 / 판단 불가</span><span>'+s.error+' / '+s.stale+' / '+s.unknown+'</span></div><div class="progress-row"><span>갱신 방식</span><span>스크립트 수동 실행</span></div>';
}
function updateFreshness(){
 renderCollectionStatus();
 if(typeof IB_REPORTS!=='undefined'&&!$('ib').hidden){$('data-notice').textContent='리포트 요약 검토일 '+IB_REPORTS.reviewed_at+' · 시세 배치와 별도 · 새 원문 자동 번역 기능은 사용하지 않습니다.';$('data-notice').parentElement.setAttribute('role','status');$('data-notice').parentElement.classList.remove('collection-warning');return;}
 if(!$('gurus').hidden){gurusNotice();return;}
 if(!$('asia').hidden){asiaNotice();return;}
 if(!$('overview').hidden)renderThreeLow();
 renderSectors();
 renderTemperature();
 const health=collectionHealth(data),now=Date.now();
 const counts=collectionStats(data,now),staleCount=counts.stale,unknown=counts.unknown,failed=counts.error;
 const etfProblem=data.etf_watch&&data.etf_watch.status!=='ok';
 const problems=[etfProblem?'추가 ETF 갱신 실패'+(counts.retained?' · '+counts.retained+'개 이전 자료 유지':' · 선정 자료 없음'):null,health.invalid?'수집 시각 확인 필요':health.late?'자동 갱신 지연 · 예정 시각 이후 새 수집이 없습니다.':health.pending?'예약 갱신 대기 중':null,staleCount?staleCount+'개 항목의 최신 거래일 확인 필요':null,unknown?unknown+'개 항목의 거래일 판단 불가':null,failed?failed+'개 항목 수집 실패':null,!health.expectedDay?'미국 거래일 달력 갱신 필요':null].filter(Boolean);
 const warning=etfProblem||health.invalid||health.late||staleCount>0||unknown>0||failed>0||!health.expectedDay;
 const notice=$('data-notice');
 notice.textContent='수집 '+localTime(data.collected_at_utc)+' · '+(problems.join(' / ')||'수집 일정·거래일 확인됨')+' · 미국 주식 최근 마감 거래일 '+(health.expectedDay||'미확인')+' · 항목별 거래일·시세 시각이 다릅니다.';
 notice.parentElement.setAttribute('role',warning?'alert':'status');
 notice.parentElement.classList.toggle('collection-warning',!!warning);
}
function displayRows(){return snapshotRows(data);}
function dollarAmount(v){return Number.isFinite(v)?num(v/1e8)+'억 달러':'—';}
function dollarVolume(r){return Number.isFinite(r.ranking_dollar_volume)?r.ranking_dollar_volume:Number.isFinite(r.close)&&Number.isFinite(r.volume)?r.close*r.volume:null;}
function collectionSummary(){const total=displayRows().length;return '기본 '+data.rows.length+'개 + 추가 ETF '+(total-data.rows.length)+'개 = 총 '+total+'개';}
function visibleRows(){
 const q=$('search').value.trim().toLowerCase(),trend=$('trend').value;
 const rows=displayRows().filter(r=>(r.group!=='대형주'||r.snapshot_rank<=stockLimit)&&(group==='all'||group==='ETF'&&r.group.endsWith('ETF')||r.group===group)&&(!q||(r.symbol+' '+r.name+' '+(r.concept_name||'')).toLowerCase().includes(q))&&(trend==='all'||trend==='error'&&priceHealth(r)!=='current'||trend==='up'&&gap(r)>0||trend==='down'&&gap(r)<0));
 return rows.sort((a,b)=>{
  const av=sortKey==='sma20_gap'?gap(a):sortKey==='dollar_volume'?dollarVolume(a):a[sortKey],bv=sortKey==='sma20_gap'?gap(b):sortKey==='dollar_volume'?dollarVolume(b):b[sortKey];
  if(av==null)return bv==null?0:1;if(bv==null)return -1;
  return(typeof av==='string'?av.localeCompare(bv):av-bv)*(ascending?1:-1);
 });
}
function renderTable(){
 const rows=visibleRows();
 $('rows').innerHTML=rows.length?rows.map(r=>'<tr data-symbol="'+esc(r.symbol)+'" tabindex="0" aria-label="'+esc(r.name)+' 상세"><td><span class="symbol">'+esc(r.symbol)+'</span><span class="company">'+esc(r.name)+'</span>'+(r.concept_name?'<span class="company">'+esc(r.concept_name)+'</span>':'')+'</td><td>'+num(r.close)+'<span class="company">'+esc(r.unit)+'</span><span class="company high52-reading" title="'+esc(high52Meta(r))+'">'+esc(high52Text(r))+'</span></td><td class="'+cls(r.change_1d_pct)+'">'+pct(r.change_1d_pct)+'</td><td class="'+cls(r.change_5d_pct)+'">'+pct(r.change_5d_pct)+'</td><td class="'+cls(r.change_20d_pct)+'">'+pct(r.change_20d_pct)+'</td><td class="'+cls(gap(r))+'">'+pct(gap(r))+'</td><td>'+(['대형주','지수 ETF','섹터 ETF','거래량 ETF'].includes(r.group)?dollarAmount(dollarVolume(r))+'<span class="company">'+num(r.volume,0)+'주</span><span class="company">20일 평균 '+num(r.volume_ratio)+'×</span>':'—')+'</td><td>'+badge(r)+'</td></tr>').join(''):'<tr><td colspan="8" class="empty">조건에 맞는 종목이 없습니다.</td></tr>';
 $('count').textContent=rows.length+'개 표시 / 대형주 상위 '+stockLimit+'개 선택 · '+collectionSummary()+' · 목록 기준일 '+(data.universe_date||'미확인');
 const etfs=data.etf_watch,note=$('etf-watch-note');note.hidden=!['ETF','거래량 ETF','all'].includes(group);
 note.textContent=etfs?'비중복 후보 '+etfs.candidate_count+'개 중 최신 일봉 '+(etfs.volume_day||'미확인')+(etfs.ranking_method==='close_times_volume_usd'?' 추정 거래대금(종가 × 거래량, USD)':' 이전 거래량 자료 · 거래대금 순위 갱신 대기')+' 기준 최대 5개 · 동일 컨셉 1개 · '+(etfs.status==='ok'?'선정 확인됨':'갱신 실패 · 기존 자료/수집 상태 확인')+' · 마지막 성공 '+localTime(etfs.last_success_at_utc|| (etfs.status==='ok'?etfs.checked_at_utc:null))+' · 최근 시도 '+localTime(etfs.checked_at_utc)+' · 전체 ETF 시장 순위가 아니며, 보유종목의 완전 비중복을 뜻하지 않습니다.':'거래대금 ETF 선정 자료를 수집하면 표시됩니다.';
}
function showDetail(symbol){
 const r=findInstrument(symbol);if(!r)return;
 detailSymbol=symbol;
 $('detail-symbol').textContent=r.symbol+' / '+r.group;
 $('detail-title').textContent=r.name;
 $('detail-price').innerHTML='<strong style="font-size:26px">'+num(r.close)+'</strong> <span class="neutral">'+esc(r.unit)+'</span> <span class="'+cls(r.change_1d_pct)+'">'+pct(r.change_1d_pct)+'</span>';
 $('detail-high52').textContent=high52Text(r)+' · '+high52Meta(r);
 $('detail-etf').hidden=!r.concept_name;$('detail-etf').textContent=r.concept_name?'컨셉: '+r.concept_name+' · '+(r.description||'')+' · 선정 일봉 '+(r.volume_day||'미확인')+' · 추정 거래대금 '+dollarAmount(dollarVolume(r))+' (종가 × 거래량) · 선정 거래량 '+num(r.ranking_volume,0)+'주':'';
 $('detail-chart').innerHTML=chart(r,true);
 if(Array.isArray(r.analysis?.cards)&&r.analysis.cards.length){
  $('detail-stats').innerHTML=technicalDetailHtml(r);
 }else{
 const maRows=[['SMA20 · 단기',r.sma20],['SMA50 · 중기',r.sma50],['SMA200 · 장기',r.sma200]].map(([label,value])=>{
  const distance=Number.isFinite(value)&&value!==0&&Number.isFinite(r.close)?(r.close/value-1)*100:null;
  return '<tr><td>'+label+'</td><td>'+num(value)+'</td><td class="'+cls(distance)+'">'+pct(distance)+'</td></tr>';
 }).join('');
 const rsi=Number.isFinite(r.rsi14)?r.rsi14:null;
 const rsiState=rsi===null?'미확인':rsi>=70?'과매수 참고 구간':rsi<=30?'과매도 참고 구간':'중간 구간';
 const macdState=Number.isFinite(r.macd_histogram)?(r.macd_histogram>0?'MACD가 신호선 위':r.macd_histogram<0?'MACD가 신호선 아래':'MACD와 신호선 일치'):'이력 부족 또는 미수집';
 $('detail-stats').innerHTML=
 '<section class="indicator-card"><h3>이동평균 MA · 한눈에 보기</h3><p>최근 종가의 평균입니다. 단기·중기·장기 가격 흐름과 현재 가격의 위치를 비교합니다.</p><table><thead><tr><th>기간</th><th>평균값</th><th>현재가 대비 이격</th></tr></thead><tbody>'+maRows+'</tbody></table><details><summary>계산 방법과 뜻</summary>20·50·200개의 유효 일봉 종가를 단순 평균한 SMA입니다. 이격은 (현재가 ÷ 이동평균 − 1) × 100입니다. 양수면 현재가가 평균 위, 음수면 평균 아래입니다. 이동평균은 가격 변화를 뒤따르는 지표입니다.</details></section>'+
 '<section class="indicator-card"><h3>RSI(14) · 상승·하락 강도</h3><p>최근 상승폭과 하락폭의 균형을 0~100으로 나타냅니다.</p><div class="reading">'+num(rsi)+' <span class="badge">'+rsiState+'</span></div>'+
 (rsi===null?'':'<div class="meter" role="meter" aria-label="RSI 14" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+rsi.toFixed(2)+'"><i style="left:'+Math.max(0,Math.min(100,rsi))+'%"></i></div><div class="meter-labels"><span>0</span><span>30</span><span>70</span><span>100</span></div>')+
 '<details><summary>계산 방법과 뜻</summary>14기간 Wilder 평활을 사용합니다. 보통 70 이상·30 이하를 과매수·과매도 참고 구간으로 봅니다. 강한 추세에서는 해당 구간에 오래 머무를 수 있습니다. 상승과 하락이 모두 0인 완전 횡보는 이 도구에서 50으로 표시합니다.</details></section>'+
 '<section class="indicator-card"><h3>MACD(12,26,9) · 모멘텀</h3><p>빠른 지수이동평균과 느린 지수이동평균의 차이를 비교합니다.</p><table><tbody><tr><td>MACD</td><td>'+num(r.macd,4)+'</td></tr><tr><td>신호선</td><td>'+num(r.macd_signal,4)+'</td></tr><tr><td>히스토그램</td><td class="'+cls(r.macd_histogram)+'">'+num(r.macd_histogram,4)+'</td></tr></tbody></table><p>'+macdState+'</p><details><summary>계산 방법과 뜻</summary>MACD = EMA12 − EMA26, 신호선 = MACD의 EMA9, 히스토그램 = MACD − 신호선입니다. EMA는 같은 기간의 단순평균으로 초기화합니다. 현재 두 선의 위·아래 관계를 보여주며, 교차가 방금 발생했다는 뜻은 아닙니다. 값은 가격과 같은 단위여서 종목 간 크기를 직접 비교하지 않습니다.</details></section>'+
 '<section class="indicator-card"><h3>볼린저 밴드(20,2) · 변동성</h3><p>20일 평균 주변의 가격 분산으로 최근 변동 범위를 보여줍니다.</p><table><tbody><tr><td>상단</td><td>'+num(r.bb_upper)+'</td></tr><tr><td>중심 · SMA20</td><td>'+num(r.bb_middle)+'</td></tr><tr><td>하단</td><td>'+num(r.bb_lower)+'</td></tr><tr><td>밴드 내 위치 %B</td><td>'+num(r.bb_percent_b)+'%</td></tr><tr><td>밴드폭</td><td>'+num(r.bb_width_pct)+'%</td></tr></tbody></table><details><summary>계산 방법과 뜻</summary>상·하단 = SMA20 ± 종가의 모집단 표준편차 × 2입니다. %B는 하단 0%, 상단 100%이며 밴드 밖에서는 범위를 벗어납니다. 밴드폭은 (상단 − 하단) ÷ 중심 × 100입니다. 밴드 접촉만으로 반전이 확정되지는 않습니다.</details></section>'+
 '<p class="indicator-note">기준: 유효 일봉 Close. 장중 봉·배당·분할 처리에 따라 다른 서비스와 차이가 날 수 있습니다. 이력이 부족하거나 이전 보고서에 지표가 없으면 —로 표시합니다. 지표 하나만으로 매수·매도를 결정하지 않습니다. '+(['시장지표','지수'].includes(r.group)?'지수·금리·환율의 지표 값은 해당 원본 단위 기준입니다.':'')+'</p>';

 }
 $('detail-meta').textContent='봉 기준: '+localTime(r.bar_time_utc)+' | 시세 기준: '+localTime(r.quote_time_utc)+' | 거래소 시간대: '+(r.exchange_timezone||'미확인')+' | '+(r.status==='ok'?'출처: Yahoo Finance':'수집 오류: '+(r.error||'미확인'))+' · 마지막 봉은 장중 값일 수 있습니다.';
 $('detail').showModal();
}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
document.querySelectorAll('[data-group]').forEach(b=>b.addEventListener('click',()=>{
 group=b.dataset.group;if(['ETF','거래량 ETF'].includes(group)){sortKey='dollar_volume';ascending=false;}document.querySelectorAll('[data-group]').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-pressed',String(t===b));});renderTable();
}));
document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{ascending=sortKey===b.dataset.sort?!ascending:false;sortKey=b.dataset.sort;renderTable();}));
$('search').addEventListener('input',renderTable);$('trend').addEventListener('change',renderTable);
document.addEventListener('click',e=>{const el=e.target.closest('[data-symbol]');if(el)showDetail(el.dataset.symbol);});
document.addEventListener('keydown',e=>{const el=e.target.closest('[data-symbol]');if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showDetail(el.dataset.symbol);}});
$('close-dialog').addEventListener('click',()=>$('detail').close());
$('export-btn').addEventListener('click',()=>{
 const cols=['symbol','name','group','close','unit','change_1d_pct','change_5d_pct','change_20d_pct','high_52w','high_52w_time_utc','drawdown_52w_pct','sma20','sma50','sma200','rsi14','macd','macd_signal','macd_histogram','bb_upper','bb_middle','bb_lower','bb_percent_b','bb_width_pct','volume','volume_ratio','status','bar_time_utc','quote_time_utc'];
 const csv='\ufeff'+[cols,...visibleRows().map(r=>cols.map(c=>r[c]))].map(row=>row.map(csvCell).join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='market-monitor.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});

const views={
 ib:['해외 IB, 관점 비교.','공개 시장 자료를 한국어로 요약하고 발표 시점과 발행 부문을 함께 확인하세요.','GLOBAL BANKS / MARKET INSIGHTS'],
 gurus:['13F, 기관 포트폴리오.','분기말 공개 보유종목을 참고하고 기관별 공시 원문을 확인하세요.','GURU PORTFOLIOS / FORM 13F'],
 asia:['아시아 시장, 한눈에.','주요 아시아 지수의 가격·추세·기준 시각을 확인하세요.','MARKET OVERVIEW / ASIA'],
 overview:['미국 시장, 한눈에.','시장 흐름과 주요 지표의 변화를 확인하세요.','MARKET OVERVIEW / UNITED STATES'],
 watchlist:['관찰 종목, 더 넓게.','시가총액 상위 20·50·100·200개를 선택해 흐름을 비교하세요.','WATCHLIST / US LARGE CAPS'],
 technical:['기술적 분석, 현재 구간.','다섯 가지 지표로 가격 위치와 신호의 일치·충돌을 확인하세요.','TECHNICAL ANALYSIS / DAILY'],
 'data-status':['데이터를 확인하세요.','수집 시각과 성공 여부, 데이터 갱신 방법을 확인하세요.','DATA STATUS / COLLECTION']
};
function activateView(view,focus=false){
 if(!views[view])return;
 for(const [id] of Object.entries(views))$(id).hidden=id!==view;
 document.querySelectorAll('[data-view]').forEach(b=>{
  const selected=b.dataset.view===view;
  b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;
  if(focus&&selected)b.focus();
  if(selected)$('current-view-label').textContent=b.textContent.trim().replace(/^\S\s*/, '');
 });
 const [title,description,eyebrow]=views[view];
 $('view-title').textContent=title;$('view-subtitle').textContent=description;$('view-eyebrow').textContent=eyebrow;
 $('export-btn').hidden=view!=='watchlist';
 const batch=view==='asia'?['daily-asia.yml','아시아']:view==='gurus'?['weekly-gurus.yml','13F 구루']:['daily-us.yml','미국장'];
 const batchLink=$('import-btn');batchLink.hidden=view==='ib';batchLink.href='https://github.com/mtljm/investment-monitor/actions/workflows/'+batch[0];
 batchLink.textContent=batch[1]+' 데이터 불러오기';batchLink.title='GitHub 로그인 후 Run workflow를 눌러 '+batch[1]+' 데이터를 갱신합니다.';
 if(view==='gurus')renderGurus();
 if(view==='ib')renderIbReports();
 updateFreshness();
}
const mobileNavigation=window.matchMedia('(max-width:760px)');
function setMenuOpen(open){
 $('menu-toggle').setAttribute('aria-expanded',String(open));
 $('main-nav').classList.toggle('is-open',open);
}
$('menu-toggle').addEventListener('click',()=>setMenuOpen($('menu-toggle').getAttribute('aria-expanded')!=='true'));
$('main-nav').addEventListener('keydown',e=>{
 if(e.key==='Escape'&&mobileNavigation.matches){setMenuOpen(false);$('menu-toggle').focus();}
});
mobileNavigation.addEventListener('change',()=>setMenuOpen(false));
document.querySelectorAll('[data-view]').forEach((b,i)=>{b.addEventListener('click',()=>{
 activateView(b.dataset.view);
 if(mobileNavigation.matches){setMenuOpen(false);$('menu-toggle').focus();window.scrollTo({top:0,behavior:'instant'});}
});b.addEventListener('keydown',e=>{
 const buttons=[...document.querySelectorAll('[data-view]')];
 let next=null;
 if(['ArrowDown','ArrowRight'].includes(e.key))next=(i+1)%buttons.length;
 if(['ArrowUp','ArrowLeft'].includes(e.key))next=(i-1+buttons.length)%buttons.length;
 if(e.key==='Home')next=0;if(e.key==='End')next=buttons.length-1;
 if(next!==null){e.preventDefault();activateView(buttons[next].dataset.view,true);}
});});
$('stock-limit').addEventListener('change',()=>{
 stockLimit=Number($('stock-limit').value);
 try{localStorage.setItem('investment-monitor-stock-limit',String(stockLimit));}catch{}
 renderTable();
});
let analysisSortKey='default',analysisAscending=true;
function analysisTargets(){return data.rows.filter(r=>['^GSPC','^NDX'].includes(r.symbol)||(r.group==='대형주'&&r.snapshot_rank<=20)).sort((a,b)=>(a.group==='지수'?0:1)-(b.group==='지수'?0:1)||(a.snapshot_rank||0)-(b.snapshot_rank||0));}
function analysisName(r){return r.symbol==='^GSPC'?'S&P 500 · SPX':r.symbol==='^NDX'?'나스닥100':r.name;}
function obvRow(r){return ['^GSPC','^NDX'].includes(r.symbol)?data.rows.find(v=>v.symbol===(r.symbol==='^GSPC'?'SPY':'QQQ')):r;}
function analysisSortValue(r,key){return key==='verdict'?r.analysis?.verdict:key==='support'?r.fibonacci?.support?.price:key==='resistance'?r.fibonacci?.resistance?.price:key==='obv_flow20'?obvRow(r)?.obv_flow20:r[key];}
function signalClass(value){
 const text=String(value||'');
 if(/과열|과매수|상승 우위|상승 정렬|상승 추세|순증|상단/.test(text))return 'signal-up';
 if(/하락 우위|하락 정렬|하락 추세|순감|하단|과매도|약세/.test(text))return 'signal-down';
 return 'signal-neutral';
}
function renderAnalysis(){
 const q=$('analysis-search').value.trim().toLowerCase();
 const targets=analysisTargets().filter(r=>(r.symbol+' '+analysisName(r)).toLowerCase().includes(q));
 if(analysisSortKey!=='default')targets.sort((a,b)=>{const av=analysisSortValue(a,analysisSortKey),bv=analysisSortValue(b,analysisSortKey);if(av==null)return bv==null?0:1;if(bv==null)return -1;return(typeof av==='string'?av.localeCompare(bv):av-bv)*(analysisAscending?1:-1);});
 $('analysis-rows').innerHTML=targets.length?targets.map(r=>{
  const cards=r.analysis?.cards||[],f=r.fibonacci,v=obvRow(r),proxy=v&&v.symbol!==r.symbol?v.symbol+' 대용':'주식 거래량';
  const state=i=>signalLabel(cards[i]?.state);
  return '<tr data-symbol="'+esc(r.symbol)+'" tabindex="0" aria-label="'+esc(r.name)+' 상세"><td><span class="symbol">'+esc(r.symbol==='^GSPC'?'SPX':r.symbol)+'</span><span class="company">'+esc(analysisName(r))+'</span></td><td>'+num(r.close)+'<span class="company">'+esc(r.unit)+'</span><span class="company high52-reading" title="'+esc(high52Meta(r))+'">'+esc(high52Text(r))+'</span></td><td class="analysis-verdict"><span class="badge '+signalClass(r.analysis?.verdict)+'">'+signalLabel(r.analysis?.verdict||'분석 자료 부족')+'</span><span class="company">'+(stale(r)?'오래된 봉 · 확인 필요':esc((r.bar_time_utc||'미확인').slice(0,10)))+'</span></td><td class="analysis-changes">'+changesHtml(r,true)+'</td><td class="analysis-trend">'+state(0)+'<span class="company '+cls(gap(r))+'">SMA20 이격 '+pct(gap(r))+'</span></td><td class="sma-group">'+[['20',r.sma20],['50',r.sma50],['200',r.sma200]].map(([period,value])=>'<span><small>'+period+'</small><b>'+num(value)+'</b></span>').join('')+'</td><td><strong class="'+signalClass(cards[1]?.state)+'">'+num(r.rsi14)+'</strong><span class="company">'+state(1)+'</span></td><td class="analysis-band"><strong class="'+signalClass(cards[2]?.state)+'">%B '+num(r.bb_percent_b)+'%</strong> · '+state(2)+'<span class="company">하 '+num(r.bb_lower)+' / 상 '+num(r.bb_upper)+'</span><span class="company">밴드폭 '+num(r.bb_width_pct)+'%</span></td><td class="analysis-volume"><strong class="'+cls(v?.obv_change20)+'">20일 Δ '+num(v?.obv_change20,0)+'</strong>'+'<span class="company">누적 '+num(v?.obv,0)+' · 순방향 '+num(v?.obv_flow20)+'%</span><span class="company">'+esc(proxy)+' · '+state(3)+'</span></td><td>'+num(f?.support?.price)+'<span class="company">'+(Number.isFinite(f?.support?.ratio)?num(f.support.ratio*100,1)+'% 선':'미확인')+'</span></td><td>'+num(f?.resistance?.price)+'<span class="company">'+(Number.isFinite(f?.resistance?.ratio)?num(f.resistance.ratio*100,1)+'% 선':'미확인')+'</span></td><td>'+num(f?.position_pct)+'%<span class="company">'+state(4)+'</span></td></tr>';
 }).join(''):'<tr><td colspan="12" class="empty">조건에 맞는 종목이 없습니다.</td></tr>';
 $('analysis-count').textContent=targets.length+'개 표시 / 지수 2개 + 상위 20개 주식 · 행 선택으로 공통 상세 창 열기';
 document.querySelectorAll('.analysis-table th').forEach(th=>{const active=Array.from(th.querySelectorAll('[data-analysis-sort]')).some(b=>b.dataset.analysisSort===analysisSortKey);th.setAttribute('aria-sort',active?(analysisAscending?'ascending':'descending'):'none');});
}
function detailMetricTable(r,index,fallback){
 const value=(v,unit='',digits=2)=>Number.isFinite(v)?num(v,digits)+(unit?' '+esc(unit):''):'—';
 if(index===0){
  const lines=[['SMA20','단기 · 20일 단순평균',r.sma20],['SMA50','중기 · 50일 단순평균',r.sma50],['SMA200','장기 · 200일 단순평균',r.sma200],['EMA 20','20일 지수평균',r.ema20]];
  return '<table class="detail-metrics ma-metrics"><caption>이동평균 기준값 · '+esc(r.unit||'원본 단위')+'</caption><colgroup><col style="width:40%"><col style="width:30%"><col style="width:30%"></colgroup><thead><tr><th scope="col">지표 / 기간</th><th scope="col">기준값</th><th scope="col">현재가 대비<br>이격률</th></tr></thead><tbody>'+lines.map(([name,description,v])=>{const gap=Number.isFinite(r.close)&&Number.isFinite(v)&&v!==0?(r.close/v-1)*100:null;return '<tr><th scope="row"><b>'+name+'</b><small>'+description+'</small></th><td>'+value(v)+'</td><td class="'+cls(gap)+'">'+pct(gap)+'</td></tr>';}).join('')+'</tbody></table>';
 }
 const v=obvRow(r)||r;
 const rows=index===1?[['RSI 14',value(r.rsi14)]]:index===2?[['볼린저 상단',value(r.bb_upper,r.unit)],['중심 · SMA20',value(r.bb_middle,r.unit)],['볼린저 하단',value(r.bb_lower,r.unit)],['밴드 내 위치 · %B',value(r.bb_percent_b,'%')],['밴드폭',value(r.bb_width_pct,'%')]]:index===3?[['누적 OBV',value(v.obv,'',0)],['최근 20일 변화',value(v.obv_change20,'',0)],['20일 순방향 비율',value(v.obv_flow20,'%')]]:index===4?[['가까운 아래 기준선',value(r.fibonacci?.support?.price,r.unit)],['가까운 위 기준선',value(r.fibonacci?.resistance?.price,r.unit)],['60일 범위 위치',value(r.fibonacci?.position_pct,'%')]]:null;
 return rows?'<table class="detail-metrics"><colgroup><col style="width:48%"><col style="width:52%"></colgroup><tbody>'+rows.map(([label,text])=>'<tr><th scope="row">'+label+'</th><td>'+text+'</td></tr>').join('')+'</tbody></table>':'<div class="analysis-value">'+esc(fallback)+'</div>';
}
function technicalDetailHtml(r){
 const a=r.analysis,f=r.fibonacci;
 const date=t=>Number.isFinite(t)&&Number.isFinite(new Date(t*1000).getTime())?new Date(t*1000).toISOString().slice(0,10):'—';
 const fib=f&&Array.isArray(f.levels)?'<p>기준 '+(f.direction==='up'?'저점 → 고점 상승':'고점 → 저점 하락')+' · 저점 '+num(f.low)+' ('+date(f.low_time)+') / 고점 '+num(f.high)+' ('+date(f.high_time)+')</p><table class="fib-table detail-metrics"><thead><tr><th>되돌림 비율</th><th>가격</th><th>현재가와 관계</th></tr></thead><tbody>'+f.levels.map(l=>'<tr class="'+(l.price===f.support?.price||l.price===f.resistance?.price?'fib-current':'')+'"><td>'+num(l.ratio*100,1)+'%</td><td>'+num(l.price)+'</td><td>'+(l.price===f.support?.price?'가장 가까운 아래 기준선':l.price===f.resistance?.price?'가장 가까운 위 기준선':l.price<=r.close?'현재가 아래':'현재가 위')+'</td></tr>').join('')+'</tbody></table>':'';
 const macd='<section class="indicator-card"><h3>추가 지표 · MACD(12,26,9)</h3><table class="detail-metrics"><tbody><tr><td>MACD</td><td>'+num(r.macd,4)+'</td></tr><tr><td>신호선</td><td>'+num(r.macd_signal,4)+'</td></tr><tr><td>히스토그램</td><td>'+num(r.macd_histogram,4)+'</td></tr></tbody></table><p>MACD = EMA12 − EMA26, 신호선 = MACD의 EMA9. 현재 선의 관계이며 당일 교차를 뜻하지 않습니다.</p></section>';
 return '<div class="shared-analysis"><article class="analysis-head"><h3 class="analysis-verdict-title '+signalClass(a?.verdict)+'">'+signalLabel(a?.verdict||'분석 자료 부족')+'</h3><p>'+esc(a?.summary||'확장 지표가 없습니다.')+'</p></article><section class="detail-changes"><h3>이전 저장 거래일 대비 신호</h3>'+changesHtml(r)+'</section><div class="analysis-grid">'+(Array.isArray(a?.cards)?a.cards:[]).map((card,i)=>'<section class="indicator-card'+(i===0?' moving-average-card':'')+'"><h3>'+esc(card.title)+'</h3><span class="analysis-state '+signalClass(card.state)+'">'+signalLabel(card.state)+'</span>'+detailMetricTable(r,i,card.value)+'<p>'+esc(card.meaning)+'</p>'+(i===4?fib:'')+'</section>').join('')+macd+'</div></div>';
}
$('analysis-search').addEventListener('input',renderAnalysis);
document.querySelectorAll('[data-analysis-sort]').forEach(b=>b.addEventListener('click',()=>{analysisAscending=analysisSortKey===b.dataset.analysisSort?!analysisAscending:true;analysisSortKey=b.dataset.analysisSort;renderAnalysis();}));

const chartLayers={sma:true,bb:true,fib:true};
let detailRange=90;
let detailSymbol=null;
function signalMeta(value){
 const t=String(value||'');
 if(/과열|과매수/.test(t))return {icon:'⚠',label:'과열 주의',css:'signal-up'};
 if(/과매도/.test(t))return {icon:'↘',label:'과매도 참고',css:'signal-down'};
 const css=signalClass(t);
 return css==='signal-up'?{icon:'▲',label:'상승 우세',css}:css==='signal-down'?{icon:'▼',label:'하락 우세',css}:{icon:'●',label:'혼조·중립',css};
}
function signalLabel(value){const m=signalMeta(value);return '<span class="'+m.css+'" title="'+m.label+'"><span aria-hidden="true">'+m.icon+'</span> '+esc(value||'미확인')+'</span>';}
function eventHtml(event){const mapping={heat:['⚠','signal-up'],up:['▲','signal-up'],down:['▼','signal-down'],oversold:['↘','signal-down'],neutral:['●','signal-neutral']};const [icon,css]=mapping[event.kind]||mapping.neutral;return '<span class="event-chip '+css+'">'+icon+' '+esc(event.text)+'</span>';}
function changesHtml(r,compact=false){
 if(r.market_region==='ASIA')return '<span class="company">아시아 지수의 이전 저장 거래일 신호 비교는 준비 중입니다.</span>';
 if(!['^GSPC','^NDX'].includes(r.symbol)&&!(r.group==='대형주'&&r.snapshot_rank<=20))return '<span class="company">신호 비교 대상: S&P 500·나스닥100·상위 20개 주식</span>';
 const c=r.changes;if(r.status!=='ok')return '<span class="company">수집 실패 · 비교 보류</span>';if(!c?.available)return '<span class="company">비교 기준 없음 · 첫 기록</span>';
 const events=Array.isArray(c.events)?c.events:[];
 return (events.length?events.slice(0,compact?2:10).map(eventHtml).join('')+(compact&&events.length>2?'<span class="company">외 '+(events.length-2)+'개 · 상세 보기</span>':''):'<span class="company">포착된 신호 변화 없음</span>')+'<span class="company">기준 '+esc(c.baseline_day)+' → '+esc(c.current_day)+'</span>';
}
function renderBriefing(){
 const b=data.briefing;
 const index=['^GSPC','^NDX'].map(symbol=>data.rows.find(r=>r.symbol===symbol)).filter(Boolean);
 const baseline=[...new Set(data.rows.map(r=>r.changes?.baseline_day).filter(Boolean))].sort();
 const html='<section class="daily-briefing" aria-label="오늘의 시장 브리핑"><div class="brief-title"><h2>오늘의 시장 브리핑</h2><small>최근 일봉 · 장중 값 포함 가능</small></div><div class="brief-grid"><article><span class="eyebrow">01 · 지수 방향</span><p>'+index.map(r=>'<strong>'+esc(analysisName(r))+' <span class="'+cls(r.change_1d_pct)+'">'+pct(r.change_1d_pct)+'</span></strong>').join('<br>')+'</p></article><article><span class="eyebrow">02 · 상위 20개 확산</span><p>'+(b?'<span class="signal-up">▲ 상승 '+b.rising+'</span> / <span class="signal-down">▼ 하락 '+b.falling+'</span> · 유효 '+b.tracked+'개<br>정렬 ▲ '+b.uptrend+' / ▼ '+b.downtrend+' · <span class="signal-up">⚠ RSI 과열 '+b.hot+'</span> / <span class="signal-down">↘ RSI 과매도 '+b.oversold+'</span>':'브리핑 자료가 없습니다.')+'</p></article><article><span class="eyebrow">03 · 새 신호</span><p>'+(b?.compared?'<strong>'+b.compared+'개 대상 비교 · '+b.event_count+'개 변화</strong><br><small>이전 저장 거래일 '+esc(baseline.join(' / '))+' 대비</small>':b?'첫 기록을 저장합니다.<br><small>다음 거래일 데이터부터 신호 변화를 비교합니다.</small>':'이 보고서에는 비교 이력이 없습니다.')+'</p></article></div>'+(b?.events?.length?'<div class="brief-events">'+b.events.map(e=>eventHtml({...e,text:e.symbol+' · '+e.text})).join('')+'</div>':'')+'</section>';
 for(const id of ['overview-briefing','technical-briefing'])$(id).innerHTML=html;
}
function detailChart(r){
 const mobile=matchMedia('(max-width:600px)').matches;
 const h=history(r).slice(-detailRange),w=mobile?420:720,height=mobile?320:310,left=10,right=mobile?90:105,top=22,bottom=30,pw=w-left-right,ph=height-top-bottom,axisFont=mobile?12:9,labelFont=mobile?12:9;
 if(h.length<2)return '<p class="neutral">가격 이력이 없습니다.</p>';
 const keys=chartLayers.sma?['sma20','sma50','sma200']:[];
 if(chartLayers.bb)keys.push('bb_upper','bb_lower');
 const fib=chartLayers.fib&&Array.isArray(r.fibonacci?.levels)?r.fibonacci.levels:[];
 const values=h.flatMap(p=>[p.close,...keys.map(k=>p[k])]).concat(fib.map(l=>l.price)).filter(Number.isFinite);
 const min=Math.min(...values),max=Math.max(...values),pad=(max-min||max*.01||1)*.07,lo=min-pad,hi=max+pad;
 const x=i=>left+i/(h.length-1)*pw,y=v=>top+(hi-v)/(hi-lo)*ph;
 const line=key=>{let active=false;return h.map((p,i)=>{if(!Number.isFinite(p[key])){active=false;return '';}const command=active?'L':'M';active=true;return command+x(i).toFixed(2)+','+y(p[key]).toFixed(2);}).join(' ');};
 let svg='';const ticks=mobile?3:4;for(let i=0;i<=ticks;i++){const v=lo+(hi-lo)*i/ticks,yy=y(v);svg+='<line x1="'+left+'" x2="'+(w-right)+'" y1="'+yy+'" y2="'+yy+'" stroke="#e5e9ee"/><text x="'+(w-right+8)+'" y="'+(yy+3)+'" fill="#73808c" font-size="'+axisFont+'">'+num(v)+'</text>';}
 const band=h.map((p,i)=>({p,i})).filter(({p})=>Number.isFinite(p.bb_upper)&&Number.isFinite(p.bb_lower));
 if(chartLayers.bb&&band.length>1){const coords=band.map(({p,i})=>x(i)+','+y(p.bb_upper)).concat([...band].reverse().map(({p,i})=>x(i)+','+y(p.bb_lower))).join(' ');svg+='<polygon points="'+coords+'" fill="#719ac5" opacity=".12"/>';for(const k of ['bb_upper','bb_lower'])svg+='<path d="'+line(k)+'" fill="none" stroke="#719ac5" stroke-width="1" stroke-dasharray="4 3"/>';}
 const colors={sma20:'#bc6c25',sma50:'#8757b4',sma200:'#326d88'};
 if(chartLayers.sma)for(const key of ['sma20','sma50','sma200'])svg+='<path d="'+line(key)+'" fill="none" stroke="'+colors[key]+'" stroke-width="1.5"/>';
 for(const l of fib){if(!Number.isFinite(l.price))continue;const near=l.price===r.fibonacci?.support?.price||l.price===r.fibonacci?.resistance?.price;svg+='<line x1="'+x(Math.max(0,h.length-60))+'" x2="'+(w-right)+'" y1="'+y(l.price)+'" y2="'+y(l.price)+'" stroke="#8e7853" stroke-width="'+(near?1.4:.7)+'" stroke-dasharray="5 4" opacity="'+(near?.8:.35)+'"/>';if(near)svg+='<text x="'+(left+5)+'" y="'+(y(l.price)-4)+'" fill="#806744" font-size="'+labelFont+'">Fib '+num(l.ratio*100,1)+'% · '+num(l.price)+'</text>';}
 const color=h.at(-1).close>=h[0].close?'#c63d45':'#2867bd';
 svg+='<path d="'+line('close')+'" fill="none" stroke="'+color+'" stroke-width="2.1"/>';
 const last=h.at(-1);svg+='<circle cx="'+x(h.length-1)+'" cy="'+y(last.close)+'" r="3" fill="'+color+'"/><text x="'+(w-right+8)+'" y="'+(y(last.close)-7)+'" fill="'+color+'" font-size="'+(mobile?13:10)+'" font-weight="700">현재 '+num(last.close)+'</text>';
 const hasOverlay=h.some(p=>Number.isFinite(p.sma20));
 return '<div class="chart-controls" role="group" aria-label="차트 지표 표시"><label>표시 범위 <select id="detail-range" aria-label="차트 일봉 표시 범위">'+[30,60,90].map(n=>'<option value="'+n+'" '+(n===detailRange?'selected':'')+'>'+n+'개 일봉</option>').join('')+'</select></label>'+[['sma','SMA20 / 50 / 200'],['bb','볼린저 밴드'],['fib','피보나치']].map(([key,label])=>'<label><input type="checkbox" data-chart-layer="'+key+'" '+(chartLayers[key]?'checked':'')+'> '+label+'</label>').join('')+'</div><svg class="chart overlay-chart" viewBox="0 0 '+w+' '+height+'" role="img" aria-label="'+esc(r.name)+' 가격과 이동평균·볼린저·피보나치 비교 차트">'+svg+'</svg><div class="chart-legend"><span>━ 종가</span><span style="color:#bc6c25">━ SMA20</span><span style="color:#8757b4">━ SMA50</span><span style="color:#326d88">━ SMA200</span><span style="color:#719ac5">┄ 볼린저</span><span style="color:#8e7853">┄ 피보나치 60일</span></div><p class="toolbar-note">'+esc(new Date(h[0].time*1000).toISOString().slice(0,10))+' ~ '+esc(new Date(last.time*1000).toISOString().slice(0,10))+' · '+esc(r.unit)+' · 종가 기준 · 기간은 표시 범위이며 지표 계산 기간과 다릅니다.'+(!hasOverlay?' · 이전 보고서에는 차트 지표 이력이 없습니다.':'')+'</p>';
}
document.addEventListener('change',e=>{if(e.target.id==='detail-range'){const range=Number(e.target.value);if([30,60,90].includes(range)){detailRange=range;const r=findInstrument(detailSymbol);if(r)$('detail-chart').innerHTML=detailChart(r);}return;}const key=e.target.dataset?.chartLayer;if(key&&Object.hasOwn(chartLayers,key)){chartLayers[key]=e.target.checked;const r=findInstrument(detailSymbol);if(r)$('detail-chart').innerHTML=detailChart(r);}});

const sectorResize=new ResizeObserver(()=>renderSectors());
for(const id of ['sector-overview','nasdaq-overview'])sectorResize.observe($(id));
activateView('overview');
initGurus();
initThreeLow();

render();
setInterval(updateFreshness,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateFreshness();});


$('asia-market-filter').addEventListener('change',renderAsia);
initIbReports();





