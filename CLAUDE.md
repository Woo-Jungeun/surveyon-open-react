# 🚀 설문온(SulmunOn) 프로젝트 총괄 마스터 지침서 (`CLAUDE.md`)

> **📌 이 문서의 목적**:  
> 본 문서는 **Claude Code (클로드 코드)** 에이전트가 설문온(`surveyon`) 프론트엔드 프로젝트를 처음 열었을 때 **즉시 프로젝트 전체 구조, 아키텍처, 우리 팀만의 개발 약속(Strict Rules), 공통 컴포넌트/API 규격, 그리고 실전 버그 방지 노하우를 100% 이해하고 작업할 수 있도록 작성된 마스터 컨텍스트 문서**입니다.
>
> **💡 사용 방법**:
> 1. 이 파일을 프로젝트 최상위 루트에 **`CLAUDE.md`** 이름으로 두면, Claude Code가 세션을 시작할 때마다 **자동으로 이 문서를 읽고 규칙을 준수**합니다.
> 2. 새 세션을 시작할 때 본 문서 최하단의 **[부록: 클로드 코드 첫 인사/세션 시작 프롬프트]**를 복사해 붙여넣으면 더욱 완벽하게 컨텍스트가 고정됩니다.

---

## 📚 0. 프로젝트 내 핵심 레퍼런스 문서 체계 (읽는 순서)

코드를 수정하거나 신규 화면을 작성하기 전, 필요시 아래 문서를 함께 참조하십시오:
1. **`CLAUDE.md` (본 문서)**: 프로젝트 전체 아키텍처, 핵심 제약조건(Critical Rules), 폴더 구조, 도메인 지식 총괄본 
2. **`AI_CODING_RULES.md`**: AI 에이전트가 절대 어기면 안 되는 프론트엔드 코딩 제약사항 요약
3. **`DEVELOPER_QUICK_START.md`**: 5분 초기 환경 구축, `surveyon-common` 사용법, 화면/버튼/API/모달 코드 템플릿
4. **`THEME_DEVELOPMENT_GUIDE.md`**: 4대 대메뉴 테마 CSS 변수, E2E 크롤링 자동화 표준 ID 명세표, Nginx 멀티서버 배포 구조
5. **`BRAND_THEME_ROADMAP.md`**: H-SRT 고객사 브랜드 테마(화이트라벨) 구축 내역 및 차기 로드맵
6. **`data_management_full_spec.md`**: 데이터관리(맵 관리, 설문지 인식 QA, 스크립트 교차검증, AI 데이터 생성) 상세 기능 명세

---

## 🚨 1. 절대 어기면 안 되는 핵심 약속 (CRITICAL RULES — 최우선 준수)

> **[경고]** 아래 10가지 규칙은 실제 운영/개발 중 발생한 치명적 버그들을 해결하며 확립된 **절대 규칙**입니다. 단 하나의 예외 없이 100% 준수하십시오.

### ❌ Rule 1. `useEffect` / `useCallback` 의존성 배열에 `loading`, `modal` 추가 절대 금지 (무한 루프 방지)
- `LoadingProvider`(`loadingSpinnerContext`)와 `ModalProvider`(`modalContext`)는 `loading.show()` / `loading.hide()`가 호출될 때마다 내부 state가 변경되어 새 Context 객체를 내려줍니다.
- 따라서 **`useEffect`나 `useCallback`의 dependency array에 `[loading, modal]`을 넣으면 `loading.show()` 호출 즉시 무한 API 호출 루프**에 빠집니다.
- **해결책**: 의존성 배열에서 `loading`, `modal`을 **반드시 제외**하고 `// eslint-disable-next-line react-hooks/exhaustive-deps`를 선언하십시오.

### ❌ Rule 2. Hex 색상 코드 직접 하드코딩 절대 금지 (`var(--primary-color)` 등 CSS 변수 필수)
- 설문온은 4대 대메뉴별 테마 전환 및 H-SRT 고객사 브랜드 화이트라벨(`--srt-brand`) 기능을 지원합니다.
- CSS 파일이나 JSX 인라인 `style={{}}`에 `#16a34a`, `#2563eb`, `#eff6ff` 등의 Hex 컬러를 직접 하드코딩하면 `surveyon-theme.css`의 전역 가중치와 충돌하거나 브랜드 테마 색상이 먹히지 않습니다.
- **해결책**: 반드시 `var(--primary-color)`, `var(--primary-hover)`, `var(--primary-bg-hover)`, `var(--primary-bg-selected)`, `var(--srt-primary-50, #eff6ff)` 등의 CSS 변수와 표준 클래스를 사용하십시오.
- **예외(고유 색상 격리 영역)**:
  - 상단 프로젝트 선택/등록 모달(`.ps-modal-container`): 설문온 고유 보라색(`#5A4BFF`, `#7C3AED`) 고정
  - H-SRT AI 요약보고서 L1 단계: 파란색(`#2563eb`) 고정
  - 위험/삭제/에러 액션: 빨간색(`#ef4444`, `#dc2626`) 고정

