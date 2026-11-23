// Compute full-window overlays before trimming to the 90 visible bars.
export function indicatorHistory(input){
 const bars=input.filter(b=>Number.isFinite(b.close)&&Number.isFinite(b.time)).sort((a,b)=>a.time-b.time);
 const prefix=[0],squares=[0];
 for(const b of bars){prefix.push(prefix.at(-1)+b.close);squares.push(squares.at(-1)+b.close*b.close);}
 const mean=(i,p)=>i+1>=p?(prefix[i+1]-prefix[i+1-p])/p:null;
 return bars.map((b,i)=>{
  const sma20=mean(i,20),sma50=mean(i,50),sma200=mean(i,200);
  const sd=sma20===null?null:Math.sqrt(Math.max(0,(squares[i+1]-squares[i+1-20])/20-sma20*sma20));
  return {time:b.time,close:b.close,high:b.high,low:b.low,volume:b.volume,sma20,sma50,sma200,bb_middle:sma20,bb_upper:sd===null?null:sma20+2*sd,bb_lower:sd===null?null:sma20-2*sd};
 }).slice(-90);
}
