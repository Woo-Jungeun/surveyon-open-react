# ⚡ 설문온(SulmunOn) 프론트엔드 개발자 퀵스타트 가이드

> **이 문서는 설문온 신규 서비스 또는 화면을 개발하는 개발자를 위한 실전 퀵스타트 가이드입니다.**  
> 아래 순서대로 설정을 마치면 **5분 안에 설문온 표준 레이아웃과 테마가 적용된 개발 환경을 구축**할 수 있습니다.

---

## 📌 목차
1. [프로젝트 초기 설정 (3분)](#1-프로젝트-초기-설정-3분)
2. [필수 환경 설정 파일](#2-필수-환경-설정-파일)
3. [엔트리포인트 템플릿 (`main.jsx` & `App.jsx`)](#3-엔트리포인트-템플릿-mainjsx--appjsx)
4. [표준 화면 개발 템플릿 (`PageContainer` & Kendo Grid)](#4-표준-화면-개발-템플릿-pagecontainer--kendo-grid)
5. [공통 API 통신 및 토큰 연동 (`api.get` / `api.post`)](#5-공통-api-통신-및-토큰-연동-apiget--apipost)
6. [공통 버튼 규격 (`cmn-btn`)](#6-공통-버튼-규격-cmn-btn)
7. [전역 모달 및 로딩 스피너 사용법](#7-전역-모달-및-로딩-스피너-사용법)
8. [자주 묻는 질문 (FAQ)](#8-자주-묻는-질문-faq)

---

## 1. 프로젝트 초기 설정 (3분)

### 1) 공통 패키지 설치
터미널에서 아래 명령어로 설문온 공통 라이브러리를 설치합니다:
```bash
# 사내 Git 저장소 기반 패키지 설치
npm install git+https://github.com/woojungeun97/surveyon-common.git
```

### 2) Kendo UI 라이선스 활성화
1. 프로젝트 루트 디렉토리에 **`telerik-license.txt`** 파일을 배치합니다.
2. 터미널에서 라이선스 활성화 명령을 실행합니다:
   ```bash
   npx kendo-ui-license activate
   ```
   *(※ 활성화 완료 시 Kendo 워터마크 배너가 표시되지 않습니다.)*

### 3) 로컬 개발 서버 실행
```bash
npm run dev
```

---

## 2. 필수 환경 설정 파일

### 1) `vite.config.js` (CORS 프록시 & `@/` 경로 별칭)
백엔드 API와의 통신 및 `@/` 경로 참조를 위해 아래 설정을 적용합니다:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
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
      }
    }
  }
});
```

### 2) `public/config.js` (런타임 API 서버 주소 분기)
`public/config.js` 파일이 위치해야 화면에서 접속 도메인에 따라 백엔드 API 주소를 자동으로 인식합니다:
- **테스트 환경**: `https://stest.hrc.kr/APIs/...`
- **운영 환경**: `https://s.hrc.kr/APIs/...`

---

## 3. 엔트리포인트 템플릿 (`main.jsx` & `App.jsx`)

### 1) `src/main.jsx`
Redux 스토어, 테마 CSS, Kendo 한글 로케일, 전역 모달을 초기화하는 엔트리 파일입니다.

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { IntlProvider, LocalizationProvider, loadMessages } from '@progress/kendo-react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

// 설문온 공통 코어 모듈
import { store, persistor, ModalProvider, LoadingProvider } from 'surveyon-common';
import kendoLanguage from 'surveyon-common/config/kendo/language.json';
import App from './App';

// 테마, 기본 리셋, Kendo 기본 스타일 import
import 'surveyon-common/assets/css/surveyon-theme.css';
import '@progress/kendo-theme-default/dist/all.css';

// Kendo 그리드/필터/달력 한글 언어팩 적용
loadMessages(kendoLanguage, 'ko');
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
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
);
```

### 2) `src/App.jsx`
서비스 테마 키를 전달하여 사이드바와 레이아웃을 연결합니다.

```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from 'surveyon-common';
import MyScreenPage from './pages/MyScreenPage';

function App() {
  return (
    <Routes>
      {/* 
        [4대 서비스 service 속성값]
        - 'hsrt'            : H-SRT (블루 테마)
        - 'dataManagement'  : 데이터관리 (그린 테마)
        - 'aiOpen'          : AI 오픈분석 (오렌지 테마)
        - 'fieldManagement' : 실사관리 (네이비 테마)
      */}
      <Route element={<AppLayout service="dataManagement" />}>
        <Route path="/" element={<MyScreenPage />} />
        <Route path="/my_screen" element={<MyScreenPage />} />
      </Route>
    </Routes>
  );
}

export default App;
```

---

## 4. 표준 화면 개발 템플릿 (`PageContainer` & Kendo Grid)

설문온의 모든 화면은 `<PageContainer>`로 감싸며, Kendo Grid는 상위 높이를 100% 채우도록 작성합니다.

```jsx
import React, { useState, useContext } from 'react';
import { PageContainer, modalContext, loadingSpinnerContext } from 'surveyon-common';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Plus, Download } from 'lucide-react';

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
        { title: '취소', background: '#75849a' },
        {
          title: '저장',
          click: async () => {
            try {
              loading.show();
              // API 저장 로직 수행
              modal.showAlert('알림', '성공적으로 저장되었습니다.');
            } catch (err) {
              modal.showErrorAlert('오류', '저장 처리 중 문제가 발생했습니다.');
            } finally {
              loading.hide();
            }
          }
        }
      ]
    });
  };

  return (
    <PageContainer
      title="데이터 맵 관리"
      infoTooltip="프로젝트 변수 매핑 및 데이터 설정을 관리하는 화면입니다."
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
            <span>엑셀 다운로드</span>
          </button>
        </>
      }
    >
      {/* 4번 메인 작업영역: 높이 100% 핏 */}
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

