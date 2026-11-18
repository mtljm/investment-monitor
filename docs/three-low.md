# 3저 전환 · 기술주 포착

시장개요의 주요 시장지표 아래에 표시합니다. 기술주 조건표와 상세 기준·출처는 펼쳐서 볼 수 있으며 별도 탭은 사용하지 않습니다.

호황이나 상승을 확정하는 지표가 아니라 상대적 환경과 기술 조건을 함께 관찰하는 자체 규칙입니다. 수익률 검증·기업 실적·밸류에이션은 포함하지 않습니다.

- 약달러: `DX-Y.NYB` < SMA50, 20일 변화 ≤ −1%.
- 저유가 전환: WTI 연속 선물 `CL=F` < SMA50, 20일 변화 ≤ −5%. 현물과 다르며 롤오버 영향을 받습니다.
- 저금리 전환: 미국 10년물 수익률 `^TNX` < SMA50, 20일 변화 ≤ −20bp. 수익률의 % 변화가 아닌 금리 수준 차이를 bp로 계산합니다(0.1bp 단위 반올림).
- 위험회피 확인: SPX > SMA200, QQQ > SMA50 및 20일 상승, VIX < 25. 금리·유가 동반 하락이 경기 둔화와 겹칠 수 있어 이 조건이 안 맞으면 포착을 보류합니다.
- 기술 조건 6개: 종가 > SMA20 > SMA50 > SMA200, RSI 45~68, SMA20 이격 0~8%, 20일 QQQ 대비 수익률 차이 > 0%p, 거래량 1.1배 이상, 20일 OBV 순증. 모두 만족해야 포착합니다. OBV는 가격 방향에 부호를 붙인 거래량이며 실제 자금 유입액이 아닙니다.
- 표본: 현재 수집된 대형주 내 IT 6개. GOOGL·META·AMZN 플랫폼 표본 3개를 선택해 포함할 수 있습니다. 업종 전체를 자동 대표하는 목록이 아닙니다.
- 누락·오래된 시세·수집 지연·지표 이력 부족은 판정/포착 보류합니다. 미충족과 자료 부족을 구분합니다.
- 기존 미국장 수집 때 DXY·WTI만 2개 추가 요청합니다. 금리·QQQ·VIX·기술주는 기존 데이터를 재사용하며, 43개 기본 표 범위는 유지합니다. 조건과 표본은 `config/three-low.json`에서 관리합니다.

출처: [달러지수 ICE](https://www.ice.com/fixed-income-data-services/index-solutions/currency-indices), [WTI CME](https://www.cmegroup.com/markets/energy/wti-crude-oil-futures.html), [연준 금리 전달 경로](https://www.federalreserve.gov/monetarypolicy/monetary-policy-what-are-its-goals-how-does-it-work.htm).
