# 기술적 지표와 세부 화면

종목·ETF를 선택하면 가격 차트 아래에 MA 묶음과 RSI·MACD·볼린저 밴드를 표시합니다.
지표의 짧은 뜻은 항상 보이며, 각 ‘계산 방법과 뜻’을 펼치면 계산식과 해석을 읽을 수 있습니다.

| 구분 | 계산 설정 | 화면에 표시하는 내용 |
| --- | --- | --- |
| 이동평균 | SMA20·50·200 | 단기·중기·장기 평균값과 현재가의 평균 대비 이격을 한 표로 표시 |
| RSI | 14기간 Wilder 평활 | 0~100 값, 30·70 참고 구간과 해석 |
| MACD | EMA12−EMA26, 신호 EMA9 | MACD·신호선·히스토그램을 함께 표시 |
| 볼린저 밴드 | SMA20 ± 종가 모집단 표준편차 × 2 | 상·중·하단, %B, 밴드폭 |

## 계산 정의

- 모든 지표는 API Close의 유효 일봉을 시간순으로 정렬한 뒤 계산합니다.
- RSI는 첫 14개 가격 변화의 상승폭·하락폭 단순평균으로 시작하고 이후 Wilder 방식으로 갱신합니다.
  최소 15개 종가가 필요합니다. 하락폭 평균만 0이면 100, 상승폭 평균만 0이면 0,
  둘 다 0인 완전 횡보는 이 도구에서 50으로 처리합니다.
- EMA는 해당 기간의 단순평균으로 초기화한 뒤 평활계수 2/(기간+1)를 적용합니다.
  MACD는 최소 26개, 신호선·히스토그램은 최소 34개 종가가 필요합니다.
- 히스토그램은 MACD−신호선입니다. 부호는 현재 선의 위·아래 관계이며 최근 교차 발생을 뜻하지 않습니다.
- 볼린저 중심은 SMA20, 표준편차는 분모 20인 모집단 방식입니다.
  %B = (현재가−하단)/(상단−하단)×100, 밴드폭 = (상단−하단)/중심×100입니다.
  0으로 나누게 되는 값은 미확인으로 둡니다.
- 필요한 이력이 없거나 이전 JSON에 지표 필드가 없으면 —로 표시합니다.
- 수집한 2년치 종가로 계산합니다. 화면의 90개 일봉 차트만으로 다시 계산하지 않습니다.
- EMA 초기값·이력 길이·가격의 배당/분할 처리·장중 봉 때문에 다른 서비스와 값이 다를 수 있습니다.
- 값은 JSON과 HTML 및 CSV에 포함됩니다. 일반 Markdown 요약 표는 기존 구성을 유지합니다.
- Telegram 본문은 기존 시장·섹터 요약을 유지하며, 전송 ZIP 안 HTML에서 새 세부 지표를 확인합니다.

## 해석

이동평균은 추세를 완만하게 보여주지만 가격 변화를 뒤따릅니다.
RSI의 70 이상·30 이하는 보통 과매수·과매도 참고 구간으로 사용되며 강한 추세에서 오래 유지될 수 있습니다.
MACD는 최근 가격 모멘텀의 상대적 변화를, 볼린저 밴드는 최근 가격 분산을 살펴보는 도구입니다.
밴드 접촉이나 특정 RSI 값 하나만으로 반전이나 매매 시점이 확정되는 것은 아닙니다.
지수·금리·환율에 계산된 값은 각 원본 단위 기준으로 읽습니다.

## 검증과 참고

Wilder RSI 예제의 초기·후속 평활값, 연속 상승·하락·횡보, 짧은 이력,
선형 가격의 MACD·신호선과 모집단 표준편차를 이용한 밴드 값을 검증했습니다.
2026-11-16에 222개 항목 수집과 브라우저 세부 화면·설명 펼치기·모바일 배치를 확인했습니다.

- [RSI — Fidelity](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/RSI)
- [RSI 계산 — StockCharts](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi)
- [MACD — Fidelity](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/macd)
- [볼린저 밴드 — Fidelity](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/bollinger-bands)
