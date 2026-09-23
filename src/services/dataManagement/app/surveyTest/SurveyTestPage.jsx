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

    // ── 문구 비교 (Compare Wording) States ──
    const [wordingResultJson, setWordingResultJson] = useState(null);
    const [wordingTopMessage, setWordingTopMessage] = useState('');
    const [isWordingLoading, setIsWordingLoading] = useState(false);

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
            console.error("analyzeAll error:", e);
            setIsProgressModalOpen(false);
            modal.showErrorAlert("에러", e.response?.data?.message || e.message || "교차 검증 중 오류가 발생했습니다.");
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
