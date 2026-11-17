import {readFile} from 'node:fs/promises';
const templates=new URL('../templates/',import.meta.url);
// Source files stay separate; all delivery formats remain self-contained HTML.
export async function readDashboardTemplate(){
 const [html,css,...scripts]=await Promise.all(['dashboard.html','dashboard.css','dashboard-safety.js','market-temperature.js','sector-heatmap.js','dashboard.js'].map(p=>readFile(new URL(p,templates),'utf8')));
 const js=scripts.join('\n');
 if(!html.includes('__DASHBOARD_CSS__')||!html.includes('__DASHBOARD_JS__'))throw new Error('대시보드 소스 삽입 위치가 없습니다.');
 if(/<\/style/i.test(css)||/<\/script/i.test(js))throw new Error('대시보드 소스에 닫기 태그를 사용할 수 없습니다.');
 return html.replace('__DASHBOARD_CSS__',()=>css).replace('__DASHBOARD_JS__',()=>js);
}