### ❌ Rule 3. 브라우저 기본 `window.alert()` / `window.confirm()` 사용 절대 금지
- 반드시 `modalContext`를 `useContext(modalContext)`로 주입받아 사용하십시오:
  - 일반 알림: `modal.showAlert('알림', '저장되었습니다.')`
  - 확인 창: `modal.showConfirm('확인', '진행하시겠습니까?', { btns: [{ title: '취소' }, { title: '확인', click: () => {...} }] })`
  - **오류 창 (`showErrorAlert` 인자 순서 주의!)**:
    - 첫 번째 인자는 제목이 아니라 **에러코드(`status`)**이고, 두 번째 인자가 **에러 메시지(`msg`)**입니다 (`'오류'` 제목은 모달 내부에서 자동 고정되며, `status === '777'`이면 무시됨).
    - ❌ 잘못된 호출: `modal.showErrorAlert('오류', '메시지')` (에러코드 자리에 '오류'가 찍힘)
    - ✅ 올바른 호출: `modal.showErrorAlert(String(res?.success || 'ERR'), res?.message || '오류가 발생했습니다.')`

### ❌ Rule 4. Axios 직접 생성 금지 & 백엔드 응답 규격 (`success === '777'`, `resultjson`) 엄수
- 개별 컴포넌트에서 `axios.create()`나 `fetch()`를 직접 쓰지 마십시오. 반드시 공통 `api` 모듈(`@/common/queries/Api.js` 또는 `surveyon-common`의 `api`)을 사용하십시오.
- 요청 인터셉터(`src/config/axios/Axios.jsx`)가 쿠키의 `TOKEN`, `X-Auth-Token`, `X-User-Id`, 그리고 `hrc`(userId의 AES256 암호화 값) 헤더를 자동으로 주입합니다.
- **응답 판별 공식**:
  - 성공 여부: **`String(res?.success) === '777'`**
  - 실제 데이터 페이로드: **`res.resultjson`** (`res.data`가 아님에 특별히 주의!)

### ❌ Rule 5. 임의의 HTML `<table>` 지양 & Kendo React Grid 표준 사용
- 데이터 목록, 그리드, 테이블 UI는 `@progress/kendo-react-grid`의 `<Grid>`, `<GridColumn>` 또는 공통 래퍼(`KendoGrid`, `KendoGridV2`, `KendoGridV3`, `GridData`, `GridDataCount`, `ExcelColumnMenu`)를 사용하십시오.
- 그리드를 감싸는 부모 래퍼와 `<Grid>`에는 `style={{ height: '100%' }}`를 부여하여 `<PageContainer>` 내부 높이에 100% 핏(Fit)되고 그리드 내부 스크롤이 작동하도록 구성하십시오.

### ❌ Rule 6. Kendo DropDownList / ComboBox 버벅임(오픈 딜레이) 및 스크롤 닫기 DOM 오염 방지
- **오픈 딜레이 방지**: 대형 화면이나 그리드 내부의 Kendo 드롭다운에 `opened={state}` 같은 부모 Controlled State를 연결하면, 클릭 1회마다 수천 줄의 부모 컴포넌트가 리렌더링되어 **0.5~1초의 심각한 오픈 지연**이 발생합니다. 드롭다운은 **Uncontrolled**로 두고 `popupSettings={{ animate: false }}`를 적용해 0ms 즉각 오픈되게 하십시오.
- **Kendo Portal DOM 특성**: Kendo 팝업/드롭다운/툴팁은 컴포넌트 내부가 아니라 `document.body` 직속 자식(`.k-animation-container`)으로 렌더링됩니다.
- **스크롤 시 닫기 주의**: 팝업 컨테이너에 `element.style.display = 'none'`을 인라인으로 강제 주입하면 다음 클릭 시 팝업이 영구적으로 안 열리는 버그가 발생합니다. 닫을 때는 반드시 `document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))`와 `document.activeElement?.blur()`를 호출해 Kendo가 스스로 정상 클린업하도록 처리하십시오.

### ❌ Rule 7. 임의 버튼 스타일 작성 금지 — 표준 `cmn-btn` 클래스 사용
- 모든 버튼은 `PageLayout.css`에 정의된 표준 클래스를 사용해야 대메뉴별 테마 색상이 자동 반영됩니다:
  - `cmn-btn cmn-btn-primary`: 핵심 실행 (저장, 완료, 조회) — 테마 메인 색상 채움
  - `cmn-btn cmn-btn-outline`: 주요 액션 (+추가, 생성, 실행) — 흰색 배경 + 테마 컬러 보더
  - `cmn-btn cmn-btn-secondary`: 보조 액션 (취소, 닫기, 다운로드) — 소프트 그레이
  - `cmn-btn cmn-btn-danger`: 위험 액션 (삭제, 초기화) — 호버 시에도 빨간색(`#dc2626`) 글자/아이콘 유지
  - `cmn-btn-sm`: 그리드 행 내부용 소형 버튼 (높이 28px)

### ❌ Rule 8. CSS Import 순서 엄수 (`all.css` 먼저 → `surveyon-theme.css` 나중)
- 엔트리포인트(`main.jsx`)에서 반드시 `@progress/kendo-theme-default/dist/all.css`를 **먼저** import하고, 그 아래에 `surveyon-theme.css`를 import해야 합니다.
- 순서가 역전되면 Kendo 기본 다홍색/살구색(`#ff6358`)이 설문온 테마 선택색(`.k-selected`, 체크박스, 정렬 아이콘)을 덮어씁니다.

### ❌ Rule 9. `<AppLayout>` 내장 기능 중복 구현 금지 & `AppSidebar.jsx` 단일화 유지
- `<AppLayout>`에는 이미 **좌측 통합 사이드바(`AppSidebar`)**, **프로젝트 선택/등록 모달(`ProjectSelectionModal`)**, **하단 푸터(`PageFooter`)**, **설문온 파비콘/타이틀 자동 주입**이 내장되어 있습니다.
- 과거 4개로 흩어져 있던 사이드바는 `src/components/common/sidebar/AppSidebar.jsx` **1개 파일로 완전히 통합(단일화)**되었습니다. 특정 서비스(예: 데이터관리, H-SRT)의 사이드바 기능을 수정할 때는 다른 서비스에 영향이 가지 않도록 `currentMode === '...'` 분기를 엄격히 격리하십시오.

