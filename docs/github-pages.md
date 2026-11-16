# GitHub Pages 운영

**접속 주소:** https://mtljm.github.io/investment-monitor/

- 공개 저장소 `main`에서 GitHub Actions로 생성한 시장 화면만 Pages에 게시합니다.
- 매일 한국시간 오전 8시 목표로 대형주 200개와 지수·지표·ETF 22개를 수집합니다.
- 예약 실행은 지연·누락될 수 있습니다. 휴장일에는 최근 거래일 자료를 표시합니다.
- 휴대폰에서 주소를 열면 됩니다. 새로고침 자체는 수집 코드를 실행하지 않습니다.
- 수동 갱신: Actions → **Pages 시장 대시보드** → **Run workflow**.

## 배포와 실패 처리

`.github/workflows/daily-pages.yml`은 검증 → 새 데이터 수집 → 공개 HTML 생성 → 배포 순서로 실행합니다.
수집에 실패하면 배포하지 않고 기존 사이트를 유지합니다. 화면의 수집 시각과 Actions 결과를 확인하세요.
결과를 Git에 자동 커밋하지 않으므로 저장소의 `reports/latest.json`과 실제 사이트 수집 시각은 다를 수 있습니다.

## 비용과 공개 범위

공개 저장소의 표준 Linux 실행기와 무료 GitHub Pages만 사용합니다.
유료 실행기·캐시·외부 서버·추가 토큰은 사용하지 않고, 실행 시간 제한과 아티팩트 보관 1일을 적용합니다.
기존 예산 차단 설정을 유지합니다.

사이트에는 시장 데이터만 게시하지만 **저장소 코드와 커밋 이력도 공개**입니다.
보유 수량·계좌번호·토큰은 커밋하지 마세요. 인증정보는 GitHub Secrets로 관리합니다.
배포 권한은 deploy 작업의 `pages: write`, `id-token: write`로 제한합니다.

[Pages 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
