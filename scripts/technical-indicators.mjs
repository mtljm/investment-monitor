// Close 기반 지표. RSI: Wilder 평활, EMA: SMA 초기값, BB: 모집단 표준편차.
export function technicalIndicators(input){
  const c=input.filter(Number.isFinite),n=c.length;
  let rsi14=null,macd=null,macd_signal=null,macd_histogram=null;
  if(n>=15){
    let gain=0,loss=0;
    for(let i=1;i<=14;i++){const d=c[i]-c[i-1];gain+=Math.max(d,0);loss+=Math.max(-d,0);}
    gain/=14;loss/=14;
    for(let i=15;i<n;i++){const d=c[i]-c[i-1];gain=(gain*13+Math.max(d,0))/14;loss=(loss*13+Math.max(-d,0))/14;}
    rsi14=gain===0&&loss===0?50:loss===0?100:100-100/(1+gain/loss);
  }
  function ema(values,period){
    const out=Array(values.length).fill(null);
    if(values.length<period)return out;
    let e=values.slice(0,period).reduce((a,b)=>a+b,0)/period;out[period-1]=e;
    const k=2/(period+1);
    for(let i=period;i<values.length;i++){e=values[i]*k+e*(1-k);out[i]=e;}
    return out;
  }
  if(n>=26){
    const fast=ema(c,12),slow=ema(c,26);
    const line=c.slice(25).map((_,i)=>fast[i+25]-slow[i+25]);
    macd=line.at(-1);
    if(line.length>=9){macd_signal=ema(line,9).at(-1);macd_histogram=macd-macd_signal;}
  }
  let bb_middle=null,bb_upper=null,bb_lower=null,bb_percent_b=null,bb_width_pct=null;
  if(n>=20){
    const tail=c.slice(-20);
    bb_middle=tail.reduce((a,b)=>a+b,0)/20;
    const sd=Math.sqrt(tail.reduce((a,b)=>a+(b-bb_middle)**2,0)/20);
    bb_upper=bb_middle+2*sd;bb_lower=bb_middle-2*sd;
    if(bb_upper!==bb_lower)bb_percent_b=(c.at(-1)-bb_lower)/(bb_upper-bb_lower)*100;
    if(bb_middle!==0)bb_width_pct=(bb_upper-bb_lower)/bb_middle*100;
  }
  return {rsi14,macd,macd_signal,macd_histogram,bb_middle,bb_upper,bb_lower,bb_percent_b,bb_width_pct};
}
