# Telegram 오전 브리핑

**현재 검증·연결 확인·시험 전송을 하나의 수동 워크플로에서 선택합니다.** 정기 전송 예약은 설정되어 있지 않습니다. [Actions 기능별 안내](github-actions.md)를 참고하세요.
GitHub 예약 실행은 지연·누락될 수 있으며, 휴장일에는 최근 거래일 자료와 기준일을 표시합니다.

- 대상: 대형주 20개 + 지수 ETF 4개 + 섹터 ETF 11개 + 지수·지표 8개 = **43개**
- ZIP: `dashboard.html`, `briefing.txt`, `latest.json`, `latest.md`
- 수신 범위: 본인 개인 대화. 계좌·보유 내역은 포함하지 않습니다.

## 수동 전송

기존 `TELEGRAM_DELIVERY_ENABLED` 변수는 사용하지 않습니다. 기본 `validate`는 외부 연결 없는 검증이며, 실제 전송은 `operation: send`를 선택해야 합니다.

[03 알림 · Telegram (send)](https://github.com/mtljm/investment-monitor/actions/workflows/daily-telegram.yml)의 **Run workflow → operation: send**로 시험 전송할 수 있습니다.
`connect`는 연결 확인만, `send`는 실제 메시지·파일 전송을 실행합니다.
받은 ZIP의 압축을 풀고 JavaScript 지원 브라우저로 HTML을 여세요.

## 봇 연결·재설정

1. 공식 [@BotFather](https://t.me/BotFather)에 `/newbot`을 보내 봇을 만듭니다. 사용자명은 `bot`으로 끝나야 합니다.
2. [Actions Secrets](https://github.com/mtljm/investment-monitor/settings/secrets/actions)에 토큰을 `TELEGRAM_BOT_TOKEN`으로 등록합니다.
3. **생성한 봇의 개인 대화**에 `/connect_investment_monitor`를 보냅니다.
4. [03 알림 · Telegram (connect)](https://github.com/mtljm/investment-monitor/actions/workflows/daily-telegram.yml)을 **operation: connect**로 실행합니다.
5. 비공개 실행 요약에서 본인 봇과 대화 ID를 확인하고, ID를 `TELEGRAM_CHAT_ID` Secret으로 등록합니다.
6. 시험 전송과 휴대폰 HTML 동작을 확인합니다.

토큰은 채팅·파일·로그·브라우저 URL에 넣지 않습니다. 재발급하면 Secret만 교체합니다.
연결 명령은 확인 직전에 보내세요. 후보가 여러 개거나 기존 웹훅이 있으면 설정을 변경하지 않고 중단합니다.
연결 확인은 파일을 전송하지 않으며, 그룹·채널 전송은 지원하지 않습니다.

## 오류와 비용

부분 수집 실패는 브리핑에 표시하고 실행을 실패 상태로 남깁니다.
이전 결과를 새 자료처럼 보내지 않으며, 전송 결과가 불확실하면 중복 방지를 위해 자동 재시도하지 않습니다.
GitHub에는 ZIP을 1일 보관하지만 Telegram에는 파일을 직접 업로드하므로 그 보관 기간은 별도입니다.

[실행 제한·과금 차단](mobile-execution.md) · [시장 조회 대상](market-monitoring.md) · [Telegram API](https://core.telegram.org/bots/api#senddocument) · [GitHub Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