## 5. 공통 API 통신 및 토큰 연동 (`api.get` / `api.post`)

설문온 백엔드와의 통신은 `surveyon-common`의 `api` 모듈을 사용합니다.
요청 시 브라우저 쿠키의 **로그인 토큰(`TOKEN`), `X-Auth-Token`, `X-User-Id`, `hrc`(AES256 암호화)**가 **자동으로 헤더에 첨부**되며, 401 세션 만료 시 로그인 창으로 자동 안내됩니다.

```jsx
import React, { useState, useEffect, useContext } from 'react';
import { api, loadingSpinnerContext, modalContext } from 'surveyon-common';

export const MyDataService = () => {
  const [list, setList] = useState([]);
  const loading = useContext(loadingSpinnerContext);
  const modal = useContext(modalContext);

  // 1. 목록 조회 (GET / POST)
  const fetchList = async () => {
    try {
      loading.show();
      // api.get(params, url, serviceType) 또는 api.post(body, url, serviceType)
      const res = await api.post({ projectnum: 'P2026_001' }, '/datasets/list', 'API_BASE_URL_DATASTATUS');
      if (res?.success === '777' || res?.data) {
        setList(res.data || res.output || []);
      }
    } catch (err) {
      modal.showErrorAlert('오류', '데이터를 불러오는 중 문제가 발생했습니다.');
    } finally {
      loading.hide();
    }
  };

  // 2. 파일 다운로드 (Blob POST)
  const handleDownload = async () => {
    const response = await api.file({ fileId: 123 }, '/files/download');
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '결과보고서.xlsx';
    a.click();
  };

  useEffect(() => {
    fetchList();
  }, []);
};
```

---

## 6. 공통 버튼 규격 (`cmn-btn`)

버튼은 반드시 `PageLayout.css`에 선언된 공통 클래스를 사용해야 서비스 테마 색상이 자동으로 반영됩니다:

| 클래스명 | 용도 | 스타일 특징 |
| :--- | :--- | :--- |
| `cmn-btn cmn-btn-primary` | **핵심 실행 (저장, 완료, 조회)** | 대메뉴 테마 메인 색상 채움 |
| `cmn-btn cmn-btn-outline` | **주요 액션 (+추가, 생성, 실행)** | 흰색 배경 + 테마 컬러 테두리 |
| `cmn-btn cmn-btn-secondary` | **보조 액션 (취소, 닫기, 목록)** | 흰색 배경 + 소프트 그레이 테두리 |
| `cmn-btn cmn-btn-danger` | **위험 액션 (삭제, 제거)** | 흰색 배경 + 레드 테두리/호버 |
| `cmn-btn-sm` | **소형 사이즈 (그리드 내부용)** | 높이 28px, 폰트 12px |

---

## 7. 전역 모달 및 로딩 스피너 사용법

브라우저 기본 `window.alert()` 대신 전역 Context를 사용합니다.

```jsx
import { useContext } from 'react';
import { modalContext, loadingSpinnerContext } from 'surveyon-common';

function SampleComponent() {
  const modal = useContext(modalContext);
  const loading = useContext(loadingSpinnerContext);

  // 1. 단순 알림창
  const showAlert = () => {
    modal.showAlert('알림', '처리가 완료되었습니다.');
  };

  // 2. 오류 팝업
  const showError = () => {
    modal.showErrorAlert('오류', '데이터를 불러올 수 없습니다.');
  };

  // 3. 로딩 스피너 제어
  const callApiWithLoading = async () => {
    try {
      loading.show();
      await fetch('/api/data');
    } finally {
      loading.hide();
    }
  };
}
```

---

## 8. 자주 묻는 질문 (FAQ)

### Q1. Kendo 배너(워터마크)가 화면에 표시됩니다.
- 프로젝트 루트에 `telerik-license.txt` 파일이 있는지 확인하세요.
- 터미널에서 `npx kendo-ui-license activate`를 실행한 후 개발 서버를 재시작(`npm run dev`)하세요.

### Q2. Kendo Grid의 행 선택/호버 색상이 안 바뀝니다.
- 최상단 `<html>` 또는 `<AppLayout service="...">`에 올바른 서비스 키(`hsrt`, `dataManagement`, `aiOpen`, `fieldManagement`)가 지정되어 있는지 확인하세요.

### Q3. API 호출 시 로그인 토큰이나 인증 헤더는 어떻게 처리하나요?
- `surveyon-common`의 `api` 모듈(`api.get`, `api.post` 등)을 사용하면 브라우저 쿠키의 `TOKEN`, `X-Auth-Token` 및 `X-User-Id`가 **인터셉터를 통해 자동으로 실려 전송**됩니다.
- 개발자가 직접 매번 헤더에 토큰을 심을 필요가 없습니다.

### Q4. 다른 서비스 화면으로 이동할 때 로그인이 풀리지 않나요?
- 설문온의 모든 프론트엔드 서비스는 동일 도메인(Nginx 라우팅 분기) 하에서 구동되므로, `window.location.href = '/field_management'` 등으로 이동해도 **동일한 인증 쿠키와 세션을 공유하므로 로그인이 절대 풀리지 않습니다.**

