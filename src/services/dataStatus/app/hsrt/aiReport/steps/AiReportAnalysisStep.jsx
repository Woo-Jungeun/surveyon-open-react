
import { useState, useEffect, useMemo, useRef } from 'react';
import { Check, ArrowRight, RefreshCw, ChevronUp, ChevronDown, FileSpreadsheet, ChevronsUpDown, ChevronsDownUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, Presentation, FileText, Target, BarChart2, CheckCircle2, Users } from 'lucide-react';
import { DpRequestPageApi } from '../../dpRequest/DpRequestPageApi';
import { AiReportPageApi } from '../AiReportPageApi';

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
    questions,
    l1SearchQuery,
    setL1SearchQuery,
    expandedL1Cards,
    setExpandedL1Cards,
    missingVariables = [],
    onExportL1Excel,
    onExportL3File,
    categories,
    bannerVars,
    userId
}) => {
    const { getOverviewContext } = DpRequestPageApi();
    const { getOverviewProofStyled } = AiReportPageApi();
    // L2 state and variables
    const [activeCategoryIndex, setActiveCategoryIndex] = useState(-1);
    const activeTabRef = useRef(null);

    useEffect(() => {
        if (activeTabRef.current) {
            activeTabRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }, [activeCategoryIndex]);
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    const [evidenceCrosstabData, setEvidenceCrosstabData] = useState(null);
    const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [activeCrosstabTab, setActiveCrosstabTab] = useState('table');
    const [isPipelineExpanded, setIsPipelineExpanded] = useState(true);

    const handleEvidenceClick = async (item, evidenceKey, catIdx, sectionTitle, sectionLabel) => {
        const updatedEvidence = {
            ...item,
            evidenceKey,
            catIdx,
            sectionTitle,
            sectionLabel
        };
        setSelectedEvidence(updatedEvidence);

        const pageId = sessionStorage.getItem('pageId') || "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        const user = userId || "jewoo";

        let contextUiSettings = null;
        try {
            const contextRes = await getOverviewContext.mutateAsync({ pageid: pageId, user });
            const ctxPayload = contextRes?.resultjson || contextRes || {};
            if (ctxPayload.ui_settings && typeof ctxPayload.ui_settings === 'object') {
                contextUiSettings = ctxPayload.ui_settings;
            } else if (ctxPayload.effective_render_settings && typeof ctxPayload.effective_render_settings === 'object') {
                contextUiSettings = ctxPayload.effective_render_settings;
            }
        } catch (ctxErr) {
            console.error("Failed to load context for proof-styled:", ctxErr);
        }

        if (!contextUiSettings) {
            contextUiSettings = {
                font_family: "Pretendard",
                font_size: 13,
                format_show_n: true,
                format_show_percent: true,
                format_percent_as_column: true,
                format_n_round: 0,
                format_percent_round: 1,
                format_percent_symbol: true,
                format_base_prefix: "(",
                format_base_postfix: ")",
                sig_diff_fin_mode: "t_test",
                sig_diff_test_mode: true,
                sig_level: 95,
                theme_primary: "#2F5597",
                theme_primary_fg: "#FFFFFF",
                theme_base_bg: "#F1F5F9",
                theme_base_fg: "#0F172A",
                stub_group_layout: "merge",
                zero_display: "-",
                empty_display: ""
            };
        }

        const target = item?.evidence_target || {};
        const stubId = target.stub_id || item?.stub_id || "";
        
        let stubsList = target.stubs || item?.stubs;
        if (!stubsList) {
            stubsList = stubId ? [stubId] : [];
        } else if (typeof stubsList === 'string') {
            stubsList = stubsList.split(',').map(s => s.trim()).filter(Boolean);
        }

        const bannerName = target.banner_name || item?.banner_name || "";
        let bannerList = target.banner || item?.banner;
        if (!bannerList) {
            bannerList = bannerName ? [bannerName] : (bannerVars?.[0] ? [bannerVars[0]] : []);
        } else if (typeof bannerList === 'string') {
            bannerList = [bannerList];
        }

        const proofPayload = {
            pageid: pageId,
            user: user,
            stub_id: stubId,
            stubs: stubsList,
            banner_name: bannerName,
            banner: bannerList,
            banner_mode: "override",
            target_column: target.target_column || "",
            compare_column: target.compare_column || "",
            weight_col: target.weight_col || "",
            filter_expression: target.filter_expression || "",
            ui_settings: contextUiSettings,
            include_stats: ["t-test"],
            include_tests: ["t-test"]
        };

        try {
            await getOverviewProofStyled.mutateAsync(proofPayload);
        } catch (err) {
            console.error("Failed to call /datasets/overview/proof-styled API:", err);
        }
    };

    const l2Categories = insightData.l2 || [];

    const allEvidenceItems = useMemo(() => {
        const items = [];
        l2Categories.forEach((catItem, catIdx) => {
            const insights = catItem?.insights || {};
            // 1. Core Findings
            if (Array.isArray(insights.core_finding)) {
                insights.core_finding.forEach((item, idx) => {
                    items.push({
                        ...item,
                        catIdx,
                        evidenceKey: 'core_' + catIdx + '_' + idx,
                        sectionTitle: '핵심 정량 분석',
                        sectionLabel: '핵심 분석 근거'
                    });
                });
            }
            // 2. Action Plan (so_what)
            if (Array.isArray(insights.so_what)) {
                insights.so_what.forEach((item, idx) => {
                    items.push({
                        ...item,
                        catIdx,
                        evidenceKey: 'sowhat_' + catIdx + '_' + idx,
                        sectionTitle: '전략적 시사점 & 액션 플랜',
                        sectionLabel: '전략 과제 근거'
                    });
                });
            }
            // 3. Demographic Profile (respondent_characteristics_summary)
            if (Array.isArray(insights.respondent_characteristics_summary)) {
                insights.respondent_characteristics_summary.forEach((item, idx) => {
                    items.push({
                        ...item,
                        catIdx,
                        evidenceKey: 'profile_' + catIdx + '_' + idx,
                        sectionTitle: '타겟 세그먼트 프로필',
                        sectionLabel: '세그먼트 특징 근거'
                    });
                });
            }
        });
        return items;
    }, [l2Categories]);

    useEffect(() => {
        setSelectedEvidence(null);
    }, [activeCategoryIndex]);



    // eslint-disable-next-line no-unused-vars
    const renderCrosstabTable = () => {
        if (isEvidenceLoading) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px', color: '#64748b', fontSize: '13px' }}>
                    <RefreshCw className="animate-spin" size={18} style={{ marginRight: '6px' }} />
                    <span>데이터를 불러오는 중입니다...</span>
                </div>
            );
        }

        let colHeaders = [];
        let rowsData = [];

        const targetGroup = selectedEvidence?.evidence_target?.target_column || '';
        const compareGroup = selectedEvidence?.evidence_target?.compare_column || '';

        if (evidenceCrosstabData && evidenceCrosstabData.columns && evidenceCrosstabData.rows) {
            const columns = evidenceCrosstabData.columns;
            const rows = evidenceCrosstabData.rows;

            let overallIndex = columns.findIndex(c => {
                const label = typeof c === 'object' ? c.label || c.name : String(c);
                return label === '전체' || label === 'Total' || label === '합계';
            });
            if (overallIndex === -1) overallIndex = 0;

            let targetIndex = columns.findIndex(c => {
                const label = typeof c === 'object' ? c.label || c.name : String(c);
                return label.toLowerCase().includes(targetGroup.toLowerCase());
            });
            let compareIndex = columns.findIndex(c => {
                const label = typeof c === 'object' ? c.label || c.name : String(c);
                return label.toLowerCase().includes(compareGroup.toLowerCase());
            });

            if (targetIndex === -1) targetIndex = columns.length > 1 ? 1 : 0;
            if (compareIndex === -1) compareIndex = columns.length > 2 ? 2 : 0;

            colHeaders = [
                { label: '구분', index: -1 },
                { label: '전체', index: overallIndex },
                { label: '★ ' + (targetGroup || (typeof columns[targetIndex] === 'object' ? columns[targetIndex].label : columns[targetIndex])), index: targetIndex }
            ];
            if (compareIndex !== targetIndex && compareIndex !== overallIndex && compareGroup) {
                colHeaders.push({
                    label: compareGroup || (typeof columns[compareIndex] === 'object' ? columns[compareIndex].label : columns[compareIndex]),
                    index: compareIndex
                });
            }

            rowsData = rows.map(r => {
                return {
                    label: r.label,
                    values: colHeaders.slice(1).map(col => {
                        const valObj = r.values[col.index];
                        return valObj ? parseFloat(valObj.percent || 0).toFixed(1) + '%' : '-';
                    })
                };
            });
        } else {
            const targetVal = parseFloat(selectedEvidence?.evidence_target?.target_val || 74.2);
            const compareVal = parseFloat(selectedEvidence?.evidence_target?.compare_val || 32.1);

            colHeaders = [
                { label: '구분', index: -1 },
                { label: '전체', index: 0 },
                { label: '★ ' + (targetGroup || '타겟 집단'), index: 1 }
            ];
            if (compareGroup) {
                colHeaders.push({ label: compareGroup, index: 2 });
            }

            rowsData = [
                { label: '매우 만족', values: ['15.0%', (targetVal * 0.28).toFixed(1) + '%', (compareVal * 0.31).toFixed(1) + '%'] },
                { label: '만족', values: ['39.0%', (targetVal * 0.72).toFixed(1) + '%', (compareVal * 0.69).toFixed(1) + '%'] },
                { label: '보통', values: ['35.0%', (100 - targetVal - 6).toFixed(1) + '%', (100 - compareVal - 18).toFixed(1) + '%'] },
                { label: '불만족', values: ['7.0%', '4.0%', '12.0%'] },
                { label: '매우 만족스럽지 않음', values: ['4.0%', '2.0%', '6.0%'] },
                { label: 'Top2 (긍정)', values: ['54.0%', targetVal.toFixed(1) + '%', compareVal.toFixed(1) + '%'] },
                { label: 'Bot2 (부정)', values: ['11.0%', '6.0%', '18.0%'] }
            ];
        }

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                            {colHeaders.map((col, idx) => (
                                <th key={idx} style={{ padding: '8px 12px', fontWeight: 700, color: '#475569', textAlign: idx === 0 ? 'left' : 'center', borderRight: '1px solid #cbd5e1' }}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rowsData.map((row, rIdx) => {
                            const isTopOrBot = row.label.includes('Top') || row.label.includes('Bot');
                            return (
                                <tr key={rIdx} style={{
                                    borderBottom: '1px solid #e2e8f0',
                                    background: isTopOrBot ? '#f8fafc' : '#ffffff',
                                    fontWeight: isTopOrBot ? 700 : 'normal',
                                    color: isTopOrBot ? '#1e293b' : '#334155'
                                }}>
                                    <td style={{ padding: '8px 12px', textAlign: 'left', color: '#475569', borderRight: '1px solid #cbd5e1' }}>
                                        {row.label}
                                    </td>
                                    {row.values.map((val, vIdx) => (
                                        <td key={vIdx} style={{
                                            padding: '8px 12px',
                                            color: vIdx === 1 ? '#2563eb' : (isTopOrBot ? '#1e293b' : '#334155'),
                                            background: vIdx === 1 ? '#eff6ff' : 'transparent',
                                            fontWeight: vIdx === 1 ? 700 : (isTopOrBot ? 700 : 'normal'),
                                            borderRight: '1px solid #cbd5e1'
                                        }}>
                                            {val}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // eslint-disable-next-line no-unused-vars
    const renderCrosstabChart = () => {
        if (isEvidenceLoading) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px', color: '#64748b', fontSize: '13px' }}>
                    <RefreshCw className="animate-spin" size={18} style={{ marginRight: '6px' }} />
                    <span>데이터를 불러오는 중입니다...</span>
                </div>
            );
        }

        let chartItems = [];

        const targetGroup = selectedEvidence?.evidence_target?.target_column || '';
        const compareGroup = selectedEvidence?.evidence_target?.compare_column || '';

        if (evidenceCrosstabData && evidenceCrosstabData.columns && evidenceCrosstabData.rows) {
            const columns = evidenceCrosstabData.columns;
            const rows = evidenceCrosstabData.rows;

            let overallIndex = columns.findIndex(c => {
                const label = typeof c === 'object' ? c.label || c.name : String(c);
                return label === '전체' || label === 'Total' || label === '합계';
            });
            if (overallIndex === -1) overallIndex = 0;

            let targetIndex = columns.findIndex(c => {
                const label = typeof c === 'object' ? c.label || c.name : String(c);
                return label.toLowerCase().includes(targetGroup.toLowerCase());
            });
            let compareIndex = columns.findIndex(c => {
                const label = typeof c === 'object' ? c.label || c.name : String(c);
                return label.toLowerCase().includes(compareGroup.toLowerCase());
            });

            if (targetIndex === -1) targetIndex = columns.length > 1 ? 1 : 0;
            if (compareIndex === -1) compareIndex = columns.length > 2 ? 2 : 0;

            let displayRow = rows.find(r => r.label.includes('Top2') || r.label.includes('긍정') || r.label.includes('만족'));
            if (!displayRow) displayRow = rows[0];

            if (displayRow) {
                chartItems.push({
                    label: '전체',
                    value: parseFloat(displayRow.values[overallIndex]?.percent || 0),
                    color: '#64748b'
                });
                chartItems.push({
                    label: '★ ' + targetGroup,
                    value: parseFloat(displayRow.values[targetIndex]?.percent || 0),
                    color: '#2563eb'
                });
                if (compareIndex !== targetIndex && compareIndex !== overallIndex && compareGroup) {
                    chartItems.push({
                        label: compareGroup,
                        value: parseFloat(displayRow.values[compareIndex]?.percent || 0),
                        color: '#a855f7'
                    });
                }
            }
        } else {
            const targetVal = parseFloat(selectedEvidence?.evidence_target?.target_val || 74.2);
            const compareVal = parseFloat(selectedEvidence?.evidence_target?.compare_val || 32.1);

            chartItems = [
                { label: '전체', value: 54.0, color: '#64748b' },
                { label: '★ ' + (targetGroup || '타겟 집단'), value: targetVal, color: '#2563eb' }
            ];
            if (compareGroup) {
                chartItems.push({ label: compareGroup, value: compareVal, color: '#a855f7' });
            }
        }

        const metricLabel = selectedEvidence?.metric_label || 'Top2 (긍정) 비율';

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>지표: {metricLabel}</div>
                {chartItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '120px', fontSize: '12px', fontWeight: 600, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>
                            {item.label}
                        </div>
                        <div style={{ flex: 1, height: '16px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                                width: item.value + '%',
                                height: '100%',
                                background: item.color,
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        <div style={{ width: '50px', fontSize: '12px', fontWeight: 700, color: item.color, textAlign: 'right' }}>
                            {item.value.toFixed(1)}%
                        </div>
                    </div>
                ))}
            </div>
        );
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

    const renderBulletText = (textVal) => {
        if (!textVal) return null;
        const str = typeof textVal === 'string' ? textVal : '';
        if (!str) return null;

        const lines = str.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '2px 0' }}>
                {lines.map((line, lIdx) => {
                    const cleaned = line.replace(/^[-*•\s]+/, '').trim();
                    return (
                        <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <span style={{ color: '#2563eb', fontSize: '11px', marginTop: '3px', flexShrink: 0 }}>•</span>
                            <span style={{ fontSize: '12px', color: '#334155', lineHeight: '1.5', flex: 1, wordBreak: 'keep-all' }}>
                                {cleaned}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderStubChips = (stubs, item, evidenceKey, catIdx, sectionTitle, sectionLabel) => {
        if (!stubs) return null;
        const stubList = typeof stubs === 'string'
            ? stubs.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
            : Array.isArray(stubs) ? stubs.map(s => String(s).trim().toUpperCase()).filter(Boolean) : [];

        if (stubList.length === 0) return null;

        return (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                {stubList.map((stub, sIdx) => {
                    const stubLower = stub.toLowerCase();
                    const isSelected = selectedEvidence?.evidenceKey === evidenceKey && selectedEvidence?.evidence_target?.stub_id?.toLowerCase() === stubLower;
                    return (
                        <button
                            key={sIdx}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEvidenceClick(
                                    {
                                        ...item,
                                        evidence_target: {
                                            ...item?.evidence_target,
                                            stub_id: stubLower
                                        }
                                    },
                                    evidenceKey,
                                    catIdx,
                                    sectionTitle,
                                    sectionLabel
                                );
                            }}
                            style={{
                                background: isSelected ? '#4f46e5' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#475569',
                                border: isSelected ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                                borderRadius: '4px',
                                padding: '1px 6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title={`클릭하여 ${stub} 문항 분석 보기`}
                        >
                            {stub}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="ai-step-content-container" style={{ gap: '8px', height: '100%', overflowY: 'hidden', boxSizing: 'border-box' }}>
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
                    placeholder="AI요약 생성 지침을 작성하세요."
                    style={{ flex: 1, height: '32px', margin: 0 }}
                />
            </div>

            {/* 분석 파이프라인 */}
            <div className="ai-pipeline-section" style={{ flexShrink: 0, margin: 0, paddingBottom: 0 }}>
                {isPipelineExpanded ? (
                    <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                        padding: '16px'
                    }}>
                        {/* Header inside the white card */}
                        <div
                            onClick={() => setIsPipelineExpanded(false)}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '14px',
                                cursor: 'pointer',
                                userSelect: 'none'
                            }}
                            title="클릭하여 파이프라인 접기"
                        >
                            <h3 className="ai-section-main-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                분석 파이프라인
                                <span
                                    className="ai-panel-help-icon"
                                    title="L1이 완료되어야 L2를 생성할 수 있고, L1, L2 결과를 기반으로 L3를 생성합니다. 선행 단계를 재생성하면 하위 단계 결과는 초기화됩니다."
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    ?
                                </span>
                                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 'normal', marginLeft: '10px' }}>
                                    (각 단계를 클릭하면 하단에 상세 결과가 표시됩니다)
                                </span>
                            </h3>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPipelineExpanded(false);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#2563eb',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px',
                                    borderRadius: '4px'
                                }}
                                title="접기"
                            >
                                <ChevronUp size={15} />
                            </button>
                        </div>

                        {/* Grid columns */}
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
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
                                    title="재생성 시 하위 단계(L2-L3) 결과가 초기화됩니다."
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
                                    title="재생성 시 하위 단계(L3) 결과가 초기화됩니다."
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
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            height: '54px',
                            boxSizing: 'border-box',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
                        }}
                        onClick={() => setIsPipelineExpanded(true)}
                        title="클릭하여 파이프라인 상세 보기"
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>분석 파이프라인</span>
                            <span style={{ height: '12px', width: '1px', backgroundColor: '#cbd5e1' }} />
                            <div style={{ fontSize: '11.5px', display: 'flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                {/* L1 button */}
                                <button
                                    onClick={() => setActiveSubTab('l1')}
                                    style={{
                                        background: activeSubTab === 'l1' ? '#eff6ff' : '#ffffff',
                                        color: activeSubTab === 'l1' ? '#2563eb' : '#475569',
                                        border: activeSubTab === 'l1' ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        padding: '3px 12px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                        outline: 'none'
                                    }}
                                >
                                    <span style={{
                                        display: 'inline-block',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: pipelineStatus.l1.isDone ? '#10b981' : '#94a3b8'
                                    }} />
                                    <span>L1 문항별 보기</span>
                                </button>

                                <span style={{ color: '#cbd5e1' }}>➔</span>

                                {/* L2 button */}
                                <button
                                    onClick={() => setActiveSubTab('l2')}
                                    style={{
                                        background: activeSubTab === 'l2' ? '#f5f3ff' : '#ffffff',
                                        color: activeSubTab === 'l2' ? '#7c3aed' : '#475569',
                                        border: activeSubTab === 'l2' ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        padding: '3px 12px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                        outline: 'none'
                                    }}
                                >
                                    <span style={{
                                        display: 'inline-block',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: pipelineStatus.l2.isDone ? '#10b981' : '#94a3b8'
                                    }} />
                                    <span>L2 조사내용별 보기</span>
                                </button>

                                <span style={{ color: '#cbd5e1' }}>➔</span>

                                {/* L3 button */}
                                <button
                                    onClick={() => setActiveSubTab('l3')}
                                    style={{
                                        background: activeSubTab === 'l3' ? '#ecfdf5' : '#ffffff',
                                        color: activeSubTab === 'l3' ? '#0d9488' : '#475569',
                                        border: activeSubTab === 'l3' ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                                        borderRadius: '16px',
                                        padding: '3px 12px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                        outline: 'none'
                                    }}
                                >
                                    <span style={{
                                        display: 'inline-block',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: pipelineStatus.l3.isDone ? '#10b981' : '#94a3b8'
                                    }} />
                                    <span>L3 종합보고서 보기</span>
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPipelineExpanded(true);
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px',
                                borderRadius: '4px'
                            }}
                            title="펼치기"
                        >
                            <ChevronDown size={15} />
                        </button>
                    </div>
                )}
            </div>
            {/* Report list detail section */}
            <div className="ai-report-detail-card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingBottom: '24px' }}>
                {/* Tabs row */}
                {activeSubTab !== 'l2' && (
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
                                        <button className="ai-xlsx-btn" onClick={onExportL1Excel} title="Excel">
                                            <FileSpreadsheet size={13} />
                                            <span>Excel</span>
                                        </button>
                                    </>
                                )}
                                {activeSubTab === 'l3' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            className="ai-xlsx-btn"
                                            onClick={() => onExportL3File('xlsx')}
                                            title="Excel"
                                        >
                                            <FileSpreadsheet size={13} />
                                            <span>Excel</span>
                                        </button>
                                        <button
                                            className="ai-ppt-btn"
                                            onClick={() => onExportL3File('pptx')}
                                            title="PPT"
                                        >
                                            <Presentation size={13} />
                                            <span>PPT</span>
                                        </button>
                                        <button
                                            className="ai-docx-btn"
                                            onClick={() => onExportL3File('docx')}
                                            title="DOCX"
                                        >
                                            <FileText size={13} />
                                            <span>DOCX</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* L2 Category Navigation Sub-Tabs Bar */}
                            {l2Categories.length === 0 ? (
                                <div className="ai-block-empty-state">
                                    <span>조회된 L2 조사내용별 분석결과가 없습니다.</span>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="ai-l2-tabs-bar"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            background: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            color: '#0f172a',
                                            flexShrink: 0,
                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                        }}
                                    >
                                        {/* Left Controls (Page Indicator, <<, <) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
                                                {activeCategoryIndex === -1 ? '전체' : (activeCategoryIndex + 1) + ' / ' + l2Categories.length}
                                            </span>
                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                <button
                                                    style={{ background: 'transparent', border: 'none', color: activeCategoryIndex === -1 ? '#cbd5e1' : '#2563eb', cursor: activeCategoryIndex === -1 ? 'default' : 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                    disabled={activeCategoryIndex === -1}
                                                    onClick={() => setActiveCategoryIndex(-1)}
                                                    title="처음으로"
                                                >
                                                    <ChevronsLeft size={16} />
                                                </button>
                                                <button
                                                    style={{ background: 'transparent', border: 'none', color: activeCategoryIndex === -1 ? '#cbd5e1' : '#2563eb', cursor: activeCategoryIndex === -1 ? 'default' : 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                    disabled={activeCategoryIndex === -1}
                                                    onClick={() => setActiveCategoryIndex(prev => prev === 0 ? -1 : prev - 1)}
                                                    title="이전"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ height: '16px', width: '1px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />

                                        {/* Horizontal Category Tabs (Middle) */}
                                        <div
                                            className="ai-l2-tabs-scroll"
                                            style={{
                                                display: 'flex',
                                                gap: '8px',
                                                overflowX: 'auto',
                                                flex: 1,
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none'
                                            }}
                                        >
                                            {/* 전체보기 Tab */}
                                            <button
                                                ref={activeCategoryIndex === -1 ? activeTabRef : null}
                                                onClick={() => setActiveCategoryIndex(-1)}
                                                style={{
                                                    background: activeCategoryIndex === -1 ? '#2563eb' : '#f1f5f9',
                                                    color: activeCategoryIndex === -1 ? '#ffffff' : '#475569',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '6px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: activeCategoryIndex === -1 ? 700 : 500,
                                                    whiteSpace: 'nowrap',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                전체보기
                                            </button>

                                            {l2Categories.map((cat, idx) => {
                                                const isActive = idx === activeCategoryIndex;
                                                return (
                                                    <button
                                                        key={idx}
                                                        ref={isActive ? activeTabRef : null}
                                                        onClick={() => setActiveCategoryIndex(idx)}
                                                        style={{
                                                            background: isActive ? '#2563eb' : '#f1f5f9',
                                                            color: isActive ? '#ffffff' : '#475569',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            padding: '6px 12px',
                                                            fontSize: '12px',
                                                            fontWeight: isActive ? 700 : 500,
                                                            whiteSpace: 'nowrap',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        {cat.category_name}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div style={{ height: '16px', width: '1px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />

                                        {/* Right Controls (>, >>) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                            <button
                                                style={{ background: 'transparent', border: 'none', color: activeCategoryIndex === l2Categories.length - 1 ? '#cbd5e1' : '#2563eb', cursor: activeCategoryIndex === l2Categories.length - 1 ? 'default' : 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                disabled={activeCategoryIndex === l2Categories.length - 1}
                                                onClick={() => setActiveCategoryIndex(prev => prev === -1 ? 0 : prev + 1)}
                                                title="다음"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                            <button
                                                style={{ background: 'transparent', border: 'none', color: activeCategoryIndex === l2Categories.length - 1 ? '#cbd5e1' : '#2563eb', cursor: activeCategoryIndex === l2Categories.length - 1 ? 'default' : 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                disabled={activeCategoryIndex === l2Categories.length - 1}
                                                onClick={() => setActiveCategoryIndex(l2Categories.length - 1)}
                                                title="끝으로"
                                            >
                                                <ChevronsRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* L2 Category Main Contents - 2 Columns grid or stacked list */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '24px',
                                            flex: 1,
                                            minHeight: 0,
                                            overflowY: 'auto',
                                            paddingRight: '4px'
                                        }}
                                    >
                                        {activeCategoryIndex === -1 ? (
                                            /* 전체보기 탭일 때는 3열 격자 요약 카드로 렌더링 */
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingBottom: '20px' }}>
                                                {l2Categories.map((catItem, idx) => {
                                                    const insights = catItem?.insights || {};
                                                    const hypothesisResult = insights.hypothesis_result || {};

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="ai-card"
                                                            onClick={() => setActiveCategoryIndex(idx)}
                                                            style={{
                                                                padding: '20px',
                                                                border: '1px solid #e2e8f0',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '12px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                height: '100%',
                                                                boxSizing: 'border-box'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.borderColor = '#2563eb';
                                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.08)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                        >
                                                            {/* Top Row: SLIDE Badge & Status Badge */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{
                                                                    backgroundColor: '#eff6ff',
                                                                    color: '#2563eb',
                                                                    border: '1px solid #bfdbfe',
                                                                    fontSize: '10px',
                                                                    fontWeight: 700,
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    SLIDE {idx + 1}
                                                                </span>
                                                                {(() => {
                                                                    let status = 'NO_DATA';
                                                                    if (typeof hypothesisResult === 'string') {
                                                                        if (
                                                                            hypothesisResult.includes('부분 채택') ||
                                                                            hypothesisResult.includes('부분 기각') ||
                                                                            hypothesisResult.includes('[부분 채택]') ||
                                                                            hypothesisResult.includes('[부분 기각]')
                                                                        ) {
                                                                            status = 'PARTIALLY_ACCEPTED';
                                                                        } else if (
                                                                            hypothesisResult.includes('가설 채택') ||
                                                                            hypothesisResult.includes('가설 지지') ||
                                                                            hypothesisResult.includes('가설 수용') ||
                                                                            hypothesisResult.includes('[채택]') ||
                                                                            hypothesisResult.includes('[가설 지지]') ||
                                                                            hypothesisResult.includes('[가설 수용]')
                                                                        ) {
                                                                            status = 'ACCEPTED';
                                                                        } else if (
                                                                            hypothesisResult.includes('가설 기각') ||
                                                                            hypothesisResult.includes('[기각]') ||
                                                                            hypothesisResult.includes('[가설 기각]')
                                                                        ) {
                                                                            status = 'REJECTED';
                                                                        }
                                                                    } else {
                                                                        status = hypothesisResult?.status || 'NO_DATA';
                                                                    }
                                                                    let label = '데이터 미비';
                                                                    let bg = '#f9fafb';
                                                                    let color = '#4b5563';
                                                                    let border = '1px solid #e5e7eb';

                                                                    if (status === 'ACCEPTED') {
                                                                        label = '채택';
                                                                        bg = '#f0fdf4';
                                                                        color = '#16a34a';
                                                                        border = '1px solid #bbf7d0';
                                                                    } else if (status === 'REJECTED') {
                                                                        label = '기각';
                                                                        bg = '#fef2f2';
                                                                        color = '#dc2626';
                                                                        border = '1px solid #fecaca';
                                                                    } else if (status === 'PARTIALLY_ACCEPTED') {
                                                                        label = '부분 채택';
                                                                        bg = '#fffbeb';
                                                                        color = '#d97706';
                                                                        border = '1px solid #fde68a';
                                                                    }

                                                                    return (
                                                                        <span style={{
                                                                            fontSize: '11px',
                                                                            fontWeight: 700,
                                                                            backgroundColor: bg,
                                                                            color: color,
                                                                            border: border,
                                                                            padding: '2px 8px',
                                                                            borderRadius: '4px'
                                                                        }}>
                                                                            {label}
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* Title: Category Name */}
                                                            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', margin: '4px 0 0 0' }}>
                                                                {catItem.category_name}
                                                            </h4>

                                                            {/* Subtitle/Text: Hypothesis Result Headline */}
                                                            <p style={{
                                                                fontSize: '11.5px',
                                                                color: '#64748b',
                                                                lineHeight: '1.5',
                                                                margin: 0,
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 3,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                flex: 1
                                                            }}>
                                                                {(() => {
                                                                    let text = '';
                                                                    if (typeof hypothesisResult === 'string') {
                                                                        text = hypothesisResult;
                                                                    } else if (hypothesisResult) {
                                                                        if (hypothesisResult.headline) {
                                                                            text = hypothesisResult.headline;
                                                                        } else if (Array.isArray(hypothesisResult.details)) {
                                                                            text = hypothesisResult.details.filter(Boolean).join(' ');
                                                                        } else if (typeof hypothesisResult.details === 'string') {
                                                                            text = hypothesisResult.details;
                                                                        }
                                                                    }
                                                                    if (!text || text.trim() === '') {
                                                                        return '가설 요약이 없습니다.';
                                                                    }
                                                                    return text.length > 120 ? text.substring(0, 120).trim() + '...' : text;
                                                                })()}
                                                            </p>

                                                            {/* Bottom Row: First KPI Impact or fallback spacer */}
                                                            {(() => {
                                                                const firstKpi = Array.isArray(hypothesisResult?.kpi_impacts) && hypothesisResult.kpi_impacts[0];
                                                                if (!firstKpi) return <div style={{ height: '24px' }} />;
                                                                const isUp = firstKpi.trend === 'UP';
                                                                const isDown = firstKpi.trend === 'DOWN';
                                                                return (
                                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '4px' }}>
                                                                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                                                                            {firstKpi.value}{firstKpi.unit || '%'}
                                                                        </span>
                                                                        {isUp && <span style={{ color: '#059669', fontWeight: 800, fontSize: '12px' }}>↑</span>}
                                                                        {isDown && <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '12px' }}>↓</span>}
                                                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                                                            {firstKpi.label}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            l2Categories.map((catItem, idx) => {
                                                if (idx !== activeCategoryIndex) return null;
                                            const insights = catItem?.insights || {};
                                            const hypothesisResult = insights.hypothesis_result || {};
                                            const coreFindingsList = insights.core_finding || [];
                                            const soWhatList = insights.so_what || [];
                                            const profileList = insights.respondent_characteristics_summary || [];

                                            return (
                                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {/* Category Section Title (Only in 전체보기 mode) */}
                                                    {activeCategoryIndex === -1 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0', marginTop: idx > 0 ? '28px' : '0' }}>
                                                            <span style={{ color: '#2563eb', fontSize: '11px', fontWeight: 800, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '2px 8px', lineHeight: '1.2' }}>
                                                                카테고리 {idx + 1}
                                                            </span>
                                                            <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                                                {catItem.category_name}
                                                            </h3>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                                                        {/* Left Column wrapper using display: contents to participate in parent grid */}
                                                        <div style={{ display: 'contents' }}>
                                                            {/* 가설 검증 결론 Card (order: 1) */}
                                                            <div className="ai-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px', order: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgb(241, 245, 249)', paddingBottom: '12px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <CheckCircle2 size={16} color="#2563eb" />
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                                                                가설 검증 결론
                                                                            </h4>
                                                                            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Hypothesis Conclusion</span>
                                                                        </div>
                                                                    </div>
                                                                    {(() => {
                                                                        let status = 'NO_DATA';
                                                                        if (typeof hypothesisResult === 'string') {
                                                                            if (
                                                                                hypothesisResult.includes('부분 채택') ||
                                                                                hypothesisResult.includes('부분 기각') ||
                                                                                hypothesisResult.includes('[부분 채택]') ||
                                                                                hypothesisResult.includes('[부분 기각]')
                                                                            ) {
                                                                                status = 'PARTIALLY_ACCEPTED';
                                                                            } else if (
                                                                                hypothesisResult.includes('가설 채택') ||
                                                                                hypothesisResult.includes('가설 지지') ||
                                                                                hypothesisResult.includes('가설 수용') ||
                                                                                hypothesisResult.includes('[채택]') ||
                                                                                hypothesisResult.includes('[가설 지지]') ||
                                                                                hypothesisResult.includes('[가설 수용]')
                                                                            ) {
                                                                                status = 'ACCEPTED';
                                                                            } else if (
                                                                                hypothesisResult.includes('가설 기각') ||
                                                                                hypothesisResult.includes('[기각]') ||
                                                                                hypothesisResult.includes('[가설 기각]')
                                                                            ) {
                                                                                status = 'REJECTED';
                                                                            }
                                                                        } else {
                                                                            status = hypothesisResult?.status || 'NO_DATA';
                                                                        }
                                                                        let label = '데이터 미비';
                                                                        let bg = '#f9fafb';
                                                                        let color = '#4b5563';
                                                                        let border = '1px solid #e5e7eb';

                                                                        if (status === 'ACCEPTED') {
                                                                            label = '채택';
                                                                            bg = '#f0fdf4';
                                                                            color = '#16a34a';
                                                                            border = '1px solid #bbf7d0';
                                                                        } else if (status === 'REJECTED') {
                                                                            label = '기각';
                                                                            bg = '#fef2f2';
                                                                            color = '#dc2626';
                                                                            border = '1px solid #fecaca';
                                                                        } else if (status === 'PARTIALLY_ACCEPTED') {
                                                                            label = '부분 채택';
                                                                            bg = '#fffbeb';
                                                                            color = '#d97706';
                                                                            border = '1px solid #fde68a';
                                                                        }

                                                                        return (
                                                                            <span style={{
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                backgroundColor: bg,
                                                                                color: color,
                                                                                border: border,
                                                                                padding: '2px 8px',
                                                                                borderRadius: '4px'
                                                                            }}>
                                                                                {label}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>

                                                                {/* 사전 가설 Box */}
                                                                {(() => {
                                                                    const matchedCat = categories?.find(c => c.title === catItem?.category_name);
                                                                    const hypothesisText = matchedCat?.desc;
                                                                    if (!hypothesisText || hypothesisText.trim() === '' || hypothesisText === '가설 검증 및 문항 분석') return null;
                                                                    return (
                                                                        <div
                                                                            style={{
                                                                                background: '#eff6ff',
                                                                                border: '1px solid #dbeafe',
                                                                                borderRadius: '6px',
                                                                                padding: '10px 12px',
                                                                                display: 'flex',
                                                                                alignItems: 'flex-start',
                                                                                gap: '8px'
                                                                            }}
                                                                        >
                                                                            <span style={{
                                                                                background: '#ffffff',
                                                                                color: '#2563eb',
                                                                                border: '1px solid #bfdbfe',
                                                                                borderRadius: '4px',
                                                                                padding: '1px 6px',
                                                                                fontSize: '10px',
                                                                                fontWeight: 700,
                                                                                whiteSpace: 'nowrap'
                                                                            }}>
                                                                                사전 가설
                                                                            </span>
                                                                            <span style={{ fontSize: '11.5px', color: '#1e3a8a', lineHeight: '1.4' }}>
                                                                                &quot;{hypothesisText}&quot;
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {/* 가설 설명 서술 영역 */}
                                                                <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#475569' }}>
                                                                    {hypothesisResult?.headline && (
                                                                        <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px', fontSize: '12.5px' }}>
                                                                            {hypothesisResult.headline}
                                                                        </div>
                                                                    )}
                                                                    {Array.isArray(hypothesisResult?.details) ? (
                                                                        <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                            {hypothesisResult.details.map((dt, dtIdx) => (
                                                                                <li key={dtIdx}>{dt}</li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : typeof hypothesisResult?.details === 'string' ? (
                                                                        renderBulletText(hypothesisResult.details)
                                                                    ) : typeof hypothesisResult === 'string' ? (
                                                                        renderBulletText(hypothesisResult)
                                                                    ) : (
                                                                        <p style={{ margin: 0 }}>{hypothesisResult?.details || '가설 검증 의견이 서술되지 않았습니다.'}</p>
                                                                    )}
                                                                </div>

                                                                {/* KPI Impacts Cards Grid */}
                                                                {Array.isArray(hypothesisResult?.kpi_impacts) && hypothesisResult.kpi_impacts.length > 0 && (
                                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '4px' }}>
                                                                        {hypothesisResult.kpi_impacts.map((kpi, kIdx) => {
                                                                            const isUp = kpi.trend === 'UP';
                                                                            const isDown = kpi.trend === 'DOWN';
                                                                            return (
                                                                                <div
                                                                                    key={kIdx}
                                                                                    style={{
                                                                                        border: '1px solid #e2e8f0',
                                                                                        borderRadius: '8px',
                                                                                        padding: '12px',
                                                                                        backgroundColor: '#ffffff',
                                                                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)'
                                                                                    }}
                                                                                >
                                                                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={kpi.label}>
                                                                                        {kpi.label}
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                                                                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
                                                                                            {kpi.value}{kpi.unit || '%'}
                                                                                        </span>
                                                                                        {isUp && <span style={{ color: '#059669', fontWeight: 800, fontSize: '14px', marginLeft: '4px' }}>↑</span>}
                                                                                        {isDown && <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '14px', marginLeft: '4px' }}>↓</span>}
                                                                                        {!isUp && !isDown && <span style={{ color: '#64748b', fontWeight: 800, fontSize: '14px', marginLeft: '4px' }}>-</span>}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* 핵심 정량 분석 Card (order: 3) */}
                                                            <div className="ai-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px', order: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgb(241, 245, 249)', paddingBottom: '12px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <BarChart2 size={16} color="#2563eb" />
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                                                                핵심 정량 분석
                                                                            </h4>
                                                                            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Core Findings</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                    {Array.isArray(coreFindingsList) && coreFindingsList.length > 0 ? (
                                                                        coreFindingsList.map((find, fIdx) => {
                                                                            const evidenceKey = 'core_' + idx + '_' + fIdx;
                                                                            const isSelected = selectedEvidence?.evidenceKey === evidenceKey;
                                                                            return (
                                                                                <div
                                                                                    key={fIdx}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        flexDirection: 'column',
                                                                                        gap: '10px',
                                                                                        padding: '14px 16px',
                                                                                        borderRadius: '10px',
                                                                                        background: isSelected ? '#f0f9ff' : '#ffffff',
                                                                                         border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                                                                        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.12)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                                                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                                                    }}
                                                                                >
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                                                            <span style={{
                                                                                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                                                                                color: '#ffffff',
                                                                                                fontWeight: 700,
                                                                                                width: '22px',
                                                                                                height: '22px',
                                                                                                borderRadius: '6px',
                                                                                                display: 'inline-flex',
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'center',
                                                                                                fontSize: '11px',
                                                                                                flexShrink: 0,
                                                                                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                                                                                            }}>
                                                                                                {fIdx + 1}
                                                                                            </span>
                                                                                            <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: '-0.02em' }}>
                                                                                                {find.headline}
                                                                                            </h5>
                                                                                        </div>

                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                            <button
                                                                                                onClick={() => handleEvidenceClick(find, evidenceKey, idx, '핵심 정량 분석', '핵심 분석 근거')}
                                                                                                style={{
                                                                                                    background: isSelected ? '#2563eb' : '#ffffff',
                                                                                                    color: isSelected ? '#ffffff' : '#2563eb',
                                                                                                    border: `1px solid ${isSelected ? '#2563eb' : '#bfdbfe'}`,
                                                                                                    borderRadius: '6px',
                                                                                                    padding: '3px 10px',
                                                                                                    fontSize: '11px',
                                                                                                    fontWeight: 600,
                                                                                                    cursor: 'pointer',
                                                                                                    display: 'inline-flex',
                                                                                                    alignItems: 'center',
                                                                                                    gap: '4px',
                                                                                                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.06)',
                                                                                                    transition: 'all 0.15s ease'
                                                                                                }}
                                                                                            >
                                                                                                <Search size={11} color={isSelected ? '#ffffff' : '#2563eb'} />
                                                                                                <span>증거</span>
                                                                                            </button>
                                                                                            {renderStubChips(find.stubs, find, evidenceKey, idx, '핵심 정량 분석', '핵심 분석 근거')}
                                                                                        </div>
                                                                                    </div>

                                                                                    <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                                                                                        {find.description}
                                                                                    </p>

                                                                                    {isSelected && find.evidence_metric && (
                                                                                        <div style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'flex-start',
                                                                                            gap: '8px',
                                                                                            padding: '9px 12px',
                                                                                            borderRadius: '8px',
                                                                                            background: '#e0f2fe',
                                                                                            border: '1px solid #bae6fd',
                                                                                            borderLeft: '3px solid #0284c7',
                                                                                            marginTop: '2px'
                                                                                        }}>
                                                                                            <BarChart2 size={14} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                                            <div style={{ fontSize: '11.5px', color: '#0369a1', lineHeight: '1.5', wordBreak: 'break-all' }}>
                                                                                                <strong style={{ color: '#0284c7', marginRight: '6px', fontWeight: 700 }}>교차표 판단:</strong>
                                                                                                <span>{find.evidence_metric}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })
                                                                    ) : typeof coreFindingsList === 'string' ? (
                                                                        renderBulletText(coreFindingsList)
                                                                    ) : (
                                                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>핵심 발견 사실이 없습니다.</span>
                                                                    )}
                                                                </div>

                                                                <div style={{ flex: 1 }} />
                                                                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span>위 항목의 <strong>증거</strong> 버튼을 눌러 근거 문항을 확인하세요</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right Column wrapper using display: contents to participate in parent grid */}
                                                        <div style={{ display: 'contents' }}>
                                                            {/* 전략적 시사점 & 액션 플랜 Card (order: 2) */}
                                                            <div className="ai-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px', order: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <Target size={16} color="#2563eb" />
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                                                                전략적 시사점 & 액션 플랜
                                                                            </h4>
                                                                            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Strategic Action Plan</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                    {Array.isArray(soWhatList) && soWhatList.length > 0 ? (
                                                                        soWhatList.map((plan, pIdx) => {
                                                                            const evidenceKey = 'sowhat_' + idx + '_' + pIdx;
                                                                            const isSelected = selectedEvidence?.evidenceKey === evidenceKey;
                                                                            return (
                                                                                <div
                                                                                    key={pIdx}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        flexDirection: 'column',
                                                                                        gap: '10px',
                                                                                        padding: '14px 16px',
                                                                                        borderRadius: '10px',
                                                                                        background: isSelected ? '#f0f9ff' : '#ffffff',
                                                                                        border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                                                                        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.12)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                                                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                                                    }}
                                                                                >
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                                                        {(() => {
                                                                                            const zone = plan.matrix_zone || 'QUICK_WIN';
                                                                                            let label = 'Quick Win (즉시 실행)';
                                                                                            let bg = '#fef2f2';
                                                                                            let color = '#991b1b';
                                                                                            let border = '1px solid #fca5a5';

                                                                                            if (zone === 'LONG_TERM') {
                                                                                                label = '장기 과제 (Long-term)';
                                                                                                bg = '#faf5ff';
                                                                                                color = '#581c87';
                                                                                                border = '1px solid #d8b4fe';
                                                                                            } else if (zone === 'EASY_WIN') {
                                                                                                label = '단기 전략 과제';
                                                                                                bg = '#eff6ff';
                                                                                                color = '#1e40af';
                                                                                                border = '1px solid #93c5fd';
                                                                                            } else if (zone === 'LOW_PRIORITY') {
                                                                                                label = '낮은 우선순위';
                                                                                                bg = '#f3f4f6';
                                                                                                color = '#374151';
                                                                                                border = '1px solid #d1d5db';
                                                                                            }

                                                                                            return (
                                                                                                <span style={{
                                                                                                    fontSize: '11px',
                                                                                                    fontWeight: 700,
                                                                                                    backgroundColor: bg,
                                                                                                    color: color,
                                                                                                    border: border,
                                                                                                    padding: '2px 10px',
                                                                                                    borderRadius: '20px',
                                                                                                    display: 'inline-flex',
                                                                                                    alignItems: 'center',
                                                                                                    letterSpacing: '-0.01em'
                                                                                                }}>
                                                                                                    {label}
                                                                                                </span>
                                                                                            );
                                                                                        })()}
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                            <button
                                                                                                onClick={() => handleEvidenceClick(plan, evidenceKey, idx, '전략적 시사점 & 액션 플랜', '전략 과제 근거')}
                                                                                                style={{
                                                                                                    background: isSelected ? '#2563eb' : '#ffffff',
                                                                                                    color: isSelected ? '#ffffff' : '#2563eb',
                                                                                                    border: `1px solid ${isSelected ? '#2563eb' : '#bfdbfe'}`,
                                                                                                    borderRadius: '6px',
                                                                                                    padding: '3px 10px',
                                                                                                    fontSize: '11px',
                                                                                                    fontWeight: 600,
                                                                                                    cursor: 'pointer',
                                                                                                    display: 'inline-flex',
                                                                                                    alignItems: 'center',
                                                                                                    gap: '4px',
                                                                                                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.06)',
                                                                                                    transition: 'all 0.15s ease'
                                                                                                }}
                                                                                            >
                                                                                                <Search size={11} color={isSelected ? '#ffffff' : '#2563eb'} />
                                                                                                <span>증거</span>
                                                                                            </button>
                                                                                            {renderStubChips(plan.stubs, plan, evidenceKey, idx, '전략적 시사점 & 액션 플랜', '전략 과제 근거')}
                                                                                        </div>
                                                                                    </div>
                                                                                    
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                        <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: '-0.02em' }}>
                                                                                            {plan.headline}
                                                                                        </h5>
                                                                                        <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                                                                                            {plan.description}
                                                                                        </p>
                                                                                    </div>

                                                                                    {isSelected && plan.evidence_metric && (
                                                                                        <div style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'flex-start',
                                                                                            gap: '8px',
                                                                                            padding: '9px 12px',
                                                                                            borderRadius: '8px',
                                                                                            background: '#e0f2fe',
                                                                                            border: '1px solid #bae6fd',
                                                                                            borderLeft: '3px solid #0284c7',
                                                                                            marginTop: '2px'
                                                                                        }}>
                                                                                            <BarChart2 size={14} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                                            <div style={{ fontSize: '11.5px', color: '#0369a1', lineHeight: '1.5', wordBreak: 'break-all' }}>
                                                                                                <strong style={{ color: '#0284c7', marginRight: '6px', fontWeight: 700 }}>교차표 판단:</strong>
                                                                                                <span>{plan.evidence_metric}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })
                                                                    ) : typeof soWhatList === 'string' ? (
                                                                        renderBulletText(soWhatList)
                                                                    ) : (
                                                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>시사점 및 액션플랜이 없습니다.</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* 타겟 세그먼트 프로필 Card (order: 4) */}
                                                            <div className="ai-card" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '16px', order: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgb(241, 245, 249)', paddingBottom: '12px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <Users size={16} color="#2563eb" />
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                                                                                타겟 세그먼트 프로필
                                                                            </h4>
                                                                            <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Demographic Profile</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                    {Array.isArray(profileList) && profileList.length > 0 ? (
                                                                        profileList.map((prof, pIdx) => {
                                                                            const evidenceKey = 'profile_' + idx + '_' + pIdx;
                                                                            const isSelected = selectedEvidence?.evidenceKey === evidenceKey;
                                                                            return (
                                                                                <div
                                                                                    key={pIdx}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        flexDirection: 'column',
                                                                                        gap: '10px',
                                                                                        padding: '14px 16px',
                                                                                        borderRadius: '10px',
                                                                                        background: isSelected ? '#f0f9ff' : '#ffffff',
                                                                                        border: isSelected ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                                                                                        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.12)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                                                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                                                    }}
                                                                                >
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                                                            <span style={{
                                                                                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                                                                                color: '#ffffff',
                                                                                                fontWeight: 700,
                                                                                                width: '22px',
                                                                                                height: '22px',
                                                                                                borderRadius: '6px',
                                                                                                display: 'inline-flex',
                                                                                                alignItems: 'center',
                                                                                                justifyContent: 'center',
                                                                                                fontSize: '11px',
                                                                                                flexShrink: 0,
                                                                                                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                                                                                            }}>
                                                                                                {pIdx + 1}
                                                                                            </span>
                                                                                            <h5 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.4, letterSpacing: '-0.02em' }}>
                                                                                                {prof.headline}
                                                                                            </h5>
                                                                                        </div>

                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                            <button
                                                                                                onClick={() => handleEvidenceClick(prof, evidenceKey, idx, '타겟 세그먼트 프로필', '세그먼트 특징 근거')}
                                                                                                style={{
                                                                                                    background: isSelected ? '#2563eb' : '#ffffff',
                                                                                                    color: isSelected ? '#ffffff' : '#2563eb',
                                                                                                    border: `1px solid ${isSelected ? '#2563eb' : '#bfdbfe'}`,
                                                                                                    borderRadius: '6px',
                                                                                                    padding: '3px 10px',
                                                                                                    fontSize: '11px',
                                                                                                    fontWeight: 600,
                                                                                                    cursor: 'pointer',
                                                                                                    display: 'inline-flex',
                                                                                                    alignItems: 'center',
                                                                                                    gap: '4px',
                                                                                                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.06)',
                                                                                                    transition: 'all 0.15s ease'
                                                                                                }}
                                                                                            >
                                                                                                <Search size={11} color={isSelected ? '#ffffff' : '#2563eb'} />
                                                                                                <span>증거</span>
                                                                                            </button>
                                                                                            {renderStubChips(prof.stubs, prof, evidenceKey, idx, '타겟 세그먼트 프로필', '세그먼트 특징 근거')}
                                                                                        </div>
                                                                                    </div>

                                                                                    {(prof.group_a || prof.group_b) && (
                                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '2px' }}>
                                                                                            {prof.group_a && (
                                                                                                <div style={{ background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 10px', fontSize: '11.5px', fontWeight: 600, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                                                    {prof.group_a}
                                                                                                </div>
                                                                                            )}
                                                                                            {prof.group_b && (
                                                                                                <div style={{ background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '7px 10px', fontSize: '11.5px', fontWeight: 600, textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                                                    {prof.group_b}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}

                                                                                    <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                                                                                        {prof.description}
                                                                                    </p>

                                                                                    {isSelected && prof.evidence_metric && (
                                                                                        <div style={{
                                                                                            display: 'flex',
                                                                                            alignItems: 'flex-start',
                                                                                            gap: '8px',
                                                                                            padding: '9px 12px',
                                                                                            borderRadius: '8px',
                                                                                            background: '#e0f2fe',
                                                                                            border: '1px solid #bae6fd',
                                                                                            borderLeft: '3px solid #0284c7',
                                                                                            marginTop: '2px'
                                                                                        }}>
                                                                                            <BarChart2 size={14} color="#0284c7" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                                                            <div style={{ fontSize: '11.5px', color: '#0369a1', lineHeight: '1.5', wordBreak: 'break-all' }}>
                                                                                                <strong style={{ color: '#0284c7', marginRight: '6px', fontWeight: 700 }}>교차표 판단:</strong>
                                                                                                <span>{prof.evidence_metric}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })
                                                                    ) : typeof profileList === 'string' ? (
                                                                        renderBulletText(profileList)
                                                                    ) : (
                                                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>타겟 프로필 데이터가 없습니다.</span>
                                                                    )}
                                                                </div>

                                                                <div style={{ flex: 1 }} />
                                                                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span>위 항목의 <strong>증거</strong> 버튼을 눌러 근거 문항을 확인하세요</span>
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                            })
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeSubTab === 'l3' && (
                        (!insightData.l3 || !(insightData.l3.executive_summary || insightData.l3.strategic_recommendations)) ? (
                            <div className="ai-block-empty-state">
                                <span>조회된 L3 종합 요약 보고서 결과가 없습니다.</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Executive Summary Card */}
                                <div className="ai-card" style={{ padding: '24px', background: '#f1f5f9', borderRadius: '12px', border: '1.5px solid #cbd5e1', boxShadow: 'none' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                            종합 의사결정 요약문 <span style={{ fontSize: '11px', fontWeight: 400, color: '#64748b', marginLeft: '4px' }}>Executive Summary</span>
                                        </h3>
                                    </div>
                                    <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {renderInsightText(insightData.l3?.executive_summary)}
                                    </p>
                                </div>

                                {/* Strategic Recommendations Card */}
                                <div className="ai-card" style={{ padding: '24px', background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #86efac', boxShadow: 'none' }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#14532d', margin: 0 }}>
                                            최종 전략적 액션 아이템 <span style={{ fontSize: '11px', fontWeight: 400, color: '#16a34a', marginLeft: '4px' }}>Strategic Action Items</span>
                                        </h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {Array.isArray(insightData.l3?.strategic_recommendations) ? (
                                            insightData.l3.strategic_recommendations.map((rec, rIdx) => (
                                                <div key={rIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        width: '18px',
                                                        height: '18px',
                                                        borderRadius: '50%',
                                                        background: '#d1fae5',
                                                        color: '#16a34a',
                                                        flexShrink: 0,
                                                        marginTop: '2px'
                                                    }}>
                                                        <Check size={11} strokeWidth={3} />
                                                    </div>
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
