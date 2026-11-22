const IB_REPORTS=__IB_REPORTS__;
function renderIbReports(){
 const bank=$('ib-bank').value,q=$('ib-search').value.trim().toLowerCase();
 $('ib-update').textContent='요약 검토일 '+IB_REPORTS.reviewed_at+' · 검토 후 수동 갱신 · 유료 API 미사용 · 새 리포트 자동 수집·번역은 아직 연결하지 않았습니다.';
 const rows=IB_REPORTS.reports.filter(r=>(bank==='all'||r.bank===bank)&&(!q||JSON.stringify(r).toLowerCase().includes(q))).sort((a,b)=>b.published_at.localeCompare(a.published_at));
 $('ib-reports').innerHTML=rows.map(r=>{const age=Math.floor((Date.now()-Date.parse(r.published_at+'T00:00:00Z'))/86400000);return '<article class="info-box ib-report"><div class="card-title">'+esc(r.bank)+'<span>'+esc(r.published_at)+'</span></div><p class="toolbar-note">'+esc(r.division)+' · '+esc(r.topics.join(' / '))+'</p><h2>'+esc(r.title)+'</h2><p class="toolbar-note">'+esc(r.original_title)+'</p>'+(age>14?'<p class="ib-age">발표 후 '+age+'일 경과 · 현재 시장 전망으로 읽지 마세요.</p>':'')+'<h3>원문 핵심 · 한국어 요약</h3><ul>'+r.summary.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><h3>원문에서 살필 위험·변수</h3><p>'+esc(r.watch)+'</p><details><summary>포트폴리오 점검에 적용 · 도구의 해석</summary><p>'+esc(r.interpretation)+'</p></details><p><a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">공식 원문 읽기</a></p></article>';}).join('')||'<p class="info-box">검색 결과가 없습니다.</p>';
}
function initIbReports(){
 document.addEventListener('input',e=>{if(e.target.id==='ib-search')renderIbReports();});
 document.addEventListener('change',e=>{if(e.target.id==='ib-bank')renderIbReports();});
}

