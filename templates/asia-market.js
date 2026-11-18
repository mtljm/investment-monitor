// Asia remains a separate snapshot; US market statistics only use data.rows.
function findInstrument(symbol){return data.rows.find(r=>r.symbol===symbol)||(data.asia?.rows||[]).find(r=>r.symbol===symbol);}
function asiaNotice(){
 const a=data.asia,rows=a?.rows||[],failed=rows.filter(r=>r.status!=='ok').length,health=asiaCollectionHealth(a);
 const state=health.invalid?'수집 시각 확인 필요':health.late?'자동 갱신 지연 · 예정 시각 이후 새 수집이 없습니다.':health.pending?'예약 갱신 대기 중':'수집 일정 확인됨';
 const notice=$('data-notice');notice.textContent=a?'아시아 수집 '+localTime(a.collected_at_utc)+' · '+state+' · 평일 17:30 KST 갱신 목표 · '+rows.filter(r=>r.status==='ok').length+'/'+rows.length+'개 성공 · 각 시장 거래일·시세 시각을 확인하세요.':'아시아 데이터가 아직 수집되지 않았습니다.';
 const warning=failed>0||!rows.length||health.invalid||health.late;
 notice.parentElement.setAttribute('role',warning?'alert':'status');notice.parentElement.classList.toggle('collection-warning',warning);
}
function renderAsia(){
 const all=data.asia?.rows||[],filter=$('asia-market-filter').value;
 const rows=all.filter(r=>filter==='all'||r.market===filter);
 $('asia-status').textContent=all.length?'수집 '+localTime(data.asia.collected_at_utc)+' · 성공 '+all.filter(r=>r.status==='ok').length+'/'+all.length+' · 지역별 정밀 휴장일 판정은 아직 지원하지 않습니다.':'아시아 데이터 수집 전입니다. 기존 미국장 자료에는 영향이 없습니다.';
 $('asia-indices').innerHTML=rows.length?rows.map(r=>'<article class="index-card asia-card" data-symbol="'+esc(r.symbol)+'" role="button" tabindex="0" aria-label="'+esc(r.market+' '+r.name)+' 상세"><div class="card-title">'+esc(r.market)+'<span>'+esc(r.symbol)+'</span></div><h3>'+esc(r.name)+'</h3><div class="value">'+num(r.close)+' <small>pt</small></div><div class="change '+cls(r.change_1d_pct)+'">'+pct(r.change_1d_pct)+' <span class="neutral">직전 일봉 대비</span></div>'+chart(r)+'<div class="asia-metrics"><span>5일 <b class="'+cls(r.change_5d_pct)+'">'+pct(r.change_5d_pct)+'</b></span><span>20일 <b class="'+cls(r.change_20d_pct)+'">'+pct(r.change_20d_pct)+'</b></span><span>RSI 14 <b>'+num(r.rsi14)+'</b></span><span>SMA 20 이격 <b class="'+cls(gap(r))+'">'+pct(gap(r))+'</b></span></div><div class="stamp">일봉 '+esc(r.bar_time_utc?r.bar_time_utc.slice(0,10):'미확인')+' · '+badge(r)+'<br>시세 '+esc(localTime(r.quote_time_utc))+'<br>거래소 '+esc(r.exchange_timezone||'미확인')+'</div></article>').join(''):'<p class="neutral">표시할 지수가 없습니다.</p>';
}

