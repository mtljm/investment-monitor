let guruSelected='';
function guruMoney(v){return dollarAmount(v);}
function gurusNotice(){
 const report=data.gurus,ms=Date.parse(report?.checked_at_utc),old=!Number.isFinite(ms)||Date.now()-ms>8*86400000,failed=report?.managers?.some(m=>m.status!=='ok');
 const notice=$('data-notice');notice.textContent='13F 확인 '+localTime(report?.checked_at_utc)+' · 주 1회 갱신 · '+(old?'최근 확인 필요':failed?'일부 수집 실패 · 기존 자료/원문 확인':'공시 자료 확인됨')+' · 보유 기준일과 제출일은 기관별로 다릅니다.';
 notice.parentElement.setAttribute('role',old||failed?'alert':'status');notice.parentElement.classList.toggle('collection-warning',!!(old||failed));
}
function renderGurus(){
 const managers=data.gurus?.managers||[],available=managers.filter(m=>m.holdings?.length);
 if(!managers.some(m=>m.id===guruSelected))guruSelected=available[0]?.id||managers[0]?.id||'';
 $('guru-managers').innerHTML=managers.length?managers.map(m=>'<button class="guru-manager '+(m.id===guruSelected?'selected':'')+'" data-guru="'+esc(m.id)+'" aria-pressed="'+(m.id===guruSelected)+'"><strong>'+esc(m.name)+'</strong><small>'+esc(m.reference)+'</small><span>'+esc(m.report_date||'공시 확인 필요')+' · '+guruMoney(m.total_usd)+'</span><small>'+(m.status==='ok'?'공시 수집됨':m.status==='stale'?'수집 실패 · 기존 자료 유지':'공시 수집 실패 · 원문 확인')+'</small></button>').join(''):'<p class="toolbar-note">13F 자료 수집 전입니다. 다음 자동 갱신 또는 수동 13F 업데이트 후 표시됩니다.</p>';
 const manager=managers.find(m=>m.id===guruSelected);$('guru-detail').hidden=!manager;
 if(!manager)return;
 $('guru-name').textContent=manager.name;
 $('guru-meta').textContent='보유 기준 '+(manager.report_date||'미확인')+' · 제출 '+(manager.filed_date||'미확인')+' · 공개 주식형 보유 '+guruMoney(manager.total_usd)+' · '+(manager.holdings?.length||0)+'개 종목';
 $('guru-sec').hidden=!manager.sec_url;if(manager.sec_url)$('guru-sec').href=manager.sec_url;
 $('guru-source').hidden=!manager.source_url;if(manager.source_url)$('guru-source').href=manager.source_url;
 const q=$('guru-search').value.trim().toLowerCase(),limit=Number($('guru-limit').value);
 const holdings=(manager.holdings||[]).filter(h=>!q||(h.symbol+' '+h.name+' '+h.cusip).toLowerCase().includes(q));
 const labels={new:'신규 공시',increase:'주식수 증가',decrease:'주식수 감소',same:'동일'};
 $('guru-rows').innerHTML=holdings.slice(0,limit||1000).map((h,i)=>{
  const quote=data.rows.some(r=>r.symbol===h.symbol),color=h.change==='increase'||h.change==='new'?'positive':h.change==='decrease'?'negative':'neutral';
  return '<tr><td>'+String(manager.holdings.indexOf(h)+1)+'</td><td>'+(quote?'<button class="guru-symbol" data-symbol="'+esc(h.symbol)+'" title="현재 시세·기술지표 상세">'+esc(h.symbol)+'</button>':'<strong>'+esc(h.symbol||h.cusip)+'</strong>')+'<span class="company">'+esc(h.name)+'</span><span class="company">'+esc(h.class)+' · '+esc(h.cusip)+'</span></td><td><strong>'+num(h.weight_pct)+'%</strong><div class="guru-weight"><i style="width:'+Math.min(100,h.weight_pct||0)+'%"></i></div></td><td>'+guruMoney(h.value_usd)+'</td><td>'+num(h.shares,0)+'</td><td class="'+color+'">'+(labels[h.change]||'비교 보류')+'<span class="company">'+(Number.isFinite(h.change_pct)?pct(h.change_pct):'—')+'</span></td></tr>';
 }).join('')||'<tr><td colspan="6" class="empty">'+(manager.status==='error'?'수집 실패 · 공시 원문을 확인하세요.':'검색 결과가 없습니다.')+'</td></tr>';
 $('guru-count').textContent='표시 '+Math.min(holdings.length,limit||1000)+' / '+holdings.length+'개 · 금액 단위: 억 달러';
 $('guru-comparison').textContent=manager.comparison?'주식수 비교 기준 '+manager.prior_date+' → '+manager.report_date+' · 분할·합병·식별번호 변경을 포함할 수 있어 실제 매수·매도량과 다릅니다.':'직전 분기 비교 보류 · 추가/정정 공시가 있거나 비교 자료가 부족하면 변화를 계산하지 않습니다.';
 $('guru-exited').textContent=manager.comparison?'이전 공시에서만 확인된 종목: '+((manager.exited||[]).map(h=>h.symbol||h.name).join(', ')||'없음')+' · 종목 식별 변경 가능, 전량 매도로 해석하지 마세요.':'';
}
function initGurus(){
 document.addEventListener('click',e=>{const button=e.target.closest('[data-guru]');if(button){guruSelected=button.dataset.guru;renderGurus();}});
 document.addEventListener('input',e=>{if(e.target.id==='guru-search')renderGurus();});
 document.addEventListener('change',e=>{if(e.target.id==='guru-limit')renderGurus();});
}
