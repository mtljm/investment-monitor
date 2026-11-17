import {readDashboardTemplate} from './dashboard-template.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function writeDashboard(data, output=resolve(root,'dashboard.html')) {
  const template=await readDashboardTemplate();
  const json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  await writeFile(output,template.replace('__MONITOR_DATA__',()=>json),'utf8');
  return output;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const file=resolve(root,process.argv[2]||'reports/latest.json');
  const data=JSON.parse(await readFile(file,'utf8'));
  console.log(await writeDashboard(data));
}

