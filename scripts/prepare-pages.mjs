import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const allowed=['group','symbol','name','unit','snapshot_rank','status','bar_time_utc','quote_time_utc',
 'close','previous_close','change','change_1d_pct','change_5d_pct','change_20d_pct',
 'sma20','sma50','sma200','rsi14','macd','macd_signal','macd_histogram',
 'bb_middle','bb_upper','bb_lower','bb_percent_b','bb_width_pct','volume_ratio','exchange_timezone','stale_calendar_days'];
export function publicData(input){
 if(!Array.isArray(input.rows)||input.rows.length>222)throw new Error('시장 보고서 형식을 확인하세요.');
 return {
  collected_at_utc:input.collected_at_utc,collected_at_kst:input.collected_at_kst,
  universe_date:input.universe_date,
  rows:input.rows.map(row=>{
   if(!['지수','시장지표','대형주','지수 ETF','섹터 ETF'].includes(row.group))throw new Error('시장 데이터 외 그룹은 공개할 수 없습니다.');
   const safe={};
   for(const key of allowed)if(row[key]!==undefined)safe[key]=row[key];
   safe.history=(row.history||[]).slice(-90).map(p=>({time:p.time,close:p.close}));
   if(row.status!=='ok')safe.error='수집 실패';
   return safe;
  })
 };
}
export function publicHtml(template,input){
 const data=publicData(input);
 const cleaned=template.replace(/<div class="side-note">[\s\S]*?<\/div><\/aside>/,'</aside>')
  .replaceAll('PERSONAL MARKET DESK','US MARKET OVERVIEW')
  .replaceAll('수동 수집 · 일봉 기준','수집 데이터 · 일봉 기준')
  .replaceAll('스크립트 수동 실행','매일 오전 8시 목표 · Actions')
  .replaceAll('수집 스크립트 실행 또는 새 JSON 불러오기가 필요합니다.','매일 오전 자동 갱신됩니다. 수동 갱신은 GitHub Actions의 Pages 시장 대시보드에서 실행하세요.')
  .replaceAll('새 JSON 불러오기가 필요합니다.','자동 갱신 시각 또는 GitHub Actions 실행 결과를 확인하세요.');
 if(cleaned.includes('80% 장기')||cleaned.includes('보유 자산은 추후'))throw new Error('개인 운용 안내가 남아 있습니다.');
 const json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 if(!cleaned.includes('__MONITOR_DATA__'))throw new Error('화면 템플릿의 데이터 위치가 없습니다.');
 return cleaned.replace('__MONITOR_DATA__',()=>json);
}
export async function main(){
 const input=JSON.parse(await readFile(resolve(root,'reports/latest.json'),'utf8'));
 const template=await readFile(resolve(root,'templates/dashboard.html'),'utf8');
 const out=resolve(root,'public-site');await mkdir(out,{recursive:true});
 await writeFile(resolve(out,'index.html'),publicHtml(template,input));
 await writeFile(resolve(out,'.nojekyll'),'');
 console.log('Pages 게시 파일 생성: public-site/index.html');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error(e.message);process.exitCode=1;});
