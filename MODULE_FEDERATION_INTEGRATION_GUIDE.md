# 🚀 설문온 대메뉴 독립 배포 & 실시간 통합 가이드 (2안: Module Federation + IIS 가상 디렉터리)

> **목적**: 각 대메뉴(예: 실사관리 `fieldManagement`) 개발자의 소스를 메인 프로젝트(`surveyon`)에 수동으로 복붙하지 않고, **IIS 가상 디렉터리(`/field_management/`)에 각각 독립 배포**하면서도 **메인 서버의 공통 사이드바·모달·챗봇 안으로 새로고침(깜빡임) 없이 실시간 연동**하는 표준 가이드입니다.

---

## 📌 1. 작동 원리 및 구조

```text
[브라우저 화면 - 단일 SPA처럼 동작 (페이지 새로고침 없음)]
┌──────────────────┬─────────────────────────────────────────────────────────┐
│ 좌측 공통 사이드바 │ 우측 메인 본문 영역 (<Outlet />)                         │
│ (내 메인 서버 관리)│  👉 /field_management/assets/remoteEntry.js             │
│ + 프로젝트 모달   │     (IIS 가상 디렉터리에 배포된 상대방 빌드 파일을        │
│ + AI 챗봇        │      런타임에 실시간으로 불러와 본문 영역에만 렌더링!)    │
└──────────────────┴─────────────────────────────────────────────────────────┘
```

