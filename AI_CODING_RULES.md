# 🤖 설문온(SulmunOn) AI 코딩 에이전트 지침서 (AI Coding Rules)

> **이 문서는 Antigravity, Cursor, Copilot, Claude 등 AI 코딩 어시스턴트가 설문온 프론트엔드 코드를 작성하거나 리팩토링할 때 반드시 준수해야 하는 엄격한 제약조건(Strict Constraints)과 표준 규격입니다.**  
> AI는 설문온 코드를 생성할 때 아래 규칙을 100% 준수해야 합니다.

---

## 📌 핵심 제약조건 요약 (Critical Rules)
- ❌ **Hex 색상 직접 작성 절대 금지**: `#16a34a`, `#2563eb` 등 Hex 컬러를 CSS나 JSX style에 하드코딩하지 마십시오.
- ❌ **브라우저 기본 `alert()` / `confirm()` 절대 금지**: 반드시 `modalContext`의 `showAlert()`, `showConfirm()`을 사용하십시오.
- ❌ **임의의 버튼 스타일 작성 금지**: 반드시 사전 정의된 `cmn-btn` 클래스를 사용하십시오.
- ✅ **모든 신규 페이지는 `<PageContainer>`로 래핑**: 화면 높이 100% 핏을 반드시 유지해야 합니다.
- ✅ **크롤링 및 자동화 테스트용 고유 `id` 속성 필수 부여**: 표준 ID 체계를 누락하지 마십시오.

---

## 1. 테마 및 색상 시스템 규칙 (Color Constraints)

설문온은 `<html>` 또는 최상위 컨테이너의 `data-theme` 속성에 따라 동적으로 색상이 전환됩니다:
- `hsrt`: 블루 테마 (`#3b82f6`)
- `dataManagement`: 그린 테마 (`#16a34a`)
- `aiOpen`: 오렌지 테마 (`#F97316`)
- `fieldManagement`: 네이비 테마 (`#1E3A8A`)

### 1-1. 허용되는 CSS 변수 (Mandatory CSS Variables)
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

### 1-2. 올바른 작성 예시 vs 잘못된 작성 예시
```jsx
// ❌ 잘못된 예시 (하드코딩 금지)
<button style={{ backgroundColor: '#16a34a', color: '#fff' }}>저장</button>
<div style={{ borderColor: '#2563eb' }}>...</div>

// ✅ 올바른 예시 (클래스 또는 CSS 변수 사용)
<button className="cmn-btn cmn-btn-primary">저장</button>
<div style={{ borderColor: 'var(--primary-border)' }}>...</div>
```

---

## 2. 화면 레이아웃 및 크롤링 ID 규칙 (Layout & ID Standards)

모든 단위 업무 화면은 `surveyon-common`의 `PageContainer`를 기본 캔버스로 사용합니다.

### 2-1. 크롤링 및 E2E 테스트 자동화용 고유 ID 명명 규칙
자동화 테스트(Selenium, Playwright 등)의 신뢰성을 위해 컴포넌트 렌더링 시 아래 표준 `id`를 필수로 보존하십시오:

| 영역 | 대상 태그 / 요소 | 필수 부여 `id` |
| :--- | :--- | :--- |
| **전체 프레임** | 루트 레이아웃 `<div>` | `id="app-root"` |
| **메인 섹션** | 우측 메인 `<section>` | `id="app-layout-main"` |
| **라우터 본문** | 콘텐츠 래퍼 `<div>` | `id="app-main-content"` |
| **화면 컨테이너** | 개별 페이지 최상위 `<main>` | `id="page-container"` |
| **메인 작업영역** | 실제 그리드/테이블이 위치하는 본문 `<div>` | `id="page-content"` |
| **헤더** | 상단 바 `<header>` | `id="page-header"` |
| **검색창** | 헤더 내 검색 `<input>` | `id="page-search-input"` |
| **액션 버튼** | [추가] / [삭제] / [저장] 버튼 | `id="page-header-add-btn"`<br>`id="page-header-delete-btn"`<br>`id="page-header-save-btn"` |
| **사이드바** | 좌측 네비게이션 `<aside>` | `id="app-sidebar"` |
| **사이드바 내부** | 헤더 / 스크롤메뉴 / 푸터 | `id="app-sidebar-header"`<br>`id="app-sidebar-nav"`<br>`id="app-sidebar-footer"` |
| **하단 푸터** | 공통 푸터 `<footer>` | `id="app-footer"` |

