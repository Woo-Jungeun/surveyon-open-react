# 🤖 설문온(SulmunOn) AI 코딩 에이전트 지침서 (AI Coding Rules)

> **이 문서는 Antigravity, Cursor, Copilot, Claude 등 AI 코딩 어시스턴트가 설문온 프론트엔드 코드를 작성하거나 리팩토링할 때 반드시 준수해야 하는 엄격한 제약조건(Strict Constraints)과 표준 규격입니다.**  
> AI는 설문온 코드를 생성할 때 아래 규칙을 100% 준수해야 합니다.

---

## 📌 핵심 제약조건 요약 (Critical Rules)
- ❌ **Hex 색상 직접 작성 절대 금지**: `#16a34a`, `#2563eb` 등 Hex 컬러를 CSS나 JSX style에 하드코딩하지 마십시오.
- ❌ **브라우저 기본 `alert()` / `confirm()` 절대 금지**: 반드시 `modalContext`의 `showAlert()`, `showConfirm()`을 사용하십시오.
- ❌ **임의의 버튼 스타일 작성 금지**: 반드시 사전 정의된 `cmn-btn` 클래스를 사용하십시오.
- ❌ **Axios 직접 생성 금지**: 반드시 `surveyon-common`의 `api` 모듈(`api.get`, `api.post`)을 사용하십시오.
- ✅ **모든 신규 페이지는 `<PageContainer>`로 래핑**: 화면 높이 100% 핏을 반드시 유지해야 합니다.
- ✅ **신규 프로젝트 구성 시 `.env`에 Kendo 라이센스 등록 및 `surveyon-theme.css` 필수 import** (Vite 기본 `index.css`로 원본 `SpoqaHanSansNeo` 폰트나 버튼 `padding: 0` 리셋을 덮어쓰지 마십시오).
- ✅ **크롤링 및 자동화 테스트용 고유 `id` 속성 필수 부여**: 표준 ID 체계를 누락하지 마십시오.

---

## 1. 프로젝트 초기 구성 규칙 (Project Setup Constraints)

AI가 설문온 신규 프로젝트 또는 화면을 구성할 때 반드시 다음 규칙을 기본으로 적용해야 합니다:

### 1-1. Kendo 라이센스 및 환경 변수
루트 디렉토리에 `.env` 파일을 생성하고 Telerik 라이센스를 등록합니다:
```env
TELERIK_LICENSE=eyJhbGciOiJSUzI1NiIsInR5cCI6IlRlbGVyaWsgTGljZW5zZSBLZXkifQ...
```
라이센스 활성화 후 개발 서버를 반드시 재시작하여 워터마크를 제거합니다.

### 1-2. 설문온 표준 폰트(`SpoqaHanSansNeo`) 및 글로벌 리셋 유지
`main.jsx`에서 `import 'surveyon-common/assets/css/surveyon-theme.css';`를 호출하면 `reset.css`(`SpoqaHanSansNeo` 폰트, `button { padding: 0 }`, `line-height: 1.5`, `letter-spacing: -0.56px`)와 `common.css`, `kendo_custom.css`가 자동으로 로드됩니다.
- ❌ `index.css` 등에 `font-family: ... !important`를 임의로 추가하여 원본 `SpoqaHanSansNeo` 서체를 덮어쓰지 마십시오.
- ❌ Vite 초기 템플릿의 `index.css`, `App.css` 기본 스타일(버튼 패딩, 배경색 등)은 반드시 제거하십시오.

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
  {/* 본문 영역 (반드시 height 100% 핏) */}
  <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
    <Grid style={{ height: '100%' }} ... />
  </div>
</PageContainer>
```

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

## 5. 공통 API 통신 및 토큰 연동 규칙 (`api`)

백엔드 통신 시 Axios 인스턴스를 직접 생성하지 말고, 반드시 `surveyon-common`의 `api` 모듈을 사용하십시오.

```jsx
import { api, modalContext, loadingSpinnerContext } from 'surveyon-common';

// 1. 서비스 키를 지정하여 호출하는 표준 방식
// - 'API_BASE_URL_DATAMANAGEMENT' : 데이터관리 (/APIs/d)
// - 'API_BASE_URL_DATASTATUS'     : H-SRT (/APIs/s)
// - 'API_BASE_URL_OPENAI'         : AI오픈분석 (/APIs/o)
// - 'API_BASE_URL_BOARD'          : 공지/문의 (/APIs/n)
const res = await api.post({ projectnum: 'P2026_001' }, '/data/info', 'API_BASE_URL_DATAMANAGEMENT');

// 2. 또는 전체 API 경로를 직접 전달하는 방식
const res = await api.get({ id: 123 }, '/APIs/d/data/detail');
```

---

## 6. 전역 모달 & 로딩 스피너 규칙

브라우저 기본 `alert()`, `confirm()`을 사용하면 디자인 통일성이 깨집니다. 반드시 Context를 주입받아 사용하십시오:

```jsx
const modal = useContext(modalContext);
const loading = useContext(loadingSpinnerContext);

// 알림창
modal.showAlert('알림', '성공적으로 처리되었습니다.');

// 오류창
modal.showErrorAlert('오류', '처리 중 오류가 발생했습니다.');

// 확인창
modal.showConfirm('확인', '계속 진행하시겠습니까?', {
  btns: [
    { title: '취소', background: '#75849a' },
    { title: '확인', click: async () => { /* 실행 로직 */ } }
  ]
});
```

---

## 7. 서비스별 분리 개발 및 라우팅 규칙 (Service Routing & Custom Menu)

설문온은 각 대메뉴 서비스를 개별 프로젝트로 분리하여 개발하며, **같은 도메인 아래에서 새 창(`window.open`)이 아닌 같은 창 URL 이동(`window.location.href`)**으로 서비스 간 이동을 처리합니다.

### 7-1. 설문온 대메뉴 서비스 키 및 기본 경로 규격
| 서비스명 | `service` prop 값 | 표준 베이스 경로 | 테마 색상 |
| :--- | :--- | :--- | :--- |
| **H-SRT** | `'hsrt'` | `/data_status` | 블루 (`#3b82f6`) |
| **데이터관리** | `'dataManagement'` | `/data_management` | 그린 (`#16a34a`) |
| **AI오픈분석** | `'aiOpen'` | `/ai_open_analysis` | 오렌지 (`#F97316`) |
| **실사관리** | `'fieldManagement'` | `/field_management` | 네이비 (`#1E3A8A`) |

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
