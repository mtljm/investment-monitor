import {publicGurusData} from './gurus.mjs';
import {readAsiaReport} from './collect-asia.mjs';
import {readDashboardTemplate} from './dashboard-template.mjs';
import {dashboardContext} from './dashboard-context.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const allowed=['market','market_region','group','symbol','name','unit','snapshot_rank','status','bar_time_utc','quote_time_utc',
 'high_52w','high_52w_time_utc','drawdown_52w_pct','high_52w_complete','close','previous_close','change','change_1d_pct','change_5d_pct','change_20d_pct',
 'dollar_volume','ranking_dollar_volume','volume','ranking_volume','volume_day','concept','concept_name','description','selection_rank','ema20','obv','obv_change20','obv_flow20','sma20','sma50','sma200','rsi14','macd','macd_signal','macd_histogram',
 'bb_middle','bb_upper','bb_lower','bb_percent_b','bb_width_pct','volume_ratio','exchange_timezone','stale_calendar_days'];
export function publicData(input){
 if(!Array.isArray(input.rows)||input.rows.length>223)throw new Error('시장 보고서 형식을 확인하세요.');
 return {
  collected_at_utc:input.collected_at_utc,collected_at_kst:input.collected_at_kst,
  universe_date:input.universe_date,
  ...(input.etf_watch?{etf_watch:publicEtfWatch(input.etf_watch)}:{}),
  ...(input.three_low?{three_low:publicThreeLow(input.three_low)}:{}),
  ...(input.gurus?{gurus:publicGurusData(input.gurus)}:{}),
  ...(input.asia?{asia:publicAsiaData(input.asia)}:{}),
  ...(input.briefing?{briefing:{...Object.fromEntries(['tracked','rising','falling','uptrend','downtrend','hot','oversold','compared','event_count'].map(k=>[k,Number.isFinite(input.briefing[k])?input.briefing[k]:0])),events:(input.briefing.events||[]).slice(0,8).map(e=>({symbol:String(e.symbol),kind:String(e.kind),text:String(e.text)}))}}:{}),
  rows:input.rows.map(row=>{
   if(!['지수','시장지표','대형주','지수 ETF','섹터 ETF','거래량 ETF'].includes(row.group))throw new Error('시장 데이터 외 그룹은 공개할 수 없습니다.');
   const safe={};
   for(const key of allowed)if(row[key]!==undefined)safe[key]=row[key];
   if(row.analysis){
    const a=row.analysis;
    const text=v=>typeof v==='string'?v.slice(0,3000):'';
    safe.analysis={verdict:text(a.verdict),summary:text(a.summary),cards:(Array.isArray(a.cards)?a.cards:[]).slice(0,5).map(c=>Object.fromEntries(['title','state','value','meaning'].map(k=>[k,text(c[k])])))};
   }
   if(row.fibonacci){
    const f=row.fibonacci,pick=l=>l?{ratio:Number.isFinite(l.ratio)?l.ratio:null,price:Number.isFinite(l.price)?l.price:null}:null;
    safe.fibonacci={direction:f.direction==='up'?'up':'down',lookback:60,levels:(Array.isArray(f.levels)?f.levels:[]).slice(0,7).map(pick),support:pick(f.support),resistance:pick(f.resistance)};
    for(const k of ['high','low','high_time','low_time','position_pct'])safe.fibonacci[k]=Number.isFinite(f[k])?f[k]:null;
   }
   if(row.changes)safe.changes={available:row.changes.available===true,baseline_day:row.changes.baseline_day,current_day:row.changes.current_day,events:(row.changes.events||[]).slice(0,10).map(e=>({kind:String(e.kind),text:String(e.text)}))};
   safe.history=(row.history||[]).slice(-90).map(p=>Object.fromEntries(['time','close','sma20','sma50','sma200','bb_middle','bb_upper','bb_lower'].filter(k=>p[k]!==undefined).map(k=>[k,Number.isFinite(p[k])?p[k]:null])));
   if(row.status!=='ok')safe.error='수집 실패';
   return safe;
  })
 };
}
export function publicEtfWatch(input){
 if(!Array.isArray(input?.rows)||input.rows.length>5||input.rows.some(r=>r.group!=='거래량 ETF')||new Set(input.rows.map(r=>r.symbol)).size!==input.rows.length||new Set(input.rows.map(r=>r.concept)).size!==input.rows.length)throw Error('거래량 ETF 공개 형식 오류');
 return {ranking_method:input.ranking_method,checked_at_utc:input.checked_at_utc,status:['ok','stale','error'].includes(input.status)?input.status:'error',candidate_count:input.candidate_count,valid_count:input.valid_count,volume_day:input.volume_day,rows:publicData({rows:input.rows}).rows};
}
export function publicThreeLow(input){
 if(!Number.isFinite(Date.parse(input?.collected_at_utc))||!Array.isArray(input?.rows)||input.rows.length!==2||new Set(input.rows.map(r=>r.symbol)).size!==2||input.rows.some(r=>!['DX-Y.NYB','CL=F'].includes(r.symbol)||r.group!=='시장지표'))throw Error('3저 공개 지표 형식 오류');
 return {collected_at_utc:input.collected_at_utc,rows:publicData({rows:input.rows}).rows};
}
export function publicAsiaData(input){
 if(!Array.isArray(input?.rows)||input.rows.length>12||!Number.isFinite(Date.parse(input.collected_at_utc)))throw Error('아시아 보고서 형식 오류');
 const symbols=new Set();
 for(const r of input.rows){if(r.group!=='지수'||r.market_region!=='ASIA'||typeof r.symbol!=='string'||symbols.has(r.symbol)||typeof r.market!=='string')throw Error('아시아 지수 형식 오류');symbols.add(r.symbol);}
 return publicData({rows:input.rows,collected_at_utc:input.collected_at_utc,collected_at_kst:input.collected_at_kst});
}
export function publicHtml(template,input){
 const data=publicData(input);
 const cleaned=template.replace(/<div class="side-note">[\s\S]*?<\/div><\/aside>/,'</aside>')
  .replaceAll('PERSONAL MARKET DESK','GLOBAL MARKET OVERVIEW')
  .replaceAll('수동 수집 · 일봉 기준','수집 데이터 · 일봉 기준')
  .replaceAll('스크립트 수동 실행','미국 매일 오전 7시 37분 목표 · 아시아 평일 오후 5시 30분 목표 · Actions')
  .replaceAll('수집 스크립트 실행 또는 새 JSON 불러오기가 필요합니다.','매일 오전 자동 갱신됩니다. 수동 갱신은 GitHub Actions의 Pages 시장 대시보드에서 실행하세요.')
  .replaceAll('새 JSON 불러오기가 필요합니다.','자동 갱신 시각 또는 GitHub Actions 실행 결과를 확인하세요.');
 if(cleaned.includes('80% 장기')||cleaned.includes('보유 자산은 추후'))throw new Error('개인 운용 안내가 남아 있습니다.');
 const json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 if(!cleaned.includes('__MONITOR_DATA__'))throw new Error('화면 템플릿의 데이터 위치가 없습니다.');
 return cleaned.replace('__MONITOR_DATA__',()=>json);
}
export async function writePublicSite(template,data,history,output=resolve(root,'public-site')){
 await mkdir(output,{recursive:true});
 await writeFile(resolve(output,'index.html'),publicHtml(template,data));
 await writeFile(resolve(output,'.nojekyll'),'');
 await writeFile(resolve(output,'history.json'),JSON.stringify(history));
 await writeFile(resolve(output,'latest.json'),JSON.stringify({version:1,data:publicData(data),history}));
}
export async function main(){
 const input=JSON.parse(await readFile(resolve(root,'reports/latest.json'),'utf8'));
 const template=await readDashboardTemplate();
 let previous={version:1,days:[]};
 if(process.env.PAGES_HISTORY_URL){
  const url=new URL(process.env.PAGES_HISTORY_URL);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.github.io'))throw new Error('Pages 이력 주소를 확인하세요.');
  url.searchParams.set('run',process.env.GITHUB_RUN_ID||Date.now().toString());
  const response=await fetch(url,{signal:AbortSignal.timeout(20000),cache:'no-store'});
  if(response.status!==404){
   if(!response.ok)throw new Error('이전 비교 이력을 불러오지 못해 배포를 중단합니다. HTTP '+response.status);
   const body=await response.text();if(body.length>2000000)throw new Error('비교 이력 크기 초과');previous=JSON.parse(body);
  }
 }else{
  try{previous=JSON.parse(await readFile(resolve(root,'reports/history.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 const context=dashboardContext(input,previous);
 await writePublicSite(template,{...context.data,asia:await readAsiaReport(input.asia)},context.history);
 console.log('Pages 게시 파일 생성: public-site/index.html');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});