### 서버 폴더 및 IIS 가상 디렉터리 구조
- **내 메인 프로젝트 배포 폴더**: `D:\web\surveyon_main\` (루트 `/`)
- **실사관리 개발자 배포 폴더**: `D:\web\surveyon_field\` (내 폴더 바깥의 독립된 폴더)
- **IIS 관리자 설정**:
  - 사이트 우클릭 → **[가상 디렉터리 추가]**
  - **별칭(Alias)**: `field_management`
  - **실제 경로(Physical Path)**: `D:\web\surveyon_field`

### 핵심 장점 4가지
1. **소스 수동 병합 불필요 & 배포 완전 독립**: 내가 메인 서버를 재배포해도 상대방 폴더가 지워지지 않고, 상대방이 실사관리 화면을 수정해 자기 폴더에만 배포해도 내 메인 서버 재빌드 없이 즉시 반영됩니다.
2. **공통 사이드바/모달/챗봇 중앙 통제**: 바깥 껍데기(`<AppLayout>`, 사이드바, 프로젝트 선택 모달, AI 챗봇)는 내 메인 서버 것 하나만 계속 떠 있으므로, 내가 사이드바를 수정해 메인 서버만 배포하면 상대방이 재빌드하지 않아도 실사관리 화면에 즉시 반영됩니다.
3. **페이지 새로고침(깜빡임) 제로**: `window.location.href`가 아니라 React Router의 `navigate()`로 이동하므로 화면 깜빡임이 전혀 없습니다.
4. **복잡한 `web.config` 수정 불필요**: 브라우저 라우팅은 내 메인 서버(`/index.html`)가 처리하고, 가상 디렉터리에서는 실제 물리 파일(`/field_management/assets/remoteEntry.js`)만 가져오므로 IIS URL Rewrite 충돌이 없습니다.

---

## 📌 2. 실사관리 개발자에게 전달할 AI 프롬프트 (복붙용)

실사관리 개발자분께 아래 프롬프트를 전달하여 본인 프로젝트에서 실행 후 빌드(`npm run build`)한 `dist` 폴더 내용물을 테스트 서버의 `/field_management` 가상 디렉터리 폴더에 올리도록 안내합니다.

````text
[AI 테스트 서버 Module Federation(remoteEntry.js) 연동 세팅 프롬프트]
지금 이 실사관리(fieldManagement) 프로젝트를 빌드해서 설문온 테스트 서버의 `/field_management/`(IIS 가상 디렉터리)에 올리고, 메인 설문온 서버의 `<AppLayout service="fieldManagement">` 본문 영역 안으로 Module Federation(`@originjs/vite-plugin-federation`)을 통해 실시간 연동하려고 해.
로컬에서 단독 개발(`npm run dev`)할 때는 지금처럼 사이드바가 포함된 화면으로 개발하고, 빌드(`npm run build`)할 때는 메인 서버가 불러갈 수 있는 `remoteEntry.js`가 생성되도록 아래 순서대로 정확히 세팅해 줘:

1. 패키지 업데이트 및 Module Federation 플러그인 설치:
   - 최신 공통 패키지 업데이트:
     npm install git+https://github.com/woojungeun97/surveyon-theme.git
   - Vite Module Federation 플러그인 설치:
     npm install @originjs/vite-plugin-federation --save-dev

2. 메인 서버 본문 주입용 엔트리 컴포넌트(`src/RemoteFieldApp.jsx`) 생성:
   - 메인 서버에는 이미 바깥에 `<AppLayout service="fieldManagement">`와 좌측 사이드바, 챗봇, 전역 모달/스피너 Provider가 떠 있어.
   - 따라서 `<AppLayout>` 없이 순수하게 실사관리 내부 페이지 `<Routes>`만 렌더링하는 `src/RemoteFieldApp.jsx`를 만들어 줘.
   - 주의: 메인 서버의 `/field_management/*` 라우트 아래에 마운트되므로, `src/RemoteFieldApp.jsx` 내부의 `<Route path="...">`는 앞에 `/field_management/`를 뺀 상대 경로(예: `path="/"`, `path="analysis/progress"`, `path="analysis/quota"`, `path="*"`)로 매칭되게 작성해 줘.
   - 또한 메인 서버 사이드바에서도 실사관리 좌측 메뉴 구성을 자동으로 받아갈 수 있도록 `export const fieldMenuGroups = [...]`도 함께 named export 해 줘.

   [src/RemoteFieldApp.jsx 예시 구조]
   ```jsx
   import React from 'react';
   import { Routes, Route, Navigate } from 'react-router-dom';
   // 현재 프로젝트에서 개발한 실사관리 페이지 컴포넌트들 import
   // (각 페이지 내부의 <PageContainer>는 그대로 유지!)

   export const fieldMenuGroups = [
     // 현재 App.jsx의 sidebarProps.menuGroups 배열과 동일하게 작성
     // (주의: menuGroups 안의 각 메뉴 path는 '/field_management/...'로 시작하는 전체 경로 유지)
   ];

   export default function RemoteFieldApp() {
     return (
       <Routes>
         <Route path="/" element={<Navigate to="analysis/progress" replace />} />
         <Route path="analysis/progress" element={<첫번째화면컴포넌트 />} />
         {/* 추가 실사관리 화면 라우트들 (상대 경로) */}
         <Route path="*" element={<Navigate to="analysis/progress" replace />} />
       </Routes>
     );
   }
   ```

3. `vite.config.js`에 `federation` 및 `build` 설정 적용:
   - `base: '/field_management/'`를 유지하고, `@originjs/vite-plugin-federation`을 아래와 같이 설정해 줘:
   ```javascript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import federation from '@originjs/vite-plugin-federation';
   import { fileURLToPath, URL } from 'node:url';

   export default defineConfig({
     base: '/field_management/',
     plugins: [
       react(),
       federation({
         name: 'fieldManagementApp',
         filename: 'remoteEntry.js',
         exposes: {
           './RemoteFieldApp': './src/RemoteFieldApp.jsx',
         },
         shared: ['react', 'react-dom', 'react-router-dom', 'react-redux', 'react-query'],
       }),
     ],
     resolve: {
       alias: {
         '@': fileURLToPath(new URL('./src', import.meta.url)),
       },
       dedupe: ['react', 'react-dom', 'react-router-dom', 'react-redux'],
     },
     optimizeDeps: {
       exclude: ['surveyon-common'],
       include: [
         'prop-types',
         'crypto-js',
         'moment',
         'html2canvas',
         'axios',
         'react-cookie',
         'redux',
         'redux-persist',
         '@reduxjs/toolkit',
       ],
     },
     build: {
       target: 'esnext',
       modulePreload: false,
       cssCodeSplit: false,
     },
     server: {
       port: 5173,
       proxy: {
         '^/APIs': { target: 'https://stest.hrc.kr', changeOrigin: true, secure: false },
         '^/o': { target: 'https://stest.hrc.kr', changeOrigin: true, secure: false },
         '/api': { target: 'https://hpropublic.hrcglobal.com', changeOrigin: true, secure: true },
       },
     },
   });
   ```

4. 프로젝트 변경 이벤트(`pageSelected`) 및 세션 스토리지 연동 점검:
   - 메인 서버의 좌측 사이드바에서 프로젝트를 변경하면 `sessionStorage`의 `projectnum`, `merge_pn`, `projectname`이 갱신되고 `window.dispatchEvent(new Event("pageSelected"))`가 발생해.
   - 실사관리 화면에서 API 호출 시 고정된 프로젝트 번호가 아니라 `sessionStorage.getItem("projectnum")` 또는 `sessionStorage.getItem("merge_pn")`을 읽어서 호출하고, `window.addEventListener("pageSelected", ...)` 발생 시 데이터를 재조회하는지 확인해 줘.

5. 빌드 검증:
   - `npm run build`를 실행해서 에러가 0건인지 확인하고, `dist/assets/remoteEntry.js` 파일이 정상적으로 생성되었는지 확인해서 알려줘.
````

---

## 📌 3. 내 메인 프로젝트(`surveyon`)에서 수정해야 할 부분 (4단계)

### 1단계: Module Federation 플러그인 설치
```bash
npm install @originjs/vite-plugin-federation --save-dev
```

### 2단계: `vite.config.js`에 `remotes` 설정 추가
```javascript
// vite.config.js 상단 import 추가
import federation from "@originjs/vite-plugin-federation";

