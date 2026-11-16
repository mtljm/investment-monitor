# investment-monitor

안정적인 포트폴리오 운용을 위해 미국 시장을 기술적으로 분석하고 투자 판단을 기록하는 개인 모니터입니다.
운용 방향은 **장기 지수 투자 약 80% + 단기 기술적 매매 약 20%**입니다.

## 현재 기능

- 미국 대형주 상위 **20·50·100·200개** 선택
- 지수 4개, 주요 지표 3개, 지수 ETF 4개, 섹터 ETF 11개 조회
- 시장 개요·관찰 종목·데이터 상태 탭, 검색·정렬·CSV 저장
- 종목 세부 화면에서 MA·RSI·MACD·볼린저 밴드와 설명 확인
- **매일 한국시간 오전 8시 목표**로 개인 Telegram에 브리핑과 HTML ZIP 전송

정기 실행은 대형주 20개를 포함한 **42개 항목**, 최대 범위는 **222개 항목**입니다.
GitHub 예약 실행은 지연·누락될 수 있으며, 휴장일에는 최근 거래일 자료를 사용합니다.
보유 자산·계좌 연동과 자동 매매는 아직 구현하지 않았습니다.

## 사용하기

Telegram에서 받은 ZIP의 압축을 풀고 `dashboard.html`을 브라우저로 엽니다.
GitHub의 [대시보드 파일](dashboard.html)도 내려받아 열 수 있습니다.
휴대폰 파일 미리보기 앱은 JavaScript를 지원하지 않을 수 있습니다.

Node.js 22 이상에서 직접 실행할 수도 있습니다.

```sh
node scripts/monitor.mjs --limit 20  # 20·50·100·200 지원
node scripts/update-universe.mjs    # 대형주 순위 갱신
node scripts/render-dashboard.mjs  # 기존 JSON으로 HTML 재생성
```

페이지 새로고침은 시세를 수집하지 않습니다. 수집 스크립트를 실행하거나 새 JSON을 불러오세요.

## 안내

| 문서 | 내용 |
| --- | --- |
| [시장 모니터링](docs/market-monitoring.md) | 조회 대상·출처·결과 파일 |
| [기술적 지표](docs/technical-indicators.md) | 계산식과 해석 |
| [휴대폰 수동 실행·비용 관리](docs/mobile-execution.md) | 실행·다운로드·과금 차단 |
| [Telegram 운영](docs/telegram-briefing.md) | 연결·시험 전송·켜기/끄기 |
| [작업 권한](PERMISSIONS.md) | 허용 범위와 인증정보 관리 |

관찰 대상은 [설정 파일](config/monitor.json), 최근 저장된 결과는 [보고서](reports/latest.md)에서 확인합니다.
계좌번호·비밀번호·토큰은 저장소에 기록하지 않습니다.
