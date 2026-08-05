
import { Sparkles, Check, ArrowRight, Search, Filter, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

const AiReportAnalysisStep = ({
    aiGuideline,
    setAiGuideline,
    pipelineStatus,
    triggerPipelineRegenerate,
    activeSubTab,
    setActiveSubTab,
    insightData,
    questions,
    l1SearchQuery,
    setL1SearchQuery,
    expandedL1Cards,
    setExpandedL1Cards
}) => {
    return (
        <div className="ai-step-content-container" style={{ gap: '20px' }}>
            {/* AI 요약 생성 지침 (한 줄로 표출) */}
            <div className="ai-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <Sparkles size={16} className="ai-spark-yellow" />
                    <span className="ai-guideline-title" style={{ whiteSpace: 'nowrap' }}>AI 요약 생성 지침</span>
                    <span className="ai-guideline-badge">L2·L3 전용</span>
                    <span className="ai-panel-help-icon" title="이 지침은 L2(카테고리별 요약) 및 L3(종합 AI 요약 보고서) 분석 단계에서 요약을 생성할 때 반영되며, L1 단계에는 적용되지 않습니다.">?</span>
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
            <div className="ai-pipeline-section">
                <h3 className="ai-section-main-title">분석 파이프라인 <span className="ai-panel-help-icon">?</span></h3>

                <div className="ai-pipeline-grid">
                    {/* Card 1 */}
                    <div className="ai-pipeline-card">
                        <div className="ai-pipe-header">
                            <div className="ai-pipe-level-badge level1">L1</div>
                            <span className="ai-pipe-title">문항별 인사이트 분석</span>
                            <span className="ai-panel-help-icon">?</span>
                        </div>
                        <div className="ai-pipe-status-row">
                            <div className="ai-pipe-done-icon">
                                <Check size={12} strokeWidth={3} />
                            </div>
                            <span className="ai-pipe-status-text">생성 완료 · {pipelineStatus.l1.countText}</span>
                        </div>
                        <div className="ai-pipe-progress-container">
                            <div className="ai-pipe-progress-bar">
                                <div className="ai-pipe-progress-fill l1" style={{ width: `${pipelineStatus.l1.progress}%` }}></div>
                            </div>
                            <span className="ai-pipe-percent-label">{pipelineStatus.l1.progress}%</span>
                        </div>
                        <button
                            className="ai-pipe-action-btn l1-btn"
                            onClick={() => triggerPipelineRegenerate('l1')}
                            disabled={pipelineStatus.l1.isGenerating}
                        >
                            {pipelineStatus.l1.isGenerating ? "분석 중..." : "문항별 인사이트 재생성"}
                        </button>
                    </div>

                    <div className="ai-pipeline-arrow">
                        <ArrowRight size={20} color="#94a3b8" />
                    </div>

                    {/* Card 2 */}
                    <div className="ai-pipeline-card">
                        <div className="ai-pipe-header">
                            <div className="ai-pipe-level-badge level2">L2</div>
                            <span className="ai-pipe-title">조사내용별 분석</span>
                            <span className="ai-panel-help-icon">?</span>
                        </div>
                        <div className="ai-pipe-status-row">
                            <div className="ai-pipe-done-icon">
                                <Check size={12} strokeWidth={3} />
                            </div>
                            <span className="ai-pipe-status-text">생성 완료 · {pipelineStatus.l2.countText}</span>
                        </div>
                        <div className="ai-pipe-progress-container" style={{ visibility: 'hidden' }}>
                            <div className="ai-pipe-progress-bar">
                                <div className="ai-pipe-progress-fill" style={{ width: '100%' }}></div>
                            </div>
                            <span>100%</span>
                        </div>
                        <button
                            className="ai-pipe-action-btn l2-btn"
                            onClick={() => triggerPipelineRegenerate('l2')}
                            disabled={pipelineStatus.l2.isGenerating}
                        >
                            {pipelineStatus.l2.isGenerating ? "분석 중..." : "조사내용별 재생성"}
                        </button>
                    </div>

                    <div className="ai-pipeline-arrow">
                        <ArrowRight size={20} color="#94a3b8" />
                    </div>

                    {/* Card 3 */}
                    <div className="ai-pipeline-card">
                        <div className="ai-pipe-header">
                            <div className="ai-pipe-level-badge level3">L3</div>
                            <span className="ai-pipe-title">종합 요약 보고서</span>
                            <span className="ai-panel-help-icon">?</span>
                        </div>
                        <div className="ai-pipe-status-row">
                            <div className="ai-pipe-done-icon green">
                                <Check size={12} strokeWidth={3} />
                            </div>
                            <span className="ai-pipe-status-text font-green">생성 완료 · {pipelineStatus.l3.countText}</span>
                        </div>
                        <div className="ai-pipe-progress-container" style={{ visibility: 'hidden' }}>
                            <div className="ai-pipe-progress-bar">
                                <div className="ai-pipe-progress-fill" style={{ width: '100%' }}></div>
                            </div>
                            <span>100%</span>
                        </div>
                        <button
                            className="ai-pipe-action-btn l3-btn"
                            onClick={() => triggerPipelineRegenerate('l3')}
                            disabled={pipelineStatus.l3.isGenerating}
                        >
                            {pipelineStatus.l3.isGenerating ? "분석 중..." : "종합 보고서 재생성"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Report list detail section */}
            <div className="ai-report-detail-card">
                {/* Tabs row */}
                <div className="ai-detail-tabs-row">
                    <div className="ai-detail-tabs">
                        <button
                            className={`ai-detail-tab ${activeSubTab === 'l1' ? 'active' : ''}`}
                            onClick={() => setActiveSubTab('l1')}
                        >
                            <div className="tab-dot blue"></div>
                            <span>L1 문항별 인사이트</span>
                        </button>
                        <button
                            className={`ai-detail-tab ${activeSubTab === 'l2' ? 'active' : ''}`}
                            onClick={() => setActiveSubTab('l2')}
                        >
                            <div className="tab-dot green"></div>
                            <span>L2 조사내용별 분석</span>
                        </button>
                        <button
                            className={`ai-detail-tab ${activeSubTab === 'l3' ? 'active' : ''}`}
                            onClick={() => setActiveSubTab('l3')}
                        >
                            <div className="tab-dot green"></div>
                            <span>L3 종합 요약 보고서</span>
                        </button>
                    </div>

                    <div className="ai-detail-actions">
                        <span className="ai-detail-status-count">요약 완료 <strong>{Object.keys(insightData.l1 || {}).length} / {questions.length} 문항</strong></span>

                        <div className="ai-detail-search-wrap">
                            <Search size={13} className="ai-detail-search-icon" />
                            <input
                                type="text"
                                className="ai-detail-search-input"
                                placeholder="문항 ID 또는 이름 검색"
                                value={l1SearchQuery}
                                onChange={(e) => setL1SearchQuery(e.target.value)}
                            />
                        </div>

                        <button className="ai-icon-btn"><Filter size={13} /></button>
                        <button className="ai-xlsx-btn">
                            <span>XLSX</span>
                        </button>
                        <button className="ai-icon-btn"><RefreshCw size={13} /></button>
                    </div>
                </div>

                {/* Report content blocks */}
                <div className="ai-report-blocks-wrap">
                    {activeSubTab === 'l1' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {Object.keys(insightData.l1 || {}).length === 0 ? (
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
                                                                {l1Val.fact_summary}
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
                                                                {l1Val.segment_insights}
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
                                                                    {l1Val.respondent_characteristics}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(!insightData.l2 || insightData.l2.length === 0) ? (
                                <div className="ai-block-empty-state">
                                    <span>조회된 L2 조사내용별 분석결과가 없습니다.</span>
                                </div>
                            ) : (
                                insightData.l2.map((catItem, idx) => (
                                    <div className="ai-block-card" key={idx}>
                                        <div className="ai-block-header">
                                            <div className="ai-block-header-left">
                                                <span className="ai-block-q-id" style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px' }}>L2 Category</span>
                                                <h4 className="ai-block-q-title">{catItem.category_name}</h4>
                                                <span className="ai-block-done-badge" style={{ background: '#ecfdf5', color: '#059669' }}>분석 완료</span>
                                            </div>
                                        </div>
                                        <div className="ai-block-body">
                                            {catItem.insights?.core_finding && (
                                                <div className="ai-insight-bullet">
                                                    <div className="ai-bullet-title-row">
                                                        <span className="ai-bullet-num-badge" style={{ background: '#10b981' }}>1</span>
                                                        <span className="ai-bullet-title-text">핵심 발견 (Core Finding)</span>
                                                    </div>
                                                    <p className="ai-bullet-body-content">
                                                        {catItem.insights.core_finding}
                                                    </p>
                                                </div>
                                            )}

                                            {catItem.insights?.hypothesis_result && (
                                                <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                    <div className="ai-bullet-title-row">
                                                        <span className="ai-bullet-num-badge" style={{ background: '#10b981' }}>2</span>
                                                        <span className="ai-bullet-title-text">가설 검증 결과 (Hypothesis Result)</span>
                                                    </div>
                                                    <p className="ai-bullet-body-content">
                                                        {catItem.insights.hypothesis_result}
                                                    </p>
                                                </div>
                                            )}

                                            {catItem.insights?.so_what && (
                                                <div className="ai-insight-bullet" style={{ marginTop: '16px' }}>
                                                    <div className="ai-bullet-title-row">
                                                        <span className="ai-bullet-num-badge" style={{ background: '#8b5cf6' }}>So What</span>
                                                        <span className="ai-bullet-title-text">전략적 시사점</span>
                                                    </div>
                                                    <div className="ai-insight-result-box" style={{ background: '#f5f3ff', borderLeftColor: '#8b5cf6', padding: '12px 16px' }}>
                                                        <p className="ai-result-text" style={{ color: '#4c1d95', margin: 0 }}>
                                                            {catItem.insights.so_what}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeSubTab === 'l3' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Executive Summary Card */}
                            <div className="ai-card" style={{ padding: '24px', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '20px' }}>📋</span>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Executive Summary (종합 의사결정 요약문)</h3>
                                </div>
                                <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {insightData.l3?.executive_summary}
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
                                                <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#1b4332', margin: 0 }}>{rec}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#1b4332', margin: 0, whiteSpace: 'pre-wrap' }}>
                                            {insightData.l3?.strategic_recommendations}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiReportAnalysisStep;
