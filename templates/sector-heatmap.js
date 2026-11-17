const sectorWeights={asOf:'2026-11-13',source:'https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-sp-500-etf-trust-spy',items:[
 ['XLK','정보기술',35.68],['XLF','금융',12.65],['XLV','헬스케어',10.48],['XLY','경기소비재',9.53],['XLC','통신서비스',8.94],['XLI','산업재',8.22],['XLP','필수소비재',5.17],['XLE','에너지',3.62],['XLU','유틸리티',2.12],['XLRE','부동산',1.85],['XLB','소재',1.74]
]};
// Balanced binary treemap: every rectangle's area follows its normalized index weight.
function sectorRects(items,x,y,w,h){
 if(items.length===1)return [{item:items[0],x,y,w,h}];
 const sum=items.reduce((v,a)=>v+a[2],0);let cut=1,part=items[0][2],best=Math.abs(part-sum/2),acc=part;
 for(let i=1;i<items.length-1;i++){acc+=items[i][2];if(Math.abs(acc-sum/2)<best){best=Math.abs(acc-sum/2);cut=i+1;part=acc;}}
 const f=part/sum;
 return w>=h?[...sectorRects(items.slice(0,cut),x,y,w*f,h),...sectorRects(items.slice(cut),x+w*f,y,w*(1-f),h)]:[...sectorRects(items.slice(0,cut),x,y,w,h*f),...sectorRects(items.slice(cut),x,y+h*f,w,h*(1-f))];
}
function renderSectors(){
 const el=$('sector-overview');if(!el)return;
 const width=el.clientWidth||900,height=width<600?640:420;
 const rects=sectorRects(sectorWeights.items,0,0,width,height);
 el.style.height=height+'px';
 el.innerHTML=rects.map(({item:[symbol,label,weight],x,y,w,h})=>{
  const r=data.rows.find(r=>r.symbol===symbol),valid=r?.status==='ok'&&!stale(r)&&Number.isFinite(r.change_1d_pct);
  const v=valid?r.change_1d_pct:null,level=valid?Math.min(1,Math.abs(v)/3):0;
  const color=!valid?'#edf0f4':v===0?'#f0f2f4':v>0?'hsl(355 62% '+(94-level*53)+'%)':'hsl(215 62% '+(94-level*53)+'%)';
  const text=valid&&level>.5?'#fff':'#24364b',change=valid?(v>0?'▲ ':v<0?'▼ ':'')+pct(v):'시세 미확인';
  const info=label+' · S&P 500 비중 '+weight.toFixed(2)+'% · '+symbol+' '+change+' · '+(r?.bar_time_utc||'').slice(0,10);
  const compact=w<110||h<80;
  return '<button class="sector-heat-tile'+(compact?' heat-compact':'')+'" data-symbol="'+symbol+'" style="left:'+x/width*100+'%;top:'+y/height*100+'%;width:'+w/width*100+'%;height:'+h/height*100+'%;--heat:'+color+';--heat-ink:'+text+'" title="'+esc(info)+'" aria-label="'+esc(info+' 상세')+'"><strong>'+label+'</strong><span class="heat-change">'+esc(compact&&valid?pct(v):change)+'</span><small>'+weight.toFixed(2)+'%'+(compact?'':' · '+symbol)+'</small></button>';
 }).join('');
}



