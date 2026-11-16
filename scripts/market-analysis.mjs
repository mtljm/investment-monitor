const finite=Number.isFinite;
const fmt=(v,d=2)=>finite(v)?v.toFixed(d):'—';
export function priceVolumeIndicators(input){
 const bars=input.filter(b=>finite(b.close)&&finite(b.time)).sort((a,b)=>a.time-b.time);
 const c=bars.map(b=>b.close),n=c.length;
 let ema20=null;
 if(n>=20){ema20=c.slice(0,20).reduce((a,b)=>a+b,0)/20;for(const v of c.slice(20))ema20=v*2/21+ema20*19/21;}
 let obv=null,obv_change20=null,obv_flow20=null;
 if(n>=21&&bars.every(b=>finite(b.volume)&&b.volume>=0)&&bars.slice(-20).some(b=>b.volume>0)){
  const values=[0];for(let i=1;i<n;i++)values.push(values.at(-1)+Math.sign(c[i]-c[i-1])*bars[i].volume);
  obv=values.at(-1);obv_change20=obv-values[n-21];
  const volume=bars.slice(-20).reduce((s,b)=>s+b.volume,0);obv_flow20=volume>0?obv_change20/volume*100:null;
 }
 const tail=bars.slice(-60);let fibonacci=null;
 if(tail.length===60&&tail.every(b=>finite(b.high)&&finite(b.low)&&b.high>=b.low&&b.close>=b.low&&b.close<=b.high)){
  const high=Math.max(...tail.map(b=>b.high)),low=Math.min(...tail.map(b=>b.low));
  const hi=tail.findLastIndex(b=>b.high===high),li=tail.findLastIndex(b=>b.low===low);
  if(high>low&&hi!==li){
   const direction=hi>li?'up':'down';const range=high-low;
   const levels=[0,.236,.382,.5,.618,.786,1].map(r=>({ratio:r,price:direction==='up'?high-range*r:low+range*r})).sort((a,b)=>a.price-b.price);
   const close=c.at(-1),support=levels.filter(l=>l.price<=close).at(-1)||null,resistance=levels.find(l=>l.price>close)||null;
   fibonacci={lookback:60,direction,high,low,high_time:tail[hi].time,low_time:tail[li].time,levels,support,resistance,position_pct:(close-low)/range*100};
  }
 }
 return {ema20,obv,obv_change20,obv_flow20,fibonacci};
}
export function assessTechnical(row,proxy=null){
 if(row.status!=='ok'||!finite(row.close))return {verdict:'분석 보류',summary:'수집 실패로 기술적 상태를 평가할 수 없습니다.',cards:[]};
 const r=row,c=r.close,full=[r.sma20,r.sma50,r.sma200].every(finite);
 const up=full&&c>r.sma20&&r.sma20>r.sma50&&r.sma50>r.sma200;
 const down=full&&c<r.sma20&&r.sma20<r.sma50&&r.sma50<r.sma200;
 const trend=!full?'이력 부족':up?'상승 정렬':down?'하락 정렬':c>r.sma200?'장기 평균 위 · 혼조':'장기 평균 아래 · 혼조';
 const rsi=finite(r.rsi14)?r.rsi14:null;
 const momentum=rsi===null?'이력 부족':rsi>=70?'과열 참고':rsi<=30?'과매도 참고':rsi>=50?'상승 우위':'하락 우위';
 const bb=finite(r.bb_percent_b)?r.bb_percent_b:null;
 const band=bb===null?'판단 불가':bb>100?'상단 밖':bb<0?'하단 밖':bb>=80?'상단 부근':bb<=20?'하단 부근':'밴드 내부';
 const v=proxy||r,volumeOK=v.status==='ok'&&finite(v.obv_flow20);
 const volume=volumeOK?v.obv_flow20>0?'20일 OBV 순증':v.obv_flow20<0?'20일 OBV 순감':'20일 OBV 보합':'거래량 부족';
 const f=r.fibonacci;
 const zone=f?f.support&&f.resistance?'두 기준선 사이':!f.resistance?'상단 기준선 도달·돌파':'하단 기준선 이탈':'산출 불가';
 let verdict=!full||rsi===null||bb===null?'분석 자료 부족':down?'하락 추세 · 방어 관찰':up?'상승 추세 · 추세 관찰':'방향 혼조 · 확인 대기';
 if(full&&rsi!==null&&bb!==null&&(rsi>=70||bb>100))verdict='과열 주의 · 추격 신중';
 else if(full&&rsi!==null&&bb!==null&&(rsi<=30||bb<0))verdict='약세·과매도 · 반전 확인';
 const gap=finite(r.sma20)&&r.sma20!==0?(c/r.sma20-1)*100:null;
 const notes=[trend+'이며 RSI는 '+momentum+' 구간입니다.',
  rsi!==null&&rsi>=70?'강한 추세에서도 과열 상태가 이어질 수 있어 즉시 매도 신호로 해석하지 않습니다.':rsi!==null&&rsi<=30?'과매도만으로 저평가나 반등을 단정할 수 없습니다.':'이동평균과 지지·저항의 유지 여부를 함께 확인하세요.'];
 notes.push('볼린저는 '+band+' 상태입니다.');
 if(f)notes.push('피보나치 기준 '+zone+'이며, 아래 '+fmt(f.support?.price)+' / 위 '+fmt(f.resistance?.price)+'를 잠재 지지·저항으로 관찰합니다.');
 if(!volumeOK||!f)notes.push('거래량 또는 피보나치 자료가 부족해 해석에 제한이 있습니다.');
 if(volumeOK)notes.push((proxy?proxy.symbol+' 대용 OBV 기준, ':'')+(up&&v.obv_flow20<0?'가격 상승 정렬과 거래량 흐름이 엇갈립니다.':down&&v.obv_flow20>0?'가격 하락 정렬과 거래량 흐름이 엇갈립니다.':'거래량 흐름은 '+volume+' 상태입니다.'));
 return {verdict,summary:notes.join(' '),cards:[
  {title:'1. 추세 · MA / SMA',state:trend,value:'SMA20 '+fmt(r.sma20)+' / 50 '+fmt(r.sma50)+' / 200 '+fmt(r.sma200)+' · EMA20 '+fmt(r.ema20),meaning:'MA는 이동평균의 통칭, SMA는 단순평균입니다. 종가·20·50·200일 평균 순서를 비교합니다. 현재가의 SMA20 이격 '+fmt(gap)+'%. 당일 교차 발생을 뜻하지 않습니다.'},
  {title:'2. 모멘텀 · RSI(14)',state:momentum,value:fmt(rsi),meaning:'Wilder RSI. 70 이상 과매수·30 이하 과매도 참고, 50은 상승·하락 강도의 경계입니다.'},
  {title:'3. 변동성 · 볼린저 밴드',state:band,value:'하단 '+fmt(r.bb_lower)+' / 중심 '+fmt(r.bb_middle)+' / 상단 '+fmt(r.bb_upper)+' · %B '+fmt(bb)+'% · 폭 '+fmt(r.bb_width_pct)+'%',meaning:'20일 SMA ± 2표준편차. %B 하단 0·상단 100, 20/80은 이 도구의 근접 구간 기준입니다. 폭은 상대 변동 범위이며 향후 방향을 예측하지 않습니다.'},
  {title:'4. 거래량 · OBV',state:volume,value:volumeOK?'누적 '+fmt(v.obv,0)+' · 20일 변화 '+fmt(v.obv_change20,0)+' · 순방향 비율 '+fmt(v.obv_flow20)+'%':'—',meaning:(proxy?'지수 자체 대신 '+proxy.symbol+' ETF 거래량 대용. ':'')+'상승일 거래량은 더하고 하락일은 뺍니다. 누적값은 수집 이력의 첫 봉 0에서 시작합니다. 20일 순방향 비율 = OBV 변화 ÷ 20일 총거래량. 종목 간 누적값 크기를 비교하지 않습니다.'},
  {title:'5. 피보나치 · 현재 구간',state:zone,value:f?'아래 기준선 '+fmt(f.support?.price)+' / 위 기준선 '+fmt(f.resistance?.price)+' · 60일 범위 위치 '+fmt(f.position_pct)+'%':'—',meaning:'최근 60개 유효 일봉 고가·저가 극값의 시간 순서로 상승/하락 기준을 정합니다. 최근 고점 이후 새 하락·저점 이후 새 상승이 반영될 수 있어 확정된 스윙이 아닙니다. 아래·위 기준선은 잠재 지지·저항이며 돌파 여부를 보장하지 않습니다. 동일 봉 극값·이력 부족·평탄 구간은 산출하지 않습니다.'}
 ]};
}
