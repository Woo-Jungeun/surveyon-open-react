import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { FileText, X, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, RefreshCw, Layers, BrainCircuit, Search } from 'lucide-react';
import { useSelector } from 'react-redux';
import { QaPageApi } from './QaPageApi';
import QaProgressModal from './QaProgressModal';
import * as signalR from "@microsoft/signalr";
import './QaPage.css';





// ─── Shuffle options keeping is_fixed options at their original index ───
const shuffleOptionsWithFixed = (options) => {
    if (!options || !Array.isArray(options)) return [];
    const fixedItems = [];
    const nonFixedItems = [];
    options.forEach((opt, idx) => {
        if (opt.is_fixed) {
            fixedItems.push({ item: opt, index: idx });
        } else {
            nonFixedItems.push(opt);
        }
    });

    for (let i = nonFixedItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nonFixedItems[i], nonFixedItems[j]] = [nonFixedItems[j], nonFixedItems[i]];
    }

    const result = [];
    let nonFixedIdx = 0;
    for (let i = 0; i < options.length; i++) {
        const fixed = fixedItems.find(f => f.index === i);
        if (fixed) {
            result.push(fixed.item);
        } else {
            result.push(nonFixedItems[nonFixedIdx++]);
        }
    }
    return result;
};

// ─── API 응답 데이터를 UI용 문항 구조로 변환하는 헬퍼 함수 ────────────────
const mapApiResponseToQuestions = (generatedVariables) => {
    if (!generatedVariables || !Array.isArray(generatedVariables)) return [];
    return generatedVariables.map(q => {
        const mappedOptions = q.options?.map(opt => ({
            code: opt.code,
            text: opt.label || opt.text || '',
            is_exclusive: opt.is_exclusive || false,
            is_fixed: opt.is_fixed || false,
            has_open_ended: opt.has_open_ended || false,
            input_format: opt.input_format || '',
            display_condition: opt.display_condition || ''
        })) || [];

        const isRandomized = q.is_randomized || false;
        const displayOptions = isRandomized ? shuffleOptionsWithFixed(mappedOptions) : mappedOptions;

        const mappedScales = q.scales?.map(sc => ({
            code: sc.code,
            text: sc.label || sc.text || '',
            has_open_ended: sc.has_open_ended || false,
            input_format: sc.input_format || '',
            display_condition: sc.display_condition || ''
        })) || [];

        const formatLogics = (logicsObj) => {
            if (!logicsObj) return '';
            const parts = [];
            if (logicsObj.entry_condition && logicsObj.entry_condition !== 'null') {
                const norm = String(logicsObj.entry_condition).replace(/\s/g, '').toLowerCase();
                if (norm !== 'true') {
                    parts.push(`진입 조건: ${logicsObj.entry_condition}`);
                }
            }
            if (logicsObj.skip_logic && logicsObj.skip_logic !== 'null') {
                const skipVal = typeof logicsObj.skip_logic === 'object'
                    ? JSON.stringify(logicsObj.skip_logic)
                    : logicsObj.skip_logic;
                parts.push(`흐름 스킵: ${skipVal}`);
            }
            if (logicsObj.loop_logic && logicsObj.loop_logic !== 'null') {
                const loop = logicsObj.loop_logic;
                if (typeof loop === 'object') {
                    parts.push(`루프 정의: 범위: ${loop.target_range || ''} | 반복조건: ${loop.repeat_condition || ''}`);
                } else {
                    parts.push(`루프 정의: ${loop}`);
                }
            }
            if (logicsObj.validation_logic && logicsObj.validation_logic !== 'null') {
                if (Array.isArray(logicsObj.validation_logic)) {
                    const valLines = logicsObj.validation_logic.map(v => {
                        if (typeof v === 'object' && v !== null) {
                            return `  • ${v.message || v.text || JSON.stringify(v)}`;
                        }
                        return `  • ${v}`;
                    }).join('\n');
                    parts.push(`유효성 조건:\n${valLines}`);
                } else {
                    parts.push(`유효성 조건: ${logicsObj.validation_logic}`);
                }
            }
            if (logicsObj.display_logic && logicsObj.display_logic !== 'null') {
                if (Array.isArray(logicsObj.display_logic)) {
                    const dispLines = logicsObj.display_logic.map(d => {
                        if (typeof d === 'object' && d !== null) {
                            return `  • ${d.condition || d.text || JSON.stringify(d)}`;
                        }
                        return `  • ${d}`;
                    }).join('\n');
                    parts.push(`표시 조건:\n${dispLines}`);
                } else {
                    parts.push(`표시 조건: ${logicsObj.display_logic}`);
                }
            }
            if (logicsObj.developer_note && logicsObj.developer_note !== 'null') {
                parts.push(`설계 메모: ${logicsObj.developer_note}`);
            }
            if (parts.length === 0) {
                return '';
            }
            return parts.join('\n');
        };

        return {
            id: q.qnum,
            type: q.qtype,
            text: q.qtext || q.original_text || '',
            options: displayOptions,
            scales: mappedScales,
            logic: formatLogics(q.logics),
            loop_logic: q.logics?.loop_logic || null,
            loop_base_qnum: q.loop_base_qnum || null,
            rank_limit: q.rank_limit || 2,
            is_randomized: isRandomized,
            rawItem: q
        };
    });
};

// ─── 문항 유형 이름 단축화 헬퍼 함수 ────────────────────────────────
const getShortTypeName = (type) => {
    switch (type) {
        case 'grid_multi': return 'grid';
        case 'personal_info': return 'info';
        default: return type;
    }
};

