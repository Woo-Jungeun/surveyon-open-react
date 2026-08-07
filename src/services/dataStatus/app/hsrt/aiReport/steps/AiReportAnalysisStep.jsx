
import { Check, ArrowRight, RefreshCw, ChevronUp, ChevronDown, FileSpreadsheet, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';

const renderInsightText = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
        return val.map(item => renderInsightText(item)).join('\n');
    }
    if (typeof val === 'object') {
        return val.description || val.headline || val.text || JSON.stringify(val);
    }
    return String(val);
};

const AiReportAnalysisStep = ({
    aiGuideline,
    setAiGuideline,
    pipelineStatus,
    triggerPipelineRegenerate,
    activeSubTab,
    setActiveSubTab,
    insightData,
    setInsightData,
    questions,
    l1SearchQuery,
    setL1SearchQuery,
    expandedL1Cards,
    setExpandedL1Cards,
    missingVariables = [],
    onExportL1Excel
}) => {
    const handleTextareaChange = (idx, field, value) => {
        if (!setInsightData) return;
        setInsightData(prev => {
            const newL2 = [...(prev.l2 || [])];
            if (newL2[idx]) {
                newL2[idx] = {
                    ...newL2[idx],
                    insights: {
                        ...newL2[idx].insights,
                        [field]: value
                    }
                };
            }
            return {
                ...prev,
                l2: newL2
            };
        });
    };

    const keys = Object.keys(insightData.l1 || {});
    const allExpanded = keys.length > 0 && keys.every(key => !!expandedL1Cards[key]);

    const handleToggleAll = () => {
        if (allExpanded) {
            setExpandedL1Cards({});
        } else {
            const newExpanded = {};
            keys.forEach(key => {
                newExpanded[key] = true;
            });
            setExpandedL1Cards(newExpanded);
        }
    };

    return (
        <div className="ai-step-content-container" style={{ gap: '12px', height: '100%', overflowY: 'hidden', boxSizing: 'border-box' }}>
            {/* AI 요약 생성 지침 (한 줄로 표출) */}
            <div className="ai-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span className="ai-guideline-title" style={{ whiteSpace: 'nowrap' }}>AI 요약 생성 지침</span>
                    <span className="ai-guideline-badge">L2·L3 전용</span>
                    <span className="ai-panel-help-icon" title="여기에 입력한 지침은 L2, L3 단계의 분석 프롬프트에 최우선으로 반영되어 리포트가 생성됩니다.">?</span>
                </div>
                <input
                    type="text"
                    className="ai-guideline-input"
                    value={aiGuideline}
                    onChange={(e) => setAiGuideline(e.target.value)}
                    placeholder="예: 백분율은 소수점 첫째 자리까지 표기하고, 집단 간 차이가 큰 항목을 우선 서술"
                    style={{ flex: 1, height: '32px', margin: 0 }}
                />
                <button className="ai-guideline-preset-btn" style={{ flexShrink: 0, margin: 0, height: '32px', padding: '0 12px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>선택</button>
            </div>

            {/* 분석 파이프라인 */}
            <div className="ai-pipeline-section" style={{ flexShrink: 0 }}>
                <h3 className="ai-section-main-title">
                    분석 파이프라인
                    <span className="ai-panel-help-icon" title="L1이 완료되어야 L2를 생성할 수 있고, L1, L2 결과를 기반으로 L3를 생성합니다. 선행 단계를 재생성하면 하위 단계 결과는 초기화됩니다.">?</span>
                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 'normal', marginLeft: '10px' }}>
                        (각 단계를 클릭하면 하단에 상세 결과가 표시됩니다)
                    </span>
                </h3>

                <div className="ai-pipeline-grid">
                    {/* Card 1 */}
                    <div
                        className={`ai-pipeline-card l1 ${activeSubTab === 'l1' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('l1')}
                        title="클릭하여 L1 문항별 인사이트 결과 보기"
                    >
                        <div className="ai-pipe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className="ai-pipe-level-badge level1">L1</div>
                                <span className="ai-pipe-title">문항별 인사이트 분석</span>
                                <span className="ai-panel-help-icon" title="교차표 캐시를 로드하고, 아직 요약되지 않은 문항을 일괄 생성합니다.">?</span>
                            </div>
                            <div className="ai-pipe-status-row" style={{ margin: 0 }}>
                                <div className={`ai-pipe-done-icon ${pipelineStatus.l1.isDone ? 'green' : ''}`}>
                                    <Check size={12} strokeWidth={3} />
                                </div>
                                <span className={`ai-pipe-status-text ${pipelineStatus.l1.isDone ? 'font-green' : ''}`}>
                                    {pipelineStatus.l1.isDone ? `생성 완료 · ${pipelineStatus.l1.countText}` : '분석 대기 중'}
                                </span>
                            </div>
                        </div>
                        <div className="ai-pipe-progress-container">
                            <div className="ai-pipe-progress-bar">
                                <div className="ai-pipe-progress-fill l1" style={{ width: `${pipelineStatus.l1.progress}%` }}></div>
                            </div>
                            <span className="ai-pipe-percent-label">{pipelineStatus.l1.progress}%</span>
                        </div>
                        <button
                            className="ai-pipe-action-btn l1-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerPipelineRegenerate('l1');
                            }}
                            disabled={pipelineStatus.l1.isGenerating}
                        >
                            {pipelineStatus.l1.isGenerating
                                ? "분석 중..."
                                : (missingVariables.length > 0 ? "L1 미요약 문항 일괄 생성" : "문항별 인사이트 재생성")
                            }
                        </button>
                    </div>

                    <div className="ai-pipeline-arrow-in">
                        <ArrowRight size={16} />
                    </div>

                    {/* Card 2 */}
                    <div
                        className={`ai-pipeline-card l2 ${activeSubTab === 'l2' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('l2')}
                        title="클릭하여 L2 조사내용별 분석 결과 보기"
                    >
                        <div className="ai-pipe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className="ai-pipe-level-badge level2">L2</div>
                                <span className="ai-pipe-title">조사내용별 분석</span>
                                <span className="ai-panel-help-icon" title="L1 문항 요약을 조사내용(카테고리)별로 결합해 가설 검증 핵심 사실전략 제안을 작성합니다.">?</span>
                            </div>
                            <div className="ai-pipe-status-row" style={{ margin: 0 }}>
                                <div className={`ai-pipe-done-icon ${pipelineStatus.l2.isDone ? 'green' : ''}`}>
                                    <Check size={12} strokeWidth={3} />
                                </div>
                                <span className={`ai-pipe-status-text ${pipelineStatus.l2.isDone ? 'font-green' : ''}`}>
                                    {pipelineStatus.l2.isDone ? `생성 완료 · ${pipelineStatus.l2.countText}` : '분석 대기 중'}
                                </span>
                            </div>
                        </div>
                        <div className="ai-pipe-progress-container">
                            <div className="ai-pipe-progress-bar">
                                <div className="ai-pipe-progress-fill l2" style={{ width: `${pipelineStatus.l2.progress}%` }}></div>
                            </div>
                            <span className="ai-pipe-percent-label l2">{pipelineStatus.l2.progress}%</span>
                        </div>
                        <button
                            className="ai-pipe-action-btn l2-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerPipelineRegenerate('l2');
                            }}
                            disabled={pipelineStatus.l2.isGenerating}
                        >
                            {pipelineStatus.l2.isGenerating ? "분석 중..." : "조사내용별 재생성"}
                        </button>
                    </div>

                    <div className="ai-pipeline-arrow-in">
                        <ArrowRight size={16} />
                    </div>

                    {/* Card 3 */}
                    <div
                        className={`ai-pipeline-card l3 ${activeSubTab === 'l3' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('l3')}
                        title="클릭하여 L3 종합 요약 보고서 보기"
                    >
                        <div className="ai-pipe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className="ai-pipe-level-badge level3">L3</div>
                                <span className="ai-pipe-title">종합 요약 보고서</span>
                                <span className="ai-panel-help-icon" title="L1, L2 결과를 종합해 Executive Summary와 전략적 액션 아이템을 생성합니다.">?</span>
                            </div>
                            <div className="ai-pipe-status-row" style={{ margin: 0 }}>
                                <div className={`ai-pipe-done-icon ${pipelineStatus.l3.isDone ? 'green' : ''}`}>
                                    <Check size={12} strokeWidth={3} />
                                </div>
                                <span className={`ai-pipe-status-text ${pipelineStatus.l3.isDone ? 'font-green' : ''}`}>
                                    {pipelineStatus.l3.isDone ? `생성 완료 · ${pipelineStatus.l3.countText}` : '분석 대기 중'}
                                </span>
                            </div>
                        </div>
                        <div className="ai-pipe-progress-container">
                            <div className="ai-pipe-progress-bar">
                                <div className="ai-pipe-progress-fill l3" style={{ width: `${pipelineStatus.l3.progress}%` }}></div>
                            </div>
                            <span className="ai-pipe-percent-label l3">{pipelineStatus.l3.progress}%</span>
                        </div>
                        <button
                            className="ai-pipe-action-btn l3-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerPipelineRegenerate('l3');
                            }}
                            disabled={pipelineStatus.l3.isGenerating}
                        >
                            {pipelineStatus.l3.isGenerating ? "분석 중..." : "종합 보고서 재생성"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Report list detail section */}
            <div className="ai-report-detail-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: '24px' }}>
                {/* Tabs row */}
                <div className="ai-detail-tabs-row" style={{ flexShrink: 0 }}>
                    <div className="ai-detail-actions" style={{ width: '100%', justifyContent: 'space-between' }}>
                        {activeSubTab === 'l1' ? (
                            <span className="ai-detail-status-count">요약 완료 <strong>{Object.keys(insightData.l1 || {}).length} / {questions.length} 문항</strong></span>
                        ) : activeSubTab === 'l2' ? (
                            <span className="ai-detail-status-count">조사내용 <strong>{insightData.l2?.length || 0}개</strong> 카테고리 분석 완료</span>
                        ) : (
                            <span className="ai-detail-status-count"><strong>최종 종합 보고서</strong></span>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {activeSubTab === 'l1' && (
                                <>
                                    <div className="ai-detail-search-wrap">
                                        <input
                                            type="text"
                                            className="ai-detail-search-input"
                                            placeholder="문항 ID 또는 텍스트 검색"
                                            value={l1SearchQuery}
                                            onChange={(e) => setL1SearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        className="ai-icon-btn"
                                        title="전체 펼치기/접기"
                                        onClick={handleToggleAll}
                                    >
                                        {allExpanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
                                    </button>
                                    <button className="ai-xlsx-btn" onClick={onExportL1Excel} title="엑셀 다운로드">
                                        <FileSpreadsheet size={13} />
                                        <span>엑셀 다운로드</span>
                                    </button>
                                </>
                            )}
                            {activeSubTab === 'l2' && (
                                <>
                                    <button
                                        className="ai-xlsx-btn"
                                        onClick={() => alert("준비 중인 기능입니다.")}
                                        title="엑셀 다운로드"
                                    >
                                        <FileSpreadsheet size={13} style={{ color: '#16a34a' }} />
                                        <span>XLSX</span>
                                    </button>
                                    <button
                                        className="ai-icon-btn"
                                        onClick={() => triggerPipelineRegenerate('l2')}
                                        title="조사내용별 분석 재생성"
                                    >
                                        <RefreshCw size={13} />
                                    </button>
                                </>
                            )}
                            {activeSubTab === 'l3' && (
                                <button className="ai-icon-btn"><RefreshCw size={13} /></button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Report content blocks */}
                <div className="ai-report-blocks-wrap" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '8px' }}>
                    {activeSubTab === 'l1' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(!pipelineStatus.l1.isDone || Object.keys(insightData.l1 || {}).length === 0) ? (
                                <div className="ai-block-empty-state">
                                    <span>조회된 L1 문항별 인사이트가 없습니다.</span>
                                </div>
                            ) : (
                                Object.keys(insightData.l1 || {}).map((qKey) => {
                                    const l1Val = insightData.l1[qKey];
                                    const matchingQ = questions.find(q => q.id === qKey || q.qnum === qKey);
                                    const qTitle = matchingQ ? `${matchingQ.qnum}. ${matchingQ.label}` : qKey;

                                    if (l1SearchQuery && !qKey.toLowerCase().includes(l1SearchQuery.toLowerCase()) && !qTitle.toLowerCase().includes(l1SearchQuery.toLowerCase())) {
                                        return null;
                                    }

                                    const isExpanded = !!expandedL1Cards[qKey];

                                    return (
                                        <div className="ai-block-card" key={qKey}>
                                            <div className="ai-block-header" onClick={() => {
                                                setExpandedL1Cards(prev => ({ ...prev, [qKey]: !prev[qKey] }));
                                            }}>
                                                <div className="ai-block-header-left">
                                                    <span className="ai-block-q-id">{qKey}</span>
                                                    <h4 className="ai-block-q-title">{qTitle}</h4>
                                                    <span className="ai-block-done-badge">요약 완료</span>
                                                </div>
                                                <div className="ai-block-header-right">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <div className="ai-block-body">
                                                    {l1Val.fact_summary && (
                                                        <div className="ai-insight-bullet">
                                                            <div className="ai-bullet-title-row">
                                                                <span className="ai-bullet-num-badge">1</span>
                                                                <span className="ai-bullet-title-text">정량 집계 요약</span>
                                                                <span className="ai-panel-help-icon">?</span>
                                                            </div>
                                                            <p className="ai-bullet-body-content">
                                                                {renderInsightText(l1Val.fact_summary)}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {l1Val.segment_insights && (
                                                        <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                            <div className="ai-bullet-title-row">
                                                                <span className="ai-bullet-num-badge">2</span>
                                                                <span className="ai-bullet-title-text">세그먼트 특징 요약</span>
                                                                <span className="ai-panel-help-icon">?</span>
                                                            </div>
                                                            <p className="ai-bullet-body-content">
                                                                {renderInsightText(l1Val.segment_insights)}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {l1Val.respondent_characteristics && (
                                                        <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                            <div className="ai-bullet-title-row">
                                                                <span className="ai-bullet-num-badge">{l1Val.segment_insights ? '3' : '2'}</span>
                                                                <span className="ai-bullet-title-text">응답자 특성 요약</span>
                                                                <span className="ai-panel-help-icon">?</span>
                                                            </div>
                                                            <div className="ai-insight-result-box">
                                                                <span className="ai-result-purple-chip">집단 분석 결과</span>
                                                                <p className="ai-result-text">
                                                                    {renderInsightText(l1Val.respondent_characteristics)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeSubTab === 'l2' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                            {(!pipelineStatus.l2.isDone || !insightData.l2 || insightData.l2.length === 0) ? (
                                <div className="ai-block-empty-state" style={{ gridColumn: 'span 2' }}>
                                    <span>조회된 L2 조사내용별 분석결과가 없습니다.</span>
                                </div>
                            ) : (
                                insightData.l2.map((catItem, idx) => (
                                    <div className="ai-card" key={idx} style={{ padding: '20px', border: '1px solid #cbd5e1' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{catItem.category_name}</h4>
                                            <button
                                                className="ai-card-btn-regenerate"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    background: '#f3e8ff',
                                                    color: '#7c3aed',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    padding: '4px 10px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    triggerPipelineRegenerate('l2');
                                                }}
                                            >
                                                <RefreshCw size={11} style={{ marginRight: '4px' }} />
                                                <span>재생성</span>
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div>
                                                <div className="ai-textarea-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                                    <span>가설 검증 의견</span>
                                                    <span className="ai-panel-help-icon">?</span>
                                                </div>
                                                <textarea
                                                    className="ai-card-textarea"
                                                    style={{
                                                        width: '100%',
                                                        height: '110px',
                                                        padding: '10px 12px',
                                                        fontSize: '12px',
                                                        color: '#334155',
                                                        lineHeight: '1.5',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '6px',
                                                        resize: 'vertical',
                                                        fontFamily: 'inherit',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    value={catItem.insights?.hypothesis_result || ''}
                                                    onChange={(e) => handleTextareaChange(idx, 'hypothesis_result', e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <div className="ai-textarea-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                                    <span>카테고리 핵심 사실 요약</span>
                                                    <span className="ai-panel-help-icon">?</span>
                                                </div>
                                                <textarea
                                                    className="ai-card-textarea"
                                                    style={{
                                                        width: '100%',
                                                        height: '110px',
                                                        padding: '10px 12px',
                                                        fontSize: '12px',
                                                        color: '#334155',
                                                        lineHeight: '1.5',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '6px',
                                                        resize: 'vertical',
                                                        fontFamily: 'inherit',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    value={catItem.insights?.core_finding || ''}
                                                    onChange={(e) => handleTextareaChange(idx, 'core_finding', e.target.value)}
                                                />
                                            </div>

                                            {catItem.insights?.respondent_characteristics_summary !== undefined && (
                                                <div>
                                                    <div className="ai-textarea-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                                        <span>응답자 특성 요약</span>
                                                        <span className="ai-panel-help-icon">?</span>
                                                    </div>
                                                    <textarea
                                                        className="ai-card-textarea"
                                                        style={{
                                                            width: '100%',
                                                            height: '110px',
                                                            padding: '10px 12px',
                                                            fontSize: '12px',
                                                            color: '#334155',
                                                            lineHeight: '1.5',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '6px',
                                                            resize: 'vertical',
                                                            fontFamily: 'inherit',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        value={catItem.insights?.respondent_characteristics_summary || ''}
                                                        onChange={(e) => handleTextareaChange(idx, 'respondent_characteristics_summary', e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <div className="ai-textarea-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                                                    <span>전략적 제안 (So what)</span>
                                                    <span className="ai-panel-help-icon">?</span>
                                                </div>
                                                <textarea
                                                    className="ai-card-textarea"
                                                    style={{
                                                        width: '100%',
                                                        height: '110px',
                                                        padding: '10px 12px',
                                                        fontSize: '12px',
                                                        color: '#334155',
                                                        lineHeight: '1.5',
                                                        border: '1px solid #cbd5e1',
                                                        borderRadius: '6px',
                                                        resize: 'vertical',
                                                        fontFamily: 'inherit',
                                                        boxSizing: 'border-box'
                                                    }}
                                                    value={catItem.insights?.so_what || ''}
                                                    onChange={(e) => handleTextareaChange(idx, 'so_what', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeSubTab === 'l3' && (
                        (!pipelineStatus.l3.isDone || !insightData.l3 || Object.keys(insightData.l3 || {}).length === 0) ? (
                            <div className="ai-block-empty-state">
                                <span>조회된 L3 종합 요약 보고서 결과가 없습니다.</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Executive Summary Card */}
                                <div className="ai-card" style={{ padding: '24px', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '20px' }}>📋</span>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Executive Summary (종합 의사결정 요약문)</h3>
                                    </div>
                                    <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {renderInsightText(insightData.l3?.executive_summary)}
                                    </p>
                                </div>

                                {/* Strategic Recommendations Card */}
                                <div className="ai-card" style={{ padding: '24px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #dcfce7', boxShadow: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '20px' }}>💡</span>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#14532d', margin: 0 }}>Strategic Recommendations (전략적 제안 및 실행 과제)</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {Array.isArray(insightData.l3?.strategic_recommendations) ? (
                                            insightData.l3.strategic_recommendations.map((rec, rIdx) => (
                                                <div key={rIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                                                    <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#1b4332', margin: 0 }}>{renderInsightText(rec)}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#1b4332', margin: 0, whiteSpace: 'pre-wrap' }}>
                                                {renderInsightText(insightData.l3?.strategic_recommendations)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiReportAnalysisStep;
