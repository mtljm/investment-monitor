function renderOverviewPulse(){
 const el=$('overview-pulse');if(!el)return;
 const health=collectionHealth(data),ready=!health.invalid&&!health.late&&health.expectedDay;
 const breadth=data.market_breadth,last=breadth?.history?.at(-1),leaders=data.leaders;
 const breadthReady=ready&&breadth?.status==='ok'&&last?.day===health.expectedDay;
 const leadersReady=ready&&leaders?.day===health.expectedDay;
 const cards=[['시장 폭',breadthReady?'집계 확인':'확인 필요',last?.day?'NYSE · NASDAQ · '+last.day:'거래소 집계 없음'],['주도주 후보',leadersReady?(leaders.candidates||[]).length+'개':'기준일 확인','유효 '+(leaders?.valid??0)+' / '+(leaders?.expected??0)+'개 · '+(leaders?.day||'자료 없음')],['수집 구성',displayRows().length+'개',collectionSummary()]];
 el.innerHTML=cards.map(([label,value,note])=>'<article class="pulse-card"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><span>'+esc(note)+'</span></article>').join('');
}
function initOverviewLayout(){
 const sections=[...document.querySelectorAll('.overview-section')],button=$('overview-expand');
 function sync(){const all=sections.every(el=>el.open);button.textContent=all?'상세 모두 접기':'상세 모두 펼치기';button.setAttribute('aria-expanded',String(all));}
 button.addEventListener('click',()=>{const open=!sections.every(el=>el.open);sections.forEach(el=>el.open=open);sync();});
 sections.forEach(el=>el.addEventListener('toggle',()=>{sync();if(el.open)requestAnimationFrame(renderSectors);}));
 document.querySelectorAll('[data-overview-jump]').forEach(button=>button.addEventListener('click',()=>{const target=$(button.dataset.overviewJump);if(target.tagName==='DETAILS')target.open=true;requestAnimationFrame(()=>{target.scrollIntoView({block:'start'});if(target.tagName==='DETAILS')target.querySelector('summary').focus({preventScroll:true});});}));
 $('heatmap-index').addEventListener('change',e=>{$('heatmap-sp').hidden=e.target.value!=='sp';$('heatmap-ndx').hidden=e.target.value!=='ndx';requestAnimationFrame(renderSectors);});
 sync();
}
