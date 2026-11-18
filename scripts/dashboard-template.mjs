import {readFile} from 'node:fs/promises';
const templates=new URL('../templates/',import.meta.url);
function validateWeights(input,now,allowZero=false){
 const symbols=new Set(['XLK','XLF','XLV','XLY','XLC','XLI','XLP','XLE','XLU','XLRE','XLB']);
 const timestamp=Date.parse(input?.asOf+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input?.asOf||'')||!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==input.asOf||timestamp>now)throw Error('섹터 비중 기준일 오류');
 const url=new URL(input.source);
 if(url.protocol!=='https:'||(allowZero?url.href!=='https://indexes.nasdaq.com/docs/FS_NDX.pdf':url.hostname!=='www.ssga.com'))throw Error('섹터 비중 출처 오류');
 if(!Array.isArray(input.items)||input.items.length!==11)throw Error('섹터 비중은 11개가 필요합니다.');
 const items=input.items.map(row=>{
  if(!Array.isArray(row)||row.length!==3)throw Error('섹터 비중 형식 오류');
  const [symbol,label,weight]=row;
  if(!symbols.delete(symbol)||typeof label!=='string'||!label.trim()||label.length>20||!Number.isFinite(weight)||(allowZero?weight<0:weight<=0)||weight>100)throw Error('섹터 비중 항목 오류');
  return [symbol,label,weight];
 });
 const sum=items.reduce((n,row)=>n+row[2],0);
 if(Math.abs(sum-100)>.15)throw Error('섹터 비중 합계는 100%여야 합니다.');
 return {asOf:input.asOf,source:url.href,items:items.sort((a,b)=>b[2]-a[2])};
}
export function validateSectorWeights(input,now=Date.now()){return validateWeights(input,now);}
export function validateNasdaqWeights(input,now=Date.now()){return validateWeights(input,now,true);}
// Source files stay separate; all delivery formats remain self-contained HTML.
export async function readDashboardTemplate(){
 const [html,css,...scripts]=await Promise.all(['dashboard.html','dashboard.css','dashboard-safety.js','market-temperature.js','sector-heatmap.js','asia-market.js','dashboard.js'].map(p=>readFile(new URL(p,templates),'utf8')));
 const weights=validateSectorWeights(JSON.parse(await readFile(new URL('../config/sector-weights.json',import.meta.url),'utf8')));
 const json=JSON.stringify(weights).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const nasdaq=validateNasdaqWeights(JSON.parse(await readFile(new URL('../config/nasdaq-sector-weights.json',import.meta.url),'utf8')));
 const nasdaqJson=JSON.stringify(nasdaq).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const js=scripts.join('\n').replace('__SECTOR_WEIGHTS__',()=>json).replace('__NASDAQ_WEIGHTS__',()=>nasdaqJson);
 if(!html.includes('__DASHBOARD_CSS__')||!html.includes('__DASHBOARD_JS__'))throw new Error('대시보드 소스 삽입 위치가 없습니다.');
 if(/<\/style/i.test(css)||/<\/script/i.test(js))throw new Error('대시보드 소스에 닫기 태그를 사용할 수 없습니다.');
 return html.replace('__DASHBOARD_CSS__',()=>css).replace('__DASHBOARD_JS__',()=>js);
}
