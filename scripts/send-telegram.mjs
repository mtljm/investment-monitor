import {readFile,stat,appendFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TelegramClient,TelegramError,privateTarget} from './telegram-client.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function sendBrief(client,chatId,manifest,bytes){
  const target=privateTarget(chatId);
  if(!/^[A-Za-z0-9-]+\.zip$/.test(manifest.file)||typeof manifest.caption!=='string'||
    manifest.caption.length>1024||!bytes.length||bytes.length>10*1024*1024)
    throw new TelegramError('전송 파일 정보 또는 크기를 확인하세요.');
  const chat=await client.call('getChat',{chat_id:target});
  if(chat.type!=='private'||String(chat.id)!==target)
    throw new TelegramError('수신자가 설정한 개인 대화와 다릅니다.');
  const result=await client.call('sendDocument',{chat_id:target,caption:manifest.caption,
    disable_content_type_detection:true},{name:manifest.file,bytes});
  if(String(result.chat?.id)!==target||!result.document)
    throw new TelegramError('Telegram 전송 응답이 예상과 다릅니다. 자동 재전송하지 않습니다.');
  return result;
}
export async function main(){
  const client=new TelegramClient(process.env.TELEGRAM_BOT_TOKEN?.trim());
  const manifest=JSON.parse(await readFile(resolve(root,'delivery/manifest.json'),'utf8'));
  const file=resolve(root,'delivery',manifest.file);
  if(dirname(file)!==resolve(root,'delivery'))throw new TelegramError('잘못된 전송 경로');
  const size=(await stat(file)).size;
  if(size>10*1024*1024)throw new TelegramError('전송 파일이 10MB를 초과합니다.');
  await sendBrief(client,process.env.TELEGRAM_CHAT_ID,manifest,await readFile(file));
  console.log('Telegram 개인 대화로 브리핑 ZIP 전송 완료');
  if(process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY,'\n## Telegram 전송\n브리핑과 ZIP 전송 성공.\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error(e instanceof TelegramError?e.message:'Telegram 전송 준비 실패. 설정과 전송 파일을 확인하세요.');process.exitCode=1;});
