# investment-monitor

안정적인 포트폴리오 운용을 위해 미국 시장을 기술적으로 분석하고 투자 판단을 기록하는 개인 모니터입니다.
운용 방향은 **장기 지수 투자 약 80% + 단기 기술적 매매 약 20%**입니다.

## 현재 기능

- 미국 대형주 상위 **20·50·100·200개** 선택
- 지수 4개, 주요 지표 4개, 지수 ETF 4개, 섹터 ETF 11개 조회
- 시장 개요·관찰 종목·데이터 상태 탭, 검색·정렬·CSV 저장
- 종목 세부 화면에서 MA·RSI·MACD·볼린저 밴드와 설명 확인
- 기술적 분석 탭: S&P 500(SPX)·나스닥100·상위 20개 주식의 추세·RSI·볼린저·OBV·피보나치 구간과 종합 해석
- **매일 한국시간 오전 7시 15분 목표**로 GitHub Pages 시장 화면 갱신

배포는 상위 20개 데이터를 포함하며, 50·100·200 선택 메뉴는 해당 범위 JSON을 불러올 때 사용할 수 있습니다.
Pages 정기 실행은 대형주 20개를 포함한 **43개 항목**입니다.
GitHub 예약 실행은 지연·누락될 수 있으며, 휴장일에는 최근 거래일 자료를 사용합니다.
보유 자산·계좌 연동과 자동 매매는 아직 구현하지 않았습니다.

## 사용하기

휴대폰 또는 PC에서 **[시장 대시보드 열기](https://mtljm.github.io/investment-monitor/)** 를 누르세요.
설치·압축 해제·로그인이 필요 없습니다. 화면의 수집 시각을 확인하세요.
수동 갱신은 GitHub Actions의 **Pages 시장 대시보드 → Run workflow**에서 실행합니다.

Node.js 22 이상에서 직접 실행할 수도 있습니다.

```sh
node scripts/monitor.mjs --limit 20  # 20·50·100·200 지원
node scripts/update-universe.mjs    # 대형주 순위 갱신
node scripts/render-dashboard.mjs  # 기존 JSON으로 HTML 재생성
```

페이지 새로고침은 시세를 수집하지 않습니다. 수집 스크립트를 실행하거나 새 JSON을 불러오세요.

화면 소스(HTML·CSS·화면 JS) 수정은 기존 게시 데이터를 재사용해 배포합니다. 정기 실행과 수동 실행 기본값은 새 시세를 수집하며, 수동 실행에서 `refresh_data`를 해제하면 화면만 갱신합니다. 자세한 구조는 [Pages 운영](docs/github-pages.md)을 참고하세요.

## 안내

| 문서 | 내용 |
| --- | --- |
| [시장 모니터링](docs/market-monitoring.md) | 조회 대상·출처·결과 파일 |
| [기술적 지표](docs/technical-indicators.md) | 계산식과 해석 |
| [휴대폰 수동 실행·비용 관리](docs/mobile-execution.md) | 실행·다운로드·과금 차단 |
| [Pages 운영](docs/github-pages.md) | 주소·자동 갱신·비용·실패 처리 |
| [Telegram 운영](docs/telegram-briefing.md) | 이전 전송 방식·수동 시험 |
| [작업 권한](PERMISSIONS.md) | 허용 범위와 인증정보 관리 |

관찰 대상은 [설정 파일](config/monitor.json), 최근 저장된 결과는 [보고서](reports/latest.md)에서 확인합니다.
계좌번호·비밀번호·토큰은 저장소에 기록하지 않습니다.



## 아시아 지수

아시아 지수 탭은 KOSPI·KOSDAQ·닛케이225·항셍·상하이종합·대만가권을 별도로 표시합니다. 미국장 통계는 변경하지 않습니다. `node scripts/collect-asia.mjs`로 수집하며 `reports/asia-latest.json`에 기록합니다. Pages 빌드는 아시아 지수를 별도로 수집해 기존 미국장 스냅샷과 함께 게시합니다. 일부 실패는 해당 카드에 표시하며 미국장 배포를 중단하지 않습니다. 각 시장 시세·거래일을 확인하세요. 장중 자료는 바뀔 수 있고 실시간 스트리밍·지역별 휴장일 정밀 판정은 아직 지원하지 않습니다.