// plugins 배열에 federation 추가 및 build.target 지정
plugins: [
    react(),
    federation({
        name: "surveyonHost",
        remotes: {
            // 테스트/운영 서버의 IIS 가상 디렉터리(/field_management)에 배포된 remoteEntry.js 연결
            fieldManagementApp: "/field_management/assets/remoteEntry.js",
        },
        shared: ["react", "react-dom", "react-router-dom", "react-redux", "react-query"],
    }),
],
build: {
    target: "esnext",
},
```
> **💡 로컬 개발 팁**: 내 로컬 PC(`localhost:5173`)에서 테스트 서버(`https://stest.hrc.kr/field_management/...`)에 배포된 실사관리 화면을 바로 불러와 확인하고 싶다면, `vite.config.js`의 `server.proxy` 안에 아래 한 블록만 추가하면 됩니다:
> ```javascript
> "^/field_management/assets": {
>     target: "https://stest.hrc.kr",
>     changeOrigin: true,
>     secure: false,
> },
> ```

### 3단계: `src/services/fieldManagement/index.jsx`에서 원격 화면 + 원격 사이드바 메뉴 연결
상대방이 `RemoteFieldApp.jsx`에서 `default export`(본문 라우트)와 `fieldMenuGroups`(좌측 메뉴 구성)를 함께 export하므로, 아래와 같이 불러오면 **상대방이 메뉴를 추가할 때도 내 사이드바에 자동으로 반영**됩니다:

```jsx
import React, { Suspense, lazy, useState, useEffect } from "react";
import { AppLayout } from "@/components/common/layout";

// IIS 가상 디렉터리(/field_management/assets/remoteEntry.js)에서 실사관리 모듈 로드
const RemoteFieldApp = lazy(() =>
    import("fieldManagementApp/RemoteFieldApp").then((mod) => {
        // 원격 모듈에 fieldMenuGroups가 정의되어 있으면 이벤트로 전달
        if (mod.fieldMenuGroups) {
            window.__FIELD_REMOTE_MENU_GROUPS__ = mod.fieldMenuGroups;
            window.dispatchEvent(new Event("fieldRemoteMenuLoaded"));
        }
        return mod;
    })
);

export default function FieldManagementRoutes() {
    const [remoteMenuGroups, setRemoteMenuGroups] = useState(
        () => window.__FIELD_REMOTE_MENU_GROUPS__ || null
    );

    useEffect(() => {
        const handleMenuLoaded = () => {
            if (window.__FIELD_REMOTE_MENU_GROUPS__) {
                setRemoteMenuGroups(window.__FIELD_REMOTE_MENU_GROUPS__);
            }
        };
        window.addEventListener("fieldRemoteMenuLoaded", handleMenuLoaded);
        return () => window.removeEventListener("fieldRemoteMenuLoaded", handleMenuLoaded);
    }, []);

    const sidebarProps = remoteMenuGroups ? { menuGroups: remoteMenuGroups } : {};

    return (
        <AppLayout service="fieldManagement" sidebarProps={sidebarProps}>
            <Suspense fallback={<div style={{ padding: "24px", color: "#64748b" }}>실사관리 화면을 불러오는 중입니다...</div>}>
                <RemoteFieldApp />
            </Suspense>
        </AppLayout>
    );
}
```

### 4단계: 메인 프로젝트의 Context & Redux Store `globalThis` 싱글톤 동기화 (필수)
원격 화면(`RemoteFieldApp`) 내부에서 사용하는 `modalContext`, `loadingSpinnerContext`, Redux `store`가 내 메인 프로젝트와 100% 동일한 인스턴스를 바라보도록 메인 프로젝트의 아래 4개 파일에 `surveyon-common`과 동일한 `globalThis` 싱글톤 가드를 적용합니다:

1. **`src/components/common/LoadingSpinner.jsx` (6행)**:
   ```javascript
   export const loadingSpinnerContext =
     globalThis.__SURVEYON_LOADING_CONTEXT__ ??
     (globalThis.__SURVEYON_LOADING_CONTEXT__ = createContext(null));
   ```
2. **`src/components/common/Modal.jsx` (8행)**:
   ```javascript
   export const modalContext =
     globalThis.__SURVEYON_MODAL_CONTEXT__ ??
     (globalThis.__SURVEYON_MODAL_CONTEXT__ = createContext(null));
   ```
3. **`src/common/redux/store/Store.jsx`**:
   ```javascript
   import { createStore } from "redux";
   import persistedReducer from "../reducer/RootReducers";

   const store =
     globalThis.__SURVEYON_REDUX_STORE__ ??
     (globalThis.__SURVEYON_REDUX_STORE__ = createStore(persistedReducer));

   export default store;
   ```
4. **`src/common/redux/store/StorePersist.jsx`**:
   ```javascript
   import store from "./Store";
   import { persistStore } from "redux-persist";

   export const persistor =
     globalThis.__SURVEYON_REDUX_PERSISTOR__ ??
     (globalThis.__SURVEYON_REDUX_PERSISTOR__ = persistStore(store));
   ```

