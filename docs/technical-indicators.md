# 기술적 지표

종목 세부 화면에서 MA를 한 표로 비교하고, 각 지표의 **계산 방법과 뜻**을 펼쳐 읽습니다.

| 지표 | 계산 | 읽는 법 |
| --- | --- | --- |
| MA20·50·200 | 최근 20·50·200개 종가의 단순평균(SMA) | 단기·중기·장기 흐름 비교 |
| MA 이격 | (현재가/MA−1)×100 | 양수면 평균 위, 음수면 아래 |
| RSI(14) | 상승·하락폭 평균의 비율을 0~100으로 환산 | 70 이상·30 이하는 과매수·과매도 참고 구간 |
| MACD | EMA12−EMA26 | 두 이동평균의 차이로 모멘텀 확인 |
| 신호선·히스토그램 | MACD의 EMA9 / MACD−신호선 | 현재 두 선의 위·아래 관계 확인 |
| 볼린저 밴드(20,2) | MA20 ± 종가 모집단 표준편차×2 | 최근 가격 분산·변동 범위 확인 |
| %B | (현재가−하단)/(상단−하단)×100 | 하단 0%, 상단 100%; 범위 밖도 가능 |
| 밴드폭 | (상단−하단)/중심×100 | 중심 대비 밴드 너비 |

## 계산 세부 기준

- **RSI:** 첫 14개 변화의 상승·하락폭 단순평균으로 시작한 뒤 Wilder 평활을 적용합니다. 최소 종가 15개가 필요합니다. 상승폭만 있으면 100, 하락폭만 있으면 0, 둘 다 0이면 이 도구에서는 50입니다.
- **EMA:** 같은 기간의 SMA로 초기화하고 평활계수 2/(기간+1)를 적용합니다. MACD는 종가 26개, 신호선·히스토그램은 34개부터 계산합니다.
- **볼린저:** 표준편차의 분모는 20입니다. 0으로 나누는 값은 미확인으로 둡니다.
- 수집한 2년치 유효 일봉 Close를 시간순으로 사용합니다. 화면의 90개 봉만으로 재계산하지 않습니다.
- 이력 부족·이전 JSON의 누락 필드는 —로 표시합니다. 값은 JSON·HTML·CSV에 포함되며 Telegram ZIP의 HTML에서도 확인합니다.

MA는 후행하며, 강한 추세에서는 RSI의 극단 구간이 지속될 수 있습니다.
MACD의 위·아래 관계는 방금 교차했다는 뜻이 아니고, 밴드 접촉도 반전을 확정하지 않습니다.
지표 하나로 매매를 결정하지 않습니다. 지수·금리·환율은 각 원본 단위로 읽습니다.
초기값·이력 길이·장중 봉·배당 및 분할 처리에 따라 다른 서비스와 값이 다를 수 있습니다.

## 참고

[RSI](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/RSI) · [RSI 계산](https://chartschool.stockcharts.com/table-of-contents/technical-indicators-and-overlays/technical-indicators/relative-strength-index-rsi) · [MACD](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/macd) · [볼린저 밴드](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/bollinger-bands)


## 기술적 분석 탭

- 대상: S&P 500(SPX, ^GSPC), 나스닥100(^NDX), 시가총액 스냅샷 상위 20개.
- 추세: SMA20·50·200의 정렬과 현재가 위치. MA는 통칭, SMA는 단순 이동평균입니다. EMA20은 SMA20으로 초기화합니다.
- OBV: 첫 유효 봉 0에서 시작해 상승일 거래량을 더하고 하락일은 뺍니다. 동일 종가는 변화 0. 20거래 관측치의 OBV 변화 및 총거래량 대비 순방향 비율을 표시합니다. 결측·음수 거래량 또는 최근 20개 모두 0이면 산출하지 않습니다. 지수는 SPY·QQQ 거래량 대용을 명시합니다.
- 피보나치: 최근 60개 유효 일봉의 고가 최댓값·저가 최솟값으로 기준을 잡습니다. 동률 극값은 가장 최근 봉을 선택합니다. 고점이 뒤면 고점에서 하향 되돌림, 저점이 뒤면 저점에서 상향 되돌림입니다. 0·23.6·38.2·50·61.8·78.6·100%를 표시합니다. 동일 봉 양극값·평탄 범위·60개 미만은 산출하지 않습니다. 현재가 이하 최근접 선을 잠재 지지, 초과 최근접 선을 잠재 저항으로 표시합니다. 60일 범위 내 위치 비율과 되돌림 비율은 서로 다릅니다.
- 종합 문구: 상승/하락 정렬, RSI, 밴드 위치로 규칙 분류하고 OBV 충돌과 지지·저항을 함께 설명합니다. 70/30과 상·하단 이탈은 과열/과매도 경고를 우선하며, 20/80은 자체 밴드 근접 기준입니다. 결측은 0으로 대체하지 않습니다.

일봉 장중 값·시세 지연·분할 처리·자동 극값 선정에 따라 해석이 달라집니다. 적정 기업가치·목표 주가·매매 추천을 산출하지 않습니다.

정의 참고: [Fidelity OBV](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/obv), [Fibonacci](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/fibonacci-retracement). 기준 기간·종합 평가는 이 도구의 자체 규칙입니다.
