const sectorWeights=__SECTOR_WEIGHTS__;
const nasdaqWeights=__NASDAQ_WEIGHTS__;
// Balanced binary treemap: every rectangle's area follows its normalized index weight.
function sectorRects(items,x,y,w,h){
 if(items.length===1)return [{item:items[0],x,y,w,h}];
 const sum=items.reduce((v,a)=>v+a[2],0);let cut=1,part=items[0][2],best=Math.abs(part-sum/2),acc=part;
 for(let i=1;i<items.length-1;i++){acc+=items[i][2];if(Math.abs(acc-sum/2)<best){best=Math.abs(acc-sum/2);cut=i+1;part=acc;}}
 const f=part/sum;
 return w>=h?[...sectorRects(items.slice(0,cut),x,y,w*f,h),...sectorRects(items.slice(cut),x+w*f,y,w*(1-f),h)]:[...sectorRects(items.slice(0,cut),x,y,w,h*f),...sectorRects(items.slice(cut),x,y+h*f,w,h*(1-f))];
}
function renderSectorMap(sectorWeights,prefix,indexLabel){
 const el=$(prefix+'-overview');if(!el)return;
 $(prefix+'-weight-date').textContent=sectorWeights.asOf;
 $(prefix+'-weight-source').href=sectorWeights.source;
 const age=Math.floor((Date.now()-Date.parse(sectorWeights.asOf+'T00:00:00Z'))/86400000);
 $(prefix+'-weight-status').textContent=age>45?' · 비중 기준일 '+age+'일 경과 · 갱신 확인 필요':'';
 const width=el.clientWidth||900,height=width<600?640:420;
 const rects=sectorRects(sectorWeights.items.filter(r=>r[2]>0),0,0,width,height);
 el.style.height=height+'px';
 el.innerHTML=rects.map(({item:[symbol,label,weight],x,y,w,h})=>{
  const r=data.rows.find(r=>r.symbol===symbol),valid=r?.status==='ok'&&!stale(r)&&Number.isFinite(r.change_1d_pct);
  const v=valid?r.change_1d_pct:null,level=valid?Math.min(1,Math.abs(v)/3):0;
  const color=!valid?'#edf0f4':v===0?'#f0f2f4':v>0?'hsl(355 62% '+(94-level*53)+'%)':'hsl(215 62% '+(94-level*53)+'%)';
  const text=valid&&level>.5?'#fff':'#24364b',change=valid?(v>0?'▲ ':v<0?'▼ ':'')+pct(v):'시세 미확인';
  const info=label+' · '+indexLabel+' 비중 '+weight.toFixed(2)+'% · '+symbol+' '+change+' · '+(r?.bar_time_utc||'').slice(0,10);
  const compact=w<110||h<80;
  const tiny=prefix==='nasdaq'&&(w<48||h<45);
  return '<button class="sector-heat-tile'+(compact?' heat-compact':'')+(tiny?' heat-tiny':'')+'" data-symbol="'+symbol+'" style="left:'+x/width*100+'%;top:'+y/height*100+'%;width:'+w/width*100+'%;height:'+h/height*100+'%;--heat:'+color+';--heat-ink:'+text+'" title="'+esc(info)+'" aria-label="'+esc(info+' 상세')+'"><strong>'+esc(label)+'</strong><span class="heat-change">'+esc(compact&&valid?pct(v):change)+'</span><small>'+weight.toFixed(2)+'%'+(compact?'':' · '+symbol)+'</small></button>';
 }).join('');
 const key=$(prefix+'-small-sectors');
 if(key)key.textContent='소형 영역 · '+rects.filter(r=>r.w<48||r.h<45).map(r=>r.item).map(([symbol,label,weight])=>{const r=data.rows.find(r=>r.symbol===symbol);return label+' '+weight.toFixed(2)+'% ('+(r?.status==='ok'&&!stale(r)&&Number.isFinite(r.change_1d_pct)?pct(r.change_1d_pct):'시세 미확인')+')';}).join(' · ');
}




function renderSectors(){
 const focused=document.activeElement?.closest('.sector-heat-tile'),symbol=focused?.dataset.symbol,map=focused?.parentElement.id;
 renderSectorMap(sectorWeights,"sector","S&P 500");renderSectorMap(nasdaqWeights,"nasdaq","나스닥 100 ICB");
 if(symbol&&map)for(const tile of $(map).querySelectorAll('.sector-heat-tile'))if(tile.dataset.symbol===symbol){tile.focus({preventScroll:true});break;}
}