### ❌ Rule 10. 멀티 서버 이동 시 새 창(`window.open`) 금지 — 같은 창 이동(`window.location.href`)
- 같은 대메뉴 내부 이동은 React Router의 `navigate()`를 사용합니다.
- 다른 대메뉴 서비스나 메인 홈(`/`)으로 이동할 때(특히 분리 배포 환경)는 새 창을 띄우지 말고 `window.location.href = '/경로'`로 **같은 탭에서 이동**해야 쿠키(`TOKEN`, `X-Auth-Token`), `localStorage`(`redux-persist`), `sessionStorage`(`projectnum`, `merge_pn`, `groupcode`)가 풀리지 않고 그대로 유지됩니다.

---

## 🏗️ 2. 기술 스택 및 프로젝트 환경 (Tech Stack & Environment)

| 구분 | 기술 / 버전 | 비고 및 제약사항 |
| :--- | :--- | :--- |
| **코어 프레임워크** | **React `^18.2.0`** + **Vite `^5.2.0`** | **React 19 사용 절대 금지** (Kendo UI v7 및 `surveyon-common` 호환성) |
| **UI 컴포넌트** | **Progress KendoReact `7.3.0`** | `@progress/kendo-react-grid`, `dialogs`, `dropdowns`, `charts` 등 |
| **Kendo 테마/라이선스** | `@progress/kendo-theme-default` `7.2.1` | 루트 `telerik-license.txt` 및 `.env`의 `TELERIK_LICENSE` 필수 (`npx kendo-ui-license activate`) |
| **상태 관리** | **Redux Toolkit `^2.2.3`** + **Redux-Persist `^6.0.0`** | 로그인/권한(`store.auth`), 쿠키 및 스토리지 영속화 |
| **서버 상태 / 캐싱** | **React Query `^3.39.3`** (`react-query`) | `MainListApi`, `MenuBarApi`, `VariablePageApi` 등 비동기 데이터 훅 |
| **라우팅** | **React Router DOM `^6.22.3`** | `<Routes>`, `<Route element={<AppLayout service="..." />}>` 중첩 라우팅 |
| **실시간 통신** | **Microsoft SignalR `^10.0.0`** | 설문지 AI 파싱 진행률(`task-progress`), 실시간 작업 상태 수신 |
| **아이콘 & 애니메이션** | `lucide-react` `^0.554.0`, `framer-motion` | 표준 UI 아이콘은 `lucide-react` 사용 |
| **암호화 / 유틸** | `crypto-js` (AES256), `dayjs`, `moment`, `xlsx` | API 헤더 `hrc` 암호화(`AES256.Crypto.encryptAES256`), 엑셀 입출력 |
| **표준 웹 폰트** | **SpoqaHanSansNeo** (`fonts.css`) | `reset.css` 및 `surveyon-theme.css`에 기본 내장 |

### 로컬 개발 서버 및 빌드 명령어 (`package.json`)
- `npm run dev`: 개발 서버 실행 (`vite --port 5173 --mode development`, `https://son.hrc.kr` 및 `https://stest.hrc.kr` 프록시 연동)
- `npm run local`: 로컬 백엔드 프록시 모드 실행 (`--mode development-local`)
- `npm run build`: 운영 빌드 (`vite build --mode production`)
- `npm run build-jenkins`: 개발/스테이징 CI 빌드 (`vite build --mode development`)
- `npm run lint`: ESLint 검사 (`--max-warnings 0`)

---

## 📂 3. 디렉토리 구조 및 아키텍처 (Repository Structure)

현재 워크스페이스는 **설문온 통합 프론트엔드(`src/`)**와 이를 타 개발자/분리 프로젝트에서도 그대로 설치해 쓸 수 있도록 패키징한 **공통 라이브러리(`surveyon-common/`)**가 함께 존재하는 구조입니다.

