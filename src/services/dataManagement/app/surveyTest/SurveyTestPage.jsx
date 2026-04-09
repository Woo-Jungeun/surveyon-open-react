import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { modalContext } from "@/components/common/Modal.jsx";
import { FileText, Play, X, CheckCircle, ChevronLeft, ChevronRight, SmilePlus, Bot, FileDown, Database } from 'lucide-react';
import { useSelector } from 'react-redux';
import { SurveyTestPageApi } from './SurveyTestPageApi';
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
    const [activeSection, setActiveSection] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [resultJson, setResultJson] = useState(null);

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
    const handleSectionClick = (key) => setActiveSection(prev => prev === key ? null : key);

    // ── 분석 시작 ──
    const handleAnalyze = async () => {
        if (!uploadedFile) {
            modal.showAlert('알림', '설문 표준안 파일을 먼저 업로드해 주세요.');
            return;
        }

        const pn = sessionStorage.getItem('projectnum') || '';
        const user = auth?.user?.userId || '';

        const fd = new FormData();
        fd.append('pn', pn);
        fd.append('documentFile', uploadedFile);
        fd.append('user', user);

        try {
            const res = await analyzeAll.mutateAsync(fd);
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
        }
    };

    // 카운트 헬퍼
    const getCount = (section) => resultJson?.[section.countKey] ?? null;

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
                            <div className="qa-report-wrapper">

                                {/* ── 필터 버튼 ── */}
                                <div className="qa-filter-bar">
                                    <button
                                        className={`qa-filter-btn qa-filter-all ${!activeSection ? 'active' : ''}`}
                                        onClick={() => setActiveSection(null)}>
                                        <span className="qa-filter-num all-icon">합</span>
                                        전체 검증 결과
                                        {resultJson && (
                                            <span className={`qa-filter-count ${(resultJson.totalCriticalCount + resultJson.totalErrorCount) > 0 ? 'has-error' : ''}`}>
                                                {resultJson.documentErrorCount + resultJson.scriptErrorCount + resultJson.mismatchErrorCount}
                                            </span>
                                        )}
                                    </button>

                                    <div className="qa-filter-divider" />

                                    {QA_SECTIONS.map((s, i) => {
                                        const cnt = getCount(s);
                                        return (
                                            <button key={s.key}
                                                className={`qa-filter-btn ${activeSection === s.key ? 'active' : ''}`}
                                                onClick={() => handleSectionClick(s.key)}>
                                                <span className="qa-filter-num">{i + 1}</span>
                                                {s.label}
                                                {cnt !== null && (
                                                    <span className={`qa-filter-count ${cnt > 0 ? 'has-error' : ''}`}>
                                                        {cnt}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}

                                    {/* ── 상단 요약 뱃지 (우측 정렬) ── */}
                                    {resultJson && (
                                        <div className="qa-top-summary">
                                            <div className="qa-ts-box critical">
                                                <span className="qa-ts-label">심각</span>
                                                <span className="qa-ts-count">{resultJson.totalCriticalCount}</span>
                                            </div>
                                            <div className="qa-ts-box error">
                                                <span className="qa-ts-label">오류</span>
                                                <span className="qa-ts-count">{resultJson.totalErrorCount}</span>
                                            </div>
                                            <div className="qa-ts-box warning">
                                                <span className="qa-ts-label">확인</span>
                                                <span className="qa-ts-count">{resultJson.totalWarningCount}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── 섹션 목록 ── */}
                                <div className="qa-sections" key={activeSection || 'all'}>
                                    {visibleSections.map((s) => {
                                        const items = resultJson?.[s.dataKey] || [];
                                        const cnt = getCount(s);
                                        return (
                                            <div key={s.key} className={`qa-section-block ${items.length === 0 ? 'is-empty' : ''}`}>
                                                <div className="qa-section-header">
                                                    <span className="qa-section-seq">
                                                        {QA_SECTIONS.findIndex(x => x.key === s.key) + 1}.
                                                    </span>
                                                    <span className="qa-section-label">{s.label}</span>
                                                    {cnt !== null ? (
                                                        <span className={`qa-section-badge ${cnt > 0 ? 'found' : ''}`}>
                                                            {cnt}건 발견
                                                        </span>
                                                    ) : (
                                                        <span className="qa-section-badge">0건 발견</span>
                                                    )}
                                                </div>

                                                <div className="qa-section-body">
                                                    {items.length > 0 ? (
                                                        <div className="qa-error-list">
                                                            {items.map((item, idx) => (
                                                                <ErrorCard key={idx} item={item} />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="qa-empty-state">
                                                            <SmilePlus size={22} className="qa-empty-icon" />
                                                            <p className="qa-empty-text">
                                                                {resultJson ? '발견된 오류가 없습니다.' : '분석 결과가 없습니다.'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
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
        </div>
    );
};

export default SurveyTestPage;
