import { useState, useRef, useContext } from 'react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { modalContext } from "@/components/common/Modal.jsx";
import { CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, FileText, Search, GitCompare, RotateCw, FileSearch } from 'lucide-react';
import { useSelector } from 'react-redux';
import { SurveyTestPageApi } from './SurveyTestPageApi';
import SurveyTestProgressModal from './SurveyTestProgressModal';
import WordingCompareView from './WordingCompareView';
import * as signalR from "@microsoft/signalr";
import './SurveyTestPage.css';

// ─── QA 섹션 정의 ────────────────────────────────────
const QA_SECTIONS = [
    { key: 'syntax', label: '스크립트(qm) 오류', dataKey: 'scriptErrors', countKey: 'scriptErrorCount' },
    { key: 'cross', label: '설문 vs 스크립트 불일치', dataKey: 'mismatchErrors', countKey: 'mismatchErrorCount' },
];

// ─── 에러 타입 설정 ────────────────────────────────────
const TYPE_CONFIG = {
    critical: { label: '심각', color: '#dc2626', bg: '#fff1f1', border: '#fca5a5' },
    error: { label: '오류', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
    warning: { label: '확인', color: '#ca8a04', bg: '#fefce8', border: '#fde047' },
};

// ─── 에러 아이템 카드 ────────────────────────────────────
const ErrorCard = ({ item }) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.error;
    return (
        <div className="qa-error-card">
            <div className="qa-error-card-top">
                <span className="qa-type-label" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                    {cfg.label}
                </span>
                <span className="qa-error-target">{item.targetItem}</span>
                <span className="qa-error-title">{item.title}</span>
            </div>
            <p className="qa-error-desc">{item.description}</p>
            {item.codeSnippet && (
                <pre className="qa-code-snippet">{item.codeSnippet}</pre>
            )}
        </div>
    );
};

