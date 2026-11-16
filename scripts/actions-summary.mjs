import {readFileSync,appendFileSync} from 'node:fs';
const lines=['# 미국 시장 모니터 · 20종목 수동 실행',''];
try {
  const data=JSON.parse(readFileSync('reports/latest.json','utf8'));
  const stocks=data.rows.filter(r=>r.group==='대형주').length;
  if(stocks!==20||data.rows.length!==31)throw new Error('예상 범위(대형주 20개, 전체 31개)와 다릅니다.');
  const failures=data.rows.filter(r=>r.status!=='ok');
  lines.push(
    '- 수집 시각: '+data.collected_at_kst,
    '- 대형주: '+stocks+'개 / 전체: '+data.rows.length+'개',
    '- 성공: '+(data.rows.length-failures.length)+'개 / 실패: '+failures.length+'개',
    '',
    '## 휴대폰에서 결과 열기',
    '1. 이 실행 화면의 Artifacts에서 market-monitor-20 결과 ZIP을 내려받습니다.',
    '2. ZIP 압축을 해제하고 dashboard.html을 JavaScript 실행을 지원하는 브라우저로 엽니다.',
    '3. 휴대폰 파일 미리보기에서 버튼이나 차트가 동작하지 않으면 브라우저 실행 지원을 확인하세요.',
    '',
    '결과 보관: 1일. 웹사이트 배포나 자동 정기 실행은 설정하지 않았습니다.',
    '이 작업은 수동 실행, 일반 Linux 러너, 최대 10분이며 별도 캐시를 저장하지 않습니다.',
    '계정 전체 무료 제공량은 다른 저장소와도 공유되므로 Billing에서 함께 확인하세요.'
  );
  if(failures.length)lines.push('','## 수집 오류',...failures.map(r=>'- '+r.symbol+': '+r.error));
  if(failures.length)process.exitCode=1;
} catch(error) {
  lines.push('수집 결과를 확인할 수 없습니다: '+error.message,'이전 보고서를 새 결과로 업로드하지 않습니다.');
  process.exitCode=1;
}
const markdown=lines.join('\n')+'\n';
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,markdown);
console.log(markdown);
