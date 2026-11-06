# 🤖 설문온(SulmunOn) AI 코딩 에이전트 지침서 (AI Coding Rules)

> **이 문서는 Antigravity, Cursor, Copilot, Claude 등 AI 코딩 어시스턴트가 설문온 프론트엔드 코드를 작성하거나 리팩토링할 때 반드시 준수해야 하는 엄격한 제약조건(Strict Constraints)과 표준 규격입니다.**  
> AI는 코드 작성 전 **`DEVELOPER_QUICK_START.md` (1순위: 세팅 및 코드 템플릿) → `AI_CODING_RULES.md` (2순위: 본 문서의 필수 제약조건) → `THEME_DEVELOPMENT_GUIDE.md` (3순위: 크롤링 ID 상세표 및 배포 아키텍처)** 순서로 숙지하고 아래 규칙을 100% 준수해야 합니다.

---

## 📌 목차 (작업 흐름 순서)
1. [프로젝트 초기 구성 규칙 (React 18, Vite ESM, 라이센스, 폰트)](#1-프로젝트-초기-구성-규칙-project-setup-constraints)
2. [테마 및 색상 시스템 규칙 (Hex 금지 & CSS 변수)](#2-테마-및-색상-시스템-규칙-color-constraints)
3. [화면 레이아웃, 크롤링 ID 및 Kendo Grid 필수 규칙](#3-화면-레이아웃-및-크롤링-id-규칙-layout--id-standards)
4. [공통 버튼 규격 (`cmn-btn`)](#4-공통-버튼-규격-cmn-btn)
5. [공통 API 통신 및 응답 규격 (`api`, `resultjson`)](#5-공통-api-통신-및-응답-규격-api-resultjson)
6. [전역 모달 & 로딩 스피너 규칙 (무한루프 방지 필수)](#6-전역-모달--로딩-스피너-규칙-무한루프-방지-필수)
7. [서비스별 분리 개발 및 라우팅/사이드바 메뉴 규칙 (`sidebarProps`)](#7-서비스별-분리-개발-및-라우팅-규칙-service-routing--custom-menu)

---

## 📌 핵심 제약조건 요약 (Critical Rules)
- ❌ **`useEffect` / `useCallback` 의존성 배열에 `loading`, `modal` 추가 절대 금지 (가장 중요)**: `LoadingProvider`·`ModalProvider` 상태가 변경(`loading.show()` / `hide()`)될 때마다 Context 객체 참조가 바뀌어 **무한 API 호출 루프**에 빠집니다. 의존성 배열에서 `loading`, `modal`은 반드시 제외(`[]` 고정 또는 `useRef` 활용)하십시오.
- ❌ **Hex 색상 직접 작성 절대 금지**: `#16a34a`, `#2563eb` 등 Hex 컬러를 CSS나 JSX style, 모달 버튼 옵션 등에 하드코딩하지 마십시오.
- ❌ **브라우저 기본 `alert()` / `confirm()` 절대 금지**: 반드시 `modalContext`의 `showAlert()`, `showConfirm()`, `showErrorAlert(status, msg)`를 사용하십시오. (`showErrorAlert`의 첫 번째 인자는 제목이 아니라 **에러코드 `status`**입니다.)
- ❌ **임의의 버튼 스타일 작성 금지**: 반드시 사전 정의된 `cmn-btn` 클래스를 사용하십시오.
- ❌ **Axios 직접 생성 금지**: 반드시 `surveyon-common`의 `api` 모듈(`api.get`, `api.post`)을 사용하며, 응답 성공 판별은 `String(res?.success) === '777'`, 실제 데이터 추출은 **`res.resultjson`** 필드를 기준으로 처리하십시오.
- ❌ **임의의 HTML `<table>` 또는 타 그리드 라이브러리 사용 금지**: 모든 목록/테이블/데이터 그리드 화면은 반드시 **Kendo React Grid (`@progress/kendo-react-grid`의 `<Grid>`, `<GridColumn>` 또는 `surveyon-common`의 `KendoGrid`, `KendoGridV2`)**를 사용하십시오.
- ✅ **모든 신규 페이지는 `<PageContainer>`로 래핑**: 화면 높이 100% 핏을 반드시 유지해야 합니다.
- ✅ **신규 프로젝트 구성 시 React 18(`^18.2.0`) 고정, `.env` 및 `main.jsx`에 Kendo 라이센스(`import '@progress/kendo-licensing'`) 등록, CSS import 순서(`all.css` 먼저 → `surveyon-theme.css` 나중) 엄수** (순서가 바뀌면 Kendo 기본 다홍색 `#ff6358`이 테마 선택색을 덮어씁니다).
- ✅ **공통 내장 기능 중복 구현 금지**: `<AppLayout>`에는 이미 **프로젝트 선택/등록 모달(`ProjectSelectionModal`)**, **우측 하단 플로팅 AI 챗봇(`SurveyonAssistant`)**, **설문온 파비콘(`favicon.svg`) 및 타이틀(`설문온`)**이 기본 내장되어 있으므로 개별 프로젝트에서 이를 다시 만들지 마십시오.
- ✅ **크롤링 및 자동화 테스트용 고유 `id` 속성 필수 부여**: 표준 ID 체계를 누락하지 마십시오.

---

## 1. 프로젝트 초기 구성 규칙 (Project Setup Constraints)

AI가 설문온 신규 프로젝트 또는 화면을 구성할 때 반드시 다음 규칙을 기본으로 적용해야 합니다:

### 1-1. React 18 버전 고정 및 `vite.config.js` (ESM 호환 & 훅 충돌 방지)
최신 `npm create vite@latest`는 React 19와 ESM(`"type": "module"`)을 기본 생성합니다. `surveyon-common` 및 Kendo UI 호환을 위해 다음 3가지를 반드시 지켜야 합니다:
1. **`react`, `react-dom`은 반드시 `^18.2.0` 버전으로 설치** (React 19 사용 금지):
   ```bash
   npm install react@^18.2.0 react-dom@^18.2.0
   ```
2. **`vite.config.js` 표준 설정** (`fileURLToPath` 기반 ESM 경로 설정, `resolve.dedupe`, `optimizeDeps.include`):
   ```javascript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import { fileURLToPath, URL } from 'node:url';

   export default defineConfig({
     base: '/field_management/', // 담당 서비스 표준 베이스 경로
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
         '^/APIs': { target: 'https://stest.hrc.kr', changeOrigin: true, secure: false },
         '^/o': { target: 'https://stest.hrc.kr', changeOrigin: true, secure: false },
         '/api': { target: 'https://hpropublic.hrcglobal.com', changeOrigin: true, secure: true },
       },
     },
   });
   ```

### 1-2. Kendo 라이센스 및 환경 변수
루트 디렉토리에 `.env` 파일을 생성하고 Telerik 라이센스를 등록하며, `src/main.jsx` 최상단에 `import '@progress/kendo-licensing';`을 포함합니다:
```env
TELERIK_LICENSE=eyJhbGciOiJSUzI1NiIsInR5cCI6IlRlbGVyaWsgTGljZW5zZSBLZXkifQ...
```
`npx kendo-ui-license activate` 실행 후 개발 서버를 반드시 재시작하여 워터마크를 제거합니다.

### 1-3. 설문온 표준 폰트(`SpoqaHanSansNeo`), 글로벌 리셋 및 CSS Import 순서 (필수)
`main.jsx`에서 스타일을 불러올 때 반드시 **`@progress/kendo-theme-default/dist/all.css`를 먼저 import하고, 그 아래에 `surveyon-common/assets/css/surveyon-theme.css`를 import**해야 합니다:
```jsx
// ✅ 올바른 CSS import 순서 (main.jsx)
import '@progress/kendo-theme-default/dist/all.css';
import 'surveyon-common/assets/css/surveyon-theme.css';
```
- ❌ **`surveyon-theme.css`를 `all.css`보다 먼저 import 금지**: 뒤에 로드된 `all.css`가 Kendo Grid 선택 행(`.k-selected`) 스타일을 Kendo 기본 다홍/살구색(`#ff6358`)으로 덮어쓰게 됩니다.
- ❌ `index.css` 등에 `font-family: ... !important`를 임의로 추가하여 원본 `SpoqaHanSansNeo` 서체를 덮어쓰지 마십시오.
- ❌ Vite 초기 템플릿의 `index.css`, `App.css` 기본 스타일(버튼 패딩, 배경색 등)은 반드시 제거하고, `node_modules/surveyon-common/assets/images/favicon.svg`를 `public/favicon.svg`로 복사한 뒤 `index.html`의 `<head>`에 `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`와 `<title>설문온</title>`을 설정하십시오 (`href="data:,"` 같은 빈 아이콘 설정 금지).

---

## 2. 테마 및 색상 시스템 규칙 (Color Constraints)

설문온은 `<html>` 또는 `<AppLayout service="...">`의 서비스 키에 따라 동적으로 색상이 전환됩니다:
- `hsrt`: 블루 테마 (`#3b82f6`)
- `dataManagement`: 그린 테마 (`#16a34a`)
- `aiOpen`: 오렌지 테마 (`#F97316`)
- `fieldManagement`: 네이비 테마 (`#1E3A8A`)

### 2-1. 허용되는 CSS 변수 (Mandatory CSS Variables)
색상이 필요한 모든 컴포넌트에는 반드시 아래 CSS Custom Properties를 사용해야 합니다:
```css
/* 메인 액션 및 호버 */
var(--primary-color)
var(--primary-hover)
var(--primary-focus)
var(--primary-border)

/* 배경 및 선택 하이라이트 */
var(--primary-bg-hover)      /* 연한 호버 배경 */
var(--primary-bg-selected)   /* 연한 선택 배경 */

/* 중립 색상 */
var(--ds-bg)                 /* 페이지 배경 (#f8fafc) */
var(--ds-surface)            /* 카드/서피스 배경 (#ffffff) */
var(--ds-border)             /* 테두리 (#e2e8f0) */
var(--ds-text-main)          /* 기본 텍스트 (#1e293b) */
var(--ds-text-sub)           /* 보조 텍스트 (#64748b) */
```

### 2-2. 올바른 작성 예시 vs 잘못된 작성 예시
```jsx
// ❌ 잘못된 예시 (하드코딩 금지)
<button style={{ backgroundColor: '#16a34a', color: '#fff' }}>저장</button>
<div style={{ borderColor: '#2563eb' }}>...</div>

// ✅ 올바른 예시 (클래스 또는 CSS 변수 사용)
<button className="cmn-btn cmn-btn-primary">저장</button>
<div style={{ borderColor: 'var(--primary-border)' }}>...</div>
```

---

## 3. 화면 레이아웃 및 크롤링 ID 규칙 (Layout & ID Standards)

모든 페이지는 `surveyon-common`의 `<PageContainer>`를 최상위 루트로 감싸야 하며, 크롤링을 위한 고유 ID를 가져야 합니다.

```jsx
import { PageContainer } from 'surveyon-common';

<PageContainer
  id="field-progress-container"
  title="실사 진행 현황"
  infoTooltip="실사 프로젝트 진행 상태 및 필드 데이터를 관리하는 화면입니다."
  onSearch={handleSearch}
  searchPlaceholder="조사명 검색..."
  onSave={handleSave}
  saveLabel="저장"
  headerActions={
    <>
      <button id="btn-add" type="button" className="cmn-btn cmn-btn-outline">
        <Plus size={15} />
        <span>신규 등록</span>
      </button>
      <button id="btn-delete" type="button" className="cmn-btn cmn-btn-danger" onClick={handleDelete}>
        <Trash2 size={15} />
        <span>삭제</span>
      </button>
    </>
  }
>
  {/* 본문 영역 (반드시 height 100% 핏 & Kendo React Grid 필수 사용) */}
  <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
    <Grid data={dataList} style={{ height: '100%' }} pageable={true} sortable={true}>
      <GridColumn field="id" title="번호" width="80px" className="text-center" />
      <GridColumn field="title" title="조사명" />
    </Grid>
  </div>
</PageContainer>
```

### 3-1. Kendo React Grid 및 `surveyon-common` 내장 컴포넌트 필수 사용 규격
- 목록, 데이터 조회, 표 형태의 UI를 구현할 때는 일반 HTML `<table>`이나 외부 테이블 라이브러리를 사용하지 말고 **반드시 `@progress/kendo-react-grid`의 `<Grid>`, `<GridColumn>`** (또는 `surveyon-common`에서 제공하는 `KendoGrid`, `KendoGridV2`, `KendoGridV3`, `GridData`, `ExcelColumnMenu`, `GridDataCount`)을 사용하십시오.
- `surveyon-theme.css`(`kendo_custom.css` 포함)가 로드되어 있으므로, `<Grid>` 및 `<GridDataCount>` 사용 시 대메뉴별 테마 색상(행 호버, 행 선택 `.k-selected`, 체크박스 `:checked` / 부분선택 `:indeterminate`, 정렬 화살표 `.k-sort-icon`, 건수 숫자 `.grid-data-count__number`)이 자동으로 `var(--primary-color)`에 연동됩니다. (임의로 주황색/다홍색 등을 하드코딩하지 마십시오.)
- 그리드를 감싸는 컨테이너와 `<Grid>`에는 반드시 `style={{ height: '100%' }}`를 부여하여 `<PageContainer>` 내부 영역에 꽉 차고 그리드 내부 스크롤이 동작하도록 구성하십시오.
- **이미 `surveyon-common`에 내장되어 바로 import 가능한 공통 모달 및 API 훅**:
  - 모달/챗봇: `ProjectSelectionModal` (`<AppLayout>`에 기본 내장), `ProPermissionModal`, `NewDataModal`, `PageListPopup`, `SurveyonAssistant` (`<AppLayout>`에 기본 내장)
  - 내장 API 훅: `MainListApi`, `ProEnterApi`, `ProPermissionApi`, `VariablePageApi`, `ChatApi`

---

## 4. 공통 버튼 규격 (`cmn-btn`)

AI는 버튼을 생성할 때 반드시 아래 4대 표준 버튼 클래스 중 하나를 지정해야 합니다:

| 클래스명 | 역할 및 사용 목적 | 호버 효과 |
| :--- | :--- | :--- |
| `cmn-btn cmn-btn-primary` | **핵심 실행 (저장, 완료, 조회, 등록)** | 대메뉴 테마 컬러 짙어짐 |
| `cmn-btn cmn-btn-outline` | **주요 액션 (+추가, 생성, 실행)** | 배경 연한 테마색 + 테두리 강조 |
| `cmn-btn cmn-btn-secondary` | **보조 액션 (취소, 닫기, 목록, 다운로드)** | 소프트 그레이 호버 |
| `cmn-btn cmn-btn-danger` | **위험 액션 (삭제, 제거)** | **빨간색(#dc2626) 글자/아이콘 고정 유지** |
| `cmn-btn-sm` | **소형 사이즈 (그리드 행 내부 액션용)** | 높이 28px 규격 |

---

## 5. 공통 API 통신 및 응답 규격 (`api`, `resultjson`)

백엔드 통신 시 Axios 인스턴스를 직접 생성하지 말고, 반드시 `surveyon-common`의 `api` 모듈을 사용하십시오.

### 5-1. 실제 API 응답 구조 (`success === '777'`, `resultjson`)
- 설문온 백엔드는 정상 처리 시 **`String(res?.success) === '777'`**을 반환하며, 실제 결과 데이터는 **`res.resultjson`** 필드에 담겨 옵니다 (`res.data`가 아님에 주의).
```jsx
import { api, modalContext, loadingSpinnerContext } from 'surveyon-common';

// 1. 서비스 키를 지정하여 호출하는 표준 방식
// - 'API_BASE_URL_DATAMANAGEMENT' : 데이터관리 (/APIs/d)
// - 'API_BASE_URL_DATASTATUS'     : H-SRT (/APIs/s)
// - 'API_BASE_URL_OPENAI'         : AI오픈분석 (/APIs/o)
// - 'API_BASE_URL_BOARD'          : 공지/문의 (/APIs/n)
const res = await api.post({ projectnum: 'P2026_001' }, '/data/info', 'API_BASE_URL_DATAMANAGEMENT');

if (String(res?.success) === '777') {
  const resultData = res?.resultjson ?? [];
  setDataList(Array.isArray(resultData) ? resultData : []);
} else {
  // 첫 번째 인자는 에러코드(status), 두 번째 인자는 에러 메시지
  modal.showErrorAlert(String(res?.success || 'ERR'), res?.message || '데이터 조회에 실패했습니다.');
}

// 2. 또는 전체 API 경로를 직접 전달하는 방식
const detailRes = await api.get({ id: 123 }, '/APIs/d/data/detail');
```

---

## 6. 전역 모달 & 로딩 스피너 규칙 (무한루프 방지 필수)

브라우저 기본 `alert()`, `confirm()`을 사용하면 디자인 통일성이 깨집니다. 반드시 Context를 주입받아 사용하십시오.

### 6-1. ⚠️ `loading` · `modal` Context 무한루프 주의사항 (필독)
- `LoadingProvider`와 `ModalProvider`는 내부 상태가 바뀔 때(`loading.show()` / `loading.hide()` 등) 리렌더링되며 새 Context 객체를 내려줄 수 있습니다.
- 따라서 **`useEffect`나 `useCallback`의 의존성 배열(dependency array)에 `loading`이나 `modal`을 절대 넣지 마십시오.** 의존성 배열에 넣으면 API 호출 시 `loading.show()`가 실행되면서 `useEffect`가 재실행되어 **즉시 무한 API 호출 루프**에 빠집니다.

```jsx
const modal = useContext(modalContext);
const loading = useContext(loadingSpinnerContext);

// ❌ 잘못된 예시 (무한 API 호출 발생!)
const fetchList = useCallback(async () => {
  loading.show();
  // ...
  loading.hide();
}, [loading, modal]); // <-- 절대 금지!

// ✅ 올바른 예시 (의존성 배열에서 loading, modal 제외)
const fetchList = useCallback(async () => {
  try {
    loading.show();
    const res = await api.post({ projectnum }, '/data/info', 'API_BASE_URL_DATAMANAGEMENT');
    if (String(res?.success) === '777') {
      setDataList(res?.resultjson || []);
    } else {
      modal.showErrorAlert(String(res?.success || 'ERR'), res?.message || '조회에 실패했습니다.');
    }
  } catch (err) {
    modal.showErrorAlert('ERR', '서버 통신 중 오류가 발생했습니다.');
  } finally {
    loading.hide();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [projectnum]);

useEffect(() => {
  fetchList();
}, [fetchList]);
```

### 6-2. 모달 호출 규격 (`showAlert`, `showErrorAlert`, `showConfirm`)
- **`modal.showErrorAlert(status, msg)` 인자 규격 주의**:
  - 오류 팝업의 제목(`'오류'`)은 `Modal.jsx` 내부에서 자동 고정됩니다.
  - **첫 번째 인자는 에러코드(`status`)**, **두 번째 인자는 에러 메시지(`msg`)**입니다 (`status === '777'`이면 자동으로 무시됨).
  - ❌ `modal.showErrorAlert('오류', '메시지')` (잘못된 호출: 에러코드 자리에 `'오류'`가 표시됨)
  - ✅ `modal.showErrorAlert(String(res?.success || 'ERR'), res?.message || '처리 중 오류가 발생했습니다.')`

```jsx
// 1. 일반 알림창 (title, content)
modal.showAlert('알림', '성공적으로 처리되었습니다.');

// 2. 오류창 (status 에러코드, msg 에러메시지)
modal.showErrorAlert(String(res?.success || 'ERR'), res?.message || '처리 중 오류가 발생했습니다.');

// 3. 확인창 (Hex 색상 하드코딩 없이 title과 click만 지정)
modal.showConfirm('확인', '계속 진행하시겠습니까?', {
  btns: [
    { title: '취소' },
    { title: '확인', click: async () => { /* 실행 로직 */ } }
  ]
});
```

---

## 7. 서비스별 분리 개발 및 라우팅 규칙 (Service Routing & Custom Menu)

설문온은 각 대메뉴 서비스를 개별 프로젝트로 분리하여 개발하며, **같은 도메인 아래에서 새 창(`window.open`)이 아닌 같은 창 URL 이동(`window.location.href`)**으로 서비스 간 이동을 처리합니다.

### 7-1. 설문온 대메뉴 서비스 키 및 기본 경로 규격
| 서비스명 | `service` prop 값 | `vite.config.js` `base` 설정 | 메인 홈 / 사이드바(☰) 진입 경로 | 테마 색상 |
| :--- | :--- | :--- | :--- | :--- |
| **H-SRT** | `'hsrt'` | `'/data_status/'` | `/data_status` | 블루 (`#3b82f6`) |
| **데이터관리** | `'dataManagement'` | `'/data_management/'` | `/data_management`, `/data_management/setting/map` | 그린 (`#16a34a`) |
| **AI오픈분석** | `'aiOpen'` | `'/ai_open_analysis/'` | `/ai_open_analysis` | 오렌지 (`#F97316`) |
| **실사관리** | `'fieldManagement'` | `'/field_management/'` | `/field_management`, `/field_management/analysis/progress` | 네이비 (`#1E3A8A`) |

- **필수 설정 1 (`vite.config.js` `base`)**: 통합 도메인/프록시 환경에서 메인 서버와 JS/CSS 에셋 경로가 충돌하지 않도록 `vite.config.js`에 `base: '/<표준베이스경로>/'` (예: `base: '/field_management/'`)를 반드시 설정하십시오.
- **필수 설정 2 (`App.jsx` 진입 경로 리다이렉트)**: 설문온 메인 홈이나 공통 사이드바(☰ 대메뉴 전환)에서 클릭해 넘어올 때 위 표의 **진입 경로**로 이동하므로, 프로젝트의 첫 화면 경로가 다른 경우(예: `/field_management/main`)에도 빈 화면이 뜨지 않도록 기본 진입 경로 및 와일드카드(`<Route path="/<표준베이스경로>/*" element={<Navigate to="첫화면경로" replace />} />`) 리다이렉트를 반드시 함께 등록하십시오.

### 7-2. 좌측 사이드바 메뉴 구성 규칙 (`sidebarProps`)
- `surveyon-common` 패키지의 원본 코드를 직접 수정하지 말고, 각 프로젝트의 `App.jsx`에서 `<AppLayout>`의 `sidebarProps={{ brand, menuGroups }}`를 통해 해당 서비스의 좌측 메뉴를 정의하십시오.
```jsx
const sidebarProps = useMemo(() => ({
  brand: {
    title: '서비스명',
    onClick: () => navigate('/서비스경로/메인화면'),
  },
  menuGroups: [
    {
      label: '카테고리명', // 생략 가능 ('')
      items: [
        { label: '메뉴 1', path: '/서비스경로/menu1', icon: IconComponent },
        { label: '메뉴 2 (준비중)', icon: IconComponent, isPending: true },
      ],
    },
  ],
}), [navigate]);

<Route element={<AppLayout service="서비스키" sidebarProps={sidebarProps} />}>
```

### 7-3. 서비스 내부 이동 vs 타 서비스 이동 구분
- **현재 프로젝트(같은 대메뉴) 내부 화면 간 이동**: React Router의 `navigate()`를 사용하십시오.
- **설문온 메인 홈(`/`) 또는 다른 대메뉴 서비스로 이동**: 새 창(`window.open`)을 띄우지 말고 반드시 **`window.location.href = '/경로'`**를 사용하여 같은 창(탭)에서 이동하십시오. (동일 도메인 및 동일 탭을 유지해야 쿠키 `TOKEN`과 `sessionStorage`의 프로젝트 선택 정보가 공유됩니다.)
- `surveyon-common`의 공통 사이드바(`AppSidebar`, `Sidebar`)에는 홈 이동(`/`), 로그아웃(`/login`), 타 대메뉴 전환 시 `window.location.href` 이동이 기본 내장되어 있으므로 이를 임의로 변경하지 마십시오.