```text
surveyon/
├── CLAUDE.md                        # [본 문서] Claude Code 마스터 지침서
├── AI_CODING_RULES.md               # AI 코딩 엄격 제약조건 문서
├── DEVELOPER_QUICK_START.md         # 신규 프로젝트/개발자 5분 퀵스타트 가이드
├── THEME_DEVELOPMENT_GUIDE.md       # 4대 테마 변수, 크롤링 ID 명세, 멀티서버 배포 가이드
├── BRAND_THEME_ROADMAP.md           # H-SRT 고객사 브랜드 테마(화이트라벨) 설계 및 로드맵
├── data_management_full_spec.md     # 데이터관리 4대 핵심 모듈 기능 명세서
├── vite.config.js                   # Vite 설정 (`@` 별칭 -> `./src`, `/o`, `/APIs`, `/api`, `/rps-silsa`, `/qm-silsa` 프록시)
├── telerik-license.txt              # Kendo UI 정식 라이선스 키 파일
│
├── surveyon-common/                 # 사내 Git 배포용 공통 스타터 킷 패키지 (`git+https://github.com/woojungeun97/surveyon-theme.git`)
│   ├── index.js                     # 공통 레이아웃, 사이드바, 모달, Redux, API, KendoGrid 통합 Export
│   ├── assets/css/surveyon-theme.css# 4대 서비스 통합 테마 + reset + SpoqaHanSansNeo + kendo_custom
│   └── components/                  # 공통 레이아웃 및 컴포넌트 원본과 동기화된 패키지 모듈
│
└── src/                             # 메인 애플리케이션 소스 루트 (`@/` alias)
    ├── main.jsx                     # 앱 엔트리포인트 (Kendo 라이선스, CLDR 한글 로케일, Redux/Modal/Loading Provider)
    ├── App.jsx                      # 최상위 라우터 (공개/인증 라우트 분기, H-SRT 고객 세션 복원, 플로팅 AI 챗봇)
    ├── assets/
    │   ├── css/                     # 글로벌 스타일 (`surveyon-theme.css`, `common.css`, `kendo_custom.css`, `theme.css`)
    │   └── font/                    # `SpoqaHanSansNeo`, `notosanskr` 웹폰트
    ├── common/
    │   ├── queries/                 # `Api.js` (공통 통신 래퍼), 도메인별 공통 Query 훅
    │   ├── redux/                   # `Store.jsx`, `StorePersist.jsx`, `AuthAction.jsx`
    │   └── utils/                   # `AES256.js`, `Validation.jsx`, `SortComparers.js`, `tooltip.js`
    ├── config/
    │   ├── axios/Axios.jsx          # Axios 인스턴스, 요청/응답 인터셉터, 프론트엔드 신버전 자동 감지 토스트
    │   └── kendo/language.json      # Kendo 컴포넌트 한글 번역 메시지
    ├── components/
    │   ├── assistant/               # 우측 하단 플로팅 설문온 AI 챗봇 (`SurveyonAssistant`)
    │   ├── common/
    │   │   ├── layout/              # `AppLayout.jsx`, `PageContainer.jsx`, `PageHeader.jsx`, `PageFooter.jsx`, `PageLayout.css`
    │   │   ├── sidebar/             # `AppSidebar.jsx` (4대 서비스 통합), `Sidebar.jsx` (UI 렌더러)
    │   │   ├── grid/                # `GridData.jsx`, `ExcelColumnMenu.jsx`, `GridDataCount.jsx`
    │   │   ├── Modal.jsx            # 전역 알림/오류/확인 팝업 (`modalContext`)
    │   │   └── LoadingSpinner.jsx   # 전역 로딩 스피너 (`loadingSpinnerContext`)
    │   └── kendo/                   # `KendoGrid.jsx`, `KendoGridV2.jsx`, `KendoGridV3.jsx`
    └── services/                    # 4대 대메뉴 및 주요 도메인 서비스 모듈
        ├── homePage/                # 메인 포털 홈 (`/`)
        ├── login/                   # 일반 로그인(`/login`) 및 고객사 전용 로그인(`/cs`)
        ├── mainList/                # 프로젝트 전체 목록 및 선택 레이아웃
        ├── proRegister/             # 프로젝트 신규 등록 (POF 연동) 및 엑셀 가이드
        ├── board/ & inquiry/        # 공지사항, 패치노트(`/board/*`), 1:1 문의하기(`/inquiry/*`)
        ├── dataStatus/              # [대메뉴 1] H-SRT (`/data_status/*`) - 블루 테마 & 브랜드 화이트라벨
        ├── dataManagement/          # [대메뉴 2] 데이터관리 (`/data_management/*`) - 그린 테마
        ├── aiOpenAnalysis/          # [대메뉴 3] AI 오픈분석 (`/ai_open_analysis/*`) - 오렌지 테마
        └── fieldManagement/         # [대메뉴 4] 실사관리 (`/field_management/*`) - 네이비 테마
```

---

## 🎨 4. 4대 대메뉴 서비스 규격 및 도메인 상세

설문온은 4개의 핵심 대메뉴 서비스로 구성되며, 각 서비스는 `<AppLayout service="...">`를 통해 고유 테마 색상과 좌측 사이드바 메뉴를 자동으로 부여받습니다.

| 서비스명 | `<AppLayout service>` | `data-theme` 값 | 라우트 베이스 (`base`) | 기본 진입 경로 | 대표 테마 색상 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. H-SRT** | `'hsrt'` | `hsrt` | `/data_status/` | `/data_status` (`HsrtGateway` 동적 분기) | **블루** (`#2563eb` / `#3b82f6`) |
| **2. 데이터관리** | `'dataManagement'` | `dataManagement` | `/data_management/` | `/data_management/setting/map` | **그린** (`#16a34a`) |
| **3. AI오픈분석** | `'aiOpen'` | `aiOpen` | `/ai_open_analysis/` | `/ai_open_analysis/pro_list` | **오렌지** (`#F97316`) |
| **4. 실사관리** | `'fieldManagement'` | `fieldManagement` | `/field_management/` | `/field_management/analysis/progress` | **네이비** (`#1E3A8A`) |

### 4-1. [대메뉴 1] H-SRT (`src/services/dataStatus/`)
- **역할**: 고객사 납품용 실시간 통계/교차분석/빈도분석/AI 리포트 대시보드.
- **주요 라우트 및 기능**:
  - `HsrtGateway`: 진입 시 스터브(Stub)/배너 세팅 여부에 따라 `교차분석(cross_analysis)` 또는 `DP의뢰서(dp_request)`로 자동 분기
  - `hsrt/dp_request`: DP 의뢰서 (표 설정, 문항/배너 구성, 요약표 자동생성)
  - `hsrt/add_question`: 문항 추가 및 리코딩(Recoding)
  - `hsrt/cross_analysis`: 교차분석 및 빈도분석 테이블/차트
  - `hsrt/ai_report`: AI 요약보고서 생성 및 뷰어
  - `hsrt/menu_permission`: 고객사/연구원 대시보드 메뉴 권한 설정