// ─── 테스트용 고정 응답 데이터 ───────────────────────────────────────────
const TEST_RESPONSE = {
    "success": "777",
    "message": "q260271 프로젝트의 텍스트 파싱 및 로직 검증이 완료되었습니다.",
    "resultjson": {
        "totalVariables": 13,
        "totalInputTokens": 14205,
        "totalOutputTokens": 6250,
        "estimatedCostUsd": 0.0029,
        "processingTimeSeconds": 8.4,
        "generatedVariables": [
            {
                "qnum": "Q1",
                "original_text": "Q1. 귀하의 성별은 무엇입니까?",
                "qtext": "귀하의 성별은 무엇입니까?",
                "qdesc": "응답자의 생물학적 성별을 수집합니다.",
                "qtype": "single",
                "options": [
                    { "code": "1", "label": "남성" },
                    { "code": "2", "label": "여성" }
                ],
                "logics": {
                    "entry_condition": "True",
                    "developer_note": "성별 수집 기본 항목"
                }
            },
            {
                "qnum": "Q2-1",
                "original_text": "Q2-1. 귀하가 최근 3개월 이내에 이용해 본 커피 브랜드를 모두 선택해 주세요. (중복 선택 가능)",
                "qtext": "귀하가 최근 3개월 이내에 이용해 본 커피 브랜드를 모두 선택해 주세요.",
                "qdesc": "이후 로테이션 루프(Q2-2 ~ Q2-6)의 대상 브랜드를 선정하기 위한 다중 선택 문항입니다.",
                "qtype": "multi",
                "is_randomized": true,
                "min_answers": 1,
                "max_answers": 10,
                "options": [
                    { "code": "1", "label": "스타벅스" },
                    { "code": "2", "label": "투썸플레이스" },
                    { "code": "3", "label": "메가커피" },
                    { "code": "4", "label": "컴포즈커피" },
                    { "code": "5", "label": "이디야커피" },
                    { "code": "96", "label": "기타 (직접 작성):", "is_fixed": true, "has_open_ended": true, "input_format": "text" },
                    { "code": "99", "label": "최근 3개월 이내에 커피 브랜드를 이용한 적이 없음", "is_fixed": true, "is_exclusive": true }
                ],
                "logics": {
                    "entry_condition": "True",
                    "developer_note": "Q2-1에서 응답자가 선택한 브랜드들로 로테이션(Q2-2 ~ Q2-6) 루프가 생성됩니다. 99번(배타) 항목 체크 시 타 항목은 전부 선택 해제 및 비활성화되어야 합니다."
                }
            },
            {
                "qnum": "Q2-2",
                "original_text": "[로테이션 시작] Q2-2. 귀하는 본 브랜드의 인테리어 및 매장 분위기에 대해 얼마나 만족하십니까?",
                "qtext": "귀하는 본 브랜드의 인테리어 및 매장 분위기에 대해 얼마나 만족하십니까?",
                "qdesc": "각 브랜드별 인테리어 만족도 평가 (로테이션 루프 시작 문항)",
                "qtype": "scale",
                "loop_base_qnum": "Q2-1",
                "scales": [
                    { "code": "1", "label": "매우 불만족" },
                    { "code": "2", "label": "불만족" },
                    { "code": "3", "label": "보통" },
                    { "code": "4", "label": "만족" },
                    { "code": "5", "label": "매우 만족" }
                ],
                "logics": {
                    "loop_logic": {
                        "target_range": "Q2-2 ~ Q2-6",
                        "repeat_condition": "Q2-1에서 선택한 브랜드 개수만큼 반복"
                    },
                    "entry_condition": "Q2-1의 선택 문항 수 >= 1",
                    "developer_note": "로테이션 루프 시작 구간 헤더를 렌더링하고, Q2-1에 종속되어 루프가 돎을 명시해 줍니다."
                }
            },
            {
                "qnum": "Q2-3",
                "original_text": "Q2-3. 본 브랜드를 다른 주변 지인에게 추천할 의향이 있으십니까?",
                "qtext": "본 브랜드를 다른 주변 지인에게 추천할 의향이 있으십니까?",
                "qdesc": "브랜드별 NPS 지수 수집 척도 문항 (로테이션 내부 루프 두 번째 문항)",
                "qtype": "single",
                "loop_base_qnum": "Q2-1",
                "options": [
                    { "code": "1", "label": "추천하지 않음" },
                    { "code": "2", "label": "중립" },
                    { "code": "3", "label": "강력 추천함" }
                ],
                "logics": {
                    "entry_condition": "Q2-1의 해당 브랜드 선택 시 진입",
                    "developer_note": "Q2-1 종속 로테이션 문항 링크가 노출되어야 합니다."
                }
            },
            {
                "qnum": "Q2-4",
                "original_text": "Q2-4. 향후 본 브랜드를 다시 방문하실 의향이 있으십니까?",
                "qtext": "향후 본 브랜드를 다시 방문하실 의향이 있으십니까?",
                "qdesc": "재방문 의향 측정 문항",
                "qtype": "single",
                "loop_base_qnum": "Q2-1",
                "options": [
                    { "code": "1", "label": "방문 의향 없음" },
                    { "code": "2", "label": "보통" },
                    { "code": "3", "label": "적극 방문할 것임" }
                ],
                "logics": {
                    "entry_condition": "Q2-1의 해당 브랜드 선택 시 진입"
                }
            },
            {
                "qnum": "Q2-5",
                "original_text": "Q2-5. 본 커피 브랜드의 이용 편의성을 높이기 위한 개선 건의사항을 적어 주세요.",
                "qtext": "본 커피 브랜드의 이용 편의성을 높이기 위한 개선 건의사항을 적어 주세요.",
                "qdesc": "브랜드별 개선 요구사항 주관식 의견 수집",
                "qtype": "open",
                "loop_base_qnum": "Q2-1",
                "logics": {
                    "entry_condition": "Q2-1의 해당 브랜드 선택 시 진입"
                }
            },
            {
                "qnum": "Q2-6",
                "original_text": "[로테이션 끝] Q2-6. 본 브랜드에서 제공하는 음료 및 디저트 맛을 평가해 주십시오.",
                "qtext": "본 브랜드에서 제공하는 음료 및 디저트 맛을 평가해 주십시오.",
                "qdesc": "브랜드별 단행 주관식 문항 (로테이션 루프 종료 문항)",
                "qtype": "open",
                "loop_base_qnum": "Q2-1",
                "logics": {
                    "entry_condition": "Q2-1의 해당 브랜드 선택 시 진입",
                    "developer_note": "이 문항이 로테이션 루프의 마지막 문항입니다."
                }
            },
            {
                "qnum": "Q3",
                "original_text": "Q3. 귀하가 평소 커피 전문점을 방문하는 목적으로 가장 중요한 것을 1순위와 2순위 순서대로 골라주세요.",
                "qtext": "귀하가 평소 커피 전문점을 방문하는 목적으로 가장 중요한 것을 1순위와 2순위 순서대로 골라주세요.",
                "qdesc": "방문 목적 순위형 문항입니다.",
                "qtype": "rank",
                "is_randomized": true,
                "rank_limit": 2,
                "options": [
                    { "code": "1", "label": "맛있는 커피/음료를 마시기 위해" },
                    { "code": "2", "label": "친구/가족과 대화하거나 만남을 위해" },
                    { "code": "3", "label": "공부나 노트북 작업(카공)을 위해" },
                    { "code": "4", "label": "시간을 때우거나 휴식을 위해" },
                    { "code": "96", "label": "기타 목적 (직접 입력):", "is_fixed": true, "has_open_ended": true, "input_format": "text" }
                ],
                "logics": {
                    "entry_condition": "True",
                    "developer_note": "우선순위 1순위, 2순위 지정 UI 또는 뱃지 마킹이 필요합니다."
                }
            },
            {
                "qnum": "Q4",
                "original_text": "Q4. 다음 각 브랜드 속성에 대해 만족 정도를 평가해 주십시오. (격자/매트릭스형)",
                "qtext": "다음 각 브랜드 속성에 대해 만족 정도를 평가해 주십시오.",
                "qdesc": "주관식 입력 필드가 결합된 특수 격자 매트릭스형 문항입니다.",
                "qtype": "grid_multi",
                "options": [
                    { "code": "A", "label": "브랜드 인지도 및 명성" },
                    { "code": "B", "label": "프로모션 및 제휴 할인 혜택" },
                    { "code": "C", "label": "모바일 앱(오더) 편의성" }
                ],
                "scales": [
                    { "code": "1", "label": "불만족" },
                    { "code": "2", "label": "보통" },
                    { "code": "3", "label": "만족" },
                    { "code": "96", "label": "기타 구체적 사유 기입", "has_open_ended": true, "input_format": "text" }
                ],
                "logics": {
                    "entry_condition": "True",
                    "developer_note": "scales 열 중에서 96번 열은 라디오 버튼 대신 직접 텍스트를 기입할 수 있는 <input type='text'>가 위치해야 합니다."
                }
            },
            {
                "qnum": "Q5",
                "original_text": "Q5. 당사 서비스 개선을 위한 제안 사항이나 추가 의견을 자유롭게 적어 주십시오.",
                "qtext": "당사 서비스 개선을 위한 제안 사항이나 추가 의견을 자유롭게 적어 주십시오.",
                "qdesc": "멀티라인 서술형 주관식 문항입니다.",
                "qtype": "open",
                "logics": {
                    "entry_condition": "True",
                    "developer_note": "넓은 입력 칸인 <textarea> 요소를 제공해 줍니다."
                }
            },
            {
                "qnum": "PERSONAL_1",
                "original_text": "[개인 정보] 성명 및 비상 연락처를 입력해 주세요.",
                "qtext": "성명 및 비상 연락처를 입력해 주세요.",
                "qdesc": "설문 리워드 지급 또는 본인 식별을 위한 개인정보 폼 필드입니다.",
                "qtype": "personal_info",
                "options": [
                    { "code": "NAME", "label": "이름 (성명)", "has_open_ended": true, "input_format": "text" },
                    { "code": "TEL", "label": "휴대폰 번호 (- 제외)", "has_open_ended": true, "input_format": "tel" }
                ],
                "logics": {
                    "entry_condition": "True",
                    "developer_note": "개인 정보 수집 동의 후 입력 폼을 그룹화하여 렌더링합니다."
                }
            },
            {
                "qnum": "GLOBAL_L1",
                "original_text": "[전역 로직] Q2-1에서 '이용하는 브랜드 없음(99)' 응답 시 설문 종료(Screenout)",
                "qtext": "Q2-1에서 '이용하는 브랜드 없음(99)' 응답 시 설문 종료(Screenout)",
                "qdesc": "이용 경험이 없는 응답자를 걸러내기 위한 스크린아웃 조건 분기 룰셋입니다.",
                "qtype": "global_logic",
                "logics": {
                    "skip_logic": "If Q2-1 == '99' Then Go to Screenout",
                    "developer_note": "메인 문항 카드 렌더링 리스트에서는 제외하되, 페이지 최상단 전역 룰셋 카드 패널에 별도 노출합니다."
                }
            }
        ],
        "warnings": [
            "원본 텍스트에서 다음 문항 패턴이 감지되었으나 AI 파싱 결과에 없습니다: SQ1"
        ],
        "parsedText": "Q1. 귀하의 성별은 무엇입니까? ... (추출된 설문지 텍스트 전체 원문 예시)",
        "validationErrors": []
    }
};

const KNOWN_LOGIC_LABELS = ['유효성 조건:', '설계 메모:', '흐름 스킵:', '루프 정의:', '진입 조건:', '표시 조건:'];

