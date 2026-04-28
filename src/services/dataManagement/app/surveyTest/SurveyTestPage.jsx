import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { modalContext } from "@/components/common/Modal.jsx";
import { FileText, Play, X, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, SmilePlus, Bot, FileDown, Database, ChevronUp, ChevronDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import { SurveyTestPageApi } from './SurveyTestPageApi';
import SurveyTestProgressModal from './SurveyTestProgressModal';
import * as signalR from "@microsoft/signalr";
import './SurveyTestPage.css';

// ─── QA 섹션 정의 ────────────────────────────────────
const QA_SECTIONS = [
    { key: 'logic', label: '표준안 자체 논리 오류', dataKey: 'documentErrors', countKey: 'documentErrorCount' },
    { key: 'syntax', label: 'QMaster 스크립트 문법 오류', dataKey: 'scriptErrors', countKey: 'scriptErrorCount' },
    { key: 'cross', label: '교차 검증 (표준안 vs 스크립트 불일치)', dataKey: 'mismatchErrors', countKey: 'mismatchErrorCount' },
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
    const [activeTab, setActiveTab] = useState('qaReport');
    const [activeSection, setActiveSection] = useState('logic');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [resultJson, setResultJson] = useState(null);
    const [expandedSections, setExpandedSections] = useState({
        logic: true,
        syntax: true,
        cross: true
    });
    const [isNavExpanded, setIsNavExpanded] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Progress Modal States
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [progressMessage, setProgressMessage] = useState('요청을 준비하고 있습니다...');
    const [isProgressComplete, setIsProgressComplete] = useState(false);

    const fileInputRef = useRef(null);
    const tabContentRef = useRef(null);
    const auth = useSelector(store => store.auth);
    const modal = useContext(modalContext);
    const { analyzeAll } = SurveyTestPageApi();

    const handleTabChange = (tab) => { if (tab !== activeTab) setActiveTab(tab); };

    useEffect(() => {
        if (tabContentRef.current) {
            tabContentRef.current.scrollTo(0, 0);
        }
    }, [activeTab]);

    const handleDrop = useCallback((e) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setUploadedFile(file);
    }, []);
    const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback(() => setIsDragging(false), []);
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setUploadedFile(file);
        e.target.value = '';
    };
    const handleRemoveFile = () => setUploadedFile(null);
    // 탭을 다시 누르면 전체 보기 모드(null)로 돌아가는 토글 기능 부활
    const handleSectionClick = (key) => setActiveSection(prev => prev === key ? null : key);

    const toggleSection = (key) => {
        setExpandedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // ── 분석 시작 ──
    const handleAnalyze = async () => {
        if (!uploadedFile) {
            modal.showAlert('알림', '설문 표준안 파일을 먼저 업로드해 주세요.');
            return;
        }

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
                .configureLogging(signalR.LogLevel.None) // 내부 로그 불필요시 차단 (선택)
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

                // 백엔드가 (message, percent) 2개의 인자로 쏘는지, { message, percent } 1개의 객체로 쏘는지 모두 대응
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
        fd.append('Pn', pn);
        fd.append('documentFile', uploadedFile);
        fd.append('user', user);
        if (myConnectionId) {
            fd.append('ConnectionId', myConnectionId);
        }

        try {
            const res = await analyzeAll.mutateAsync(fd);

            // 응답 완료 시 100% 로깅
            setProgressPercentage(100);
            setProgressMessage('교차 검증이 완벽하게 끝났습니다!');
            setTimeout(() => setIsProgressComplete(true), 500);

            if (res?.success === '777') {
                setResultJson(res.resultjson);
                setActiveTab('qaReport');
            } else if (res?.success === '908' || res?.success === '900') {
                modal.showErrorAlert("알림", res?.message || '분석 중 오류가 발생했습니다.');
            } else {
                modal.showErrorAlert("알림", res?.message || '분석 중 오류가 발생했습니다.');
            }
        } catch (e) {
            modal.showErrorAlert("오류", '서버 통신 중 오류가 발생했습니다.');
            setIsProgressModalOpen(false);
        } finally {
            if (connection) {
                connection.stop();
            }
        }
    };

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
            <DataHeader title="설문 테스트" />

            <div className="survey-test-body">

                {/* ── 상단 컨트롤 패널 ── */}
                <div className="st-top-panel">
                    <p className="st-section-title horizontal">설문 표준안 파일 업로드</p>

                    <div className="st-top-panel-row">
                        <div className="st-field-group">
                            <input type="file" ref={fileInputRef}
                                accept=".hwp,.hwpx,.docx,.doc"
                                style={{ display: 'none' }}
                                onChange={handleFileChange} />
                            <div
                                className={`st-drop-zone horizontal ${isDragging ? 'is-dragging' : ''} ${uploadedFile ? 'is-filled' : ''}`}
                                onClick={() => !uploadedFile && fileInputRef.current?.click()}
                                onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
                                {uploadedFile ? (
                                    <div className="st-drop-filled horizontal">
                                        <CheckCircle size={20} className="st-drop-check" />
                                        <span className="st-drop-filename">{uploadedFile.name}</span>
                                        <button className="st-drop-remove horizontal"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="st-drop-empty horizontal">
                                        <FileText size={20} className="st-drop-icon" />
                                        <span className="st-drop-hint">클릭하여 파일 찾기 또는 여기로 드래그</span>
                                        <span className="st-drop-ext">.hwp · .docx</span>
                                    </div>
                                )}
                            </div>

                        </div>

                        <button className="st-btn-run horizontal" onClick={handleAnalyze}
                            disabled={analyzeAll.isLoading}>
                            <Play size={14} />
                            {analyzeAll.isLoading ? '분석 중...' : '원스텝 통합 QA 분석 시작'}
                        </button>
                    </div>
                </div>

                {/* ── 오른쪽: 탭 + 컨텐츠 ── */}
                <div className="survey-test-content">
                    <div className="tab-container">
                        <button className={`tab-btn ${activeTab === 'qaReport' ? 'active' : ''}`}
                            onClick={() => handleTabChange('qaReport')}>
                            통합 QA 리포트
                        </button>
                        <button className={`tab-btn ${activeTab === 'virtualData' ? 'active' : ''}`}
                            onClick={() => handleTabChange('virtualData')}>
                            가상 테스트 데이터
                        </button>
                    </div>

                    <div className="survey-test-tab-content" ref={tabContentRef}>
                        {activeTab === 'qaReport' ? (
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
                                            const sectionIndex = QA_SECTIONS.findIndex(x => x.key === s.key) + 1;

                                            const localCriticalCnt = items.filter(x => x.type === 'critical').length;
                                            const localErrorCnt = items.filter(x => x.type === 'error').length;
                                            const localWarningCnt = items.filter(x => x.type === 'warning').length;

                                            return (
                                                <div key={s.key} className={`qa-section-block ${items.length === 0 ? 'is-empty' : ''}`} style={{ border: 'none', background: 'transparent' }}>

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
                                                            <div className="qa-empty-state" style={{
                                                                background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px',
                                                                padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                                                            }}>
                                                                {resultJson ? (
                                                                    <>
                                                                        <CheckCircle size={32} color="#10b981" style={{ marginBottom: '16px' }} />
                                                                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#059669' }}>이 항목은 오류 없이 완벽하게 검증되었습니다.</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <SmilePlus size={32} className="qa-empty-icon" style={{ marginBottom: '16px', color: '#cbd5e1' }} />
                                                                        <p className="qa-empty-text" style={{ fontSize: '14px', color: '#64748b' }}>분석 결과가 없습니다.</p>
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
                        ) : (
                            <div className="st-virtual-data-wrapper">
                                <div className="st-vd-content">
                                    <Bot size={72} strokeWidth={1.5} className="st-vd-icon" />
                                    <h2 className="st-vd-title">가상 응답자 테스트 데이터 (Mock Data)</h2>
                                    <p className="st-vd-desc">
                                        오류가 수정된 정상적인 QMaster 로직 플로우를 기반으로 다양<br />
                                        한 응답 패턴을 지닌 100건의 가상 응답 데이터를 생성했습니다.
                                    </p>
                                    <div className="st-vd-actions">
                                        <button className="st-vd-btn csv" onClick={() => modal.showAlert('알림', '개발 예정입니다.')}>
                                            <FileDown size={18} />
                                            CSV 다운로드
                                        </button>
                                        <button className="st-vd-btn db" onClick={() => modal.showAlert('알림', '개발 예정입니다.')}>
                                            <Database size={18} />
                                            QMaster DB 즉시 주입
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <SurveyTestProgressModal
                isOpen={isProgressModalOpen}
                onClose={() => setIsProgressModalOpen(false)}
                percentage={progressPercentage}
                message={progressMessage}
                isComplete={isProgressComplete}
            />
        </div>
    );
};

export default SurveyTestPage;