- **H-SRT 화이트라벨(고객사 브랜드 테마) 아키텍처 (`srtTheme.css`)**:
  - 고객사 프로젝트마다 브랜드 색상으로 화면을 전환하는 기능 지원.
  - `:root`에 `--srt-brand` 단일 색상만 주입하면 CSS `color-mix()`를 통해 `--srt-primary-25` ~ `--srt-primary-950` 전 단계 명도가 자동 계산됨.
  - H-SRT 코드 작성 시에는 파란색 Hex 코드를 직접 쓰지 말고 반드시 `var(--srt-primary-*)` 또는 `var(--primary-color)`를 사용해야 함.

### 4-2. [대메뉴 2] 데이터관리 (`src/services/dataManagement/`)
- **역할**: 설문 프로젝트의 변수 맵(Excel), 설문지 AI 파싱/검증, 스크립트 교차검증, AI 가상 응답 생성을 총괄.
- **4대 하위 메뉴 (`src/services/dataManagement/index.jsx`)**:
  1. **맵 관리 (`setting/map`)**:
     - 탭 1 (맵 다운로드): 서버 직접 생성 다운로드 + 로컬 PC 도구(`surveyonmap://` 커스텀 프로토콜) Two-Track 지원
     - 탭 2 (업로드 및 반영): 엑셀 업로드 유효성 검증 + 웹 화면에서 바로 편집하는 배치 맵 편집기(`BatchMapEditModal`)
     - 탭 3 (히스토리 및 복원): 변경 이력 조회 및 원클릭 과거 시점 맵 복원
  2. **설문지 인식 (`qa`)**:
     - HWP/DOCX/PDF 설문지 원문을 AI로 파싱하여 문항(`qnum`, `qtype`, 보기, 척도, 스킵/루프 로직) JSON 구조화
     - SignalR(`task-progress`) 실시간 진행률 연동 + 좌측 색인 ↔ 우측 카드 양방향 Scroll-Spy 에디터
  3. **설문 & 스크립트 교차검증 (`survey_test`)**:
     - 기획서(설문지)와 온라인 조사 C# 엔진 스크립트(`qm`) 간의 문법 오류(`syntax`) 및 보기/로직 불일치(`cross`) 대조 검증
  4. **AI 데이터 생성 (`ai_data`)**:
     - Playwright 기반 E2E 자동 응답 봇(`surveyonrunner://run`) 가동, PID별 완주/탈락 결함 분류(`FAILURE_CLASS_MAP`), QMaster 실사 서버 연동 데이터 초기화(`/rps-silsa`, `/qm-silsa`), SPSS(`.sav`) 바이너리 다운로드

### 4-3. [대메뉴 3] AI 오픈분석 (`src/services/aiOpenAnalysis/`)
- **역할**: 주관식(오픈) 설문 응답 데이터를 LLM 기반으로 자동 정제, 카테고리/군집 분류 및 코딩하는 서비스.
- **주요 라우트**: `pro_list`(프로젝트 목록), `pro_register`(등록), `option_setting` / `option_setting_2`(분석 옵션 및 코딩), `pro_permission`(권한), `pro_key`(API 키 관리), `token_usage`(토큰 사용량/잔액 조회).

### 4-4. [대메뉴 4] 실사관리 (`src/services/fieldManagement/`)
- **역할**: 실사 진행 현황 모니터링 및 쿼터(Quota) 관리.
- **주요 라우트**: `analysis/progress`(문항별 집계 및 실사 진행 현황), `analysis/quota`(쿼터 관리).

---

## 🔐 5. 인증(Auth), 세션 스토리지, API 통신 아키텍처

### 5-1. 3단계 로그인 및 프로젝트 컨텍스트 저장소
1. **Browser Cookie (`path: "/"`, 동일 도메인 전체 공유)**:
   - `TOKEN`: JWT/세션 로그인 토큰 (`Authorization: Bearer ${TOKEN}`으로 자동 변환)
   - `X-Auth-Token`: 백엔드 인증 전용 토큰 헤더
2. **LocalStorage (`redux-persist`)**:
   - `store.auth`: 로그인 여부(`isLogin`), 사용자 정보(`user.userId`, `user.userName`, `user.userGroup`, `user.userAuth`)
   - `hsrtCustomerState`: H-SRT 고객(`groupcode === "999999991"`)이 브라우저를 닫았다 열었을 때 `sessionStorage`를 자동 복원하기 위한 백업본 (`App.jsx`에서 자동 복원)
3. **SessionStorage (현재 선택된 프로젝트 컨텍스트)**:
   - `projectnum`: 현재 작업 중인 프로젝트 번호 (예: `P2026_001`)
   - `projectname`: 현재 프로젝트 조사명
   - `merge_pn`: 병합 프로젝트 번호
   - `servername`: 연동 실사 서버명
   - `groupcode`: 사용자 그룹 코드 (`999999991`이면 H-SRT 외부 고객)
   - `myRole`: 현재 프로젝트 내 역할/권한
   - `pageId`, `pagetitle`: H-SRT 현재 선택된 대시보드 페이지 ID 및 제목

### 5-2. 공통 API 클라이언트 (`api`) 사용법 및 엔드포인트 타입
`src/common/queries/Api.js` (또는 `surveyon-common`의 `api`)는 3번째 인자인 `type`에 따라 대상 백엔드 엔드포인트를 자동으로 라우팅합니다:

