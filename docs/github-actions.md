# GitHub Actions 기능별 안내

워크플로는 10개에서 4개로 통합했습니다. 시장별 예약 시각과 개별 수집 범위는 유지하며, 시간대 진단 2개는 삭제했습니다. 과거 실행 기록은 삭제하지 않습니다.

| Actions 표시 이름 | 파일 | 실행 방식 | 용도 |
| --- | --- | --- | --- |
| [01 시장 · 예약 및 화면 갱신](https://github.com/mtljm/investment-monitor/actions/workflows/daily-pages.yml) | `daily-pages.yml` | 예약 / 관련 소스 push / 수동 | 미국·아시아·기관 자료 갱신 또는 화면만 배포 |
| [02 파일 · 미국 20종목 다운로드](https://github.com/mtljm/investment-monitor/actions/workflows/market-monitor.yml) | `market-monitor.yml` | 수동 | HTML·데이터 아티팩트 생성. 사이트 배포 없음 |
| [03 알림 · Telegram](https://github.com/mtljm/investment-monitor/actions/workflows/daily-telegram.yml) | `daily-telegram.yml` | 수동 | 검증·연결 확인·실제 전송 중 선택 |
| 99 내부 · 공통 수집 및 배포 | `publish-market.yml` | 다른 워크플로에서 호출 | 검증 → 선택 수집 → 병합 → Pages 게시 → 공개 자료 확인 |

## 시장·화면 갱신 선택

**Run workflow → market**에서 대상을 선택합니다.

| market | 처리 |
| --- | --- |
| `reuse` (기본값) | 미국·아시아·기관의 게시 자료와 비교 이력을 보존하고 화면만 배포 |
| `us` | 미국만 수집하고 나머지는 보존 |
| `asia` | 아시아 지수만 수집하고 나머지는 보존 |
| `gurus` | 기관 공시 자료만 확인하고 나머지는 보존 |
| `all` | 미국·아시아·기관 모두 갱신 |

아래 예약을 한 워크플로에서 구분해 처리합니다. `config/batch-schedules.json`과 cron의 일치를 테스트하며, 모르는 예약식은 미국 수집으로 대체하지 않고 실패 처리합니다.

| 대상 | 한국시간 목표 | UTC cron |
| --- | --- | --- |
| 미국 | 매일 07:37 | `37 22 * * *` |
| 아시아 | 평일 17:30 | `30 8 * * 1-5` |
| 기관 | 토요일 08:00 | `0 23 * * 5` |

예약은 지연·누락될 수 있습니다. push 시 기존 파일별 수집 범위 판정을 유지합니다. 모든 게시 경로는 공통 배포의 같은 잠금을 사용합니다.

## Telegram 선택

**Run workflow → operation**에서 선택합니다. 자동 전송 예약은 없습니다.

- `validate` (기본값): 토큰이나 외부 연결 없이 전송 로직 테스트만 실행합니다.
- `connect`: 등록된 봇의 개인 대화 연결을 확인합니다. 브리핑 전송은 하지 않습니다.
- `send`: 새 시장 자료를 수집해 등록된 개인 대화에 브리핑·ZIP을 실제 전송합니다.

각 선택은 해당 job 하나만 실행합니다. 기존 `TELEGRAM_DELIVERY_ENABLED` 변수는 더 이상 사용하지 않습니다.

## 정리 범위

- 미국·아시아·기관 전용 예약 파일 3개는 `daily-pages.yml`로 통합했습니다.
- Telegram 연결 전용 파일은 `daily-telegram.yml`의 `connect` 선택으로 통합했습니다.
- UTC·서울 시간대 진단 파일 2개와 매시간 진단 예약은 삭제했습니다.
- 파일 다운로드와 공통 배포는 결과·권한이 달라 별도로 유지했습니다.
- 기존 실행 기록에는 예전 이름이나 삭제된 워크플로가 보일 수 있습니다. 활성 설정은 위 4개 파일을 기준으로 확인합니다.
