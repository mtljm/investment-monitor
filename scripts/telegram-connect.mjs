import {appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TelegramClient,TelegramError} from './telegram-client.mjs';
export function connectionTarget(updates,botUsername=''){
  const command='/connect_investment_monitor';
  const chats=new Map();
  for(const update of updates){
    const m=update.message;
    const text=typeof m?.text==='string'?m.text.trim().toLowerCase():'';
    const matches=text===command||(botUsername&&text===command+'@'+botUsername.toLowerCase());
    if(m?.chat?.type==='private'&&matches&&
      String(m.chat.id)===String(m.from?.id))
      chats.set(String(m.chat.id),m.chat);
  }
  if(chats.size!==1)throw new TelegramError('자신의 봇 개인 대화에 /connect_investment_monitor 를 보낸 뒤 다시 실행하세요. 일치하는 개인 대화가 정확히 하나여야 합니다.');
  return [...chats.values()][0];
}
export async function main(){
  const client=new TelegramClient(process.env.TELEGRAM_BOT_TOKEN?.trim());
  const bot=await client.call('getMe');
  const webhook=await client.call('getWebhookInfo');
  if(webhook.url)throw new TelegramError('웹훅이 연결된 봇입니다. 기존 설정을 변경하지 않고 중단합니다. 새 전용 봇을 사용하세요.');
  const updates=await client.call('getUpdates',{limit:100,timeout:0});
  const username=String(bot.username||'').replace(/[^A-Za-z0-9_]/g,'');
  if(process.env.GITHUB_STEP_SUMMARY){
    await appendFile(process.env.GITHUB_STEP_SUMMARY,'# Telegram 연결 진단\n\n봇 인증 성공: @'+username+'\n\n[이 봇의 개인 대화 열기](https://t.me/'+username+')\n\n최근 업데이트: '+updates.length+'개.\n\nBotFather가 아닌 위 봇의 개인 대화에 /connect_investment_monitor 를 보내세요. 메시지 내용과 토큰은 출력하지 않습니다.\n\n');
  }
  const chat=connectionTarget(updates,username);
  const text=['# Telegram 개인 대화 연결 확인','',
    '봇: @'+String(bot.username||'').replace(/[^A-Za-z0-9_]/g,''),
    '아래 개인 대화 ID를 TELEGRAM_CHAT_ID 저장소 Secret으로 등록하세요.',
    '본인이 방금 연결 명령을 보낸 전용 봇인지 확인한 뒤 등록하세요.',
    '',String(chat.id),'','토큰은 이 요약에 표시하지 않습니다. 연결 확인 단계에서는 메시지나 파일을 전송하지 않습니다.'].join('\n');
  if(!process.env.GITHUB_STEP_SUMMARY)throw new TelegramError('이 연결 확인은 GitHub Actions에서 실행하세요.');
  await appendFile(process.env.GITHUB_STEP_SUMMARY,text+'\n');
  console.log('개인 대화 ID를 비공개 실행 요약에서 확인하세요.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error(e instanceof TelegramError?e.message:'Telegram 연결 확인 실패');process.exitCode=1;});
