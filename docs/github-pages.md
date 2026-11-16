# GitHub Pages 전환 준비

## 현재 확인 결과

현재 계정과 비공개 저장소의 Pages 설정에서 업그레이드 또는 저장소 공개가 필요하다는 제한을 확인했습니다.
추가 비용 $0을 유지하려면 공개 저장소가 필요합니다.
Pages 사이트는 일반적으로 누구나 볼 수 있으므로 게시 전에 공개 범위를 확정해야 합니다.

## 준비한 내용

`node scripts/prepare-pages.mjs`는 현재 시장 보고서를 `public-site/index.html`로 내보냅니다.
사이트에는 공개 시장 조회 필드만 포함하고, 개인 운용 비중·계좌·토큰·임의 추가 필드와 내부 오류 본문을 제외합니다.
원본 보고서 자체에도 비밀정보를 넣지 않아야 합니다. 이 스크립트는 임의의 비밀 문자열을 자동 탐지하는 도구는 아닙니다.
생성만 하며 저장소 공개 전환·외부 게시·Telegram 설정 변경은 수행하지 않습니다.

## 권장 구성과 남은 단계

1. 기존 investment-monitor는 비공개로 유지합니다.
2. 별도 공개 저장소 investment-monitor-pages에 게시할 index.html과 .nojekyll만 둡니다.
3. 사용자가 공개 게시를 승인하면 Pages 설정과 최초 게시를 진행합니다.
4. 비공개 수집 워크플로에서 공개 저장소로 결과만 갱신하도록 제한된 쓰기 자격증명을 연결합니다.
5. 오전 8시 갱신과 휴대폰 접속을 검증한 뒤 Telegram 정기 전송을 중지합니다.

게시 후 예상 주소는 https://mtljm.github.io/investment-monitor-pages/ 이며 아직 활성화되지 않았습니다.
Pages는 정적 호스팅이므로 웹페이지 새로고침으로 수집 코드를 실행하지 않습니다.
수동 수집은 기존 GitHub Actions 버튼을 유지할 수 있습니다.

[Pages 제공 범위](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) · [사이트 생성과 공개 범위](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
