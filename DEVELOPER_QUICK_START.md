# ⚡ 설문온(SulmunOn) 프론트엔드 개발자 퀵스타트 가이드

> **이 문서는 설문온 신규 서비스 또는 화면을 개발하는 개발자를 위한 실전 퀵스타트 가이드입니다.**  
> 아래 순서대로 설정을 마치면 **5분 안에 설문온 표준 레이아웃과 테마가 적용된 개발 환경을 구축**할 수 있습니다.
>
> **📚 설문온 공식 문서 읽는 순서 (3대 가이드)**
> 1. **`DEVELOPER_QUICK_START.md` (본 문서)**: 프로젝트 설치 → 환경 세팅 → 기본 화면·API·모달 템플릿 따라 하기
> 2. **`AI_CODING_RULES.md`**: AI 에이전트(Cursor, Antigravity, Claude 등)에게 코드 작성을 지시할 때 반드시 읽혀야 하는 **엄격한 제약조건(Strict Rules)**
> 3. **`THEME_DEVELOPMENT_GUIDE.md`**: 4대 테마 CSS 변수 상세, 크롤링 ID 전체 명세표, Jenkins CI/CD 및 Nginx 멀티서버 배포 아키텍처 심화 레퍼런스

---

## 📌 목차
1. [프로젝트 초기 설정 (패키지 설치)](#1-프로젝트-초기-설정-패키지-설치)
2. [필수 환경 설정 (라이센스, 폰트, 프록시)](#2-필수-환경-설정-라이센스-폰트-프록시)
3. [엔트리포인트 템플릿 (`main.jsx` & `App.jsx`)](#3-엔트리포인트-템플릿-mainjsx--appjsx)
4. [표준 화면 개발 템플릿 (`PageContainer` & Kendo Grid)](#4-표준-화면-개발-템플릿-pagecontainer--kendo-grid)
5. [공통 버튼 규격 (`cmn-btn`)](#5-공통-버튼-규격-cmn-btn)
6. [공통 API 통신 및 토큰 연동 (`api.get` / `api.post`)](#6-공통-api-통신-및-토큰-연동-apiget--apipost)
7. [전역 모달 및 로딩 스피너 사용법](#7-전역-모달-및-로딩-스피너-사용법)
8. [서비스별 분리 개발 및 라우팅 연동 안내](#8-서비스별-분리-개발-및-라우팅-연동-안내)
9. [실전 트러블슈팅 및 FAQ](#9-실전-트러블슈팅-및-faq)

---

## 1. 프로젝트 초기 설정 (패키지 설치)

### 1) 신규 Vite 프로젝트 생성 및 React 18 버전 고정
최신 `npm create vite@latest`는 React 19를 기본 설치하므로, `surveyon-common` 및 Kendo UI 호환을 위해 **`react`, `react-dom`을 반드시 `^18.2.0`으로 맞춰서 설치**합니다:
```bash
npm create vite@latest my-surveyon-app -- --template react
cd my-surveyon-app

# React 18 버전 고정 (React 19 사용 금지)
npm install react@^18.2.0 react-dom@^18.2.0
```

### 2) 설문온 공통 패키지 설치
터미널에서 아래 명령어로 사내 공통 라이브러리를 설치합니다:
```bash
# 사내 Git 저장소 기반 패키지 설치
npm install git+https://github.com/woojungeun97/surveyon-theme.git
```

---

## 2. 필수 환경 설정 (라이센스, 폰트, 프록시)

### 1) Kendo UI 라이선스 설정 (워터마크 영구 제거)
사내에서 별도로 전달받은 **`telerik-license.txt`** 파일을 프로젝트 루트 디렉토리에 복사해 두고, `.env` 파일을 생성하여 파일 안의 키 값을 등록합니다:

```env
TELERIK_LICENSE=<사내 배포된 telerik-license.txt 파일 내 라이선스 키 전체 문자열 입력>
```

이후 터미널에서 아래 명령어를 1회 실행하여 활성화합니다:
```bash
npx kendo-ui-license activate
```
> [!IMPORTANT]
> 개발 서버(`npm run dev`)가 켜져 있는 상태에서 활성화 명령을 실행하면 Vite 캐시로 인해 워터마크가 계속 남아있을 수 있습니다. 반드시 **개발 서버를 종료(`Ctrl+C`)한 후 다시 `npm run dev`를 실행**하세요.

---

### 2) 글로벌 스타일, 폰트 (`reset.css` & `SpoqaHanSansNeo`) 및 `index.html` 설정
`surveyon-common/assets/css/surveyon-theme.css`를 import하면 설문온 표준 서체인 **SpoqaHanSansNeo**와 `reset.css`(버튼 패딩/라인높이/자간 리셋), `common.css`, `kendo_custom.css`가 자동으로 함께 적용됩니다.

1. **`index.html` 초기 타이틀 및 파비콘 설정**:  
   `<AppLayout>`이 마운트될 때 설문온 공식 파비콘(Data URI)과 `<title>설문온</title>`을 자동 주입합니다. 초기 로딩 시 `/favicon.ico` 404 로그 없이 처음부터 설문온 아이콘이 표시되도록 `node_modules/surveyon-common/assets/images/favicon.svg`를 `public/favicon.svg`로 복사하고 `index.html`의 `<head>`를 아래와 같이 설정하세요:
   ```html
   <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
   <title>설문온</title>
   ```
2. **Vite 기본 CSS 초기화 (필수)**:
   > [!CAUTION]
   > Vite 초기 생성 시 기본으로 들어있는 `src/index.css`나 `src/App.css`에 `font-family: ... !important`나 `button { padding: ... }` 같은 스타일이 남아있으면 원본 서체(`SpoqaHanSansNeo`)와 사이드바 레이아웃이 깨집니다. **Vite 기본 `index.css`와 `App.css`의 내용은 비우거나 제거**하세요.

---

### 3) `vite.config.js` (ESM 호환, 훅 충돌 방지 & CORS 프록시)
최신 Vite(ESM `"type": "module"`) 환경에서 `__dirname` 에러가 나지 않도록 `fileURLToPath`를 사용하고, Git 패키지 연동 시 React 훅 충돌을 방지하는 `resolve.dedupe` 및 `optimizeDeps.include`를 함께 설정합니다:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // [중요] 통합 서버(Nginx/프록시) 하위 경로 연동 시 JS/CSS 에셋 충돌 방지를 위해
  // 담당 서비스의 표준 베이스 경로를 지정합니다. (예: '/data_status/', '/data_management/', '/ai_open_analysis/', '/field_management/')
  base: '/field_management/',
  plugins: [react()],
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
  server: {
    port: 5173,
    proxy: {
      // 설문온 백엔드 API 프록시 (CORS 방지)
      '^/APIs': {
        target: 'https://stest.hrc.kr',
        changeOrigin: true,
        secure: false,
      },
      '^/o': {
        target: 'https://stest.hrc.kr',
        changeOrigin: true,
        secure: false,
      },
      // 프로젝트 신규 등록(POF 조회)용 H-PRO API 프록시
      '/api': {
        target: 'https://hpropublic.hrcglobal.com',
        changeOrigin: true,
        secure: true,
      }
    }
  }
});
```

> [!TIP]
> **API 서버 도메인 설정 안내**:  
> `surveyon-common`의 `api` 모듈에는 설문온 표준 API 엔드포인트(`https://stest.hrc.kr/APIs/...`)가 기본 내장되어 있어 별도의 `public/config.js` 없이도 즉시 통신이 가능합니다.  
> 만약 접속 도메인별 런타임 분기가 필요한 경우에만 `public/config.js`를 사용하세요.

---

## 3. 엔트리포인트 템플릿 (`main.jsx` & `App.jsx`)

### 1) `src/main.jsx`
Redux 스토어, 테마 CSS, Kendo 한글 로케일 및 CLDR 데이터(`load`), 전역 모달을 초기화합니다.

```jsx
import '@progress/kendo-licensing';
import React, { Fragment } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from 'react-query';

// Kendo React 한글 로케일 및 CLDR 데이터 관련
import { IntlProvider, LocalizationProvider, loadMessages, load } from '@progress/kendo-react-intl';
import likelySubtags from 'cldr-core/supplemental/likelySubtags.json';
import currencyData from 'cldr-core/supplemental/currencyData.json';
import weekData from 'cldr-core/supplemental/weekData.json';
import bgNumbers from 'cldr-numbers-full/main/ko/numbers.json';
import bgLocalCurrency from 'cldr-numbers-full/main/ko/currencies.json';
import bgCaGregorian from 'cldr-dates-full/main/ko/ca-gregorian.json';
import bgDateFields from 'cldr-dates-full/main/ko/dateFields.json';
import deNumbers from 'cldr-numbers-full/main/de/numbers.json';
import deLocalCurrency from 'cldr-numbers-full/main/de/currencies.json';
import deCaGregorian from 'cldr-dates-full/main/de/ca-gregorian.json';
import deDateFields from 'cldr-dates-full/main/de/dateFields.json';

// 설문온 공통 코어 모듈
import { store, persistor, ModalProvider, LoadingProvider } from 'surveyon-common';
import kendoLanguage from 'surveyon-common/config/kendo/language.json';
import App from './App';

// [중요] 반드시 Kendo 기본 스타일(all.css)을 먼저 import하고, 그 아래에 surveyon-theme.css를 import하세요.
// 순서가 바뀌면 Kendo 기본 선택색(다홍/살구색 #ff6358)이 설문온 대메뉴 테마 선택색을 덮어씁니다.
import '@progress/kendo-theme-default/dist/all.css';
import 'surveyon-common/assets/css/surveyon-theme.css';

// Kendo CLDR 데이터 및 한글 언어팩 적용
load(
  likelySubtags,
  currencyData,
  weekData,
  bgLocalCurrency,
  bgNumbers,
  bgCaGregorian,
  bgDateFields,
  deLocalCurrency,
  deNumbers,
  deCaGregorian,
  deDateFields
);
loadMessages(kendoLanguage, 'ko');

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <Fragment>
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <LocalizationProvider language="ko">
          <IntlProvider locale="ko-KR">
            <LoadingProvider>
              <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                  <ModalProvider>
                    <App />
                  </ModalProvider>
                </BrowserRouter>
              </QueryClientProvider>
            </LoadingProvider>
          </IntlProvider>
        </LocalizationProvider>
      </PersistGate>
    </Provider>
  </Fragment>
);
```

### 2) `src/App.jsx` (기본 사용 및 좌측 메뉴 커스텀)
서비스 테마 키(`service`)를 전달하여 사이드바와 레이아웃을 연결합니다.  
해당 프로젝트만의 좌측 메뉴 구성이나 로고 클릭 동작을 바꾸고 싶다면 `sidebarProps={{ brand, menuGroups }}`를 전달하여 기본 메뉴를 덮어쓸 수 있습니다.

```jsx
import React, { useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppLayout } from 'surveyon-common';
import { Grid, ClipboardList, Trash2 } from 'lucide-react';
import MyScreenPage from './pages/MyScreenPage';

function App() {
  const navigate = useNavigate();

  // (선택) 프로젝트별 좌측 사이드바 메뉴 커스텀
  // 생략 시 surveyon-common에 내장된 해당 서비스의 기본 메뉴가 표시됩니다.
  const sidebarProps = useMemo(
    () => ({
      brand: {
        title: '서비스명',
        onClick: () => navigate('/my_service/main'),
      },
      menuGroups: [
        {
          label: '기본 메뉴', // 그룹 소제목 (불필요 시 '' 빈 문자열)
          items: [
            { label: '화면 1', path: '/my_service/main', icon: Grid },
            { label: '화면 2', path: '/my_service/sub', icon: ClipboardList },
            { label: '준비중 메뉴', icon: Trash2, isPending: true }, // isPending: true 시 '서비스 준비 중입니다' 알림 표시
          ],
        },
      ],
    }),
    [navigate]
  );

  return (
    <Routes>
      {/* 
        [4대 서비스 service 속성값]
        - 'hsrt'            : H-SRT (블루 테마)
        - 'dataManagement'  : 데이터관리 (그린 테마)
        - 'aiOpen'          : AI 오픈분석 (오렌지 테마)
        - 'fieldManagement' : 실사관리 (네이비 테마)
      */}
      <Route element={<AppLayout service="fieldManagement" sidebarProps={sidebarProps} />}>
        <Route path="/" element={<Navigate to="/field_management/analysis/progress" replace />} />
        <Route path="/field_management" element={<Navigate to="/field_management/analysis/progress" replace />} />
        <Route path="/field_management/analysis/progress" element={<MyScreenPage />} />
        {/* 메인 홈이나 공통 사이드바(☰)에서 기본 진입 경로로 넘어올 때 첫 화면으로 연결되도록 와일드카드 리다이렉트 추가 */}
        <Route path="/field_management/*" element={<Navigate to="/field_management/analysis/progress" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
```

> [!NOTE]
> **`<AppLayout>`에 기본 내장된 공통 기능 (별도 구현 불필요)**
> - **프로젝트 선택/등록 모달 (`ProjectSelectionModal`)**: 좌측 사이드바 상단의 **[프로젝트 변경]** 버튼을 클릭하면 프로젝트 목록 조회, 신규 등록(POF 연동), 프로젝트 병합 팝업이 자동으로 열립니다.
> - **플로팅 AI 챗봇 (`SurveyonAssistant`)**: 화면 우측 하단에 설문온 AI 챗봇 아이콘과 대화창이 자동으로 표시됩니다 (특정 화면에서 숨기려면 `<AppLayout hideAssistant={true}>` 전달).
> - **공식 파비콘 및 탭 타이틀**: 브라우저 탭의 설문온 아이콘(`favicon.svg`)과 기본 타이틀(`설문온`)이 자동 적용됩니다.

---

## 4. 표준 화면 개발 템플릿 (`PageContainer` & Kendo Grid)

설문온의 모든 화면은 `<PageContainer>`로 감싸며, 본문 그리드는 화면 높이를 100% 채우도록 작성합니다.

### 1) `surveyon-common`에서 바로 import 가능한 공통 컴포넌트 & API 목록
직접 구현하지 않고 `import { ... } from 'surveyon-common'`으로 즉시 꺼내 쓸 수 있는 모듈입니다:

| 분류 | Export 명칭 | 설명 및 용도 |
| :--- | :--- | :--- |
| **레이아웃** | `AppLayout`, `PageContainer`, `PageHeader`, `PageFooter`, `AppSidebar` | 4대 대메뉴 표준 프레임, 상단 타이틀/검색/액션 바, 좌측 사이드바 |
| **그리드 & 유틸** | `KendoGrid`, `KendoGridV2`, `KendoGridV3`, `GridData`, `ExcelColumnMenu`, `GridDataCount` | 설문온 표준 Kendo Grid 래퍼, 엑셀식 컬럼 필터 메뉴, 상단 `전체 N건 \| 선택 N건` 카운터 |
| **공통 모달 & 챗봇** | `ProjectSelectionModal`, `ProPermissionModal`, `NewDataModal`, `PageListPopup`, `SurveyonAssistant` | 프로젝트 선택/등록 모달, 권한 관리 모달, 데이터 추가 모달, H-SRT 페이지 설정 팝업, AI 챗봇 |
| **전역 상태 & 통신** | `api`, `store`, `persistor`, `ModalProvider`, `modalContext`, `LoadingProvider`, `loadingSpinnerContext` | 토큰 자동 주입 Axios 래퍼, Redux Persist 스토어(싱글톤), 전역 알림/확인 모달 및 로딩바 |
| **내장 API 훅** | `MainListApi`, `ProEnterApi`, `ProPermissionApi`, `VariablePageApi`, `ChatApi` | 프로젝트 목록/등록/권한, 변수/페이지 설정, AI 챗봇 백엔드 통신 훅 |

### 2) 기본 화면 코드 예시 (`MyScreenPage.jsx`)

```jsx
import React, { useState, useContext } from 'react';
import { PageContainer, modalContext, loadingSpinnerContext } from 'surveyon-common';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Plus, Download, Trash2 } from 'lucide-react';

const MyScreenPage = () => {
  const modal = useContext(modalContext);
  const loading = useContext(loadingSpinnerContext);

  const [dataList, setDataList] = useState([
    { id: 1, title: '2026년 상반기 브랜드 조사', manager: '김담당', status: '진행중' },
    { id: 2, title: '고객 만족도 종합 집계', manager: '이관리', status: '완료' },
  ]);

  // 상단 검색 콜백
  const handleSearch = (keyword) => {
    console.log('검색어:', keyword);
  };

  // 상단 저장 버튼 콜백
  const handleSave = async () => {
    modal.showConfirm('확인', '현재 설정을 저장하시겠습니까?', {
      btns: [
        { title: '취소' },
        {
          title: '저장',
          click: async () => {
            try {
              loading.show();
              // API 저장 로직 수행
              modal.showAlert('알림', '성공적으로 저장되었습니다.');
            } catch (err) {
              // 첫 번째 인자는 에러코드(status), 두 번째 인자는 에러 메시지
              modal.showErrorAlert('ERR', '저장 처리 중 문제가 발생했습니다.');
            } finally {
              loading.hide();
            }
          }
        }
      ]
    });
  };

  // 삭제 버튼 콜백
  const handleDelete = () => {
    modal.showConfirm('삭제 확인', '선택한 항목을 삭제하시겠습니까?');
  };

  return (
    <PageContainer
      title="실사 진행 현황"
      infoTooltip="실사 프로젝트 진행 상태 및 필드 데이터를 관리하는 화면입니다."
      onSearch={handleSearch}
      searchPlaceholder="조사명 검색..."
      onSave={handleSave}
      saveLabel="저장"
      headerActions={
        <>
          <button type="button" className="cmn-btn cmn-btn-outline">
            <Plus size={15} />
            <span>신규 등록</span>
          </button>
          <button type="button" className="cmn-btn cmn-btn-secondary">
            <Download size={15} />
            <span>다운로드</span>
          </button>
          <button type="button" className="cmn-btn cmn-btn-danger" onClick={handleDelete}>
            <Trash2 size={15} />
            <span>삭제</span>
          </button>
        </>
      }
    >
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Grid
          data={dataList}
          style={{ height: '100%' }}
          pageable={true}
          sortable={true}
        >
          <GridColumn field="id" title="번호" width="80px" className="text-center" />
          <GridColumn field="title" title="조사명" />
          <GridColumn field="manager" title="담당자" width="120px" />
          <GridColumn field="status" title="진행상태" width="100px" />
        </Grid>
      </div>
    </PageContainer>
  );
};

export default MyScreenPage;
```

---

## 5. 공통 버튼 규격 (`cmn-btn`)

버튼은 반드시 `PageLayout.css`에 선언된 공통 클래스를 사용해야 서비스 테마 색상이 자동으로 반영됩니다:

| 클래스명 | 용도 | 스타일 특징 |
| :--- | :--- | :--- |
| `cmn-btn cmn-btn-primary` | **핵심 실행 (저장, 완료, 조회)** | 대메뉴 테마 메인 색상 채움 |
| `cmn-btn cmn-btn-outline` | **주요 액션 (+추가, 생성, 실행)** | 흰색 배경 + 테마 컬러 테두리 |
| `cmn-btn cmn-btn-secondary` | **보조 액션 (취소, 닫기, 목록)** | 흰색 배경 + 소프트 그레이 테두리 |
| `cmn-btn cmn-btn-danger` | **위험 액션 (삭제, 제거)** | 흰색 배경 + 레드 테두리 (**호버 시에도 빨간색 글자/아이콘 완벽 유지**) |
| `cmn-btn-sm` | **소형 사이즈 (그리드 내부용)** | 높이 28px, 폰트 12px |

---

## 6. 공통 API 통신 및 토큰 연동 (`api.get` / `api.post`)

설문온 백엔드와의 통신은 `surveyon-common`의 `api` 모듈을 사용합니다.
요청 시 브라우저 쿠키의 **로그인 토큰(`TOKEN`), `X-Auth-Token`, `X-User-Id`, `hrc`(AES256 암호화)**가 **자동으로 헤더에 첨부**됩니다.

```jsx
import React, { useState, useEffect, useContext } from 'react';
import { api, loadingSpinnerContext, modalContext } from 'surveyon-common';

export const MyDataService = () => {
  const [list, setList] = useState([]);
  const loading = useContext(loadingSpinnerContext);
  const modal = useContext(modalContext);

  // 1. 목록 조회 (POST / GET)
  const fetchList = async () => {
    try {
      loading.show();
      // 서비스 키를 전달하거나 전체 API 경로(/APIs/d/...)를 직접 전달할 수 있습니다.
      // - 'API_BASE_URL_DATAMANAGEMENT' : /APIs/d
      // - 'API_BASE_URL_DATASTATUS'     : /APIs/s
      // - 'API_BASE_URL_OPENAI'         : /APIs/o
      // - 'API_BASE_URL_BOARD'          : /APIs/n
      const res = await api.post({ projectnum: 'P2026_001' }, '/data/info', 'API_BASE_URL_DATAMANAGEMENT');
      if (String(res?.success) === '777') {
        // 설문온 백엔드 표준 응답 데이터는 res.resultjson에 담겨 반환됩니다.
        setList(res?.resultjson || []);
      } else {
        // 첫 번째 인자는 에러코드(status), 두 번째 인자는 에러 메시지
        modal.showErrorAlert(String(res?.success || 'ERR'), res?.message || '데이터 조회에 실패했습니다.');
      }
    } catch (err) {
      modal.showErrorAlert('ERR', '데이터를 불러오는 중 문제가 발생했습니다.');
    } finally {
      loading.hide();
    }
  };

  // [주의] useEffect / useCallback 의존성 배열에 loading, modal을 넣으면 무한 루프가 발생하므로 절대 넣지 마세요.
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
```

---

## 7. 전역 모달 및 로딩 스피너 사용법

브라우저 기본 `window.alert()` 대신 전역 Context를 사용합니다.  
> [!WARNING]
> **`loading` · `modal` 의존성 배열 추가 금지**: `LoadingProvider`·`ModalProvider` 상태가 변경될 때마다 Context 객체가 새로 생성될 수 있으므로 `useEffect`나 `useCallback`의 의존성 배열에 `[loading, modal]`을 절대 넣지 마세요 (무한 API 호출 발생).

```jsx
import { useContext } from 'react';
import { modalContext, loadingSpinnerContext } from 'surveyon-common';

function SampleComponent() {
  const modal = useContext(modalContext);
  const loading = useContext(loadingSpinnerContext);

  // 1. 단순 알림창 (title, content)
  const showAlert = () => {
    modal.showAlert('알림', '처리가 완료되었습니다.');
  };

  // 2. 오류 팝업 (첫 번째 인자는 에러코드 status, 두 번째 인자는 메시지 — 제목 '오류'는 자동 고정)
  const showError = () => {
    modal.showErrorAlert('ERR_01', '데이터를 불러올 수 없습니다.');
  };

  // 3. 확인 팝업 (Confirm)
  const showConfirm = () => {
    modal.showConfirm('확인', '진행하시겠습니까?', {
      btns: [
        { title: '취소' },
        { title: '확인', click: () => { /* 확인 시 실행 로직 */ } }
      ]
    });
  };
}
```

---

## 8. 서비스별 분리 개발 및 라우팅 연동 안내

설문온은 각 대메뉴 서비스를 개별 프로젝트로 분리하여 개발한 뒤, **동일 도메인 아래에서 경로(Path) 기반으로 분기하여 같은 창(URL 이동)**으로 연결합니다.

### 1) 대메뉴 서비스 키 및 표준 경로 규격
| 서비스명 | `<AppLayout service="...">` | `vite.config.js` `base` 설정 | 메인/사이드바(☰) 기본 진입 경로 | 테마 색상 |
| :--- | :--- | :--- | :--- | :--- |
| **H-SRT** | `'hsrt'` | `'/data_status/'` | `/data_status` | 블루 (`#3b82f6`) |
| **데이터관리** | `'dataManagement'` | `'/data_management/'` | `/data_management`, `/data_management/setting/map` | 그린 (`#16a34a`) |
| **AI오픈분석** | `'aiOpen'` | `'/ai_open_analysis/'` | `/ai_open_analysis` | 오렌지 (`#F97316`) |
| **실사관리** | `'fieldManagement'` | `'/field_management/'` | `/field_management`, `/field_management/analysis/progress` | 네이비 (`#1E3A8A`) |

### 2) 공통 사이드바에 내장된 서비스 간 이동 및 세션 공유
같은 도메인 아래에서 같은 창(탭)으로 이동하므로 **로그인 쿠키(`TOKEN`), `redux-persist` 상태, 선택된 프로젝트 정보(`sessionStorage.projectnum`, `merge_pn` 등)가 별도 처리 없이 자동으로 공유**됩니다.
- **현재 서비스 내부 메뉴 이동**: React Router의 `navigate()`로 동작합니다.
- **좌측 상단 🏠 홈 버튼 / ☰ 타 서비스 이동 / 로그아웃**: `surveyon-common` 내부에서 자동으로 `window.location.href`를 통해 해당 서비스 경로로 같은 창 이동을 수행합니다.
- **서버 하위 경로 배포 시**: 각 프로젝트의 `vite.config.js`에 담당 서비스의 `base` 경로(예: `base: '/data_management/'`)를 설정하여 빌드합니다.

---

## 9. 실전 트러블슈팅 및 FAQ

### Q1. Kendo 배너(워터마크)가 화면에 계속 표시됩니다.
- 프로젝트 루트에 `.env` 파일을 만들고 `TELERIK_LICENSE=...` 키가 올바르게 들어있는지 확인하세요.
- 터미널에서 `npx kendo-ui-license activate`를 실행하세요.
- **가장 중요**: 활성화 후 **기존 Vite 개발 서버(`npm run dev`)를 완전히 종료(`Ctrl+C`)했다가 다시 실행**해야 캐시가 갱신됩니다.

### Q2. 폰트가 깨지거나 사이드바 `<` 접기 버튼이 찌그러집니다.
- `main.jsx`에 `import 'surveyon-common/assets/css/surveyon-theme.css';`가 포함되어 있는지 확인하세요 (`SpoqaHanSansNeo` 서체 및 `reset.css` 버튼 패딩 리셋이 내장되어 있습니다).
- Vite 기본 템플릿의 `src/index.css`나 `src/App.css`에 `font-family: ... !important`나 `button { padding: ... }` 스타일이 남아있다면 제거하세요.

### Q3. API 호출 시 405 Method Not Allowed 또는 /o/... 로 요청이 날아갑니다.
- `surveyon-common` 최신 버전을 사용하고 있는지 확인하세요 (`npm update surveyon-common`).
- `api.post(body, '/data/info', 'API_BASE_URL_DATAMANAGEMENT')`처럼 3번째 인자에 서비스 키를 넘기거나, `api.post(body, '/APIs/d/data/info')`로 정확한 API 경로를 지정하세요.

### Q4. 삭제 버튼(`cmn-btn-danger`)에 마우스를 올리면 글씨가 검정색으로 바뀝니다.
- 최신 `surveyon-common` 패키지에서는 호버 시에도 빨간색(`#dc2626`) 및 아이콘 색상이 고정되도록 수정되었습니다. 터미널에서 `npm update surveyon-common`을 실행하세요.

### Q5. Kendo Grid에서 행/체크박스 선택, 부분선택(`-`), 정렬 화살표(`↑`), 건수 표시(`GridDataCount`)가 테마 색상 대신 다홍색/주황색으로 나옵니다.
- `src/main.jsx`에서 CSS import 순서가 역전되었을 때 발생합니다. 반드시 **`@progress/kendo-theme-default/dist/all.css`를 먼저 import하고, 그 다음 줄에 `surveyon-common/assets/css/surveyon-theme.css`를 import**하세요.
- 또한 Kendo Grid v7의 `.k-selected`, 체크박스 `:indeterminate`, 정렬 아이콘(`.k-sort-icon`), `GridDataCount`의 `var(--primary-color)` 연동이 모두 반영된 최신 `surveyon-common`을 사용하도록 `npm update surveyon-common`을 실행하세요.

### Q6. `does not provide an export named 'default'` 에러가 나거나 모달/스피너 Context가 동작하지 않습니다.
- `vite.config.js`의 `optimizeDeps`에 `exclude: ['surveyon-common']`과 `include: ['prop-types', 'crypto-js', 'moment', 'html2canvas', 'axios', 'react-cookie', 'redux', 'redux-persist', '@reduxjs/toolkit']`가 모두 설정되어 있는지 확인하세요 (본 문서 [2-3절 `vite.config.js` 템플릿](#3-viteconfigjs-esm-호환-훅-충돌-방지--cors-프록시) 참고).
- 설정 변경 후에는 `node_modules/.vite` 캐시를 지우거나 `npx vite --force`로 개발 서버를 재시작하세요.
