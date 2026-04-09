import React, { useState, useRef, useCallback } from 'react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import { FileText, Play, X, CheckCircle, ChevronLeft, ChevronRight, SmilePlus } from 'lucide-react';
import './SurveyTestPage.css';

const QA_SECTIONS = [
    { key: 'logic', label: '표준안 자체 논리 오류' },
    { key: 'syntax', label: 'QMaster 스크립트 문법 오류' },
    { key: 'cross', label: '교차 검증 (표준안 vs 스크립트 불일치)' },
];

const SurveyTestPage = () => {
    const [activeTab, setActiveTab] = useState('qaReport');
    const [panelOpen, setPanelOpen] = useState(true);
    const [activeSection, setActiveSection] = useState(null);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleTabChange = (tab) => { if (tab !== activeTab) setActiveTab(tab); };
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

    const visibleSections = activeSection
        ? QA_SECTIONS.filter(s => s.key === activeSection)
        : QA_SECTIONS;

    return (
        <div className="survey-test-page" data-theme="data-management">
            <DataHeader title="설문 테스트" />

            <div className="survey-test-body">

                {/* ── 왼쪽 컨트롤 패널 ── */}
                <aside className={`st-control-panel ${panelOpen ? 'is-open' : 'is-closed'}`}>
                    <button className="st-panel-toggle"
                        onClick={() => setPanelOpen(v => !v)}
                        title={panelOpen ? '패널 닫기' : '패널 열기'}>
                        {panelOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
                    </button>

                    <div className="st-panel-body">
                        <p className="st-section-title">설문 표준안 파일 업로드</p>

                        <div className="st-field-group">
                            <input type="file" ref={fileInputRef}
                                accept=".hwp,.hwpx,.docx,.doc"
                                style={{ display: 'none' }}
                                onChange={handleFileChange} />
                            <div
                                className={`st-drop-zone ${isDragging ? 'is-dragging' : ''} ${uploadedFile ? 'is-filled' : ''}`}
                                onClick={() => !uploadedFile && fileInputRef.current?.click()}
                                onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
                                {uploadedFile ? (
                                    <div className="st-drop-filled">
                                        <CheckCircle size={24} className="st-drop-check" />
                                        <span className="st-drop-filename">{uploadedFile.name}</span>
                                        <button className="st-drop-remove"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="st-drop-empty">
                                        <FileText size={28} className="st-drop-icon" />
                                        <span className="st-drop-hint">클릭하여 파일 찾기<br />또는 여기로 드래그</span>
                                        <span className="st-drop-ext">.hwp · .docx</span>
                                    </div>
                                )}
                            </div>
                            {/* {uploadedFile && (
                                <p className="st-file-caption">
                                    현재 파일 명: <strong>{uploadedFile.name}</strong>
                                </p>
                            )} */}
                        </div>

                        <button className="st-btn-run">
                            <Play size={14} />
                            원스텝 통합 QA 분석 시작
                        </button>
                    </div>
                </aside>

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

                    <div className="survey-test-tab-content">
                        {activeTab === 'qaReport' ? (
                            <div className="qa-report-wrapper">

                                {/* ── 필터 버튼 3개 ── */}
                                <div className="qa-filter-bar">
                                    {QA_SECTIONS.map((s, i) => (
                                        <button key={s.key}
                                            className={`qa-filter-btn ${activeSection === s.key ? 'active' : ''}`}
                                            onClick={() => handleSectionClick(s.key)}>
                                            <span className="qa-filter-num">{i + 1}</span>
                                            {s.label}
                                        </button>
                                    ))}
                                </div>

                                {/* ── 섹션 목록 ── */}
                                <div className="qa-sections">
                                    {visibleSections.map((s) => (
                                        <div key={s.key} className="qa-section-block">
                                            <div className="qa-section-header">
                                                <span className="qa-section-seq">
                                                    {QA_SECTIONS.findIndex(x => x.key === s.key) + 1}.
                                                </span>
                                                <span className="qa-section-label">{s.label}</span>
                                                <span className="qa-section-badge">0건 발견</span>
                                            </div>
                                            <div className="qa-section-body">
                                                <div className="qa-empty-state">
                                                    <SmilePlus size={26} className="qa-empty-icon" />
                                                    <p className="qa-empty-text">분석 결과가 없습니다.</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        ) : (
                            <div className="survey-test-placeholder">
                                <p>가상 테스트 데이터 영역</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SurveyTestPage;