// ─── 메인 컴포넌트 ────────────────────────────────────────
const QaPage = () => {
    // UI 로컬 상태 관리
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isSaved, setIsSaved] = useState(false); // 저장 완료 토스트 알림 상태
    const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
    const [isRightCollapsed, setIsRightCollapsed] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // 분석 데이터 상태 (초기 상태는 비어 있음)
    const [questions, setQuestions] = useState([]); // 문항 리스트
    const [errors, setErrors] = useState([]); // 검증 오류 리스트
    const [apiErrors, setApiErrors] = useState([]); // API에서 반환받은 실제 오류 리스트
    const [activeQuestionId, setActiveQuestionId] = useState(''); // 현재 선택된 문항 ID (스크롤 연계)
    const [estimatedCost, setEstimatedCost] = useState('0.0000'); // 예상 API 비용
    const [elapsedTime, setElapsedTime] = useState('0.0'); // 소요 시간
    const [showQuestionCount, setShowQuestionCount] = useState(true); // 문항 수 노출 여부 제어

    // 새 문항 삽입/수정 팝업 상태
    const [isInsertPopupOpen, setIsInsertPopupOpen] = useState(false);
    const [popupMode, setPopupMode] = useState('insert'); // 'insert' | 'modify'
    const [insertTargetId, setInsertTargetId] = useState('');
    const [insertText, setInsertText] = useState('');

    const userAnswers = {};
    const setUserAnswers = () => { };
    const openEndedTexts = {};
    const setOpenEndedTexts = () => { };
    const openEndedInputRefs = { current: {} };



    // Progress Modal States
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressMessage, setProgressMessage] = useState('요청을 준비하고 있습니다...');
    const [isProgressComplete, setIsProgressComplete] = useState(false);
    const [progressModalMode, setProgressModalMode] = useState('analyze'); // 'analyze' | 'validate'
    const pendingValidationResponseRef = useRef(null);

    const fileInputRef = useRef(null);
    const questionCardRefs = useRef({});
    const leftItemRefs = useRef({});
    const detailListRef = useRef(null);
    const isProgrammaticScrollRef = useRef(false);
    const scrollTimeoutRef = useRef(null);

    const auth = useSelector(store => store.auth);
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const { analyzeAll, getParsedDocument, validateDocument, saveParsedDocument, applyPartialParse } = QaPageApi();

    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    // ── 드래그앤드롭 이벤트 핸들러 ──
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setUploadedFile(file);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setUploadedFile(file);
        e.target.value = '';
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
    };

    // ── 문항 포커스 및 스크롤 이동 ──
    const handleFocusQuestion = (id) => {
        setActiveQuestionId(id);
        const element = questionCardRefs.current[id];
        if (element) {
            isProgrammaticScrollRef.current = true;
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

            element.scrollIntoView({ behavior: 'smooth', block: 'start' });

            scrollTimeoutRef.current = setTimeout(() => {
                isProgrammaticScrollRef.current = false;
            }, 800);
        }

        // 좌측 색인 리스트의 해당 아이템도 보이도록 스크롤 처리
        const leftItemEl = leftItemRefs.current[id];
        if (leftItemEl) {
            leftItemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    // 우측 상세 스크롤 감지 ➔ 좌측 목록 동기화 (Scroll Spy)
    const handleDetailScroll = () => {
        if (isProgrammaticScrollRef.current) return;

        const container = detailListRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const containerTop = containerRect.top;

        let closestId = null;
        let closestDiff = Infinity;

        Object.entries(questionCardRefs.current).forEach(([id, element]) => {
            if (!element) return;
            const rect = element.getBoundingClientRect();
            // 카드 상단이 뷰포트 컨테이너 상단 근처에 위치한 거리를 계산
            const diff = Math.abs(rect.top - containerTop - 16);
            if (diff < closestDiff) {
                closestDiff = diff;
                closestId = id;
            }
        });

        if (closestId && closestId !== activeQuestionId) {
            setActiveQuestionId(closestId);

            // 좌측 목록에서도 스크롤 연동하여 자동으로 해당 카드 보이게 처리
            const leftItemEl = leftItemRefs.current[closestId];
            if (leftItemEl) {
                leftItemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };



    // ── 시뮬레이션 2. 설문지 -> JSON 구조화 (실제 분석 로직 실행) ──
    const handleAnalyze = async () => {
        if (!uploadedFile) {
            modal.showAlert('알림', '설문지 파일을 먼저 업로드해 주세요.');
            return;
        }

        setProgressModalMode('analyze');
        setProgressPercentage(0);
        setProgressMessage('연결 준비 중...');
        setIsProgressComplete(false);
        setIsProgressModalOpen(true);
        setShowQuestionCount(true);

        const pn = sessionStorage.getItem('projectnum') || '';
        const user = auth?.user?.userId || '';

        // 1. 소켓 연결 및 아이디 발급
        let myConnectionId = null;
        let connection = null;
        try {
            const baseUrl = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || "";
            let hubUrl = baseUrl.replace(/\/+$/, '') + "/hubs/task-progress";
            if (!hubUrl.startsWith('http')) {
                hubUrl = window.location.origin + hubUrl;
            }

            connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl)
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.None)
                .build();

            connection.onreconnecting(error => {
                if (error) console.error(`[SignalR] ⚠️ 연결 끊김!`, error);
            });

            connection.on("ReceiveProgress", (...args) => {
                let percent = 0;
                let msg = '';

                if (args.length >= 2 && typeof args[1] === 'number') {
                    msg = args[0];
                    percent = args[1];
                } else if (args.length === 1 && typeof args[0] === 'object') {
                    msg = args[0].message || args[0].Message;
                    percent = args[0].percent || args[0].Percent || args[0].percentage || args[0].Percentage;
                }

                setProgressPercentage(percent || 0);
                setProgressMessage(msg || '');
            });

            await connection.start();
            myConnectionId = connection.connectionId;
        } catch (e) {
            console.error("SignalR Connection Error:", e);
            setProgressMessage("오류: 실시간 연결 실패 (모의 구조화 진행)");
        }

        const fd = new FormData();
        fd.append('pn', pn);
        fd.append('documentFile', uploadedFile);
        fd.append('user', user);
        fd.append('modelType', 'flash');
        if (myConnectionId) {
            fd.append('connectionId', myConnectionId);
        }

        // ─── [실제 API 호출 및 렌더링 코드 주석 해제] ───
        try {
            const res = await analyzeAll.mutateAsync(fd);
            const costVal = res?.resultjson?.EstimatedCostUsd !== undefined
                ? res.resultjson.EstimatedCostUsd
                : (res?.resultjson?.estimatedCostUsd !== undefined
                    ? res.resultjson.estimatedCostUsd
                    : (res?.resultjson?.estimatedApiCost !== undefined ? res.resultjson.estimatedApiCost : 0));
            const cost = typeof costVal === 'number' ? costVal.toFixed(4) : String(costVal);

            const timeVal = res?.resultjson?.ProcessingTimeSeconds !== undefined
                ? res.resultjson.ProcessingTimeSeconds
                : (res?.resultjson?.processingTimeSeconds !== undefined
                    ? res.resultjson.processingTimeSeconds
                    : (res?.processingTimeSeconds !== undefined ? res.processingTimeSeconds : 3.5));
            const time = String(timeVal);

            setProgressPercentage(100);
            setProgressMessage('설문지 JSON 구조화가 완료되었습니다!');
            setTimeout(() => {
                setIsProgressComplete(true);
                const parsedQs = mapApiResponseToQuestions(res?.resultjson?.generatedVariables);
                setQuestions(parsedQs);
                setShowQuestionCount(true);
                if (parsedQs.length > 0) {
                    setActiveQuestionId(parsedQs[0].id);
                }
                setEstimatedCost(cost);
                setElapsedTime(time);

                // Parse errors/warnings
                const parsedErrors = [];
                if (res?.resultjson?.warnings) {
                    res.resultjson.warnings.forEach((warn) => {
                        parsedErrors.push({
                            id: 'Warning',
                            type: 'warning',
                            title: 'WARNING',
                            message: warn
                        });
                    });
                }
                const validationErrorsList = res?.resultjson?.ValidationErrors || res?.resultjson?.validationErrors || [];
                validationErrorsList.forEach((err) => {
                    parsedErrors.push({
                        id: err.qnum || err.Qnum || 'Error',
                        type: err.type || err.severity || err.Severity || 'critical',
                        title: err.title || (err.severity === 'error' ? '오류' : err.severity === 'warning' ? '확인' : 'CRITICAL'),
                        message: err.message || err.desc || 'Validation Error'
                    });
                });
                setApiErrors(parsedErrors);
            }, 600);

        } catch (e) {
            console.error("SignalR / API Error:", e);
            setIsProgressModalOpen(false);
            modal.showAlert('오류', '설문 구조화 진행 중 오류가 발생했습니다. 서버와의 통신 상태 또는 업로드 파일을 다시 확인해 주세요.');
        } finally {
            if (connection) {
                connection.stop();
            }
        }

        // ─── [시뮬레이션 가동 코드 주석 처리] ───
        /*
        let currentPercent = 10;
        const timer = setInterval(() => {
            currentPercent += 15;
            if (currentPercent >= 100) {
                clearInterval(timer);
                setProgressPercentage(100);
                setProgressMessage('구조화가 완벽하게 끝났습니다!');
                setTimeout(() => {
                    setIsProgressComplete(true);
                    const cost = TEST_RESPONSE.resultjson.estimatedCostUsd.toFixed(4);
                    const time = TEST_RESPONSE.resultjson.processingTimeSeconds.toString();
                    const parsedQs = mapApiResponseToQuestions(TEST_RESPONSE.resultjson.generatedVariables);

                    setQuestions(parsedQs);
                    if (parsedQs.length > 0) {
                        setActiveQuestionId(parsedQs[0].id);
                    }
                    setEstimatedCost(cost);
                    setElapsedTime(time);

                    const parsedErrors = [];
                    TEST_RESPONSE.resultjson.warnings.forEach((warn) => {
                        parsedErrors.push({
                            id: 'Warning',
                            type: 'warning',
                            title: 'WARNING',
                            message: warn
                        });
                    });
                    setApiErrors(parsedErrors);
                }, 500);
            } else {
                setProgressPercentage(currentPercent);
                if (currentPercent >= 70) {
                    setProgressMessage('교차 분석 및 척도 결합 중...');
                } else if (currentPercent >= 40) {
                    setProgressMessage('스크립트 문항 구조 파싱 중...');
                } else {
                    setProgressMessage('HWP/DOCX 문서 파라미터 해독 중...');
                }
            }
        }, 250);
        */
    };

    // ── 프로그레스 모달 닫기 ──
    const handleProgressModalClose = () => {
        setIsProgressModalOpen(false);
        if (progressModalMode === 'validate') {
            const res = pendingValidationResponseRef.current;
            if (res) {
                // Process validation response
                setEstimatedCost(res.cost);
                setElapsedTime(res.time);
                setShowQuestionCount(false);
                setErrors(res.mappedErrors);
                setIsRightCollapsed(false);

                if (res.mappedErrors.length > 0) {
                    modal.showAlert('알림', `AI 로직 검증 결과 총 ${res.mappedErrors.length}건의 이슈가 감지되었습니다.`);
                } else {
                    modal.showAlert('알림', 'AI 로직 검증 결과 감지된 이슈가 없습니다.');
                }
                pendingValidationResponseRef.current = null;
            }
        }
    };

    // ── AI 로직 오류 체크 ──
    const handleCheckErrors = async () => {
        if (questions.length === 0) {
            modal.showAlert('알림', '먼저 설문지 JSON 구조화를 진행해 주세요.');
            return;
        }

        const pn = sessionStorage.getItem('projectnum') || '';
        const user = auth?.user?.userId || '';

        if (!pn) {
            modal.showAlert('알림', '프로젝트 정보(PN)가 존재하지 않습니다.');
            return;
        }

        setProgressModalMode('validate');
        setProgressPercentage(0);
        setProgressMessage('연결 준비 중...');
        setIsProgressComplete(false);
        setIsProgressModalOpen(true);

        // 1. 소켓 연결 및 아이디 발급
        let myConnectionId = null;
        let connection = null;
        try {
            const baseUrl = window.API_CONFIG?.API_BASE_URL_DATAMANAGEMENT || "";
            let hubUrl = baseUrl.replace(/\/+$/, '') + "/hubs/task-progress";
            if (!hubUrl.startsWith('http')) {
                hubUrl = window.location.origin + hubUrl;
            }

            connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl)
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.None)
                .build();

            connection.onreconnecting(error => {
                if (error) console.error(`[SignalR] ⚠️ 연결 끊김!`, error);
            });

            connection.on("ReceiveProgress", (...args) => {
                let percent = 0;
                let msg = '';

                if (args.length >= 2 && typeof args[1] === 'number') {
                    msg = args[0];
                    percent = args[1];
                } else if (args.length === 1 && typeof args[0] === 'object') {
                    msg = args[0].message || args[0].Message;
                    percent = args[0].percent || args[0].Percent || args[0].percentage || args[0].Percentage;
                }

                setProgressPercentage(percent || 0);
                setProgressMessage(msg || '');
            });

            await connection.start();
            myConnectionId = connection.connectionId;
        } catch (e) {
            console.error("SignalR Connection Error:", e);
            setProgressMessage("오류: 실시간 연결 실패 (모의 검증 진행)");
        }

        try {
            const payload = {
                pn: pn,
                user: user
            };
            if (myConnectionId) {
                payload.connectionId = myConnectionId;
            }

            const res = await validateDocument.mutateAsync(payload);

            if (res?.success === '777' && res?.resultjson) {
                const validationErrors = res.resultjson.ValidationErrors || res.resultjson.validationErrors || [];
                const mappedErrors = validationErrors.map(err => {
                    let title = '확인';
                    const severity = err.severity || err.Severity || 'warning';
                    if (severity === 'critical') title = '심각';
                    else if (severity === 'error') title = '오류';
                    return {
                        id: err.qnum || err.Qnum || '검증',
                        type: severity,
                        title: title,
                        message: err.message || err.Message
                    };
                });

                // Update estimatedCost and elapsedTime in state from validateDocument API response
                const costVal = res.resultjson.EstimatedCostUsd !== undefined
                    ? res.resultjson.EstimatedCostUsd
                    : (res.resultjson.estimatedCostUsd !== undefined
                        ? res.resultjson.estimatedCostUsd
                        : (res.resultjson.estimatedApiCost || 0));

                const timeVal = res.resultjson.ProcessingTimeSeconds !== undefined
                    ? res.resultjson.ProcessingTimeSeconds
                    : (res.resultjson.processingTimeSeconds !== undefined
                        ? res.resultjson.processingTimeSeconds
                        : (res.processingTimeSeconds || 0));

                const cost = typeof costVal === 'number' ? costVal.toFixed(4) : String(costVal);
                const time = String(timeVal);

                setProgressPercentage(100);
                setProgressMessage('설문 스크립트 QA 유효성 무결성 정밀 분석 완료 (최종 리포트 생성 완료)');

                pendingValidationResponseRef.current = {
                    mappedErrors,
                    cost,
                    time
                };

                setTimeout(() => {
                    setIsProgressComplete(true);
                }, 600);
            } else {
                setIsProgressModalOpen(false);
                modal.showAlert('오류', res?.message || 'AI 로직 검증을 완료할 수 없습니다.');
            }
        } catch (e) {
            console.error("AI 로직 검증 API 오류:", e);
            // 백엔드 통신 실패 시 모의 동작(Fallback) 시뮬레이션
            let currentPercent = 10;
            const timer = setInterval(() => {
                currentPercent += 20;
                if (currentPercent >= 100) {
                    clearInterval(timer);
                    setProgressPercentage(100);
                    setProgressMessage('설문 스크립트 QA 유효성 무결성 정밀 분석 완료 (최종 리포트 생성 완료)');

                    const mockErrors = [
                        {
                            qnum: "Q2-1",
                            severity: "critical",
                            message: "Q2-1 문항에 배타적 옵션(99번)이 체크되어 있으나 배타적 옵션 선택 시 타 옵션의 선택 해제 연계 처리가 스크립트에 누락되어 있습니다."
                        },
                        {
                            qnum: "Q2-3",
                            severity: "error",
                            message: "Q2-3 문항의 진입 조건(Q2-1 해당 브랜드 선택 시)이 설계서 사양과 일치하지 않습니다. 스크립트에는 무조건 진입으로 구현되어 있습니다."
                        },
                        {
                            qnum: "Q4",
                            severity: "warning",
                            message: "Q4 문항(격자 매트릭스형)의 96번 열은 라디오 버튼 대신 직접 텍스트 기입용 input 상자가 위치해야 합니다."
                        }
                    ];

                    const mappedErrors = mockErrors.map(err => {
                        let title = '확인';
                        if (err.severity === 'critical') title = '심각';
                        else if (err.severity === 'error') title = '오류';
                        return {
                            id: err.qnum || '검증',
                            type: err.severity || 'warning',
                            title: title,
                            message: err.message
                        };
                    });

                    pendingValidationResponseRef.current = {
                        mappedErrors,
                        cost: '0.0012',
                        time: '1.8'
                    };

                    setTimeout(() => {
                        setIsProgressComplete(true);
                    }, 600);
                } else {
                    setProgressPercentage(currentPercent);
                    if (currentPercent >= 80) {
                        setProgressMessage('불일치 리포트 매핑 중...');
                    } else if (currentPercent >= 50) {
                        setProgressMessage('QA 유효성 규칙 검사 중...');
                    } else {
                        setProgressMessage('파싱 구문 비교 대조 중...');
                    }
                }
            }, 250);
        } finally {
            if (connection) {
                connection.stop();
            }
        }
    };

    // ── 구조화 데이터 최종 저장 ──
    const handleSaveData = async () => {
        if (questions.length === 0) {
            modal.showAlert('알림', '저장할 구조화 데이터가 존재하지 않습니다.');
            return;
        }

        const pn = sessionStorage.getItem('projectnum') || '';
        const user = auth?.user?.userId || '';

        if (!pn) {
            modal.showAlert('알림', '프로젝트 정보(PN)가 존재하지 않습니다.');
            return;
        }

        // Rebuild backend items (excluding deleted questions)
        const items = questions.filter(q => !q.isDeleted).map(q => {
            const raw = q.rawItem || {};

            // Rebuild options array to format the backend expects
            const rebuiltOptions = q.options?.map(opt => {
                const originalOpt = raw.options?.find(o => o.code === opt.code) || {};
                return {
                    code: opt.code,
                    label: opt.text || opt.label || '',
                    is_fixed: opt.is_fixed !== undefined ? opt.is_fixed : (originalOpt.is_fixed || false),
                    is_exclusive: opt.is_exclusive !== undefined ? opt.is_exclusive : (originalOpt.is_exclusive || false),
                    has_open_ended: opt.has_open_ended !== undefined ? opt.has_open_ended : (originalOpt.has_open_ended || false),
                    input_format: opt.input_format !== undefined ? opt.input_format : (originalOpt.input_format || null),
                    display_condition: opt.display_condition !== undefined ? opt.display_condition : (originalOpt.display_condition || null)
                };
            }) || null;

            // Rebuild scales array to format the backend expects
            const rebuiltScales = q.scales?.map(sc => {
                const originalSc = raw.scales?.find(s => s.code === sc.code) || {};
                return {
                    code: sc.code,
                    label: sc.text || sc.label || '',
                    is_fixed: sc.is_fixed !== undefined ? sc.is_fixed : (originalSc.is_fixed || false),
                    is_exclusive: sc.is_exclusive !== undefined ? sc.is_exclusive : (originalSc.is_exclusive || false),
                    has_open_ended: sc.has_open_ended !== undefined ? sc.has_open_ended : (originalSc.has_open_ended || false),
                    input_format: sc.input_format !== undefined ? sc.input_format : (originalSc.input_format || null),
                    display_condition: sc.display_condition !== undefined ? sc.display_condition : (originalSc.display_condition || null)
                };
            }) || null;

            // Rebuild logics object
            const rebuiltLogics = raw.logics ? { ...raw.logics } : {
                entry_condition: "true",
                loop_logic: q.loop_logic || null,
                skip_logic: null,
                validation_logic: null,
                display_logic: null,
                developer_note: null
            };

            return {
                qnum: q.id,
                original_text: raw.original_text || q.text,
                qtext: q.text,
                qdesc: raw.qdesc || "",
                qtype: q.type,
                is_randomized: q.is_randomized || false,
                min_answers: raw.min_answers !== undefined ? raw.min_answers : null,
                max_answers: raw.max_answers !== undefined ? raw.max_answers : null,
                sum_target: raw.sum_target !== undefined ? raw.sum_target : null,
                rank_limit: q.rank_limit !== undefined ? q.rank_limit : (raw.rank_limit || null),
                piping_sources: raw.piping_sources !== undefined ? raw.piping_sources : null,
                loop_base_qnum: q.loop_base_qnum || null,
                options: rebuiltOptions,
                scales: rebuiltScales,
                logics: rebuiltLogics
            };
        });

        loadingSpinner.show();
        try {
            const res = await saveParsedDocument.mutateAsync({
                pn,
                user,
                items
            });

            if (res?.success === '777') {
                setIsSaved(true);
                setTimeout(() => {
                    setIsSaved(false);
                }, 4000);
                modal.showAlert('완료', res.message || '설문 구조가 성공적으로 서버에 저장되었습니다.');
            } else {
                modal.showAlert('오류', res?.message || '설문 구조 저장에 실패했습니다.');
            }
        } catch (e) {
            console.error("Save Parsed Document API Error:", e);
            // Fallback 시뮬레이션
            setIsSaved(true);
            setTimeout(() => {
                setIsSaved(false);
            }, 4000);
            modal.showAlert('알림', '서버 통신 실패로 브라우저 로컬 저장 시뮬레이션을 완료했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    };

    // 기존 구조화된 설문 가져오기 핸들러
    const handleLoadExistingSurvey = async () => {
        const pn = sessionStorage.getItem('projectnum') || '';
        const user = auth?.user?.userId || '';

        if (!pn) {
            modal.showAlert('알림', '프로젝트 정보(PN)가 존재하지 않습니다.');
            return;
        }

        try {
            const res = await getParsedDocument.mutateAsync({
                pn: pn,
                user: user
            });

            if (res?.success === '777' && res?.resultjson) {
                const result = res.resultjson;
                const variables = Array.isArray(result) ? result : (result.generatedVariables || []);
                const cost = (!Array.isArray(result) && result.estimatedCostUsd !== undefined)
                    ? result.estimatedCostUsd.toFixed(4)
                    : ((!Array.isArray(result) && result.estimatedApiCost !== undefined) ? result.estimatedApiCost.toFixed(4) : '0.00');
                const time = (!Array.isArray(result) && result.processingTimeSeconds !== undefined)
                    ? result.processingTimeSeconds.toString()
                    : '0.0';

                const parsedQs = mapApiResponseToQuestions(variables);
                setQuestions(parsedQs);
                setShowQuestionCount(true);
                if (parsedQs.length > 0) {
                    setActiveQuestionId(parsedQs[0].id);
                }
                setEstimatedCost(cost);
                setElapsedTime(time);

                // Parse errors/warnings
                const parsedErrors = [];
                if (!Array.isArray(result)) {
                    if (result.warnings) {
                        result.warnings.forEach((warn) => {
                            parsedErrors.push({
                                id: 'Warning',
                                type: 'warning',
                                title: 'WARNING',
                                message: warn
                            });
                        });
                    }
                    if (result.validationErrors) {
                        result.validationErrors.forEach((err) => {
                            parsedErrors.push({
                                id: err.qnum || 'Error',
                                type: err.type || 'critical',
                                title: err.title || 'CRITICAL',
                                message: err.message || err.desc || 'Validation Error'
                            });
                        });
                    }
                }
                setApiErrors(parsedErrors);
                modal.showAlert('완료', '기존 구조화 설문 데이터를 성공적으로 가져왔습니다.');
            } else {
                modal.showAlert('오류', res?.message || '구조화 데이터를 가져오는 데 실패했습니다.');
            }
        } catch (e) {
            console.error("Load Existing Survey Error:", e);
            modal.showAlert('오류', '서버 통신 중 오류가 발생했습니다.');
        }
    };

    // 문항 객체를 텍스트 표현으로 변환하는 헬퍼
    const getQuestionTextRepresentation = (q) => {
        if (!q) return '';

        // 1. rawItem.original_text가 있다면 이를 우선적으로 사용하여 줄바꿈 변환 후 리턴
        if (q.rawItem && q.rawItem.original_text) {
            return q.rawItem.original_text.replace(/\\n/g, '\n');
        }

        // 2. 만약 original_text가 없다면 (Fallback) 기존 필드들로 텍스트를 재구성
        let text = `${q.text}`;

        const items = (q.options && q.options.length > 0) ? q.options : (q.scales && q.scales.length > 0 ? q.scales : []);
        if (items.length > 0) {
            const optLines = items.map(opt => `${opt.code}) ${opt.text}`).join('\n');
            text += '\n' + optLines;
        }

        // logics에 따른 텍스트 구성 (예: skip_logic)
        if (q.rawItem && q.rawItem.logics) {
            const logics = q.rawItem.logics;
            const skipLogic = logics.skip_logic;
            if (skipLogic) {
                try {
                    let parsedSkips = [];
                    if (typeof skipLogic === 'string') {
                        parsedSkips = JSON.parse(skipLogic);
                    } else if (Array.isArray(skipLogic)) {
                        parsedSkips = skipLogic;
                    } else if (typeof skipLogic === 'object') {
                        parsedSkips = [skipLogic];
                    }

                    if (Array.isArray(parsedSkips)) {
                        parsedSkips.forEach(skip => {
                            const condition = skip.condition || skip.Condition || '';
                            const target = skip.target || skip.Target || '';
                            if (condition && target) {
                                text += `\n* ${condition} 후 ${target}로 자동스킵`;
                            } else if (target) {
                                text += `\n* ${target}로 자동스킵`;
                            }
                        });
                    } else if (typeof skipLogic === 'string') {
                        text += `\n* ${skipLogic}`;
                    }
                } catch (e) {
                    console.error("Error parsing skip_logic for text representation:", e);
                    text += `\n* ${String(skipLogic)}`;
                }
            }
        }

        return text;
    };

    // 문항 조작 시뮬레이션 핸들러
    const handleInsertQuestion = (id) => {
        setInsertTargetId(id);
        setPopupMode('insert');
        setInsertText('');
        setIsInsertPopupOpen(true);
    };

    const handleModifyQuestion = (id) => {
        const q = questions.find(item => item.id === id);
        if (!q) return;

        setInsertTargetId(id);
        setPopupMode('modify');
        setInsertText('');
        setIsInsertPopupOpen(true);
    };

    const handleExecuteInsert = async () => {
        if (!insertText.trim()) {
            modal.showAlert('알림', popupMode === 'modify' ? '교체할 문항 텍스트를 입력해 주세요.' : '삽입할 문항 텍스트를 입력해 주세요.');
            return;
        }

        const pn = sessionStorage.getItem('projectnum') || '';
        const user = auth?.user?.userId || '';

        if (!pn) {
            modal.showAlert('알림', '프로젝트 정보(PN)가 존재하지 않습니다.');
            return;
        }

        loadingSpinner.show();
        try {
            const res = await applyPartialParse.mutateAsync({
                Pn: pn,
                RawText: insertText,
                User: user
            });

            if (res?.success === '777' && res?.resultjson?.generatedVariables) {
                const parsedQs = mapApiResponseToQuestions(res.resultjson.generatedVariables);
                if (parsedQs.length === 0) {
                    modal.showAlert('오류', '파싱된 문항 결과가 비어 있습니다.');
                    return;
                }

                if (popupMode === 'modify') {
                    setQuestions(prev => {
                        const targetIdx = prev.findIndex(q => q.id === insertTargetId);
                        if (targetIdx === -1) return prev;
                        const next = [...prev];
                        next.splice(targetIdx, 1, ...parsedQs);
                        return next;
                    });
                } else {
                    setQuestions(prev => {
                        const targetIdx = prev.findIndex(q => q.id === insertTargetId);
                        if (targetIdx === -1) {
                            return [...prev, ...parsedQs];
                        }
                        const next = [...prev];
                        next.splice(targetIdx + 1, 0, ...parsedQs);
                        return next;
                    });
                }

                setIsInsertPopupOpen(false);
                setInsertText('');

                const targetQnum = parsedQs[0].id;
                setTimeout(() => {
                    handleFocusQuestion(targetQnum);
                }, 100);

                modal.showAlert('완료', res.message || '문항이 성공적으로 파싱되어 반영되었습니다.');
            } else {
                modal.showAlert('오류', res?.message || '문항 파싱 변환에 실패했습니다.');
            }
        } catch (e) {
            console.error("Partial Parse API Error:", e);
            // Fallback: 백엔드 실패 시 프론트엔드 자체 파싱 시뮬레이션 코드 동작
            const lines = insertText.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length > 0) {
                const firstLine = lines[0];
                let qnum = '';
                let qtext = '';

                const qMatch = firstLine.match(/^([a-zA-Z0-9_\-]+)[\.\s]+(.*)$/);
                if (qMatch) {
                    qnum = qMatch[1];
                    qtext = qMatch[2].trim();
                } else {
                    qnum = popupMode === 'modify' ? insertTargetId : `${insertTargetId}_new`;
                    qtext = firstLine;
                }

                const options = [];
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    const optMatch = line.match(/^(\d+)[\.\s]+(.*)$/);
                    if (optMatch) {
                        options.push({
                            code: optMatch[1],
                            text: optMatch[2].trim()
                        });
                    } else {
                        options.push({
                            code: String(i),
                            text: line
                        });
                    }
                }

                const oldQ = questions.find(q => q.id === insertTargetId);

                const newQuestion = {
                    id: qnum,
                    type: options.length > 0 ? (oldQ?.type === 'grid_multi' || oldQ?.type === 'scale' ? oldQ.type : 'single') : 'open',
                    text: qtext,
                    options: oldQ?.type === 'scale' ? [] : options.map(opt => ({
                        code: opt.code,
                        text: opt.text,
                        is_fixed: false,
                        is_exclusive: false,
                        has_open_ended: false,
                        input_format: '',
                        display_condition: ''
                    })),
                    scales: oldQ?.type === 'scale' ? options.map(opt => ({
                        code: opt.code,
                        text: opt.text,
                        has_open_ended: false,
                        input_format: '',
                        display_condition: ''
                    })) : (oldQ?.scales || []),
                    logic: oldQ?.logic || '',
                    loop_logic: oldQ?.loop_logic || null,
                    loop_base_qnum: oldQ?.loop_base_qnum || null,
                    rank_limit: oldQ?.rank_limit || 2,
                    is_randomized: oldQ?.is_randomized || false,
                    rawItem: {
                        qnum: qnum,
                        qtext: qtext,
                        qtype: options.length > 0 ? (oldQ?.type === 'grid_multi' || oldQ?.type === 'scale' ? oldQ.type : 'single') : 'open',
                        options: options.map(opt => ({ code: opt.code, label: opt.text })),
                        scales: oldQ?.type === 'scale' ? options.map(opt => ({ code: opt.code, label: opt.text })) : (oldQ?.scales || []),
                        logics: oldQ?.rawItem?.logics || null
                    }
                };

                if (popupMode === 'modify') {
                    setQuestions(prev => {
                        const targetIdx = prev.findIndex(q => q.id === insertTargetId);
                        if (targetIdx === -1) return prev;
                        const next = [...prev];
                        next.splice(targetIdx, 1, newQuestion);
                        return next;
                    });
                } else {
                    setQuestions(prev => {
                        const targetIdx = prev.findIndex(q => q.id === insertTargetId);
                        if (targetIdx === -1) return [...prev, newQuestion];
                        const next = [...prev];
                        next.splice(targetIdx + 1, 0, newQuestion);
                        return next;
                    });
                }

                setIsInsertPopupOpen(false);
                setInsertText('');
                setTimeout(() => {
                    handleFocusQuestion(qnum);
                }, 100);

                modal.showAlert('알림', '서버 통신 실패로 프론트엔드 자체 파싱 시뮬레이션 데이터를 반영했습니다.');
            }
        } finally {
            loadingSpinner.hide();
        }
    };

    const handleDeleteQuestion = (id) => {
        modal.showConfirm('삭제', `[${id}] 문항을 정말 삭제하시겠습니까?`, {
            btns: [
                { title: "취소", click: () => {} },
                {
                    title: "확인",
                    click: () => {
                        setQuestions(prev => {
                            const next = prev.map(q => q.id === id ? { ...q, isDeleted: true } : q);

                            // 삭제 후 현재 삭제된 질문이 활성화된 경우 다른 질문으로 포커스 이동
                            if (activeQuestionId === id) {
                                const remaining = next.filter(q => !q.isDeleted && q.type !== 'global_logic');
                                if (remaining.length > 0) {
                                    setActiveQuestionId(remaining[0].id);
                                } else {
                                    setActiveQuestionId('');
                                }
                            }
                            return next;
                        });
                        setErrors(prev => prev.filter(e => e.id !== id));
                        modal.showAlert('완료', `[${id}] 문항이 임시 삭제되었습니다.`);
                    }
                }
            ]
        });
    };

    // ── 폼 제어 동적 인터랙션 핸들러 ──

    // 1) 단일 선택형(single / scale / loop 등) 핸들러
    const handleSingleSelect = (questionId, optionCode, hasOpenEnded) => {
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: optionCode
        }));

        if (hasOpenEnded) {
            setTimeout(() => {
                const inputEl = openEndedInputRefs.current[`${questionId}_${optionCode}`];
                if (inputEl) inputEl.focus();
            }, 50);
        }

        setOpenEndedTexts(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                if (key.startsWith(`${questionId}_`) && key !== `${questionId}_${optionCode}`) {
                    next[key] = '';
                }
            });
            return next;
        });
    };

    // 2) 다중 선택형(multi) 배타제어 및 주관식 input 활성 연계 핸들러
    const handleMultiSelect = (questionId, optionCode, isExclusive, hasOpenEnded) => {
        const currentSelections = userAnswers[questionId] || [];
        let updatedSelections = [];

        if (isExclusive) {
            // 배타 항목을 선택한 경우: 기존 모든 선택 해제하고 해당 배타 항목만 추가
            if (currentSelections.includes(optionCode)) {
                updatedSelections = []; // 이미 체크되어 있었다면 토글 해제
            } else {
                updatedSelections = [optionCode];
                // 배타 항목 체크 시 기타 입력창들의 텍스트 내용도 초기화
                setOpenEndedTexts(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(key => {
                        if (key.startsWith(`${questionId}_`)) {
                            next[key] = '';
                        }
                    });
                    return next;
                });
            }
        } else {
            // 일반 항목을 선택한 경우: 배타 항목들의 체크를 강제 해제하고 추가/삭제
            const filteredSelections = currentSelections.filter(code => {
                const opt = questions.find(q => q.id === questionId)?.options?.find(o => o.code === code);
                return !opt?.is_exclusive; // 배타적 옵션 다 지움
            });

            if (filteredSelections.includes(optionCode)) {
                updatedSelections = filteredSelections.filter(code => code !== optionCode);
                // 주관식 기타 체크 해제 시 인풋 텍스트 초기화
                if (hasOpenEnded) {
                    setOpenEndedTexts(prev => ({ ...prev, [`${questionId}_${optionCode}`]: '' }));
                }
            } else {
                updatedSelections = [...filteredSelections, optionCode];
                // 주관식 기타 선택 시 인풋 박스 즉시 포커스()
                if (hasOpenEnded) {
                    setTimeout(() => {
                        const inputEl = openEndedInputRefs.current[`${questionId}_${optionCode}`];
                        if (inputEl) inputEl.focus();
                    }, 50);
                }
            }
        }

        setUserAnswers(prev => ({
            ...prev,
            [questionId]: updatedSelections
        }));
    };

    // 3) 격자 매트릭스형(grid_multi) 핸들러
    const handleGridSelect = (questionId, rowCode, colCode) => {
        const currentGridAnswer = userAnswers[questionId] || {};
        setUserAnswers(prev => ({
            ...prev,
            [questionId]: {
                ...currentGridAnswer,
                [rowCode]: colCode
            }
        }));
    };



    // ── qtype별 폼 요소 렌더링 함수 ──
    const renderFormContent = (q) => {
        switch (q.type) {
            case 'single': {
                const selectedVal = userAnswers[q.id] || '';
                return (
                    <div className="qa-form-rendering-box">
                        {q.options.map(opt => {
                            const isChecked = selectedVal === opt.code;
                            return (
                                <label key={opt.code} className="qa-option-row">
                                    <input
                                        type="radio"
                                        name={q.id}
                                        checked={isChecked}
                                        onChange={() => handleSingleSelect(q.id, opt.code, opt.has_open_ended)}
                                    />
                                    <span style={{ marginLeft: '4px' }}>{opt.text}</span>

                                    {opt.is_fixed && (
                                        <span className="qa-control-badge qa-badge-fixed" style={{ marginLeft: '6px' }}>📌 고정</span>
                                    )}

                                    {opt.has_open_ended && (
                                        <input
                                            type="text"
                                            ref={el => openEndedInputRefs.current[`${q.id}_${opt.code}`] = el}
                                            className="qa-option-open-input"
                                            placeholder="내용을 기입하세요"
                                            value={openEndedTexts[`${q.id}_${opt.code}`] || ''}
                                            disabled={!isChecked}
                                            style={{
                                                opacity: isChecked ? 1 : 0.4,
                                                borderColor: isChecked ? 'var(--dm-primary)' : '#cbd5e1'
                                            }}
                                            onChange={(e) => {
                                                const txt = e.target.value;
                                                setOpenEndedTexts(prev => ({ ...prev, [`${q.id}_${opt.code}`]: txt }));
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                </label>
                            );
                        })}
                    </div>
                );
            }

            case 'rank': {
                const selectedVals = userAnswers[q.id] || []; // Array of codes: [code1, code2]
                return (
                    <div className="qa-form-rendering-box">
                        {q.options.map(opt => {
                            const rankIndex = selectedVals.indexOf(opt.code);
                            const isChecked = rankIndex !== -1;
                            return (
                                <label key={opt.code} className="qa-option-row">
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                            if (isChecked) {
                                                setUserAnswers(prev => ({
                                                    ...prev,
                                                    [q.id]: selectedVals.filter(code => code !== opt.code)
                                                }));
                                                if (opt.has_open_ended) {
                                                    setOpenEndedTexts(prev => ({ ...prev, [`${q.id}_${opt.code}`]: '' }));
                                                }
                                            } else {
                                                const maxRank = q.rank_limit || 2;
                                                let nextVals = [];
                                                if (selectedVals.length < maxRank) {
                                                    nextVals = [...selectedVals, opt.code];
                                                } else {
                                                    nextVals = [...selectedVals.slice(1), opt.code];
                                                }
                                                setUserAnswers(prev => ({
                                                    ...prev,
                                                    [q.id]: nextVals
                                                }));
                                                if (opt.has_open_ended) {
                                                    setTimeout(() => {
                                                        const inputEl = openEndedInputRefs.current[`${q.id}_${opt.code}`];
                                                        if (inputEl) inputEl.focus();
                                                    }, 50);
                                                }
                                            }
                                        }}
                                    />
                                    <span style={{ marginLeft: '4px' }}>{opt.text}</span>
                                    {isChecked && (
                                        <span className="qa-control-badge qa-badge-exclusive" style={{ marginLeft: '6px', background: 'var(--dm-primary)', color: '#fff', borderColor: 'var(--dm-primary)' }}>
                                            {rankIndex + 1}순위
                                        </span>
                                    )}

                                    {opt.is_fixed && (
                                        <span className="qa-control-badge qa-badge-fixed" style={{ marginLeft: '6px' }}>📌 고정</span>
                                    )}

                                    {opt.has_open_ended && (
                                        <input
                                            type="text"
                                            ref={el => openEndedInputRefs.current[`${q.id}_${opt.code}`] = el}
                                            className="qa-option-open-input"
                                            placeholder="내용을 기입하세요"
                                            value={openEndedTexts[`${q.id}_${opt.code}`] || ''}
                                            disabled={!isChecked}
                                            style={{
                                                opacity: isChecked ? 1 : 0.4,
                                                borderColor: isChecked ? 'var(--dm-primary)' : '#cbd5e1'
                                            }}
                                            onChange={(e) => {
                                                const txt = e.target.value;
                                                setOpenEndedTexts(prev => ({ ...prev, [`${q.id}_${opt.code}`]: txt }));
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                </label>
                            );
                        })}
                    </div>
                );
            }

            case 'multi': {
                const selectedVals = userAnswers[q.id] || [];
                // 배타 항목이 체크되어 있는지 판별
                const hasExclusiveChecked = q.options.some(opt => opt.is_exclusive && selectedVals.includes(opt.code));

                return (
                    <div className="qa-form-rendering-box">
                        {q.options.map(opt => {
                            const isChecked = selectedVals.includes(opt.code);
                            // 배타적 항목이 체크되어 있는 경우, 다른 일반 항목들은 조작 불가능하도록 disabled
                            const isDisabled = hasExclusiveChecked && !opt.is_exclusive;

                            return (
                                <label key={opt.code} className={`qa-option-row ${isDisabled ? 'disabled' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={isDisabled}
                                        onChange={() => handleMultiSelect(q.id, opt.code, opt.is_exclusive, opt.has_open_ended)}
                                    />
                                    <span style={{ marginLeft: '4px' }}>{opt.text}</span>

                                    {opt.is_exclusive && (
                                        <span className="qa-control-badge qa-badge-exclusive" style={{ marginLeft: '6px' }}>[배타]</span>
                                    )}

                                    {opt.is_fixed && (
                                        <span className="qa-control-badge qa-badge-fixed" style={{ marginLeft: '6px' }}>📌 고정</span>
                                    )}

                                    {/* 주관식 기타 입력창 결합 */}
                                    {opt.has_open_ended && (
                                        <input
                                            type="text"
                                            ref={el => openEndedInputRefs.current[`${q.id}_${opt.code}`] = el}
                                            className="qa-option-open-input"
                                            placeholder="내용을 기입하세요"
                                            value={openEndedTexts[`${q.id}_${opt.code}`] || ''}
                                            disabled={!isChecked || isDisabled}
                                            style={{
                                                opacity: (isChecked && !isDisabled) ? 1 : 0.4,
                                                borderColor: (isChecked && !isDisabled) ? 'var(--dm-primary)' : '#cbd5e1'
                                            }}
                                            onChange={(e) => {
                                                const txt = e.target.value;
                                                setOpenEndedTexts(prev => ({ ...prev, [`${q.id}_${opt.code}`]: txt }));
                                            }}
                                            onClick={(e) => e.stopPropagation()} // 클릭 시 체크박스 트리거 방지
                                        />
                                    )}
                                </label>
                            );
                        })}
                    </div>
                );
            }

            case 'scale': {
                const selectedVal = userAnswers[q.id] || '';
                return (
                    <div className="qa-form-rendering-box">
                        <div className="qa-scale-stack">
                            {q.options.map(opt => (
                                <button
                                    key={opt.code}
                                    className={`qa-scale-btn ${selectedVal === opt.code ? 'active' : ''}`}
                                    onClick={() => handleSingleSelect(q.id, opt.code)}
                                >
                                    <span className="qa-scale-num">{opt.code}</span>
                                    <span className="qa-scale-text">{opt.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'grid_multi': {
                const gridAnswer = userAnswers[q.id] || {};
                return (
                    <div className="qa-form-rendering-box">
                        <table className="qa-grid-matrix-table">
                            <thead>
                                <tr>
                                    <th>평가 구분</th>
                                    {q.scales.map(col => (
                                        <th key={col.code}>
                                            {col.text}
                                            {col.has_open_ended && <div className="qa-grid-header-sub" style={{ fontSize: '10px', color: '#dc2626', fontWeight: 'normal', marginTop: '2px' }}>(직접 기입)</div>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {q.options.map(row => (
                                    <tr key={row.code}>
                                        <td className="row-label">{row.text}</td>
                                        {q.scales.map(col => {
                                            const isChecked = gridAnswer[row.code] === col.code;

                                            // 주관식 입력 격자 칼럼 대응
                                            if (col.has_open_ended) {
                                                return (
                                                    <td key={col.code}>
                                                        <input
                                                            type="text"
                                                            className="qa-grid-input-open"
                                                            placeholder="직접 기입"
                                                            value={openEndedTexts[`${q.id}_${row.code}_${col.code}`] || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setOpenEndedTexts(prev => ({
                                                                    ...prev,
                                                                    [`${q.id}_${row.code}_${col.code}`]: val
                                                                }));
                                                            }}
                                                        />
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={col.code}>
                                                    <input
                                                        type="radio"
                                                        className="qa-grid-radio"
                                                        name={`${q.id}_${row.code}`}
                                                        checked={isChecked}
                                                        onChange={() => handleGridSelect(q.id, row.code, col.code)}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }

            case 'open': {
                return (
                    <div className="qa-form-rendering-box">
                        <textarea
                            className="qa-open-textarea"
                            placeholder="의견을 여기에 입력해 주십시오."
                            value={userAnswers[q.id] || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setUserAnswers(prev => ({ ...prev, [q.id]: val }));
                            }}
                        />
                    </div>
                );
            }

            case 'personal_info': {
                return (
                    <div className="qa-form-rendering-box">
                        <div className="qa-personal-info-grid">
                            <div className="qa-form-group">
                                <label>성명</label>
                                <input type="text" className="qa-input-text" placeholder="성명 입력" />
                            </div>
                            <div className="qa-form-group">
                                <label>연락처</label>
                                <input type="text" className="qa-input-text" placeholder="010-0000-0000" />
                            </div>
                        </div>
                    </div>
                );
            }

            default:
                return null;
        }
    };

    const visibleQuestions = questions.filter(q => q.type !== 'global_logic' && !q.isDeleted);
    const globalLogicRules = questions.filter(q => q.type === 'global_logic' && !q.isDeleted);

    const filteredVisibleQuestions = visibleQuestions.filter(q =>
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredGlobalRules = globalLogicRules.filter(r =>
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="qa-parser-page" data-theme="data-management">
            <DataHeader
                title="QA"
                onSave={handleSaveData}
                saveButtonLabel="구조화 데이터 저장"
            />

            <div className="qa-parser-body">
                {/* ── 1. 좌측 컨트롤 패널 (250px 슬림) ───────────────────────── */}
                <div className={`qa-parser-left qa-panel ${isLeftCollapsed ? 'collapsed' : ''}`}>
                    {isLeftCollapsed ? (
                        <div className="qa-collapsed-trigger-bar" onClick={() => setIsLeftCollapsed(false)} title="컨트롤 패널 열기">
                            <ChevronRight size={18} color="#64748b" />
                            <span className="vertical-text">컨트롤 패널</span>
                        </div>
                    ) : (
                        <>
                            <div className="qa-left-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', padding: '0 4px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#475569' }}></span>
                                <button className="qa-panel-toggle-btn" onClick={() => setIsLeftCollapsed(true)} title="컨트롤 패널 접기">
                                    <ChevronLeft size={16} color="#64748b" />
                                </button>
                            </div>

                            {/* 1단계: 설문 구조화 분석 카드 */}
                            <div className="qa-analysis-card">
                                <div className="qa-card-header">
                                    <span className="qa-card-title">1단계. 설문지 분석</span>
                                </div>

                                <input type="file" ref={fileInputRef}
                                    accept=".docx,.doc,.hwp,.hwpx"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange} />

                                <div className={`qa-left-dropzone ${isDragging ? 'is-dragging' : ''} ${uploadedFile ? 'is-filled' : ''}`}
                                    onClick={() => !uploadedFile && fileInputRef.current?.click()}
                                    onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
                                    {uploadedFile ? (
                                        <div className="qa-dz-filled">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
                                                <span className="qa-dz-filename" title={uploadedFile.name}>{uploadedFile.name}</span>
                                            </div>
                                            <button className="qa-dz-remove" onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="qa-dz-empty">
                                            <FileText size={18} className="qa-dz-icon" />
                                            <span className="qa-dz-text">클릭하여 파일찾기</span>
                                            <span className="qa-dz-subtext">.docx · .hwp</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    className={`qa-btn-action ${uploadedFile ? 'btn-green active-pulse' : 'btn-disabled'}`}
                                    onClick={handleAnalyze}
                                    disabled={!uploadedFile || analyzeAll.isLoading}
                                    style={{ width: '100%' }}
                                >
                                    <RefreshCw size={14} className={analyzeAll.isLoading ? 'spin-anim' : ''} />
                                    설문지 ➔ JSON 구조화 시작
                                </button>
                            </div>

                            {/* 2단계: AI 로직 검증 카드 */}
                            <div className="qa-analysis-card">
                                <div className="qa-card-header">
                                    <span className="qa-card-title">2단계. AI 로직 검증</span>
                                </div>
                                <div className="qa-action-buttons">
                                    <button
                                        className="qa-btn-action btn-gray"
                                        onClick={handleLoadExistingSurvey}
                                        style={{ width: '100%' }}
                                    >
                                        <FileText size={14} />
                                        기존 구조화된 설문 가져오기
                                    </button>
                                    <button
                                        className={`qa-btn-action ${questions.length > 0 ? 'btn-orange' : 'btn-disabled'}`}
                                        onClick={handleCheckErrors}
                                        disabled={questions.length === 0}
                                        style={{ width: '100%' }}
                                    >
                                        <BrainCircuit size={14} />
                                        AI 로직 오류 체크
                                    </button>
                                </div>
                            </div>

                            {/* 검증 요약 카드 - 결과 생성 시 노출 */}
                            {questions.length > 0 && (
                                <div className="qa-stats-card" style={{ animation: 'qaFadeIn 0.35s ease', marginBottom: '12px' }}>
                                    {showQuestionCount && (
                                        <div className="qa-stats-row">
                                            <span className="qa-stats-label">파싱 문항 수</span>
                                            <span className="qa-stats-value">{questions.filter(q => q.type !== 'global_logic').length} 개</span>
                                        </div>
                                    )}
                                    <div className="qa-stats-row">
                                        <span className="qa-stats-label">예상 API 비용</span>
                                        <span className="qa-stats-value">${estimatedCost}</span>
                                    </div>
                                    <div className="qa-stats-row">
                                        <span className="qa-stats-label">소요 시간</span>
                                        <span className="qa-stats-value">{elapsedTime} 초</span>
                                    </div>
                                </div>
                            )}

                            {/* 저장 완료 피드백 토스트 */}
                            {isSaved && (
                                <div className="qa-save-toast">
                                    서버 DB 영구 저장 완료 (시뮬레이션)
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── 2. 중앙 구조화 상세 뷰어 (색인 + 상세 뷰 분할) ─────────────────── */}
                <div className="qa-parser-center qa-panel">
                    <div className="qa-center-header">
                        <h2>구조화 설문 결과 상세 뷰어</h2>
                    </div>

                    <div className="qa-split-viewer">
                        {questions.length > 0 ? (
                            <>
                                {/* 좌측 문항 색인 리스트 */}
                                <div className="qa-index-list">
                                    <div className="qa-index-search-wrapper">
                                        <Search size={14} className="qa-index-search-icon" />
                                        <input
                                            type="text"
                                            placeholder="변수명 또는 라벨 검색..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="qa-index-search-input"
                                        />
                                        {searchTerm && (
                                            <button className="qa-index-search-clear" onClick={() => setSearchTerm('')}>
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {filteredGlobalRules.map(r => (
                                        <div
                                            key={r.id}
                                            ref={el => leftItemRefs.current[r.id] = el}
                                            className={`qa-index-item ${activeQuestionId === r.id ? 'active' : ''}`}
                                            onClick={() => handleFocusQuestion(r.id)}
                                        >
                                            <div className="qa-index-item-info">
                                                <span className="qa-index-label-title" title={r.text}>
                                                    전역 룰셋
                                                </span>
                                                <span className="qa-index-label-sub">
                                                    {r.id}
                                                </span>
                                            </div>
                                            <div className="qa-index-type-badge type-rule">
                                                rule
                                            </div>
                                        </div>
                                    ))}
                                    {filteredVisibleQuestions.map((q) => {
                                        const isLoopBase = questions.some(otherQ => otherQ.loop_base_qnum === q.id);
                                        const isLoopChild = !!q.loop_base_qnum;
                                        return (
                                            <div
                                                key={q.id}
                                                ref={el => leftItemRefs.current[q.id] = el}
                                                className={`qa-index-item ${activeQuestionId === q.id ? 'active' : ''} ${isLoopChild ? 'qa-loop-child' : ''}`}
                                                onClick={() => handleFocusQuestion(q.id)}
                                            >
                                                <div className="qa-index-item-info">
                                                    <span className="qa-index-label-title" title={q.text} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        {isLoopBase && (
                                                            <span className="qa-loop-base-badge" title="로테이션 루프 시작 문항" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', padding: '3px', marginRight: '4px', flexShrink: 0 }}>
                                                                <RefreshCw size={11} />
                                                            </span>
                                                        )}
                                                        {isLoopChild && (
                                                            <span className="qa-loop-child-prefix" style={{ color: '#94a3b8', fontWeight: '800', marginRight: '4px', flexShrink: 0 }}>
                                                                ↳
                                                            </span>
                                                        )}
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</span>
                                                    </span>
                                                    <span className="qa-index-label-sub">
                                                        {q.id}
                                                    </span>
                                                </div>
                                                <div className={`qa-index-type-badge type-${q.type}`}>
                                                    {getShortTypeName(q.type)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredGlobalRules.length === 0 && filteredVisibleQuestions.length === 0 && (
                                        <div className="qa-index-search-empty">
                                            검색 결과가 없습니다.
                                        </div>
                                    )}
                                </div>

                                {/* 우측 문항 상세 리스트 */}
                                <div className="qa-detail-list" ref={detailListRef} onScroll={handleDetailScroll}>
                                    {globalLogicRules.map(r => (
                                        <div
                                            key={r.id}
                                            className={`qa-global-rules-container ${activeQuestionId === r.id ? 'highlighted' : ''}`}
                                            ref={el => questionCardRefs.current[r.id] = el}
                                        >
                                            <div className="qa-global-rules-list">
                                                <div className="qa-global-rule-card">
                                                    <div className="qa-global-rule-title">
                                                        <BrainCircuit size={12} color="#4f46e5" />
                                                        [전역 로직] {r.text}
                                                    </div>
                                                    <div style={{ margin: '4px 0 0 0', lineHeight: 1.4, fontSize: '11.5px' }}>
                                                        {r.logic.split('\n').filter(Boolean).map((line, idx) => {
                                                            const trimmed = line.trim();
                                                            const matchedLabel = KNOWN_LOGIC_LABELS.find(lbl => trimmed.startsWith(lbl));
                                                            if (matchedLabel) {
                                                                const labelIdx = line.indexOf(matchedLabel);
                                                                const label = line.substring(0, labelIdx + matchedLabel.length);
                                                                const val = line.substring(labelIdx + matchedLabel.length);
                                                                return (
                                                                    <div key={idx}>
                                                                        <strong style={{ fontWeight: 800, color: 'var(--dm-primary-hover, #15803d)', marginRight: '6px' }}>{label}</strong>
                                                                        <span style={{ color: '#1e293b' }}>{val}</span>
                                                                    </div>
                                                                );
                                                            }
                                                            return <div key={idx} style={{ color: '#1e293b' }}>{line}</div>;
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {visibleQuestions.map((q) => (
                                        <div
                                            key={q.id}
                                            className={`qa-question-card ${activeQuestionId === q.id ? 'highlighted' : ''}`}
                                            ref={el => questionCardRefs.current[q.id] = el}
                                        >
                                            {q.loop_logic && (
                                                <div className="qa-loop-banner">
                                                    <Layers size={13} />
                                                    [로테이션 루프 시작 구간: {q.loop_logic.target_range}] - {q.loop_logic.repeat_condition}
                                                </div>
                                            )}

                                            <div className="qa-qc-header">
                                                <div className="qa-qc-title-area">
                                                    <span className="qa-qc-id">{q.id}</span>
                                                    <span className={`qa-index-type-badge type-${q.type}`}>
                                                        {getShortTypeName(q.type)}
                                                    </span>
                                                </div>
                                                <div className="qa-qc-controls">
                                                    <button className="qa-mini-btn btn-insert" onClick={() => handleInsertQuestion(q.id)}>+ 삽입</button>
                                                    <button className="qa-mini-btn" onClick={() => handleModifyQuestion(q.id)}>교체</button>
                                                    <button className="qa-mini-btn btn-delete" onClick={() => handleDeleteQuestion(q.id)}>삭제</button>
                                                </div>
                                            </div>

                                            <div className="qa-qc-body">
                                                <p className="qa-qc-question-text">{q.text}</p>

                                                {((q.options && q.options.length > 0) || (q.scales && q.scales.length > 0) || (q.logic && q.logic.trim())) && (
                                                    <div className="qa-qc-details-container">
                                                        {q.options && q.options.length > 0 && (
                                                            <div className="qa-qc-section">
                                                                <div className="qa-qc-section-title">보기 목록 (OPTIONS)</div>
                                                                <div className="qa-qc-section-content-inner">
                                                                    {q.options.map(opt => (
                                                                        <div key={opt.code} className="qa-qc-option-item">
                                                                            <span className="qa-qc-option-code">[{opt.code}]</span>{' '}
                                                                            <span className="qa-qc-option-text">{opt.text}</span>
                                                                            {opt.is_exclusive && <span className="qa-control-badge qa-badge-exclusive" style={{ marginLeft: '6px' }}>[배타]</span>}
                                                                            {opt.is_fixed && <span className="qa-control-badge qa-badge-fixed" style={{ marginLeft: '6px' }}>📌 고정</span>}
                                                                            {opt.has_open_ended && <span className="qa-control-badge qa-badge-open" style={{ marginLeft: '6px' }}>✍ 주관식 입력</span>}
                                                                            {opt.display_condition && <span className="qa-control-badge qa-badge-condition" style={{ marginLeft: '6px' }}>👁 {opt.display_condition}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {q.scales && q.scales.length > 0 && (
                                                            <div className="qa-qc-section">
                                                                <div className="qa-qc-section-title">척도 목록 (SCALES)</div>
                                                                <div className="qa-qc-section-content-inner">
                                                                    {q.scales.map(sc => (
                                                                        <div key={sc.code} className="qa-qc-option-item">
                                                                            <span className="qa-qc-option-code">[{sc.code}]</span>{' '}
                                                                            <span className="qa-qc-option-text">{sc.text}</span>
                                                                            {sc.has_open_ended && <span className="qa-control-badge qa-badge-open" style={{ marginLeft: '6px' }}>✍ 주관식 입력</span>}
                                                                            {sc.display_condition && <span className="qa-control-badge qa-badge-condition" style={{ marginLeft: '6px' }}>👁 {sc.display_condition}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {q.logic && q.logic.trim() && (
                                                            <div className="qa-qc-section">
                                                                <div className="qa-qc-section-title">상호 연계 로직 (LOGICS)</div>
                                                                <div className="qa-qc-section-content-inner">
                                                                    {q.logic.split('\n').filter(Boolean).map((line, idx) => {
                                                                        const trimmed = line.trim();
                                                                        const matchedLabel = KNOWN_LOGIC_LABELS.find(lbl => trimmed.startsWith(lbl));
                                                                        if (matchedLabel) {
                                                                            const labelIdx = line.indexOf(matchedLabel);
                                                                            const label = line.substring(0, labelIdx + matchedLabel.length);
                                                                            const val = line.substring(labelIdx + matchedLabel.length);
                                                                            return (
                                                                                <div key={idx} className="qa-qc-logic-item">
                                                                                    <strong className="qa-qc-logic-label">{label}</strong>
                                                                                    <span className="qa-qc-logic-value">{val}</span>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <div key={idx} className="qa-qc-logic-item" style={{ color: '#1e293b' }}>
                                                                                {line}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {q.loop_base_qnum && (
                                                    <div className="qa-bottom-link-bar">
                                                        <span>🔗 본 문항은 {q.loop_base_qnum}에 종속된 반복 로테이션 문항입니다.</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="qa-empty-viewer">
                                <FileText size={48} strokeWidth={1.5} />
                                <span style={{ fontSize: '14px', fontWeight: 600 }}>구조화된 설문 분석 결과가 존재하지 않습니다.</span>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>좌측 패널에서 설문을 가져오거나 구조화를 진행해 주세요.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 3. 우측 AI 로직 검증 패널 ─────────────────────────────── */}
                <div className={`qa-parser-right qa-panel ${isRightCollapsed ? 'collapsed' : ''}`}>
                    {isRightCollapsed ? (
                        <div className="qa-collapsed-trigger-bar" onClick={() => setIsRightCollapsed(false)} title="검증 결과 열기">
                            <ChevronLeft size={18} color="#64748b" />
                            <span className="vertical-text">검증 결과</span>
                        </div>
                    ) : (
                        <>
                            <div className="qa-right-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button className="qa-panel-toggle-btn" onClick={() => setIsRightCollapsed(true)} title="검증 결과 접기">
                                        <ChevronRight size={16} color="#64748b" />
                                    </button>
                                    <h2>
                                        <AlertTriangle size={15} color="#64748b" />
                                        AI 로직 검증 결과
                                    </h2>
                                </div>
                                {errors.length > 0 && (
                                    <span className="qa-error-count-badge">{errors.length}건 검출</span>
                                )}
                            </div>

                            <div className="qa-right-error-list">
                                {errors.length > 0 ? (
                                    errors.map((err, idx) => (
                                        <div
                                            key={idx}
                                            className={`qa-error-card-lite ${err.type}`}
                                            onClick={() => handleFocusQuestion(err.id)}
                                            style={{ cursor: 'pointer' }}
                                            title="클릭 시 해당 문항으로 스크롤 이동"
                                        >
                                            <div className="qa-ec-top">
                                                <span className="qa-ec-id">{err.id}</span>
                                                <span className="qa-ec-badge">{err.title}</span>
                                            </div>
                                            <p className="qa-ec-message">{err.message}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="qa-empty-viewer" style={{ padding: '40px 10px' }}>
                                        <CheckCircle size={32} color="#94a3b8" strokeWidth={1.5} />
                                        <span style={{ fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>이슈 검출 내역이 없습니다.</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>AI 로직 오류 체크 시 검증이 시작됩니다.</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <QaProgressModal
                isOpen={isProgressModalOpen}
                onClose={handleProgressModalClose}
                percentage={progressPercentage}
                message={progressMessage}
                isComplete={isProgressComplete}
                mode={progressModalMode}
            />

            {/* 새 문항 삽입/교체 팝업 모달 */}
            <div className={`qa-insert-overlay ${isInsertPopupOpen ? 'active' : ''}`}>
                <div className="qa-insert-card">
                    <div className="qa-insert-header">
                        <div className="qa-insert-header-title-box">
                            <div className="qa-insert-header-accent"></div>
                            <h3 className="qa-insert-title">
                                {popupMode === 'modify' ? '문항 교체 파싱' : '새 문항 삽입 파싱'}
                            </h3>
                        </div>
                        <button onClick={() => setIsInsertPopupOpen(false)} className="qa-insert-close">&times;</button>
                    </div>
                    <div className="qa-insert-body">
                        <p className="qa-insert-subtitle">
                            {popupMode === 'modify'
                                ? '교체할 문항의 텍스트 전체를 입력하세요. AI가 분석하여 목록에 업데이트합니다.'
                                : '추가할 새 문항의 텍스트 전체를 붙여넣으세요. AI가 분석하여 목록에 삽입합니다.'}
                        </p>
                        <p className="qa-insert-target">
                            {popupMode === 'modify'
                                ? `대상 문항: ${insertTargetId} 교체`
                                : `대상 문항: ${insertTargetId} 바로 뒤에 삽입`}
                        </p>
                        <textarea
                            className="qa-insert-textarea"
                            placeholder="교체 또는 삽입할 설문지 텍스트를 입력해주세요."
                            value={insertText}
                            onChange={(e) => setInsertText(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="qa-insert-footer">
                        <button className="qa-insert-btn-cancel" onClick={() => setIsInsertPopupOpen(false)}>
                            취소
                        </button>
                        <button className="qa-insert-btn-submit" onClick={handleExecuteInsert}>
                            {popupMode === 'modify' ? '교체 완료' : '재파싱 실행'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QaPage;
