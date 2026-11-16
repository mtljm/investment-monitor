# 휴대폰 수동 실행 · 1단계

[실행 화면 열기](https://github.com/mtljm/investment-monitor/actions/workflows/market-monitor.yml)

1. 휴대폰 브라우저에서 GitHub에 로그인합니다.
2. 위 실행 화면에서 Run workflow → main → Run workflow를 누릅니다.
3. 실행 완료 후 해당 실행의 Artifacts에서 결과 ZIP을 내려받습니다.
4. 압축을 해제하고 dashboard.html을 JavaScript 실행을 지원하는 브라우저로 엽니다.

휴대폰 OS와 파일 미리보기 앱에 따라 로컬 HTML의 JavaScript가 실행되지 않을 수 있습니다.
실제 휴대폰에서 검색·탭·차트 동작을 확인하는 단계가 필요합니다.
이 단계는 다운로드 방식이며, 웹주소에서 바로 실행되는 웹 호스팅 방식은 아닙니다.
토큰을 휴대폰 HTML에 넣을 필요가 없습니다.

## 비용 관리

- 수동 버튼으로만 실행합니다. push·PR·schedule 자동 트리거가 없습니다.
- 첫 단계는 대형주 20개 + ETF 4개 + 지수·지표 7개로 고정합니다.
- 일반 Ubuntu 러너 1개, 실행 전체 최대 10분, 수집 단계 최대 6분입니다.
- 동시에 실행하는 작업은 1개이며 GitHub concurrency 규칙상 대기 작업은 남을 수 있습니다.
- 결과 HTML·JSON·Markdown만 업로드하고 보관 기간은 1일로 설정합니다.
- 패키지 설치와 캐시 저장을 사용하지 않습니다.
- 별도의 유료 서버·결제·호스팅을 생성하지 않습니다.
- 계정 Actions 예산 $0 및 Usage blocked 상태를 2026-11-16 화면에서 확인했습니다.
- 무료 제공량과 저장 공간은 계정의 다른 작업과 공유됩니다.
- 코드의 시간 제한만으로 계정 과금을 막을 수는 없습니다. 계정의 예산 차단 설정을 유지해야 합니다.

실행 제한은 회당 비용을 줄이는 장치이며 월간 전체 사용량의 별도 강제 한도는 아닙니다.
반복 실행·재실행도 사용량에 포함됩니다.
부분 수집 실패 시 워크플로는 실패로 표시하지만, 생성된 보고서에는 실패 항목이 표시되며 다운로드할 수 있습니다.
실제 수집이 시작되기 전에 GitHub가 결제/예산 문제로 차단하면 한도를 올리거나 결제를 추가하지 않고 원인을 확인합니다.

## 다음 단계

휴대폰에서 20종목 결과가 정상 표시되는 것을 확인한 후 50·100·200개 선택 기능을 수동 실행 입력에 추가합니다.
오전 정기 실행과 별도 웹 호스팅은 아직 설정하지 않습니다.

## 공식 참고

- [수동 실행](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [결과 내려받기](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts)
- [예산과 사용 차단](https://docs.github.com/en/billing/how-tos/set-up-budgets)

## 첫 실행 검증 결과

- 실행: [#1 미국 시장 20종목 수동 수집](https://github.com/mtljm/investment-monitor/actions/runs/43855707340)
- 수집 시각: 2026-11-16 20:12:48 KST
- 실행 결과: 성공, 전체 소요 시간 17초
- 수집 범위: 대형주 20개를 포함한 31개 항목, 성공 31개·실패 0개
- 결과 파일: market-monitor-20-1 ZIP, 화면 표시 크기 60.5 KB
- 보관: 1일
- 실제 휴대폰의 압축 해제와 HTML JavaScript 실행 검증은 사용자 기기에서 진행할 단계입니다.

실행 성공과 시간·파일 크기는 확인했으며, 계정 전체 월간 무료 제공량의 잔여치나 청구 확정액을 의미하지 않습니다.