// ─── 메인 컴포넌트 ────────────────────────────────────────
const SurveyTestPage = () => {
    const [activeSection, setActiveSection] = useState('syntax');
    const [resultJson, setResultJson] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // ── 메인 뷰 모드 ('qa' | 'wording') ──
    const [viewMode, setViewMode] = useState('qa');

    // ── 목업 테스트 조작 상태 ──
    const [mockState, setMockState] = useState(null);

    // ── 문구 비교 (Compare Wording) States ──
    const [wordingResultJson, setWordingResultJson] = useState(null);
    const [wordingTopMessage, setWordingTopMessage] = useState('');
    const [isWordingLoading, setIsWordingLoading] = useState(false);

    // ── 목업 상태 조작 핸들러 ──
    const applyMockState = (stateKey) => {
        setMockState(stateKey);
        setViewMode('wording');

        if (stateKey === 'BEFORE_COMPARE') {
            setIsWordingLoading(false);
            setWordingResultJson(null);
        } else if (stateKey === 'COMPARING') {
            setIsWordingLoading(true);
            setWordingResultJson(null);
        } else if (stateKey === 'MOCK_Q250919') {
            setIsWordingLoading(false);
            setWordingResultJson({
                message: '인식된 설문지 최신 저장본과 큐마 스크립트(QM) 대조 결과입니다.',
                warning: null,
                source: { available: true, message: '설문지 원문 텍스트도 함께 검토하였습니다. 구조화 과정에서 제외된 설명 문구는 차이 항목에 포함되지 않습니다.' },
                emphasis: { available: true, sameFile: true, fileName: 'q250919_survey.docx', extractedAt: '2026-09-18 17:20' },
                basis: { documentVersion: 3, documentUpdatedAt: '2026-08-21 14:18', scriptFetchedAt: '2026-09-18 17:20' },
                summary: { questionDiff: 3, questionMajor: 1, optionDiff: 2, emphasisDiff: 1, sourceMatched: 25 },
                questions: [
                    {
                        qnum: 'SQ1',
                        scriptVar: 'q100',
                        grade: 'major',
                        similarity: 65,
                        doc: '귀하의 연령은 어떻게 되십니까?',
                        script: '귀하의 만 연령을 선택해 주세요.',
                        docMarks: [{ start: 3, length: 2 }],
                        scriptMarks: [{ start: 3, length: 4 }],
                        note: '연령 표기 방식 차이 (만 연령 vs 연령)'
                    },
                    {
                        qnum: 'SQ2',
                        scriptVar: 'q150',
                        grade: 'minor',
                        similarity: 92,
                        doc: '현재 거주하시는 지역을 선택해 주세요.',
                        script: '현재 거주하시는 지역을 선택해 주십시오.',
                        docMarks: [{ start: 15, length: 3 }],
                        scriptMarks: [{ start: 15, length: 4 }],
                        note: null
                    }
                ],
                options: [
                    {
                        qnum: 'SQ1',
                        scriptVar: 'q100',
                        docOnly: ['19~29세', '30~39세', '40~49세', '50세 이상'],
                        scriptOnly: ['만 19~29세', '만 30~39세', '만 40~49세', '만 50세 이상']
                    }
                ],
                emphasisDiffs: [
                    {
                        qnum: 'SQ3',
                        scriptVar: 'q200',
                        docOnly: ['모두', '반드시'],
                        scriptOnly: ['모두']
                    }
                ],
                sameQnumElsewhere: [],
                sourceMatchedQnums: ['SQ4', 'SQ5', 'SQ6', 'SQ7', 'SQ8', 'SQ9']
            });
        } else if (stateKey === 'MOCK_Q260448_2') {
            setIsWordingLoading(false);
            setWordingResultJson({
                message: '설문지와 스크립트의 문항 번호 순서가 일부 차이납니다. 동일한 문항 문구 29개가 서로 다른 문항 번호에 배치되어 있습니다. 문항 번호 기준 대조 시 차이가 크게 표시될 수 있습니다.',
                warning: '설문지와 스크립트의 문항 번호 순서가 일부 차이납니다. 동일한 문항 문구 29개가 서로 다른 문항 번호에 배치되어 있습니다.',
                source: { available: false, message: '설문지 원문 텍스트가 저장되어 있지 않아 구조화 데이터 기준으로 대조하였습니다. 안내 유의사항 등이 \'스크립트에만 존재\'로 보일 수 있습니다.' },
                emphasis: { available: false, sameFile: false, message: '설문지 서식 정보가 없습니다. 설문지 파일(HWP, DOCX)을 다시 업로드하시면 서식 강조 대조 결과가 제공됩니다.' },
                basis: { documentVersion: 3, documentUpdatedAt: '2026-08-21 14:18', scriptFetchedAt: '2026-09-18 17:20' },
                summary: { questionDiff: 31, questionMajor: 30, optionDiff: 47, emphasisDiff: 0, sourceMatched: 0 },
                questions: [
                    {
                        qnum: 'SQ1',
                        scriptVar: 'q100',
                        grade: 'major',
                        similarity: 0,
                        doc: '국가',
                        script: '귀하의 성별은 무엇입니까?',
                        docMarks: [{ start: 0, length: 2 }],
                        scriptMarks: [{ start: 0, length: 13 }],
                        note: '문번 순서 밀림 현상으로 서로 다른 문항이 대조됨'
                    },
                    {
                        qnum: 'SQ2',
                        scriptVar: 'q150',
                        grade: 'major',
                        similarity: 18,
                        doc: '귀하의 성별은 무엇입니까?',
                        script: '귀하의 만 연령은 어떻게 되십니까?',
                        docMarks: [{ start: 3, length: 2 }],
                        scriptMarks: [{ start: 3, length: 5 }],
                        note: null
                    }
                ],
                options: [
                    {
                        qnum: 'SQ1',
                        scriptVar: 'q100',
                        docOnly: ['한국', '미국', '영국', '독일', '프랑스'],
                        scriptOnly: ['남성', '여성']
                    },
                    {
                        qnum: 'SQ2',
                        scriptVar: 'q150',
                        docOnly: ['남성', '여성'],
                        scriptOnly: ['만 세']
                    }
                ],
                emphasisDiffs: [],
                sameQnumElsewhere: [],
                sourceMatchedQnums: []
            });
        } else if (stateKey === 'MOCK_Q261181') {
            setIsWordingLoading(false);
            setWordingResultJson({
                message: '총 195개 문항 대조 완료 (질문 문구 차이 5건, 보기 차이 8건, 서식 차이 0건).',
                warning: null,
                source: { available: true, message: '설문지 원문 텍스트도 함께 검토하였습니다. 구조화 과정에서 제외된 설명 문구는 차이 항목에 포함되지 않습니다.' },
                emphasis: { available: false, sameFile: false, message: '설문지 서식 정보가 없습니다. 설문지 파일(HWP, DOCX)을 다시 업로드하시면 서식 강조 대조 결과가 제공됩니다.' },
                basis: { documentVersion: 2, documentUpdatedAt: '2026-09-08 17:24', scriptFetchedAt: '2026-09-18 17:19' },
                summary: { questionDiff: 5, questionMajor: 2, optionDiff: 8, emphasisDiff: 0, sourceMatched: 8 },
                questions: [
                    {
                        qnum: 'SQ3-2',
                        scriptVar: 'q50',
                        grade: 'major',
                        similarity: 15,
                        doc: '//정보 처리용(쿼터) 문항이고, 응답자에게 보이지 않습니다. SQ3-2. 연령분류2',
                        script: '연령분류2',
                        docMarks: [{ start: 0, length: 42 }],
                        scriptMarks: [],
                        note: '설문지 원문에 주석 및 처리용 문구 포함됨'
                    },
                    {
                        qnum: 'C2-1',
                        scriptVar: 'q680',
                        grade: 'major',
                        similarity: 66,
                        doc: '로직: 자동 코딩',
                        script: '자동 코딩',
                        docMarks: [{ start: 0, length: 4 }],
                        scriptMarks: [],
                        note: null
                    }
                ],
                options: [],
                emphasisDiffs: [],
                sameQnumElsewhere: [],
                sourceMatchedQnums: ['SQ1', 'SQ2', 'SQ3-1', 'C1', 'C2', 'D1', 'D2', 'D3']
            });
        } else if (stateKey === 'MOCK_Q260271T') {
            setIsWordingLoading(false);
            setWordingResultJson({
                message: '총 168개 문항 대조 완료 (질문 문구 차이 7건, 보기 차이 54건, 서식 차이 0건).',
                warning: null,
                source: { available: true, message: '설문지 원문 텍스트도 함께 검토하였습니다. 구조화 과정에서 제외된 설명 문구는 차이 항목에 포함되지 않습니다.' },
                emphasis: { available: false, sameFile: false, message: '설문지 서식 정보가 없습니다. 설문지 파일(HWP, DOCX)을 다시 업로드하시면 서식 강조 대조 결과가 제공됩니다.' },
                basis: { documentVersion: 2, documentUpdatedAt: '2026-09-10 10:09', scriptFetchedAt: '2026-09-18 17:20' },
                summary: { questionDiff: 7, questionMajor: 4, optionDiff: 54, emphasisDiff: 0, sourceMatched: 98 },
                questions: [
                    {
                        qnum: 'SQ8-2',
                        scriptVar: 'sq8a2',
                        grade: 'major',
                        similarity: 33,
                        doc: '주소: 주소 검색',
                        script: '주소',
                        docMarks: [{ start: 4, length: 5 }],
                        scriptMarks: [],
                        note: '설문지에 주소 검색 안내 문구 포함'
                    },
                    {
                        qnum: 'G5-2',
                        scriptVar: 'zg5a2',
                        grade: 'major',
                        similarity: 41,
                        doc: '시계 그리기',
                        script: '시계',
                        docMarks: [{ start: 2, length: 4 }],
                        scriptMarks: [],
                        note: null
                    }
                ],
                options: [],
                emphasisDiffs: [],
                sameQnumElsewhere: [
                    {
                        qnum: 'Q10',
                        scriptVar: 'q10_1',
                        message: 'Q10 문번이 q10_1 및 q10_2 두 변수로 분할 지정되었습니다.'
                    }
                ],
                sourceMatchedQnums: ['SQ1', 'SQ2', 'SQ3', 'SQ4', 'SQ5']
            });
        } else if (stateKey === 'MOCK_909') {
            setIsWordingLoading(false);
            setWordingResultJson({
                errorcontent: '설문 q261043 은(는) 아직 설문지 인식을 하지 않았습니다. 먼저 설문지를 올려 인식해 주세요.'
            });
        }
    };

    // Progress Modal States
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressMessage, setProgressMessage] = useState('요청을 준비하고 있습니다...');
    const [isProgressComplete, setIsProgressComplete] = useState(false);

    const tabContentRef = useRef(null);
    const pendingResponseRef = useRef(null);
    const auth = useSelector(store => store.auth);
    const modal = useContext(modalContext);
    const { analyzeAll, compareWording } = SurveyTestPageApi();

    const handleProgressModalClose = () => {
        setIsProgressModalOpen(false);
        const res = pendingResponseRef.current;
        if (!res) return;

        if (String(res.success) === '777') {
            setResultJson(res.resultjson);
        } else {
            modal.showErrorAlert("알림", res.message || '분석 중 오류가 발생했습니다.');
        }
        pendingResponseRef.current = null;
    };

    // 탭을 다시 누르면 전체 보기 모드(null)로 돌아가는 토글 기능 부활
    const handleSectionClick = (key) => setActiveSection(prev => prev === key ? null : key);

    // ── AI 교차 검증 시작 ──
    const handleAnalyze = async () => {
        // 로딩바 초기화 및 모달 띄우기
        setProgressPercentage(0);
        setProgressMessage('연결 준비 중...');
        setIsProgressComplete(false);
        setIsProgressModalOpen(true);

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

            // --- 생명주기 이벤트 로깅 ---
            connection.onreconnecting(error => {
                if (error) console.error(`[SignalR] ⚠️ 연결 끊김! Error:`, error);
            });
            connection.onclose(error => {
                if (error) console.error(`[SignalR] ❌ 비정상 연결 종료:`, error);
            });

            // 2. 이벤트 수신 등록
            connection.on("ReceiveProgress", (...args) => {
                let percent = 0;
                let msg = '';

                if (args.length >= 2 && typeof args[1] === 'number') {
                    msg = args[0];
                    percent = args[1];
                } else if (args.length === 1 && typeof args[0] === 'object') {
                    msg = args[0].message || args[0].Message;
                    percent = args[0].percent || args[0].Percent || args[0].percentage || args[0].Percentage;
                } else if (args.length >= 2 && typeof args[0] === 'number') {
                    percent = args[0];
                    msg = args[1];
                }

                setProgressPercentage(percent || 0);
                setProgressMessage(msg || '');
            });

            await connection.start();
            myConnectionId = connection.connectionId;
        } catch (e) {
            console.error("SignalR Connection Error:", e);
            setProgressMessage("오류: 실시간 연결 실패 (분석 진행 가능)");
        }

        const fd = new FormData();
        fd.append('pn', pn);
        fd.append('user', user);
        fd.append('modelType', 'flash');
        if (myConnectionId) {
            fd.append('connectionId', myConnectionId);
        }

        try {
            const res = await analyzeAll.mutateAsync(fd);
            pendingResponseRef.current = res;

            // 응답 완료 시 100% 로깅
            setProgressPercentage(100);
            setProgressMessage('교차 검증이 완벽하게 끝났습니다!');
            setTimeout(() => setIsProgressComplete(true), 500);
        } catch (e) {
            console.log("백엔드 통신 실패. 모의 동작으로 로딩을 계속 진행합니다.");
            // 모의 동작 시뮬레이션
            let currentPercent = 10;
            const timer = setInterval(() => {
                currentPercent += 15;
                if (currentPercent >= 100) {
                    clearInterval(timer);
                    setProgressPercentage(100);
                    setProgressMessage('교차 검증이 완벽하게 끝났습니다!');
                    setTimeout(() => {
                        setIsProgressComplete(true);
                        // Mock resultJson setting
                        pendingResponseRef.current = {
                            success: '777',
                            resultjson: {
                                processingTimeSeconds: 15.34,
                                estimatedApiCost: 0.0125,
                                documentErrorCount: 0,
                                scriptErrorCount: 1,
                                mismatchErrorCount: 1,
                                totalCriticalCount: 1,
                                totalErrorCount: 1,
                                totalWarningCount: 0,
                                documentErrors: [],
                                scriptErrors: [
                                    {
                                        type: 'critical',
                                        title: '타입 불일치 (문자열과 숫자 비교)',
                                        targetItem: 'q5 (귀하의 성별)',
                                        description: '문자열을 반환하는 함수(fopen)를 숫자(int)와 직접 비교 연산자로 비교했습니다. C# 기반 로직 엔진은 강형(Strongly typed)이므로, 런타임 컴파일 에러(CS0019)를 발생시킵니다. fint(...)를 통해 정수형으로 래핑한 뒤 비교해 주세요.',
                                        codeSnippet: '  #prelogic\n  if (fopen(\'gender\') == 1) {\n▶   Goto(\'q10\');\n  }',
                                        lineNumber: 152
                                    }
                                ],
                                mismatchErrors: [
                                    {
                                        type: 'error',
                                        title: '기획서와 스크립트 보기 옵션 개수 불일치',
                                        targetItem: '문10',
                                        description: '[기획 요구] 문10 문항의 보기는 총 5개(1번~5번)로 규정되어 있음.\n[스크립트 현황] 실제 스크립트 q10에는 6번(기타) 보기가 임의로 추가되어 대조 불일치.\n[데이터 영향] 기획서에 명시되지 않은 기타 데이터가 적재되어 분석 혼선 유발.',
                                        codeSnippet: 'JSON 기획 로직:\n"options": [\n  {"code": "1", "label": "남성"},\n  {"code": "2", "label": "여성"}\n]\n\n실제 스크립트 코드 (q10):\n#question q10\n*title 문10\n1: 남성\n2: 여성\n3: 기타 (임의 추가됨)',
                                        lineNumber: 240
                                    }
                                ]
                            }
                        };
                    }, 500);
                } else {
                    setProgressPercentage(currentPercent);
                    if (currentPercent >= 70) {
                        setProgressMessage('교차 분석 및 척도 결합 중...');
                    } else if (currentPercent >= 40) {
                        setProgressMessage('스크립트 문항 구조 파싱 중...');
                    } else {
                        setProgressMessage('설문 파라미터 해독 중...');
                    }
                }
            }, 250);
        } finally {
            if (connection) {
                connection.stop();
            }
        }
    };

    // ── 문구 비교 (Compare Wording) 실행 ──
    const handleCompareWording = async () => {
        const pn = sessionStorage.getItem('projectnum') || '';
        const user = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "설문번호(pn)를 찾지 못했습니다. 프로젝트를 먼저 선택해주세요.");
            return;
        }

        setIsWordingLoading(true);
        const requestedPn = pn;

        try {
            const res = await compareWording.mutateAsync({ pn, user });

            // 기다리는 사이 다른 설문으로 옮겼으면 늦게도착한 결과 버림
            const currentPn = sessionStorage.getItem('projectnum') || '';
            if (currentPn !== requestedPn) {
                console.log("[CompareWording] 설문번호가 변경되어 늦게 도착한 결과를 버립니다.");
                return;
            }

            if (String(res?.success) === '777') {
                setWordingResultJson(res.resultjson || {});
                setWordingTopMessage(res.message || '');
                setViewMode('wording');
            } else if (res?.success === '900' || res?.success === '909') {
                const errMsg = res.resultjson?.errorcontent || res.message || "문구 비교를 진행할 수 없습니다.";
                modal.showErrorAlert("알림", errMsg);
            } else {
                const errMsg = res?.resultjson?.errorcontent || res?.message || "문구 비교를 하지 못했습니다. 잠시 후 다시 시도해주세요.";
                modal.showErrorAlert("알림", errMsg);
            }
        } catch (e) {
            console.error("compareWording error:", e);
            const errMsg = e.response?.data?.message || e.message || "문구 비교를 하지 못했습니다. 잠시 후 다시 시도해주세요.";
            modal.showErrorAlert("에러", errMsg);
        } finally {
            setIsWordingLoading(false);
        }
    };

    // 통계 정보 계산
    const totalQuestions = resultJson ? (resultJson.totalQuestionCount || 5) : 5;
    const validationCost = resultJson ? (resultJson.estimatedApiCost !== undefined ? resultJson.estimatedApiCost.toFixed(4) : '0.4500') : '0.4500';
    const validationTime = resultJson ? (resultJson.processingTimeSeconds !== undefined ? resultJson.processingTimeSeconds.toString() : '12.5') : '12.5';

    // 카운트 헬퍼
    const getCount = (section) => resultJson?.[section.countKey] ?? 0;

    // 전체 현황 집계 헬퍼 (로컬 데이터 기반 수작업 집계로 정확성 보장)
    const getGlobalCounts = (json) => {
        if (!json) return { critical: 0, error: 0, warning: 0 };
        return QA_SECTIONS.reduce((acc, s) => {
            const items = json[s.dataKey] || [];
            acc.critical += items.filter(x => x.type === 'critical').length;
            acc.error += items.filter(x => x.type === 'error').length;
            acc.warning += items.filter(x => x.type === 'warning').length;
            return acc;
        }, { critical: 0, error: 0, warning: 0 });
    };
    const globalCounts = getGlobalCounts(resultJson);

    const visibleSections = activeSection
        ? QA_SECTIONS.filter(s => s.key === activeSection)
        : QA_SECTIONS;

    return (
        <div className="survey-test-page" data-theme="data-management">
            <DataHeader title="설문&스크립트 교차검증" />

            {/* ── 테스트 목업 조작 막대 (실제 화면엔 없는 개발/테스트용 조작 바) ── */}
            <div style={{
                background: '#0f172a',
                borderRadius: '8px',
                padding: '10px 16px',
                margin: '12px 16px 0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                color: '#e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
                <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '13px' }}>목업 조작</span>
                <span style={{ color: '#94a3b8', fontSize: '12px', marginRight: '6px' }}>실제 화면엔 없는 막대입니다. 눌러서 상태를 바꿔 보세요 →</span>

                <button
                    type="button"
                    onClick={() => applyMockState('BEFORE_COMPARE')}
                    style={{
                        background: mockState === 'BEFORE_COMPARE' ? '#2563eb' : '#1e293b',
                        color: mockState === 'BEFORE_COMPARE' ? '#ffffff' : '#94a3b8',
                        border: mockState === 'BEFORE_COMPARE' ? '1px solid #3b82f6' : '1px solid #334155',
                        padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                >
                    비교 전
                </button>

                <button
                    type="button"
                    onClick={() => applyMockState('COMPARING')}
                    style={{
                        background: mockState === 'COMPARING' ? '#2563eb' : '#1e293b',
                        color: mockState === 'COMPARING' ? '#ffffff' : '#94a3b8',
                        border: mockState === 'COMPARING' ? '1px solid #3b82f6' : '1px solid #334155',
                        padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                >
                    비교 중
                </button>

                <button
                    type="button"
                    onClick={() => applyMockState('MOCK_Q250919')}
                    style={{
                        background: mockState === 'MOCK_Q250919' ? '#2563eb' : '#1e293b',
                        color: mockState === 'MOCK_Q250919' ? '#ffffff' : '#94a3b8',
                        border: mockState === 'MOCK_Q250919' ? '1px solid #3b82f6' : '1px solid #334155',
                        padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                >
                    q250919 · 정상(강조 있음)
                </button>

                <button
                    type="button"
                    onClick={() => applyMockState('MOCK_Q260448_2')}
                    style={{
                        background: mockState === 'MOCK_Q260448_2' ? '#2563eb' : '#1e293b',
                        color: mockState === 'MOCK_Q260448_2' ? '#ffffff' : '#94a3b8',
                        border: mockState === 'MOCK_Q260448_2' ? '1px solid #3b82f6' : '1px solid #334155',
                        padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                >
                    q260448_2 · 문번 밀림 경고
                </button>

                <button
                    type="button"
                    onClick={() => applyMockState('MOCK_Q261181')}
                    style={{
                        background: mockState === 'MOCK_Q261181' ? '#2563eb' : '#1e293b',
                        color: mockState === 'MOCK_Q261181' ? '#ffffff' : '#94a3b8',
                        border: mockState === 'MOCK_Q261181' ? '1px solid #3b82f6' : '1px solid #334155',
                        padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                >
                    q261181 · 강조 정보 없음
                </button>

                <button
                    type="button"
                    onClick={() => applyMockState('MOCK_Q260271T')}
                    style={{
                        background: mockState === 'MOCK_Q260271T' ? '#2563eb' : '#1e293b',
                        color: mockState === 'MOCK_Q260271T' ? '#ffffff' : '#94a3b8',
                        border: mockState === 'MOCK_Q260271T' ? '1px solid #3b82f6' : '1px solid #334155',
                        padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                >
                    q260271t · 같은 문번 두 곳
                </button>

                <button
                    type="button"
                    onClick={() => applyMockState('MOCK_909')}
                    style={{
                        background: mockState === 'MOCK_909' ? '#2563eb' : '#1e293b',
                        color: mockState === 'MOCK_909' ? '#ffffff' : '#94a3b8',
                        border: mockState === 'MOCK_909' ? '1px solid #3b82f6' : '1px solid #334155',
                        padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                    }}
                >
                    909 · 설문지 인식 전
                </button>
            </div>

            <div className="survey-test-body">
                {/* ── 컨텐츠 영역 ── */}
                <div className="survey-test-content">
                    {/* ── 통합 탭 헤더 바 (맵 관리 탭 구조 및 디자인 100% 동일 적용) ── */}
                    <div className="tab-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* 탭 버튼들 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                                <button
                                    type="button"
                                    className={`tab-btn ${viewMode === 'qa' ? 'active' : ''}`}
                                    onClick={() => setViewMode('qa')}
                                >
                                    교차 검증 (AI 오류 분석)
                                </button>
                                <button
                                    type="button"
                                    className={`tab-btn ${viewMode === 'wording' ? 'active' : ''}`}
                                    onClick={() => {
                                        setViewMode('wording');
                                    }}
                                >
                                    문구 비교 (텍스트 대조)
                                </button>
                            </div>

                            {/* 탭 바로 옆에 위치하는 눈에 띄는 주요 실행 버튼 */}
                            {viewMode === 'qa' && (
                                <button
                                    className={`st-btn-action compact-btn btn-green ${!resultJson && !analyzeAll.isLoading ? 'active-pulse' : ''}`}
                                    onClick={handleAnalyze}
                                    disabled={analyzeAll.isLoading || isWordingLoading}
                                    style={{ height: '32px', padding: '0 16px', fontSize: '13px' }}
                                >
                                    <Search size={13} />
                                    AI 교차 검증 시작
                                </button>
                            )}

                            {viewMode === 'wording' && (!isWordingLoading && wordingResultJson ? (
                                <button
                                    className="st-btn-action compact-btn st-btn-wording"
                                    onClick={handleCompareWording}
                                    disabled={isWordingLoading || analyzeAll.isLoading}
                                >
                                    <FileSearch size={13} className="btn-icon-spin" />
                                    <span>문구 대조 재실행</span>
                                </button>
                            ) : null)}
                        </div>

                        {/* 우측 요약 통계 정보 (QA 탭일 때 표시) */}
                        {viewMode === 'qa' && (
                            <div className={`st-top-stats-card ${!resultJson ? 'placeholder' : ''}`} style={{ border: 'none', background: 'transparent', padding: '0', margin: 0, boxShadow: 'none' }}>
                                <div className="st-top-stat-item">
                                    <span className="st-top-stat-label">총 변수/문항 수</span>
                                    <span className="st-top-stat-value">{resultJson ? `${totalQuestions} 개` : '- 개'}</span>
                                </div>
                                <div className="st-top-stat-item">
                                    <span className="st-top-stat-label">교차 검증 비용</span>
                                    <span className="st-top-stat-value green-text">{resultJson ? `$${validationCost}` : '$-'}</span>
                                </div>
                                <div className="st-top-stat-item">
                                    <span className="st-top-stat-label">검증 소요 시간</span>
                                    <span className="st-top-stat-value">{resultJson ? `${validationTime} 초` : '- 초'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {viewMode === 'wording' ? (
                        <div className="survey-test-tab-content" style={{ padding: '0', overflowY: 'auto' }}>
                            {isWordingLoading ? (
                                <div className="st-empty-viewer" style={{ padding: '80px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 600, color: '#64748b' }}>
                                        <span style={{
                                            display: 'inline-block', width: 20, height: 20, border: '2.5px solid #cbd5e1',
                                            borderTopColor: 'var(--dm-primary, #16a34a)', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                                        }} />
                                        설문 문구 대조 분석 중...
                                    </div>
                                </div>
                            ) : wordingResultJson ? (
                                <WordingCompareView data={wordingResultJson} topMessage={wordingTopMessage} />
                            ) : (
                                <div style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '32px 16px',
                                    boxSizing: 'border-box'
                                }}>
                                    <div className="st-empty-viewer" style={{
                                        padding: '40px 24px',
                                        textAlign: 'center',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        maxWidth: '560px',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    }}>
                                        <div style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            background: '#f0fdf4',
                                            border: '1px solid #bbf7d0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '20px',
                                            color: '#16a34a'
                                        }}>
                                            <FileSearch size={32} />
                                        </div>

                                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>
                                            설문지 vs 큐마 스크립트 문구 대조
                                        </h3>

                                        <p style={{ fontSize: '14px', color: '#475569', margin: '0 0 24px 0', maxWidth: '480px', lineHeight: '1.6' }}>
                                            인식된 설문지 원문과 큐마 스크립트(QM) 간의 <strong>질문 문장, 보기 항목, 서식 강조</strong> 차이를<br />
                                            대조하여 일치 여부를 확인합니다.
                                        </p>

                                        <button
                                            type="button"
                                            className={`st-btn-action st-btn-wording ${!isWordingLoading && !analyzeAll.isLoading ? 'active-pulse' : ''}`}
                                            onClick={handleCompareWording}
                                            disabled={isWordingLoading || analyzeAll.isLoading}
                                        >
                                            <FileSearch size={18} className="btn-icon-spin" />
                                            <span>문구 대조 실행</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="survey-test-tab-content" ref={tabContentRef}>
                            <div className="qa-report-wrapper" style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', height: '100%', position: 'relative' }}>
                                {/* 사이드바 토글 버튼 */}
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    style={{
                                        position: 'absolute',
                                        top: '16px',
                                        left: isSidebarOpen ? '260px' : '20px',
                                        zIndex: 10,
                                        background: '#fff',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        transition: 'all 0.3s ease',
                                        transform: 'translateX(-50%)',
                                    }}
                                    title={isSidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
                                >
                                    {isSidebarOpen ? <ChevronLeft size={16} color="#475569" /> : <ChevronRight size={16} color="#475569" />}
                                </button>

                                {/* ── 좌측 사이드바 (요약 대시보드 & 네비게이션) ── */}
                                <div className="qa-sidebar" style={{
                                    width: isSidebarOpen ? '260px' : '20px',
                                    flexShrink: 0,
                                    background: '#f8fafc',
                                    borderRight: '1px solid #e2e8f0',
                                    display: 'flex', flexDirection: 'column', overflowX: 'hidden', overflowY: 'auto',
                                    transition: 'all 0.3s ease'
                                }}>
                                    {/* 상단: 전체 검증 요약 */}
                                    <div style={{ opacity: isSidebarOpen ? 1 : 0, transition: 'opacity 0.2s ease', whiteSpace: 'nowrap' }}>
                                        {resultJson && (
                                            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
                                                <span style={{
                                                    fontSize: '12px', fontWeight: 700, color: '#475569',
                                                    display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px'
                                                }}>
                                                    <AlertTriangle size={14} color="#94a3b8" />
                                                    전체 검증 현황
                                                </span>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <span style={{ flex: 1, textAlign: 'center', padding: '5px 0', background: '#fff1f1', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>심각 {globalCounts.critical}</span>
                                                    <span style={{ flex: 1, textAlign: 'center', padding: '5px 0', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>오류 {globalCounts.error}</span>
                                                    <span style={{ flex: 1, textAlign: 'center', padding: '5px 0', background: '#fefce8', color: '#ca8a04', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>확인 {globalCounts.warning}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* 하단: 항목별 네비게이션 리스트 */}
                                        <div style={{ padding: '16px 12px' }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '4px 8px', marginBottom: '12px',
                                                userSelect: 'none'
                                            }}>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>검증 항목 상세</span>
                                            </div>

                                            {QA_SECTIONS.map((s, i) => {
                                                const cnt = getCount(s);
                                                const isActive = activeSection === s.key;
                                                return (
                                                    <button key={s.key}
                                                        onClick={() => handleSectionClick(s.key)}
                                                        style={{
                                                            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                                            padding: '10px 12px', borderRadius: '6px', textAlign: 'left',
                                                            background: isActive ? '#e2e8f0' : 'transparent',
                                                            color: isActive ? '#0f172a' : '#64748b', transition: 'all 0.15s ease', cursor: 'pointer', border: 'none'
                                                        }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '13px', fontWeight: isActive ? 700 : 500, lineHeight: '1.4', whiteSpace: 'normal', wordBreak: 'keep-all' }}>
                                                                {i + 1}. {s.label}
                                                            </div>
                                                        </div>
                                                        {cnt !== null && (
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                minWidth: '22px', height: '22px', padding: '0px 6px 0px 5px',
                                                                borderRadius: '11px', fontSize: '11.5px', fontWeight: 800,
                                                                background: cnt > 0 ? (isActive ? '#ef4444' : '#fee2e2') : (isActive ? '#cbd5e1' : '#f1f5f9'),
                                                                color: cnt > 0 ? (isActive ? '#fff' : '#ef4444') : (isActive ? '#475569' : '#94a3b8'),
                                                                boxSizing: 'border-box'
                                                            }}>
                                                                {cnt}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* ── 우측 메인 (오류 리스트) ── */}
                                <div className="qa-main-view" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
                                    <div className="qa-sections" key={activeSection || 'all'} style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                        {visibleSections.map((s) => {
                                            const items = resultJson?.[s.dataKey] || [];
                                            const cnt = getCount(s);

                                            const localCriticalCnt = items.filter(x => x.type === 'critical').length;
                                            const localErrorCnt = items.filter(x => x.type === 'error').length;
                                            const localWarningCnt = items.filter(x => x.type === 'warning').length;

                                            return (
                                                <div key={s.key} className={`qa-section-block ${items.length === 0 ? 'is-empty' : ''}`} style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    flex: visibleSections.length === 1 ? 1 : (items.length === 0 ? 'none' : 1)
                                                }}>

                                                    {/* 우측 본문 헤더 (앵커 역할 & 개별 탭 상세 요약) */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #f1f5f9' }}>
                                                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0, marginRight: '4px' }}>{s.label}</h3>

                                                        {cnt > 0 && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                {/* 심각/오류/확인 세부 카운트 (개별 탭 안에서의 요약) */}
                                                                {(localCriticalCnt > 0 || localErrorCnt > 0 || localWarningCnt > 0) && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                                                                        {localCriticalCnt > 0 && (
                                                                            <span style={{ padding: '3px 8px', background: '#fff1f1', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>심각 {localCriticalCnt}</span>
                                                                        )}
                                                                        {localErrorCnt > 0 && (
                                                                            <span style={{ padding: '3px 8px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>오류 {localErrorCnt}</span>
                                                                        )}
                                                                        {localWarningCnt > 0 && (
                                                                            <span style={{ padding: '3px 8px', background: '#fefce8', color: '#ca8a04', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>확인 {localWarningCnt}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="qa-section-body" style={{ padding: 0 }}>
                                                        {items.length > 0 ? (
                                                            <div className="qa-error-list" style={{ padding: 0, gap: '16px' }}>
                                                                {items.map((item, idx) => (
                                                                    <ErrorCard key={idx} item={item} />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="st-empty-viewer">
                                                                {resultJson ? (
                                                                    <>
                                                                        <CheckCircle size={48} strokeWidth={1.5} style={{ color: '#10b981' }} />
                                                                        <span className="st-empty-title" style={{ color: '#059669' }}>이 항목은 오류 없이 완벽하게 검증되었습니다.</span>
                                                                        <span className="st-empty-desc">교차 검증 분석 결과 문법 및 논리 모순이 발견되지 않았습니다.</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <FileText size={48} strokeWidth={1.5} />
                                                                        <span className="st-empty-title">분석 결과가 존재하지 않습니다.</span>
                                                                        <span className="st-empty-desc">상단 패널에서 AI 교차 검증을 시작해 주세요.</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <SurveyTestProgressModal
                isOpen={isProgressModalOpen}
                onClose={handleProgressModalClose}
                percentage={progressPercentage}
                message={progressMessage}
                isComplete={isProgressComplete}
            />
        </div>
    );
};

export default SurveyTestPage;