---

## 3. 버튼 컴포넌트 규격 (Button Standards)

새로운 버튼 스타일을 임의로 생성하지 말고, 반드시 아래 사전 정의된 클래스를 사용하십시오:

```jsx
// 1. Primary Button (메인 실행: 저장, 조회, 완료)
<button type="button" className="cmn-btn cmn-btn-primary" onClick={onSave}>
  <Save size={15} />
  <span>저장</span>
</button>

// 2. Outline Button (주요 추가/생성 액션: +추가, 생성)
<button type="button" className="cmn-btn cmn-btn-outline" onClick={onAdd}>
  <Plus size={15} />
  <span>신규 추가</span>
</button>

// 3. Secondary Button (보조 액션: 취소, 닫기, 목록)
<button type="button" className="cmn-btn cmn-btn-secondary" onClick={onCancel}>
  <span>취소</span>
</button>

// 4. Danger Button (삭제/위험 액션)
<button type="button" className="cmn-btn cmn-btn-danger" onClick={onDelete}>
  <Trash2 size={15} />
  <span>삭제</span>
</button>

// 5. Small Button (그리드 행 내부 액션용 28px 버튼)
<button type="button" className="cmn-btn cmn-btn-outline cmn-btn-sm">
  <span>수정</span>
</button>
```

---

## 4. Kendo Grid 100% 핏 표준 작성 규칙 (Grid Architecture)

그리드가 브라우저 높이에 맞춰 유동적으로 꽉 차도록 항상 아래 계층 구조를 준수하십시오:

```jsx
<PageContainer title="조사 목록">
  {/* [규칙] wrapper에 height: 100% 및 flex: 1 적용 */}
  <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
    <Grid
      data={dataList}
      style={{ height: '100%' }}
      pageable={true}
      sortable={true}
    >
      <GridColumn field="id" title="번호" width="80px" />
      <GridColumn field="name" title="프로젝트명" />
      <GridColumn field="status" title="상태" width="120px" />
    </Grid>
  </div>
</PageContainer>
```

---

## 5. 전역 모달 및 로딩바 작성 규칙 (Modal & Spinner Rules)

AI는 팝업을 작성할 때 네이티브 `alert()`나 `confirm()`을 절대 작성해서는 안 되며, `modalContext`를 사용해야 합니다.

```jsx
import { useContext } from 'react';
import { modalContext, loadingSpinnerContext } from 'surveyon-common';

const modal = useContext(modalContext);
const loading = useContext(loadingSpinnerContext);

// 1. 단일 알림창 (Alert)
modal.showAlert('알림', '정상적으로 처리되었습니다.');

// 2. 오류 팝업 (Error Alert)
modal.showErrorAlert('오류', '데이터를 저장하지 못했습니다.');

// 3. 확인/취소 컨펌창 (Confirm)
modal.showConfirm('확인', '정말 삭제하시겠습니까?', {
  btns: [
    { title: '취소', background: '#75849a' },
    {
      title: '삭제',
      click: async () => {
        try {
          loading.show();
          await deleteItem();
          modal.showAlert('알림', '삭제되었습니다.');
        } finally {
          loading.hide();
        }
      }
    }
  ]
});
```

---

## 6. 백엔드 API 통신 및 인증 규칙 (API & Auth Standards)
- **통신 클라이언트**: 반드시 `surveyon-common`의 `api` 모듈을 사용하십시오. (`import { api } from 'surveyon-common';`)
  - 조회: `const res = await api.post(params, '/datasets/list', 'API_BASE_URL_DATASTATUS');`
  - 저장/실행: `const res = await api.post(payload, '/datasets/save', 'API_BASE_URL_DATASTATUS');`
  - 파일 다운로드: `const res = await api.file(payload, '/files/download');`
- **인증 토큰 자동화**: `api` 호출 시 브라우저 쿠키의 `TOKEN`, `X-Auth-Token`, `X-User-Id`, `hrc` 헤더가 내부 인터셉터에서 자동 첨부되므로 임의로 Axios 헤더를 수동 조작하지 마십시오.
- **세션 데이터 참조**:
  - 프로젝트 번호: `sessionStorage.getItem('projectnum')`
  - 병합 프로젝트 번호: `sessionStorage.getItem('merge_pn')`
  - 프로젝트명: `sessionStorage.getItem('projectname')`
  - 대시보드 제목: `sessionStorage.getItem('pagetitle')`