| `type` 키 (3번째 인자) | 실제 매핑 경로 | 대상 서비스 |
| :--- | :--- | :--- |
| `'API_BASE_URL_DATAMANAGEMENT'` | `https://stest.hrc.kr/APIs/d` | 데이터관리 (`/APIs/d/...`) |
| `'API_BASE_URL_DATASTATUS'` | `https://stest.hrc.kr/APIs/s` | H-SRT 및 실사관리 (`/APIs/s/...`) |
| `'API_BASE_URL_OPENAI'` | `https://stest.hrc.kr/APIs/o` | AI 오픈분석 신규 API (`/APIs/o/...`) |
| `'API_BASE_URL_BOARD'` | `https://stest.hrc.kr/APIs/n` | 공지사항 / 패치노트 / 문의 (`/APIs/n/...`) |
| 생략 시 (`DEFAULT_PATH`) | `https://son.hrc.kr/o` | 레거시/공통 오픈 API (`/o/...`) |

#### API 메서드 시그니처 (`api`)
- `api.post(data, url, type, config)` -> `res` 반환 (`res.success === '777'`, 데이터는 `res.resultjson`)
- `api.get(data, url, type)` -> `res` 반환
- `api.getWithParams(url, params, type)` -> 쿼리 스트링 포함 GET 요청
- `api.form(data, url, config, type)` -> `FormData` 멀티파트 파일 업로드 (인터셉터가 `Content-Type` 자동 정리)
- `api.file(data, url, type, config)` -> POST 방식 `Blob` 파일 다운로드
- `api.fileGet(url, params, type, config)` -> GET 방식 `Blob` 파일 다운로드
- `api.urlencoded(url, data, type)` -> `application/x-www-form-urlencoded` 전송

> **참고 (`Axios.jsx` 자동 버전 감지 기능)**:  
> `src/config/axios/Axios.jsx`에는 API 호출, 화면 클릭, 탭 포커스 시 백그라운드로 `/index.html`의 해시된 스크립트 파일명(`index-XXXX.js`)을 체크하여, 서버에 새 빌드가 배포되었을 경우 좌측 하단에 **"새로운 업데이트 안내! 지금 새로고침"** 보라색 토스트를 띄우는 로직이 내장되어 있습니다. 이 로직을 임의로 삭제하지 마십시오.

---

## 🧩 6. 표준 화면 개발 패턴 (Standard Screen Template)

새로운 화면(페이지)을 만들거나 리팩토링할 때는 반드시 아래 표준 템플릿 구조를 따르십시오:

```jsx
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { PageContainer } from '@/components/common/layout'; // 또는 'surveyon-common'
import { modalContext } from '@/components/common/Modal.jsx';
import { loadingSpinnerContext } from '@/components/common/LoadingSpinner.jsx';
import api from '@/common/queries/Api.js';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Plus, Download, Trash2 } from 'lucide-react';

const StandardScreenPage = () => {
  const modal = useContext(modalContext);
  const loading = useContext(loadingSpinnerContext);
  const projectnum = sessionStorage.getItem('projectnum');

  const [dataList, setDataList] = useState([]);

  // [필수 규칙] useCallback / useEffect 의존성 배열에 loading, modal 절대 추가 금지!
  const fetchList = useCallback(async (searchKeyword = '') => {
    if (!projectnum) return;
    try {
      loading.show();
      const res = await api.post(
        { projectnum, keyword: searchKeyword },
        '/data/list',
        'API_BASE_URL_DATAMANAGEMENT'
      );
      if (String(res?.success) === '777') {
        setDataList(Array.isArray(res?.resultjson) ? res.resultjson : []);
      } else {
        // 첫 번째 인자는 에러코드(status), 두 번째 인자는 에러 메시지
        modal.showErrorAlert(String(res?.success || 'ERR'), res?.message || '데이터 조회에 실패했습니다.');
      }
    } catch (err) {
      modal.showErrorAlert('ERR', '서버와 통신하는 중 문제가 발생했습니다.');
    } finally {
      loading.hide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectnum]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSave = () => {
    modal.showConfirm('확인', '변경사항을 저장하시겠습니까?', {
      btns: [
        { title: '취소' },
        {
          title: '저장',
          click: async () => {
            try {
              loading.show();
              const res = await api.post({ projectnum }, '/data/save', 'API_BASE_URL_DATAMANAGEMENT');
              if (String(res?.success) === '777') {
                modal.showAlert('알림', '성공적으로 저장되었습니다.');
                fetchList();
              } else {
                modal.showErrorAlert(String(res?.success || 'ERR'), res?.message || '저장에 실패했습니다.');
              }
            } catch (e) {
              modal.showErrorAlert('ERR', '저장 처리 중 오류가 발생했습니다.');
            } finally {
              loading.hide();
            }
          },
        },
      ],
    });
  };

  return (
    <PageContainer
      id="my-screen-container"
      title="표준 업무 화면"
      infoTooltip="업무 화면에 대한 안내 툴팁입니다."
      onSearch={(keyword) => fetchList(keyword)}
      searchPlaceholder="검색어 입력..."
      onSave={handleSave}
      saveLabel="저장"
      headerActions={
        <>
          <button id="btn-add" type="button" className="cmn-btn cmn-btn-outline">
            <Plus size={15} />
            <span>신규 등록</span>
          </button>
          <button id="btn-download" type="button" className="cmn-btn cmn-btn-secondary">
            <Download size={15} />
            <span>다운로드</span>
          </button>
          <button id="btn-delete" type="button" className="cmn-btn cmn-btn-danger">
            <Trash2 size={15} />
            <span>삭제</span>
          </button>
        </>
      }
    >
      {/* 그리드 영역: 반드시 높이 100% 핏 유지 */}
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Grid data={dataList} style={{ height: '100%' }} pageable={true} sortable={true}>
          <GridColumn field="id" title="번호" width="80px" className="text-center" />
          <GridColumn field="title" title="제목" />
          <GridColumn field="writer" title="작성자" width="120px" />
          <GridColumn field="status" title="상태" width="100px" />
        </Grid>
      </div>
    </PageContainer>
  );
};

export default StandardScreenPage;
```

