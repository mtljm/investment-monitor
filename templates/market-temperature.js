// TEMPERATURE_MODEL_START
function calculateTemperature(rows){
 const finite=Number.isFinite;
 const interpolate=(value,points)=>{
  if(value<=points[0][0])return points[0][1];
  for(let i=1;i<points.length;i++){const [x,y]=points[i],[px,py]=points[i-1];if(value<=x)return py+(y-py)*(value-px)/(x-px);}
  return points.at(-1)[1];
 };
 const find=symbol=>rows.find(r=>r.symbol===symbol&&r.status==='ok');
 const vix=find('^VIX'),spx=find('^GSPC'),ndx=find('^NDX'),btc=find('BTC-USD');
 const stocks=rows.filter(r=>r.group==='대형주'&&r.status==='ok'&&Number.isInteger(r.snapshot_rank)&&r.snapshot_rank<=20&&r.snapshot_rank>=1&&finite(r.change_1d_pct));
 const validIndex=r=>r&&['close','sma20','sma50','sma200'].every(k=>finite(r[k])&&r[k]>0);
 const missing=[];
 if(!vix||!finite(vix.close)||vix.close<=0)missing.push('VIX');
 if(!validIndex(spx))missing.push('S&P 500 추세');if(!validIndex(ndx))missing.push('나스닥100 추세');
 if(stocks.length<15)missing.push('상위 20개 표본(최소 15개)');
 if(!btc||!finite(btc.close)||!finite(btc.sma20)||btc.close<=0||btc.sma20<=0)missing.push('비트코인');
 if(missing.length)return {score:null,label:'자료 부족',missing,components:[],sample:stocks.length};
 const vixStress=interpolate(vix.close,[[12,0],[15,20],[20,40],[25,60],[30,80],[40,100]]);
 const indexStress=r=>(r.close<r.sma20?30:0)+(r.close<r.sma50?30:0)+(r.close<r.sma200?40:0);
 const down=stocks.filter(r=>r.change_1d_pct<0).length;
 const btcGap=(btc.close/btc.sma20-1)*100;
 const components=[
  {name:'VIX · 변동성',weight:45,stress:vixStress,detail:'VIX '+vix.close.toFixed(2)+' · 향후 30일 예상 변동성'},
  {name:'대표 지수 추세',weight:25,stress:(indexStress(spx)+indexStress(ndx))/2,detail:'S&P 500·나스닥100의 SMA20·50·200 아래 여부'},
  {name:'대형주 하락 확산',weight:20,stress:down/stocks.length*100,detail:stocks.length+'개 유효 표본 중 '+down+'개 하락 · 시장 전체 표본은 아님'},
  {name:'비트코인 약세',weight:10,stress:interpolate(btcGap,[[-15,100],[-10,80],[-5,60],[0,40],[5,20],[10,0]]),detail:'SMA20 대비 '+btcGap.toFixed(2)+'% · 보조 위험선호 지표'}
 ];
 const score=Math.round(components.reduce((sum,c)=>sum+c.stress*c.weight/100,0));
 const level=Math.min(4,Math.floor(score/20));
 const labels=['안정','관심','경계','불안','공포'];
 const messages=['변동성과 매도 압력이 낮은 구간입니다.','일부 지표에 긴장이 생긴 구간입니다.','추세 약화와 위험 회피를 점검할 구간입니다.','매도 확산과 변동성 부담이 겹친 구간입니다.','여러 지표의 위험 회피 압력이 강한 구간입니다.'];
 return {score,level,label:labels[level],message:messages[level],components,sample:stocks.length,missing:[]};
}
// TEMPERATURE_MODEL_END
function renderTemperature(){
 const wasOpen=$('market-temperature').querySelector('details')?.open===true;
 const now=Date.now(),health=collectionHealth(data,now);
 const current=data.rows.filter(r=>priceHealth(r,now)==='current');
 const result=calculateTemperature(current);
 const blocked=health.invalid||health.late||!health.expectedDay;
 const score=blocked?null:result.score;
 const label=blocked?'갱신 확인 필요':result.label;
 const descriptions=blocked?'수집 시각·예약 갱신·거래일을 확인한 뒤 온도를 표시합니다.':score===null?'빠졌거나 오래된 핵심 지표: '+result.missing.join(', '):result.message;
 $('market-temperature').dataset.level=score===null?'unknown':String(result.level);
 const stages=['안정','관심','경계','불안','공포'];
 const componentHtml=result.components.map(c=>'<li><div><strong>'+esc(c.name)+'</strong><span>'+num(c.stress,0)+' / 100 · 가중치 '+c.weight+'%</span></div><small>'+esc(c.detail)+'</small><div class="temperature-mini" aria-hidden="true"><span style="width:'+Math.max(0,Math.min(100,c.stress))+'%"></span></div></li>').join('');
 const rates=data.rows.find(r=>r.symbol==='^TNX'),fx=data.rows.find(r=>r.symbol==='KRW=X');
 $('market-temperature').innerHTML='<div class="temperature-top"><div><span class="eyebrow">MARKET STRESS · 자체 위험온도</span><h3>현재 시장은 <strong>'+esc(label)+'</strong></h3><p>'+esc(descriptions)+'</p></div><div class="temperature-number">'+(score===null?'—':score)+'<small>/ 100</small></div></div><div class="temperature-scale">'+(score===null?'':'<div class="temperature-pin" style="left:'+score+'%" aria-hidden="true"><span>▼</span></div>')+'<div class="temperature-track" '+(score===null?'aria-label="위험온도 산출 보류"':'role="meter" aria-label="자체 시장 위험온도 · 높을수록 위험 회피" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+score+'" aria-valuetext="'+score+'점 · '+label+'"')+'>'+stages.map((s,i)=>'<span class="temp-zone temp-zone-'+i+'"></span>').join('')+'</div><div class="temperature-labels">'+stages.map(s=>'<span>'+s+'</span>').join('')+'</div></div><div class="temperature-meta"><span>낮음: 안정 ← → 높음: 위험 회피</span><span>수집 '+esc(localTime(data.collected_at_utc))+'</span></div><p class="temperature-disclaimer">CNN 공포·탐욕 지수나 공식 VIX 점수가 아닌 자체 규칙 지표입니다. 점수는 하락 확률·예상 손실·매매 신호가 아닙니다.</p><details class="temperature-method"><summary>온도 산출 근거와 기준 보기</summary>'+(score===null?'<p>자료가 부족하거나 갱신이 늦으면 점수를 0으로 대체하지 않습니다.</p>':'<ul class="temperature-components">'+componentHtml+'</ul>')+'<p>가중치: VIX 45% + 대표 지수 추세 25% + 상위 20개 하락 비율 20% + 비트코인 SMA20 이격 10%. 유효 대형주 표본은 최소 15개가 필요합니다.</p><p>VIX 12/15/20/25/30/40을 긴장도 0/20/40/60/80/100에 선형 대응합니다. 지수는 각 SMA20·50·200 아래일 때 30·30·40점을 부여해 두 지수를 평균합니다. 비트코인 이격 −15/−10/−5/0/+5/+10%를 100/80/60/40/20/0점에 대응합니다. 범위 밖은 0~100으로 제한합니다.</p><p>표시 구간: 0~19 안정, 20~39 관심, 40~59 경계, 60~79 불안, 80~100 공포. 구간·가중치는 자체 설정이며 과거 수익률로 검증된 모형이 아닙니다. 주식 추세와 하락 확산은 서로 겹치는 신호입니다.</p><p>금리 '+num(rates?.close)+'% · 달러/원 '+num(fx?.close)+'원은 맥락 지표로만 봅니다. 금리·환율 상승을 일률적인 공포로 점수화하지 않습니다. 비트코인은 보조 지표이며 미국 주식과 다르게 거래됩니다.</p><a href="https://www.cboe.com/tradable_products/vix/faqs" target="_blank" rel="noopener">VIX 정의 · Cboe</a></details>';
 if(wasOpen)$('market-temperature').querySelector('details').open=true;
}


