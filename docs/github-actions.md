# GitHub Actions 기능별 안내

Actions 목록의 숫자·기능 접두어로 용도를 구분합니다. 파일 경로, 예약, 권한과 호출 관계는 유지합니다. 아래 시각은 한국시간이며 예약 실행은 지연·누락될 수 있습니다.

| 분류 | Actions 표시 이름 | 파일 | 실행 방식 | 결과 |
| --- | --- | --- | --- | --- |
| 01 시장 | [미국장 갱신](https://github.com/mtljm/investment-monitor/actions/workflows/daily-us.yml) | `daily-us.yml` | 매일 07:37 / 수동 | 미국 데이터 갱신 후 사이트 게시 |
| 01 시장 | [아시아장 갱신](https://github.com/mtljm/investment-monitor/actions/workflows/daily-asia.yml) | `daily-asia.yml` | 평일 17:30 / 수동 | 아시아 지수 갱신 후 사이트 게시 |
| 02 기관 | [13F 포트폴리오 갱신](https://github.com/mtljm/investment-monitor/actions/workflows/weekly-gurus.yml) | `weekly-gurus.yml` | 토요일 08:00 / 수동 | 기관 공시 자료 확인 후 사이트 게시 |
| 03 배포 | [화면 및 선택 데이터 갱신](https://github.com/mtljm/investment-monitor/actions/workflows/daily-pages.yml) | `daily-pages.yml` | 관련 소스 push / 수동 | 화면 배포 또는 선택한 데이터 갱신 |
| 04 수집 | [미국 20종목 다운로드](https://github.com/mtljm/investment-monitor/actions/workflows/market-monitor.yml) | `market-monitor.yml` | 수동 | HTML·보고서를 아티팩트로 보관. 사이트 배포 없음 |
| 05 알림 | [Telegram 연결 확인](https://github.com/mtljm/investment-monitor/actions/workflows/telegram-connect.yml) | `telegram-connect.yml` | 수동 | 봇과 개인 대화 연결 확인. 브리핑 전송 없음 |
| 05 알림 | [Telegram 시험 전송](https://github.com/mtljm/investment-monitor/actions/workflows/daily-telegram.yml) | `daily-telegram.yml` | 수동 | 새 자료를 수집해 등록된 개인 대화에 브리핑·ZIP 전송 |
| 90 진단 | [예약 시계 UTC](https://github.com/mtljm/investment-monitor/actions/workflows/schedule-clock-utc.yml) | `schedule-clock-utc.yml` | 매시간 05분 / 수동 | UTC 기본 예약의 실행 시각·간격 기록 |
| 90 진단 | [예약 시계 서울](https://github.com/mtljm/investment-monitor/actions/workflows/schedule-clock-seoul.yml) | `schedule-clock-seoul.yml` | 매시간 05분 / 수동 | Asia/Seoul 명시 예약의 실행 시각·간격 기록 |
| 99 내부 | 공통 수집 및 배포 | `publish-market.yml` | 다른 워크플로에서 호출 | 검증 → 선택 수집 → 기존 자료 병합 → Pages 게시 → 공개 자료 확인 |

## 실행 목적에 따른 선택

- 미국·아시아·기관 중 하나만 갱신하려면 해당 전용 워크플로의 **Run workflow**를 실행합니다.
- 화면만 다시 배포하려면 **03 배포 · 화면 및 선택 데이터 갱신**에서 기본값 `reuse`를 사용합니다.
- 같은 배포 화면에서 `us`(미국), `asia`(아시아), `gurus`(기관), `all`(세 대상 모두)을 선택할 수 있습니다.
- HTML·보고서 파일만 내려받으려면 **04 수집**을 사용합니다. 사이트 갱신과 구분합니다.
- **05 알림 · Telegram 시험 전송**은 실제 외부 메시지·파일 전송입니다. 현재 정기 전송 예약은 없으며, 활성화 변수만 바꿔도 예약이 생기지는 않습니다.
- **90 진단**은 시장 데이터를 수집하거나 사이트를 배포하지 않습니다. 매시간 예약은 UTC와 한국시간의 정수 시간 차이를 구별하지 못하므로 실행 간격·누락 관찰용입니다.
- **99 내부**는 `workflow_call` 전용으로 직접 실행하지 않습니다. 전용 갱신 워크플로와 03 배포가 같은 게시 경로와 잠금을 공유합니다.

## 예약 원문

| 대상 | UTC cron | timezone 지정 |
| --- | --- | --- |
| 미국 | `37 22 * * *` | 없음: UTC 기본값 |
| 아시아 | `30 8 * * 1-5` | 없음: UTC 기본값 |
| 기관 | `0 23 * * 5` | 없음: UTC 기본값 |
| UTC 진단 | `5 * * * *` | 없음: UTC 기본값 |
| 서울 진단 | `5 * * * *` | `Asia/Seoul` |

실제 실행 여부는 표시 이름이 아니라 실행 상세의 이벤트(`schedule` / `workflow_dispatch` / `push`)와 수집·배포 단계 결과로 확인합니다. 표시 이름 변경 전 실행에는 예전 이름이 남을 수 있습니다.
