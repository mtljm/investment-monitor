# 시장 모니터링

## 조회 대상

| 구분 | 대상 |
| --- | --- |
| 지수 4개 | S&P 500, Nasdaq 100, Dow Jones, Russell 2000 |
| 주요 지표 4개 | VIX, 미국 10년물 국채수익률, USD/KRW, 비트코인(BTC/USD) |
| 지수 ETF 4개 | SPY, QQQ, DIA, IWM |
| 대형주 | 시가총액 상위 20·50·100·200개 선택 |
| 섹터 ETF 11개 | 아래 목록 |

| 섹터 | ETF | 섹터 | ETF |
| --- | --- | --- | --- |
| 커뮤니케이션 | XLC | 경기소비재 | XLY |
| 필수소비재 | XLP | 에너지 | XLE |
| 금융 | XLF | 헬스케어 | XLV |
| 산업재 | XLI | 소재 | XLB |
| 부동산 | XLRE | 정보기술 | XLK |
| 유틸리티 | XLU | | |

대형주 20개 기준 총 **43개**, 200개 기준 총 **223개**입니다.
ETF 목록은 관찰 대상이며 보유 비중이나 매수 결정을 의미하지 않습니다.

## 화면과 갱신

- **시장 개요:** 지수·주요 지표·섹터별 등락
- **관찰 종목:** 대형주·지수 ETF·섹터 ETF 탭, 검색·추세 필터·정렬·CSV 저장
- **데이터 상태:** 수집 성공·실패, 오래된 봉 확인

종목을 선택하면 최근 최대 90개 일봉 차트와 [기술적 지표](technical-indicators.md)를 확인합니다.
표시 범위 변경이나 페이지 새로고침은 새 시세를 수집하지 않습니다.
보고서에 없는 범위는 선택할 수 없으며, 새 수집 결과 JSON을 불러올 수 있습니다.

## 출처와 선정

- 가격: [Yahoo Finance](https://finance.yahoo.com/) 공개 chart API. 비공식 API라 지연·차단·변경될 수 있습니다.
- 대형주: [Stock Analysis](https://stockanalysis.com/list/largest-us-companies/?count=500)의 앞 500개에서 미국 기업·주식·주 상장 조건으로 필터링합니다. OTC 경로형 티커와 회사명·티커 중복을 제외하고 시가총액순 200개를 저장합니다.
- 섹터 ETF: [State Street 공식 목록](https://www.ssga.com/us/en/individual/capabilities/equities/sector-investing/select-sector-etfs)
- 데이터 이용: [Yahoo 약관](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html)

대형주 목록은 기준일을 기록한 스냅샷입니다. `node scripts/update-universe.mjs`로 갱신합니다.
출처 형식이 바뀌거나 적격 기업이 부족하면 기존 설정을 유지하고 중단합니다.

## 결과 파일과 기준

| 파일 | 내용 |
| --- | --- |
| `dashboard.html` | 데이터를 포함한 단일 HTML |
| `reports/latest.json` | 지표·일봉 이력·시각·출처·오류 |
| `reports/latest.md` | 요약 표 |
| `reports/<UTC 실행시각>.json/.md` | 실행별 기록 |

일간·5일·20일 변화율은 거래 관측치 기준입니다.
거래량 배수는 최신 거래량/직전 20개 봉 평균, 금리 일간 변화는 bp, VIX 변화는 pt입니다.
Close를 사용하며 배당 재투자 총수익률은 아닙니다. 장중 봉은 확정 종가가 아닐 수 있습니다.

항목별 거래 시각·휴일이 다르므로 봉·시세·수집 시각을 구분합니다.
마지막 봉이 달력 기준 4일을 넘으면 확인 표시를 하며 거래소 휴일을 정밀 판정하지 않습니다.
이력 부족·수집 실패는 미확인으로 표시합니다. 일부 수집 실패 시 나머지 결과를 저장하고 종료코드 1, 전부 성공하면 0입니다.

실행 명령은 [README](../README.md), 자동 전송은 [Telegram 운영](telegram-briefing.md)을 참고하세요.

비트코인은 BTC-USD의 수집 시점 최신 일봉 가격(USD)이며 실시간 스트리밍이 아닙니다. 등락률은 직전 UTC 일봉 종가 대비로, 최근 24시간 수익률·원화 거래소 가격과 다릅니다. 주말에도 거래되므로 마지막 봉이 36시간을 넘으면 거래일 확인 경고를 표시합니다.