---

## 🎯 7. E2E 테스트 및 크롤링 자동화 표준 ID 체계

Playwright / Selenium 크롤링 및 자동화 테스트를 위해 주요 레이아웃과 액션 요소에는 아래 표준 `id`가 부여되어 있으며, 이를 임의로 제거하거나 변경해서는 안 됩니다:
- **전체 프레임 (`AppLayout`)**: `#app-root`, `#app-layout-main`, `#app-main-content`, `#app-footer`
- **좌측 사이드바 (`AppSidebar`)**: `#app-sidebar`, `#app-sidebar-header`, `#app-sidebar-nav`, `#app-sidebar-footer`
- **단위 페이지 (`PageContainer` & `PageHeader`)**:
  - `#page-container` (화면 최상위 `<main>`)
  - `#page-content` (실제 작업 본문 영역)
  - `#page-header`, `#page-header-left`, `#page-search-input`, `#page-header-actions`
  - `#page-header-add-btn`, `#page-header-delete-btn`, `#page-header-save-btn`

---

## 🔄 8. `src/`와 `surveyon-common/` 동기화 원칙 (양방향 반영 필수)

현재 레포지토리 내부의 `surveyon-common/` 폴더는 외부 분리 프로젝트에서 `npm install git+https://github.com/woojungeun97/surveyon-theme.git`으로 가져다 쓰는 **사내 공통 라이브러리 패키지 원본**입니다.

### 동기화 대상 핵심 파일 목록
아래 영역의 파일을 수정할 때는 **`src/...` 원본과 `surveyon-common/...` 내부 동일 경로 파일을 반드시 세트로 함께 수정(동기화)**해야 합니다:
1. **공통 레이아웃 (`components/common/layout/`)**: `AppLayout.jsx`, `PageContainer.jsx`, `PageHeader.jsx`, `PageFooter.jsx`, `PageLayout.css`
2. **통합 사이드바 & 공통 모달 (`components/common/sidebar/`)**: `AppSidebar.jsx`, `Sidebar.jsx`, `ProjectSelectionModal.jsx`, `ProPermissionModal.jsx`, `NewDataModal.jsx`, `PageListPopup.jsx`
3. **전역 모달 & 스피너 (`components/common/`)**: `Modal.jsx`, `LoadingSpinner.jsx`
4. **AI 어시스턴트 (`components/assistant/`)**: `SurveyonAssistant` 관련 컴포넌트
5. **Kendo Grid 래퍼 (`components/kendo/`, `components/common/grid/`)**: `KendoGrid.jsx`, `KendoGridV2.jsx`, `KendoGridV3.jsx`, `GridData.jsx`, `ExcelColumnMenu.jsx`, `GridDataCount.jsx`
6. **공통 테마 & 스타일 (`assets/css/`)**: `surveyon-theme.css`, `common.css`, `kendo_custom.css`, `reset.css`, `theme.css`
7. **공통 API & 스토어 (`common/queries/`, `config/axios/`, `common/redux/`)**: `Api.js`, `Axios.jsx`, `Store.jsx`, `StorePersist.jsx`

---

## 👥 9. 사용자 권한/역할 분기 및 단독 팝업(Standalone Popup) 규칙

### 9-1. 사용자 그룹 및 권한 분기 (`auth.user` & `sessionStorage`)
설문온은 로그인한 사용자의 소속/권한에 따라 메뉴 노출과 동작이 엄격히 구분됩니다:
- **`isAiSolutionTeam` (`auth?.user?.userGroup === "AI솔루션팀"`)**:
  - 사내 AI솔루션팀(관리자/개발팀) 전용 기능 접근 가능 (예: 토큰 사용량/비용 상세, 관리자 옵션 등).
- **`isHsrtCustomer` (`auth?.user?.userGroup === "H-SRT고객"` 또는 `sessionStorage.getItem("groupcode") === "999999991"`)**:
  - 외부 고객사 전용 계정 (`/cs` 경로 로그인).
  - 프로젝트 변경/등록 버튼을 숨기거나 비활성화하며, 내부 연구원 전용 메뉴 접근을 차단함.
  - 브라우저를 닫았다 열어도 세션이 유지되도록 `localStorage.getItem("hsrtCustomerState")`를 통해 `sessionStorage`를 자동 복원함 (`src/App.jsx` 참조).
- **프로젝트별 역할 (`sessionStorage.getItem("myRole")`)**:
  - 현재 선택된 프로젝트 내에서 사용자의 편집/조회 권한 분기에 사용.

### 9-2. 단독 팝업 창(Standalone Popup) 라우트 예외 처리 (`src/App.jsx`)
- `/questions-info`, `/questions_info`, `/dp_request_preview`, `/crosstab-single-view`, `/variable_list`, `/manual`, `/excel_guide` 등의 경로는 새 창이나 팝업 뷰어로 열리는 **단독 페이지(Standalone Popup)**입니다.
- **주의사항**:
  - 이 경로들은 `<MainLayout>`이나 `<AppLayout>`(사이드바/헤더/푸터)으로 감싸지 않습니다.
  - 우측 하단 플로팅 AI 챗봇(`<SurveyonAssistant />`)이 화면을 가리지 않도록 `App.jsx`의 `isStandalonePopup` 배열에 경로를 등록하여 챗봇 렌더링을 제외해야 합니다.
  - 또한 `404 (<Route path="*">)` 라우트보다 반드시 **위쪽**에 선언되어야 라우트가 낚이지 않습니다.

