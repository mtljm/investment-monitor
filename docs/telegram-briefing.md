# 매일 오전 Telegram 브리핑

## 운영 구조

GitHub Actions에서 매일 **한국시간 오전 8시**를 목표로 데이터를 수집하고,
개인 Telegram 대화로 간단한 시황과 HTML이 포함된 ZIP을 보냅니다.

- 대상: 초기 단계는 대형주 20개 + ETF 4개 + 지수·지표 7개
- 파일: dashboard.html, briefing.txt, latest.json, latest.md
- 휴장일: 최신 거래일 자료를 보내며 지수 봉 기준일을 표시
- 실행: UTC 23:00, 한국시간 다음 날 08:00
- GitHub 스케줄은 지연·누락될 수 있어 정각 도착을 보장하지 않음
- 현재 상태: 2026-11-16 연결정보 등록과 실제 시험 전송 성공 후 **정기 전송 활성화 완료**
- 활성화 조건: 저장소 변수 TELEGRAM_DELIVERY_ENABLED가 정확히 true일 때
- 수동 시험은 활성화 변수와 무관하게 Run workflow로 실행 가능

## 1. Telegram 봇 만들기

1. Telegram 공식 [@BotFather](https://t.me/BotFather)를 엽니다.
2. /newbot 명령을 보냅니다.
3. 표시 이름을 입력합니다. 예: My Investment Brief
4. 고유 사용자 이름을 입력합니다. bot으로 끝나야 합니다. 예: 나만의이름_market_brief_bot
5. 발급된 토큰은 채팅·저장소 파일·브라우저 URL에 붙여넣지 마세요.

이어서 [GitHub Actions Secrets](https://github.com/mtljm/investment-monitor/settings/secrets/actions)에서
New repository secret을 눌러 다음 값을 등록합니다.

| Name | Secret 값 |
| --- | --- |
| TELEGRAM_BOT_TOKEN | BotFather가 발급한 토큰 |

## 2. 수신 대화 확인

1. 방금 만든 봇의 개인 대화를 열고 시작합니다.
2. 그 대화에 /connect_investment_monitor 를 보냅니다.
3. [Telegram 연결 확인](https://github.com/mtljm/investment-monitor/actions/workflows/telegram-connect.yml)을 수동 실행합니다.
4. 완료된 실행 요약에서 봇 이름이 자신의 전용 봇인지 확인하고 개인 대화 ID를 확인합니다.
5. GitHub Actions Secrets에 TELEGRAM_CHAT_ID라는 이름으로 해당 ID를 등록합니다.

봇 토큰은 로그에 출력하지 않습니다.
개인 대화 ID는 사용자가 Secret에 복사할 수 있도록 비공개 저장소의 해당 실행 요약에만 표시합니다.
연결 확인은 메시지·파일을 전송하거나 기존 웹훅을 삭제하지 않습니다.
업데이트는 Telegram에서 오래 보관되지 않으므로 연결 확인 직전에 명령을 다시 보내세요.
일치하는 개인 대화가 여러 개면 자동 선택하지 않고 중단합니다.
그룹·채널 전송은 현재 지원하지 않습니다.

## 3. 시험 전송 후 활성화

1. [Telegram 오전 브리핑](https://github.com/mtljm/investment-monitor/actions/workflows/daily-telegram.yml)을 수동 실행합니다.
2. 자신의 개인 대화에 브리핑과 ZIP이 도착하는지 확인합니다.
3. 휴대폰에서 ZIP을 내려받아 압축을 풀고 HTML의 탭·검색·차트 동작을 확인합니다.
4. 확인 후 [Actions Variables](https://github.com/mtljm/investment-monitor/settings/variables/actions)에
   TELEGRAM_DELIVERY_ENABLED를 true로 등록합니다.

중지하려면 해당 변수를 false로 변경합니다.
활성화 전에는 예약 이벤트가 생기더라도 수집·전송 작업은 실행하지 않습니다.
봇이 새 토큰을 발급받으면 Secret만 교체하며 토큰을 파일로 저장하지 않습니다.

## 비용 및 오류 관리

- 별도 유료 서버 없이 기존 GitHub Actions 사용
- 계정 Actions 추가 과금 예산 $0 및 Usage blocked 상태 유지
- 일반 Linux 러너 1개, 최대 10분, 수집 최대 6분, 전송 단계 최대 2분
- 기존 수동 수집과 같은 concurrency 그룹으로 동시 실행 1개
- 결과 ZIP만 GitHub Artifact로 1일 보관, 캐시 사용 안 함
- 연결 확인은 수동만 지원하고 최대 3분
- 무료 제공량은 계정의 다른 작업과 공유됨
- 설정 누락·예산 소진·전송 오류가 나도 한도를 올리거나 결제를 추가하지 않음
- 통신 결과가 불확실한 경우 중복 파일 전송을 피하려고 자동 재시도하지 않음
- 부분 수집 실패 시 실패 항목이 표시된 브리핑을 전송하고 실행은 실패 상태로 남음
- 이전 보고서는 수집 전에 제거하여 오래된 파일을 새 결과처럼 전송하지 않음

Telegram에서는 파일을 실제 업로드합니다. 만료되는 GitHub Artifact 링크만 보내지 않습니다.
GitHub Artifact의 1일 보관 설정은 Telegram 대화에 전송된 파일의 보관 기간을 제한하지 않습니다.
전송 대상과 자료는 개인 대화 및 공개 시장 데이터로 한정하며 계좌·보유 내역은 포함하지 않습니다.

## 공식 문서

- [BotFather와 봇 생성](https://core.telegram.org/bots/tutorial#obtain-your-bot-token)
- [Telegram 파일 전송 API](https://core.telegram.org/bots/api#senddocument)
- [GitHub 예약 실행](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [GitHub Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)

## 운영 시작 기록

- 2026-11-16: 봇 인증·개인 대화 연결 확인 및 Secrets 등록 완료
- [첫 실제 전송 성공](https://github.com/mtljm/investment-monitor/actions/runs/43859521742): 데이터 수집·브리핑 ZIP 생성·Telegram 개인 대화 전송 모두 성공
- 저장소 변수 TELEGRAM_DELIVERY_ENABLED=true를 GitHub 화면에서 확인
- 첫 예약 실행 목표: 2026-11-17 08:00 KST (GitHub 예약 작업 지연 가능)
- 대상: 대형주 20개 + ETF 4개 + 지수·지표 7개
- 토큰과 개인 대화 ID 값은 이 문서에 기록하지 않음
- 실제 휴대폰에서 받은 ZIP의 압축 해제 및 HTML 실행 여부는 사용자 기기에서 별도로 확인할 항목
