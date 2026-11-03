# ⚡ 설문온(SulmunOn) 프론트엔드 개발자 퀵스타트 가이드

> **이 문서는 설문온 신규 서비스 또는 화면을 개발하는 개발자를 위한 실전 퀵스타트 가이드입니다.**  
> 아래 순서대로 설정을 마치면 **5분 안에 설문온 표준 레이아웃과 테마가 적용된 개발 환경을 구축**할 수 있습니다.

---

## 📌 목차
1. [프로젝트 초기 설정 (패키지 설치)](#1-프로젝트-초기-설정-패키지-설치)
2. [필수 환경 설정 (라이센스, 폰트, 프록시)](#2-필수-환경-설정-라이센스-폰트-프록시)
3. [엔트리포인트 템플릿 (`main.jsx` & `App.jsx`)](#3-엔트리포인트-템플릿-mainjsx--appjsx)
4. [표준 화면 개발 템플릿 (`PageContainer` & Kendo Grid)](#4-표준-화면-개발-템플릿-pagecontainer--kendo-grid)
5. [공통 버튼 규격 (`cmn-btn`)](#5-공통-버튼-규격-cmn-btn)
6. [공통 API 통신 및 토큰 연동 (`api.get` / `api.post`)](#6-공통-api-통신-및-토큰-연동-apiget--apipost)
7. [전역 모달 및 로딩 스피너 사용법](#7-전역-모달-및-로딩-스피너-사용법)
8. [실전 트러블슈팅 및 FAQ](#8-실전-트러블슈팅-및-faq)

---

## 1. 프로젝트 초기 설정 (패키지 설치)

### 1) 신규 Vite 프로젝트 생성 (신규 프로젝트 시)
```bash
npm create vite@latest my-surveyon-app -- --template react
cd my-surveyon-app
```

### 2) 설문온 공통 패키지 설치
터미널에서 아래 명령어로 사내 공통 라이브러리를 설치합니다:
```bash
# 사내 Git 저장소 기반 패키지 설치
npm install git+https://github.com/woojungeun97/surveyon-common.git
npm install
```

---

## 2. 필수 환경 설정 (라이센스, 폰트, 프록시)

### 1) Kendo UI 라이선스 설정 (워터마크 영구 제거)
프로젝트 루트 디렉토리에 **`.env`** 파일을 생성하고 라이선스 키를 등록합니다 (가장 확실하고 권장되는 방법):

```env
TELERIK_LICENSE=eyJhbGciOiJSUzI1NiIsInR5cCI6IlRlbGVyaWsgTGljZW5zZSBLZXkifQ.eyJ0eXBlIjoidGVsZXJpay1saWNlbnNlIiwibGljZW5zZUlkIjoiYjJjNzhkN2ItYzg0YS00MDI4LWEwN2EtNjhkMWFkZmYxNDMzIiwidXNlcklkIjoiOWEyZmM4MjMtNzM0Mi00NDAyLTliODgtMGMxMmNjMzQxNWMyIiwiaWF0IjoxNzU1ODI0MzUyLCJsaWNlbnNlcyI6WyJleUpoYkdjaU9pSlNVekkxTmlJc0luUjVjQ0k2SWxSbGJHVnlhV3NnVEdsalpXNXpaU0JGZG1sa1pXNWpaU0o5LmV5SmpiMlJsSWpvaVMwVk9SRTlWU1ZKRlFVTlVJaXdpZEhsd1pTSTZJbkJsY25CbGRIVmhiQ0lzSW1WNGNHbHlZWFJwYjI0aU9qRTNPRGN6TURZNE1UWXNJblZ6WlhKSlpDSTZJamxoTW1aak9ESXpMVGN6TkRJdE5EUXdNaTA1WWpnNExUQmpNVEpqWXpNME1UVmpNaUlzSW14cFkyVnVjMlZKWkNJNkltSXlZemM0WkRkaUxXTTROR0V0TkRBeU9DMWhNRGRoTFRZNFpERmhaR1ptTVRRek15SjkuWmlWaXdTNUQ4ZjQ3OXRtLVE2TExSUzhRZmJiamFBSEJKbzVyOFR1cFZ1aXRhUVd4TmUzcks1SWQ3OVVBQU5yZXBONnFQZ29xc3MwbmRETThwbWRyZ3hCV2FjT2tnakdCUVpKY29aR3YtTUVHZnlTdXo0aGZLOU5NTkJiWTRoQTI2Nld1dkRvdDJ5TU9ZSEJ0UTQ0ZDdCZGowdDYwRzh1U1VHMGZaVExEMDE2UndlXzRFaC1jelZ0RXBDcWJvVmp1WWR4TDc0ZTAtMG15SURYcmk5NDZ1RmsyZTU5X2JMSGVBLWQwOXlNRjAtaTM1RGE2ZTk5bTgwRWhFc0RsVE56bl9hcUlfdjJLc0NNNXdnR1RVd0p3N1Q1OThwa2QtaFFIVi1pRHV2Y3BacWRaeWQ3T05GQ0E5aTRST0puU2k2MDFIUVVsUkQ4a19EZ1FrWE5Hbko5bVRnIiwiZXlKaGJHY2lPaUpTVXpJMU5pSXNJblI1Y0NJNklsUmxiR1Z5YVdzZ1RHbGpaVzV6WlNCRmRtbGtaVzVqWlNKOS5leUowZVhCbElqb2lkWE5oWjJVaUxDSjFjMlZ5U1dRaU9pSTVZVEptWXpneU15MDNNelF5TFRRME1ESXRPV0k0T0Mwd1l6RXlZMk16TkRFMVl6SWlMQ0pzYVdObGJuTmxTV1FpT2lKaU1tTTNPR1EzWWkxak9EUmhMVFF3TWpndFlUQTNZUzAyT0dReFlXUm1aakUwTXpNaWZRLkYxX1pqdXBMYmJoT3RhWkdHSkFJbGw0VVdBUElfby11Y2E2eWp4MFprUUFEOV9RMi1BTVdBSUgwcmI0WTctRXdkZF9JZ0RkRnNqSUlrR2ZVVW1SUnNUZFFyMTJMLWVsZFlBRGtWbkVfREk5MEJ6Y1ZkY1ktdTlIVUxXeHViUnJwMHJVWHlMWGhzTVhXY1NDWUxrVEVtQ3FZdHlJVzNIQ29yZFA3TWZPQ3hxS1pnamsxdEU1TlJFZDJQT251WTkxU0ZySnRxdm8xaDdHS2Y2Tjd3OWRCaHdwRGh1MVRQTGtPdTFlMEhOVmZaSkRQU0o1TlZsaHlSZEd0ZnJQZVVzNmdHMFNPUWNLLXhOSkhHeml6NXlUUnNCSzAxUEE4YmVPTXhFSlhmNTY0UGZUOXdFTW9IMUR3TVZRLW5sUmpxc0dTTHVCY3d0RXVpVXFjdlAwZHotem1RUSJdLCJwcm9kdWN0cyI6W3siY29kZSI6IktFTkRPVUlSRUFDVCIsImxpY2Vuc2VFeHBpcmF0aW9uRGF0ZSI6MTc4NzMwNjgxNiwidHJpYWwiOmZhbHNlfV0sImF1ZCI6ImgqKioqKkBoKiouYyoua3IiLCJsaWNlbnNlSG9sZGVyIjoiaCoqKioqQGgqKi5jKi5rciIsImludGVncml0eSI6IjZBWVdiSW1kR3FheU8xU3VMR2x3YlRKekF5d3k0d2dsUmtCaEN6d2U5YkE9In0.kIscrb35V04rqLXLZLyrZD088UTpK3v6IXEoJGqhCDo4OpiHAwepHIzM57X-tcJnRXAxL1bwElzhRzZqbbio2PIOJv0jA67tLIxv3girK0U5Q1LdiSLRfsX9KQ8AJHexKp-qqAeRi2qD6fnDMixi-NYee348Qh9ECpQpsuHOvcKPf1CsTiZ7EVM1A3cLwY57uBysZfSzWf9laQQ3FU92zZBe29WZN9LESicpTH_aYQJ8VXPtYbiyVmF7AxIkcEbH3AENNCr1el92XQoC76T92RXkvPxZagpx2biAZEKM_Z0faBNHyDytpCOVmC275ClI5Mj2Xo3kZnI1QKpvOPEbpQ
```

또한 프로젝트 루트에 `telerik-license.txt` 파일을 두고 터미널에서 1회 활성화합니다:
```bash
npx kendo-ui-license activate
```
> [!IMPORTANT]
> 개발 서버(`npm run dev`)가 켜져 있는 상태에서 활성화 명령을 실행하면 Vite 캐시로 인해 워터마크가 계속 남아있을 수 있습니다. 반드시 **개발 서버를 종료(`Ctrl+C`)한 후 다시 `npm run dev`를 실행**하세요.

---

### 2) 글로벌 스타일 및 폰트 (`reset.css` & `SpoqaHanSansNeo`)
`surveyon-common/assets/css/surveyon-theme.css`를 import하면 설문온 표준 서체인 **SpoqaHanSansNeo**와 `reset.css`(버튼 패딩/라인높이/자간 리셋), `common.css`, `kendo_custom.css`가 자동으로 함께 적용됩니다.

> [!CAUTION]
> Vite 초기 생성 시 기본으로 들어있는 `src/index.css`나 `src/App.css`에 `font-family: ... !important`나 `button { padding: ... }` 같은 스타일이 남아있으면 원본 서체(`SpoqaHanSansNeo`)와 사이드바 레이아웃이 깨집니다. **Vite 기본 `index.css`와 `App.css`의 내용은 비우거나 제거**하세요.

---

### 3) `vite.config.js` (CORS 프록시 & `@/` 경로 별칭)
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

> [!TIP]
> **API 서버 도메인 설정 안내**:  
> `surveyon-common`의 `api` 모듈에는 설문온 표준 API 엔드포인트(`https://stest.hrc.kr/APIs/...`)가 기본 내장되어 있어 별도의 `public/config.js` 없이도 즉시 통신이 가능합니다.  
> 만약 접속 도메인별 런타임 분기가 필요한 경우에만 `public/config.js`를 사용하세요.

---

## 3. 엔트리포인트 템플릿 (`main.jsx` & `App.jsx`)

### 1) `src/main.jsx`
Redux 스토어, 테마 CSS, Kendo 한글 로케일 및 CLDR 데이터(`load`), 전역 모달을 초기화합니다.

```jsx
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

// 테마 및 Kendo 기본 스타일 import
import 'surveyon-common/assets/css/surveyon-theme.css';
import '@progress/kendo-theme-default/dist/all.css';

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
      <Route element={<AppLayout service="fieldManagement" />}>
        <Route path="/" element={<MyScreenPage />} />
        <Route path="/field_management" element={<MyScreenPage />} />
      </Route>
    </Routes>
  );
}

export default App;
```

---

## 4. 표준 화면 개발 템플릿 (`PageContainer` & Kendo Grid)

설문온의 모든 화면은 `<PageContainer>`로 감싸며, 본문 그리드는 화면 높이를 100% 채우도록 작성합니다.

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
      if (res?.success === '777' || res?.data) {
        setList(res.data || res.output || []);
      }
    } catch (err) {
      modal.showErrorAlert('오류', '데이터를 불러오는 중 문제가 발생했습니다.');
    } finally {
      loading.hide();
    }
  };

  useEffect(() => {
    fetchList();
  }, []);
};
```

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

  // 3. 확인 팝업 (Confirm)
  const showConfirm = () => {
    modal.showConfirm('확인', '진행하시겠습니까?');
  };
}
```

---

## 8. 실전 트러블슈팅 및 FAQ

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
