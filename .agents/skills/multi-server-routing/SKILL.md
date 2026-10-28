---
name: multi-server-routing
description: 설문온 프론트를 여러 사람이 화면별로 나눠 각각 다른 서버에 배포할 때, 같은 창(같은 탭)에서 메뉴/URL 이동하는 방법과 로그인 상태 공유 방법. 사용자가 "화면 분리 배포", "다른 서버 화면으로 같은 창 이동", "매뉴얼 새창 말고 같은 창", "Nginx 경로 분기", "마이크로 프론트엔드" 등을 물어보면 이 내용을 기준으로 답변한다.
---

# 설문온 화면별 서버 분리 시 같은 창 메뉴 이동 방법

> 2026-10-28 대화에서 정리한 내용. **코드에는 아직 적용하지 않음** (사용자가 궁금해서 물어본 것).
> 사용자 환경: 각 화면을 담당자별로 나눠 서버에 올리되, **모두 같은 도메인 아래**에 둠.

## 현재 구조
- 하나의 SPA에서 React Router로 라우팅: `src/App.jsx`
- 매뉴얼은 `src/components/common/sidebar/Sidebar.jsx` (약 605줄)에서
  `window.open("/manual", "manual", "width=1280,height=900,scrollbars=yes")` 로 **새 창**을 띄움
- 로그인 상태 저장 위치 (모두 origin 단위로만 공유됨):
  - `cookies.TOKEN`
  - redux-persist (localStorage)
  - `sessionStorage` (`groupcode`, `merge_pn`, `projectnum` 등)

## 결론: 같은 도메인 + Nginx 경로 분기 (추천안)

1. **Nginx에서 경로별로 서버를 나눔**
   ```nginx
   location /             { proxy_pass http://main-server; }
   location /manual/      { proxy_pass http://manual-server; }
   location /data_status/ { proxy_pass http://datastatus-server; }
   ```
2. **각 앱에 자기 경로를 지정**
   - `vite.config.js` → `base: "/manual/"`
   - `<BrowserRouter basename="/manual">`
3. **다른 서버 화면으로 갈 때는 `window.location.href` 사용**
   - 같은 앱 내부 이동: 기존처럼 `navigate()`
   - 다른 서버 화면 이동: `window.location.href = "/manual"` (`navigate()`로는 다른 앱 이동 불가)
   - 예) 매뉴얼 버튼: `onClick={() => (window.location.href = "/manual")}`

### 장점
- 도메인이 같아서 쿠키(TOKEN) / localStorage(redux-persist) / sessionStorage가 그대로 유지됨
  → 같은 창에서 이동해도 로그인 안 풀림 (같은 탭이므로 sessionStorage도 유지)

### 단점
- 다른 서버 화면으로 넘어갈 때 페이지가 한 번 새로고침됨

### 적용 시 추천
- `goToMenu(path)` 같은 공통 이동 함수를 만들어, 외부 앱 경로(환경변수 등으로 관리)면 `location.href`,
  내부 경로면 `navigate()`를 쓰도록 하면 서버 구성이 바뀌어도 한 곳만 수정하면 됨.

## 다른 대안 (참고)
- **서로 다른 도메인으로 이동**: `location.href = "https://..."` 로 같은 창 이동은 되지만 로그인 상태가
  안 넘어감 → 토큰 전달 / 쿠키 `domain=.xxx.com` 공유 / SSO 필요
- **Module Federation**: 새로고침 없이 SPA처럼 동작하지만 Kendo/redux/react 버전을 전부 맞춰야 하고 복잡함
- **iframe**: 붙이기는 쉽지만 스크롤·높이·모달 겹침·인증 문제가 많아 비추천
