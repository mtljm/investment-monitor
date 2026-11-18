const threeLowConfig=__THREE_LOW_CONFIG__;
// THREE_LOW_MODEL_START
function calculateThreeLow(input,c,{fresh=r=>r?.status==='ok',blocked=false}={}){
 const finite=Number.isFinite,rows=input.rows||[],extra=input.three_low?.rows||[],find=s=>[...rows,...extra].find(r=>r.symbol===s);
 const gap=(r,ma)=>r?.close>0&&r?.[ma]>0?(r.close/r[ma]-1)*100:null;
 const dxy=find('DX-Y.NYB'),oil=find('CL=F'),yieldRow=find('^TNX');
 const yieldHistory=(yieldRow?.history||[]).filter(p=>finite(p.close)&&finite(p.time)).sort((a,b)=>a.time-b.time);
 const yieldDelta=yieldHistory.length>=21&&finite(yieldRow.close)?Math.round((yieldRow.close-yieldHistory.at(-21).close)*1000)/10:null;
 const definitions=[['DX-Y.NYB','약달러 전환',dxy,dxy?.change_20d_pct,c.dollar_change20_max,'%'],['CL=F','저유가 전환',oil,oil?.change_20d_pct,c.oil_change20_max,'%'],['^TNX','저금리 전환',yieldRow,yieldDelta,c.yield_change20_bp_max,'bp']];
 const metrics=definitions.map(([symbol,label,row,delta,threshold,unit])=>{const g=gap(row,'sma50'),available=fresh(row)&&finite(delta)&&finite(g);return {symbol,label,row,delta,threshold,unit,gap:g,available,passed:available&&g<0&&delta<=threshold};});
 const spx=find('^GSPC'),qqq=find('QQQ'),vix=find('^VIX');
 const risk=[{label:'S&P 500 > SMA200',available:fresh(spx)&&spx.close>0&&spx.sma200>0,passed:spx?.close>spx?.sma200},
 {label:'QQQ > SMA50 · 20일 상승',available:fresh(qqq)&&qqq.close>0&&qqq.sma50>0&&finite(qqq.change_20d_pct),passed:qqq?.close>qqq?.sma50&&qqq?.change_20d_pct>0},
 {label:'VIX < '+c.vix_max,available:fresh(vix)&&vix.close>0,passed:vix?.close<c.vix_max}];
 const available=!blocked&&metrics.every(m=>m.available)&&risk.every(r=>r.available),count=metrics.filter(m=>m.passed).length,riskReady=risk.every(r=>r.available&&r.passed),environment=available&&count===3&&riskReady;
 const candidates=c.candidates.map(item=>{
  const row=rows.find(r=>r.group==='대형주'&&r.symbol===item.symbol),g=gap(row,'sma20'),relative=finite(row?.change_20d_pct)&&finite(qqq?.change_20d_pct)?row.change_20d_pct-qqq.change_20d_pct:null;
  const valid=fresh(row)&&fresh(qqq)&&[row?.close,row?.sma20,row?.sma50,row?.sma200].every(v=>v>0)&&[row?.rsi14,row?.volume_ratio,row?.obv_flow20,relative,g].every(finite);
  const checks=[{label:'SMA20·50·200 상승 정렬',passed:!!row&&row.close>row.sma20&&row.sma20>row.sma50&&row.sma50>row.sma200},
   {label:'RSI '+c.rsi_min+'~'+c.rsi_max,passed:row?.rsi14>=c.rsi_min&&row?.rsi14<=c.rsi_max},
   {label:'SMA20 이격 0~'+c.sma20_gap_max+'%',passed:finite(g)&&g>=0&&g<=c.sma20_gap_max},
   {label:'20일 QQQ 대비 우위',passed:finite(relative)&&relative>0},
   {label:'거래량 '+c.volume_ratio_min+'배 이상',passed:row?.volume_ratio>=c.volume_ratio_min},
   {label:'20일 OBV 순증',passed:row?.obv_flow20>0}];
  const score=checks.filter(r=>r.passed).length,ready=environment&&valid&&score===6;
  return {...item,row,gap:g,relative,checks,score,valid,ready,state:!valid?'자료 부족':ready?'포착':row.rsi14>c.rsi_max?'과열 주의':score===6?'기술 충족 · 환경 대기':'기술 조건 대기'};
 }).sort((a,b)=>Number(b.ready)-Number(a.ready)||Number(b.valid)-Number(a.valid)||b.score-a.score||(b.relative??-Infinity)-(a.relative??-Infinity));
 return {metrics,risk,available,count,riskReady,environment,candidates,readyCount:candidates.filter(r=>r.ready).length};
}
// THREE_LOW_MODEL_END
function renderThreeLow(){
 const health=collectionHealth(data),result=calculateThreeLow(data,threeLowConfig,{fresh:r=>r?.status==='ok'&&priceHealth(r)==='current',blocked:health.invalid||health.late});
 const title=!result.available?'자료 확인 · 판정 보류':result.count!==3?'3저 전환 조건 대기 · '+result.count+'/3':!result.riskReady?'3저 전환 충족 · 위험회피 확인':'3저 전환 충족 · 기술주 조건 점검';
 $('three-low-state').textContent=title;
 $('three-low-summary').textContent=!result.available?'누락·오래된 데이터 또는 수집 지연이 있어 포착을 보류합니다.':!result.environment?'환경 조건이 모두 충족될 때까지 포착을 보류합니다. 아래 표는 기술 조건 관찰 목록입니다.':'환경 조건 충족. 기술 조건 6개를 모두 만족하는 종목만 포착으로 표시합니다.';
 $('three-low-macros').innerHTML=result.metrics.map(m=>'<article class="info-box"><h3>'+esc(m.label)+'</h3><strong class="three-low-value">'+num(m.row?.close)+' <small>'+esc(m.row?.unit||'')+'</small></strong><p>'+(!m.available?'자료 확인 필요':m.passed?'✓ 조건 충족':'○ 조건 대기')+'</p><p>20일 변화 <b>'+ (Number.isFinite(m.delta)?(m.delta>0?'+':'')+num(m.delta)+m.unit:'—')+'</b><br>SMA50 대비 '+pct(m.gap)+'</p><small>기준: SMA50 아래 + 20일 변화 ≤ '+m.threshold+m.unit+'<br>일봉 '+esc((m.row?.bar_time_utc||'미확인').slice(0,10))+'</small></article>').join('');
 $('three-low-risk').innerHTML='<strong>위험회피 필터</strong> '+result.risk.map(r=>'<span class="event-chip '+(r.available&&r.passed?'signal-up':'signal-down')+'">'+(r.available?r.passed?'✓ ':'○ ':'? ')+esc(r.label)+'</span>').join('');
 $('three-low-rules').textContent='모두 SMA50 아래이면서 최근 20일 변화가 달러지수 '+threeLowConfig.dollar_change20_max+'% 이하, WTI 선물 '+threeLowConfig.oil_change20_max+'% 이하, 미국 10년물 '+threeLowConfig.yield_change20_bp_max+'bp 이하일 때 3저 전환으로 표시합니다.';
 $('three-low-risk-rule').textContent='위험회피 필터: S&P 500이 SMA200 위, QQQ가 SMA50 위이고 20일 상승, VIX '+threeLowConfig.vix_max+' 미만. 이 조건과 3저 조건이 모두 충족돼야 기술 조건 6/6 종목을 포착합니다.';
 $('three-low-universe').textContent='표본은 현재 수집 대형주 중 자체 선정 정보기술 '+threeLowConfig.candidates.filter(r=>r.category==='정보기술').length+'개입니다. 플랫폼 '+threeLowConfig.candidates.filter(r=>r.category==='플랫폼').length+'개를 선택해 포함할 수 있으며 GICS 정보기술 업종과 구분합니다. 밸류에이션·실적 검증은 포함하지 않습니다.';
 const scope=$('three-low-scope').value,list=result.candidates.filter(r=>scope==='all'||r.category==='정보기술');
 $('three-low-count').textContent='포착 '+list.filter(r=>r.ready).length+'개 / 표본 '+list.length+'개 · 현재 수집된 대형주 범위 내 자체 선정 표본';
 $('three-low-table-toggle').textContent='기술주 조건표 · 포착 '+list.filter(r=>r.ready).length+'개 / 표본 '+list.length+'개';
 $('three-low-rows').innerHTML=list.map(item=>{const r=item.row;return '<tr'+(r?' data-symbol="'+esc(r.symbol)+'" tabindex="0" aria-label="'+esc(r.name)+' 현재 지표 상세"':'')+'><td><b>'+esc(item.symbol)+'</b><span class="company">'+esc(r?.name||'현재 수집 범위 밖')+' · '+esc(item.category)+'</span></td><td><span class="badge '+(item.ready?'up':item.state==='과열 주의'?'signal-up':'')+'">'+esc(item.state)+'</span><span class="company">기술 '+item.score+'/6</span></td><td>'+num(r?.close)+'<span class="company">SMA20 '+pct(item.gap)+'</span></td><td>'+num(r?.rsi14)+'</td><td>'+(Number.isFinite(item.relative)?(item.relative>0?'+':'')+num(item.relative)+'%p':'—')+'</td><td>'+num(r?.volume_ratio)+'×<span class="company">OBV20 '+pct(r?.obv_flow20)+'</span></td><td class="three-low-checks">'+item.checks.map(check=>'<span class="'+(check.passed?'positive':'neutral')+'">'+(check.passed?'✓ ':'○ ')+esc(check.label)+'</span>').join('')+'</td></tr>';}).join('');
}
function initThreeLow(){document.addEventListener('change',e=>{if(e.target.id==='three-low-scope')renderThreeLow();});}