---

## 🛡️ 10. 작업 환경 및 안전 수칙 (Safety & Workflow Rules)

1. **언어 및 커뮤니케이션**: 모든 설명, 코드 주석, 커밋 메시지 초안, 질문은 **한국어(Korean)**로 명확하게 작성하십시오.
2. **OS 및 쉘 환경**: 현재 작업 환경은 **Windows (PowerShell)**입니다. 경로 구분자나 터미널 명령어 실행 시 Windows 호환 문법을 사용하십시오.
3. **위험 명령어 임의 실행 금지 (중요)**:
   - `package.json`의 **`npm run deploy`**는 실제 테스트/운영 IIS 서버(`msdeploy.exe`)로 즉시 배포하는 명령어이므로 **사용자의 명시적 지시 없이는 절대 실행하지 마십시오.**
   - `git push --force`, `git reset --hard`, 브랜치 삭제 등 파괴적 Git 명령어는 반드시 사용자에게 먼저 확인을 받으십시오.
4. **기존 주석 및 히스토리 보존**: 기존 코드의 JSDoc 주석(`@author`, `@since` 등)이나 비즈니스 예외 처리 주석을 임의로 삭제하지 마십시오.

---

## 💬 부록: 클로드 코드(Claude Code) 첫 세션 시작용 복붙 프롬프트

> 클로드 코드를 처음 실행했을 때 아래 블록을 복사해서 첫 메시지로 보내면, 클로드 코드가 프로젝트의 모든 맥락과 규칙을 즉시 숙지합니다.

```text
안녕! 지금부터 설문온(SulmunOn / surveyon) 프론트엔드 프로젝트를 함께 개발할 거야.
작업을 시작하기 전에 프로젝트 루트에 있는 다음 문서들을 먼저 읽고 우리 팀의 아키텍처와 엄격한 코딩 규칙(Strict Rules)을 완벽히 숙지해줘:

1. `CLAUDE.md` (전체 아키텍처, 10대 절대 규칙, 도메인 구조, 권한/팝업/동기화 규칙 총괄본)
2. `AI_CODING_RULES.md` (AI 코딩 제약사항 상세)
3. `DEVELOPER_QUICK_START.md` (표준 화면/API/모달/버튼 템플릿)

특히 아래 핵심 약속은 어떤 코드 작업에서도 예외 없이 지켜야 해:
1. [환경 & 그리드] React 18(`^18.2.0`) 고정, 모든 테이블/그리드는 Kendo UI React v7(`<Grid>`, `KendoGridV2` 등) 사용 및 `<PageContainer>` 내 높이 100% 핏 유지
2. [무한루프 방지] `useEffect` / `useCallback` 의존성 배열에 `loading`, `modal` 절대 넣지 말 것 (`loading.show()` 호출 시 무한 API 호출 발생)
3. [테마 & 버튼] Hex 색상 하드코딩 금지 (`var(--primary-color)`, `var(--srt-primary-*)` 등 CSS 변수 및 `cmn-btn` 표준 버튼 클래스 필수 사용 / 단, 프로젝트 선택 모달 보라색 `#5A4BFF`, AI 요약보고서 L1 파란색 `#2563eb`, 삭제 빨간색 `#ef4444`는 고유 색상 유지)
4. [전역 모달] 브라우저 기본 `alert`/`confirm` 금지 (`modalContext`의 `showAlert`, `showConfirm`, `showErrorAlert(status, msg)` 사용 — 특히 `showErrorAlert`의 첫 번째 인자는 제목이 아니라 에러코드 `status`임에 주의!)
5. [API 통신] Axios 직접 생성 금지 (공통 `api` 모듈 사용, 성공 판별은 `String(res?.success) === '777'`, 실제 데이터는 `res.data`가 아닌 `res.resultjson` 참조)
6. [Kendo 드롭다운 최적화] 부모 리렌더링으로 인한 0.5~1초 오픈 딜레이 방지를 위해 드롭다운은 Uncontrolled + `popupSettings={{ animate: false }}` 유지, 스크롤 닫기 시 `display = 'none'` 강제 주입 금지
7. [공통 패키지 동기화] `src/components/common/...`, `src/assets/css/...`, `src/common/queries/...` 등 공통 모듈 수정 시 `surveyon-common/` 폴더 내 동일 파일도 반드시 함께 동기화할 것
8. [권한 & 팝업 & 라우팅] `AI솔루션팀` vs `H-SRT고객`(`groupcode === '999999991'`) 권한 분기 준수, 단독 팝업 라우트(`isStandalonePopup`) 예외 유지, 타 대메뉴 이동 시 새 창이 아닌 `window.location.href` 같은 창 이동 유지
9. [안전 수칙] Windows 환경 기준 동작, `npm run deploy`(IIS 서버 배포)나 파괴적 Git 명령어는 내 명시적 허락 없이 절대 실행 금지

위 문서들을 먼저 읽고 나서, 설문온의 4대 대메뉴 구조와 핵심 규칙들을 모두 확인했는지 짧게 요약 보고한 뒤 내 첫 작업 지시를 대기해줘!
```

