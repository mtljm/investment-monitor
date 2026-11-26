# 휴대폰 수동 실행·비용 관리

평소에는 [Telegram 브리핑](telegram-briefing.md)을 확인하고, 추가 갱신이 필요할 때 수동 실행합니다.

[Actions 기능별 안내](github-actions.md)에서 사이트 갱신·파일 수집·알림을 구분할 수 있습니다.

## 수동 실행

1. GitHub에 로그인하고 [04 수집 · 미국 20종목 다운로드](https://github.com/mtljm/investment-monitor/actions/workflows/market-monitor.yml)을 엽니다.
2. **Run workflow → main → Run workflow**를 누릅니다.
3. 완료된 실행의 **Artifacts**에서 ZIP을 내려받아 압축을 풉니다.
4. `dashboard.html`을 JavaScript 지원 브라우저로 엽니다.

휴대폰 파일 미리보기에서 탭·차트가 동작하지 않으면 브라우저 실행 지원을 확인하세요.
HTML에 토큰을 넣을 필요는 없습니다. 수동 실행은 대형주 20개를 포함한 43개 항목입니다.

## 비용 관리

- 계정 Actions 추가 과금 예산 **$0 + 한도 도달 시 사용 중지**를 유지합니다.
- 일반 Linux 러너 1개, 전체 최대 10분, 수집 최대 6분, Telegram 전송 최대 2분입니다.
- 동시 실행은 1개이며 추가 요청은 대기할 수 있습니다.
- GitHub 결과물은 **1일 보관**, 캐시는 사용하지 않습니다.
- 무료 제공량은 계정의 다른 작업과 공유하며 재실행도 사용량에 포함됩니다.
- 실행 시간·보관 제한만으로 과금을 막을 수는 없습니다. 계정 예산 차단을 함께 유지해야 합니다.

예산·결제 문제로 차단되면 한도를 올리거나 결제를 추가하지 않고 원인을 확인합니다.
GitHub 보관 기간은 이미 내려받거나 Telegram으로 전송된 파일에 적용되지 않습니다.

[예산 설정](https://github.com/settings/billing/budgets) · [예산 차단 안내](https://docs.github.com/en/billing/how-tos/set-up-budgets) · [수동 실행 안내](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
