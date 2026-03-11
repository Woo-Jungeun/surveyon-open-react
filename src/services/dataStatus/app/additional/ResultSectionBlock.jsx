
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Copy, Maximize, Settings, Download, BarChart2, Layers, LineChart, PieChart, Donut, Aperture, Filter, MoreHorizontal, AreaChart, Map as MapIcon, LayoutGrid, Bot, Loader2, CheckCircle2, GripVertical, ChevronLeft, ChevronRight, Maximize2, ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import KendoChart from '../../components/KendoChart';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { saveAs } from '@progress/kendo-file-saver';

const computeLocalVars = (dataItem) => {
    if (!dataItem) return {};
    const chartData = dataItem.columns.map((colObj, colIndex) => {
        const colName = colObj.label || colObj;
        const dataPoint = { name: colName };
        dataItem.rows.forEach(row => {
            if (row.label === '합계' || row.label === '전체') {
                dataPoint.total = row.values[colIndex]?.count || 0;
            } else {
                const pct = row.values[colIndex]?.percent;
                dataPoint[row.label] = pct ? parseFloat(pct) : 0;
            }
        });
        return dataPoint;
    });

    const seriesNames = dataItem.rows
        .filter(row => row.label !== '합계' && row.label !== '전체')
        .map(row => row.label);

    return {
        chartData,
        seriesNames,
        hasColLabel2: dataItem.columns?.some(c => c.label2),
        hasVarLabel: dataItem.columns?.some(c => c.var_label),
        hasRowLabel2: dataItem.rows?.some(r => r.label2 || r.var_label)
    };
};

export const ResultSectionBlock = ({
    resultData,
    dataIndex,
    isConfigOpen,
    setIsConfigOpen,
    setToast,
    setFullscreenModal,
    tableName,
    isExpanded,
    onToggleExpand,
    isAnyExpanded,
    tableMode
}) => {
    const { chartData, seriesNames, hasColLabel2, hasVarLabel, hasRowLabel2 } = useMemo(() => computeLocalVars(resultData), [resultData]);

    const chartContainerRef = useRef(null);
    const displayMenuRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const moreStatsRef = useRef(null);

    const [chartMode, setChartMode] = useState(null);
    const [isStatsOptionsOpen, setIsStatsOptionsOpen] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
    const [displayMode, setDisplayMode] = useState('all');
    const [columnLayout, setColumnLayout] = useState('single');
    const [isMoreStatsOpen, setIsMoreStatsOpen] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const [layoutOptions, setLayoutOptions] = useState([
        { id: 'table', label: '표', checked: true },
        { id: 'stats', label: '통계', checked: true },
        { id: 'chart', label: '차트', checked: false },
        { id: 'ai', label: 'AI 분석', checked: false }
    ]);

    const colGroups = useMemo(() => {
        if (!resultData?.columns) return [];
        const groups = [];
        let currentGroup = null;
        resultData.columns.forEach((col, idx) => {
            const l2 = col.label2 || '';
            if (!currentGroup || currentGroup.label2 !== l2) {
                currentGroup = { label2: l2, count: 1 };
                groups.push(currentGroup);
            } else {
                currentGroup.count++;
            }
        });
        return groups;
    }, [resultData?.columns]);

    const colVarLabel = useMemo(() => {
        return resultData?.columns?.find(c => c.var_label)?.var_label || '';
    }, [resultData?.columns]);

    const [statsOptions, setStatsOptions] = useState([
        { id: 'mean', label: '평균', checked: true },
        { id: 'median', label: '중앙값', checked: false },
        { id: 'mode', label: '최빈값', checked: false },
        { id: 'std', label: '표준편차', checked: false },
        { id: 'min', label: '최소값', checked: false },
        { id: 'max', label: '최대값', checked: false },
        { id: 'n', label: '표본수', checked: false },
        { id: 'rse', label: '상대표준오차', checked: false },
    ]);

    const toggleLayoutOption = (id) => {
        setLayoutOptions(layoutOptions.map(opt =>
            opt.id === id ? { ...opt, checked: !opt.checked } : opt
        ));
    };

    const toggleStatOption = (id) => {
        setStatsOptions(statsOptions.map(opt =>
            opt.id === id ? { ...opt, checked: !opt.checked } : opt
        ));
    };

    const handleSortDragStart = (e, index, type) => {
        e.dataTransfer.setData('dragIndex', index);
        e.dataTransfer.setData('type', type);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleSortDrop = (e, dropIndex, type) => {
        const dragIndex = Number(e.dataTransfer.getData('dragIndex'));
        const dragType = e.dataTransfer.getData('type');
        if (dragType !== type) return;
        if (dragIndex === dropIndex) return;

        if (type === 'layout') {
            const newOptions = [...layoutOptions];
            const [draggedItem] = newOptions.splice(dragIndex, 1);
            newOptions.splice(dropIndex, 0, draggedItem);
            setLayoutOptions(newOptions);
        } else if (type === 'stats') {
            const newOptions = [...statsOptions];
            const [draggedItem] = newOptions.splice(dragIndex, 1);
            newOptions.splice(dropIndex, 0, draggedItem);
            setStatsOptions(newOptions);
        }
    };

    const handleCopyTable = async (dataItem, hasColLabel2, hasRowLabel2) => {
        try {
            let clipboardText = "";
            if (hasColLabel2 || hasRowLabel2) {
                const headerPart1 = [(hasRowLabel2 ? '대분류' : ''), '문항', ...dataItem.columns.map(c => hasColLabel2 ? (c.label2 || '') : (c.label || c))].filter(Boolean).join('\t');
                const headerPart2 = [(hasRowLabel2 ? '' : ''), '', ...dataItem.columns.map(c => c.label || c)].filter(Boolean).join('\t');
                const rows = dataItem.rows.map(row =>
                    [(hasRowLabel2 ? (row.label2 || '') : ''), row.label, ...row.values.map(v => {
                        if (displayMode === 'value') return v.count;
                        if (displayMode === 'percent') return `${v.percent}%`;
                        return `${v.count} (${v.percent}%)`;
                    })].filter(val => val !== '').join('\t')
                ).join('\n');
                clipboardText = hasColLabel2 ? `${headerPart1}\n${headerPart2}\n${rows}` : `${headerPart1}\n${rows}`;
            } else {
                const headers = ['문항', ...dataItem.columns.map(c => c.label || c)].join('\t');
                const rows = dataItem.rows.map(row =>
                    [row.label, ...row.values.map(v => {
                        if (displayMode === 'value') return v.count;
                        if (displayMode === 'percent') return `${v.percent}%`;
                        return `${v.count} (${v.percent}%)`;
                    })].join('\t')
                ).join('\n');
                clipboardText = `${headers}\n${rows}`;
            }
            await navigator.clipboard.writeText(clipboardText);
            setToast({ show: true, message: "복사 완료 (Ctrl+V)" });
        } catch (e) {
            console.error(e);
            setToast({ show: true, message: "복사 실패" });
        }
    };

    const handleCopyStats = async (dataItem, hasColLabel2, hasRowLabel2) => {
        try {
            let clipboardText = "";
            if (hasColLabel2 || hasRowLabel2) {
                const headerPart1 = ['통계분류', '통계항목', ...dataItem.columns.map(c => hasColLabel2 ? (c.label2 || '') : (c.label || c))].join('\t');
                const headerPart2 = ['', '', ...dataItem.columns.map(c => c.label || c)].join('\t');
                const rows = statsOptions.filter(opt => opt.checked).map(stat => {
                    const statKey = stat.id.toLowerCase();
                    const statValues = dataItem.stats[statKey] || [];
                    return [stat.label, '', ...statValues].join('\t');
                }).join('\n');
                clipboardText = hasColLabel2 ? `${headerPart1}\n${headerPart2}\n${rows}` : `${headerPart1}\n${rows}`;
            } else {
                const headers = ['통계', ...dataItem.columns.map(c => c.label || c)].join('\t');
                const rows = statsOptions.filter(opt => opt.checked).map(stat => {
                    const statKey = stat.id.toLowerCase();
                    const statValues = dataItem.stats[statKey] || [];
                    return [stat.label, ...statValues].join('\t');
                }).join('\n');
                clipboardText = `${headers}\n${rows}`;
            }
            await navigator.clipboard.writeText(clipboardText);
            setToast({ show: true, message: "복사 완료 (Ctrl+V)" });
        } catch (e) {
            console.error(e);
            setToast({ show: true, message: "복사 실패" });
        }
    };

    const handleRunAiAnalysis = () => {
        setIsAiLoading(true);
        setTimeout(() => {
            setAiResult([
                "전체 응답은 High 이상 구간이 높아 전반적으로 긍정적인 반응을 보였습니다.",
                "배너 중 Banner C가 모든 구간에서 가장 높은 반응도를 기록했습니다.",
                "데이터 분산이 낮아 결과의 안정성과 신뢰도가 확보되었습니다."
            ]);
            setIsAiLoading(false);
        }, 1500);
    };

    const getChartTypeName = (mode) => {
        const typeMap = {
            'column': 'column', 'bar': 'bar', 'stackedColumn': 'stacked_column', 'stacked100Column': 'stacked_100_column',
            'line': 'line', 'pie': 'pie', 'donut': 'donut', 'radarArea': 'radar', 'funnel': 'funnel',
            'scatterPoint': 'scatter', 'area': 'area', 'map': 'map', 'heatmap': 'heatmap'
        };
        return typeMap[mode] || 'chart';
    };

    const handleDownload = async (format) => {
        const typeName = getChartTypeName(chartMode || 'column');
        const fileName = `${tableName || 'CrossTab'}_${typeName}`;
        if (!chartContainerRef.current) return;
        try {
            let svgElement = chartContainerRef.current.querySelector('.k-chart svg');
            if (!svgElement) {
                const allSvgs = chartContainerRef.current.querySelectorAll('svg');
                svgElement = Array.from(allSvgs).find(svg => {
                    const bbox = svg.getBBox();
                    return bbox.width > 100 && bbox.height > 100;
                });
            }
            if (!svgElement) return;
            const bbox = svgElement.getBBox();
            const width = bbox.width || 800;
            const height = bbox.height || 600;
            const clonedSvg = svgElement.cloneNode(true);
            clonedSvg.setAttribute('width', width);
            clonedSvg.setAttribute('height', height);
            const svgString = new XMLSerializer().serializeToString(clonedSvg);
            if (format === 'svg') {
                const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                saveAs(blob, `${fileName}.svg`);
            } else if (format === 'png') {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    canvas.width = width * 2;
                    canvas.height = height * 2;
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => saveAs(blob, `${fileName}.png`));
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            }
            setShowDownloadMenu(false);
        } catch (error) {
            console.error('Download error:', error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) setShowDownloadMenu(false);
            if (displayMenuRef.current && !displayMenuRef.current.contains(event.target)) setIsDisplayMenuOpen(false);
            if (moreStatsRef.current && !moreStatsRef.current.contains(event.target)) setIsMoreStatsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div
            key={dataIndex}
            className={`result-section ${isExpanded ? 'is-expanded' : ''} ${(isAnyExpanded && !isExpanded) || isConfigOpen ? 'is-narrow' : ''}`}
            style={{
                marginTop: dataIndex > 0 ? (isConfigOpen ? '0px' : '20px') : '0'
            }}
        >
            <div className="result-header" onClick={() => isConfigOpen && setIsConfigOpen(false)} style={{ cursor: isConfigOpen ? 'pointer' : 'default' }}>
                <div className="result-tabs">
                    <div className="result-tab">
                        결과 {resultData.y_info ? `(${resultData.y_info})` : ""}
                    </div>
                    {!isConfigOpen && (
                        <button onClick={(e) => { e.stopPropagation(); setIsStatsOptionsOpen(!isStatsOptionsOpen); }} className={`stats-toggle-btn ${isStatsOptionsOpen ? 'active' : ''}`}>
                            <Settings size={14} />
                            <span>옵션 설정</span>
                        </button>
                    )}
                </div>
                <div>
                    {tableMode !== 'merged' && (
                        <button
                            className={`wide-view-toggle-btn ${isExpanded ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                            title={isExpanded ? "원래대로 보기" : "넓게 보기"}
                        >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                    {!isConfigOpen && layoutOptions.find(opt => opt.id === 'chart')?.checked && (
                        <>
                            <div className="download-menu-container" ref={downloadMenuRef}>
                                <button className={`view-option-btn download-btn ${showDownloadMenu ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }}>
                                    <Download size={18} />
                                </button>
                                {showDownloadMenu && (
                                    <div className="download-dropdown">
                                        <button onClick={() => handleDownload('png')}>PNG (이미지)</button>
                                        <button onClick={() => handleDownload('svg')}>SVG (PPT용)</button>
                                    </div>
                                )}
                            </div>
                            <button className={`view-option-btn ${!chartMode || chartMode === 'column' ? 'active' : ''}`} onClick={() => setChartMode('column')}><BarChart2 size={18} /></button>
                            <button className={`view-option-btn ${chartMode === 'stackedColumn' ? 'active' : ''}`} onClick={() => setChartMode('stackedColumn')}><Layers size={18} /></button>
                            <button className={`view-option-btn ${chartMode === 'line' ? 'active' : ''}`} onClick={() => setChartMode('line')}><LineChart size={18} /></button>
                            <button className={`view-option-btn ${chartMode === 'pie' ? 'active' : ''}`} onClick={() => setChartMode('pie')}><PieChart size={18} /></button>
                        </>
                    )}
                </div>
            </div>

            {isStatsOptionsOpen && (
                <div className="stats-controls">
                    <div className="stats-controls__title-group">
                        <span className="stats-controls__title">옵션 설정</span>
                        <span className="stats-controls__subtitle">드래그 순서 변경 및 표출 선택</span>
                    </div>
                    <div className="stats-controls__section">
                        <span className="stats-controls__section-label">배치 옵션</span>
                        <div className="sortable-list">
                            {layoutOptions.map((item, index) => (
                                <div key={item.id} className={`sortable-item ${item.checked ? 'checked' : ''} ${item.id === 'ai' ? 'disabled' : ''}`}
                                    draggable={item.id !== 'ai'}
                                    onDragStart={(e) => item.id !== 'ai' && handleSortDragStart(e, index, 'layout')}
                                    onDragOver={(e) => { if (item.id !== 'ai') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                                    onDrop={(e) => item.id !== 'ai' && handleSortDrop(e, index, 'layout')}
                                    onClick={() => item.id !== 'ai' && toggleLayoutOption(item.id)}>
                                    <GripVertical size={14} className="drag-handle" style={item.id === 'ai' ? { display: 'none' } : {}} />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {layoutOptions.find(opt => opt.id === 'stats')?.checked && (
                        <>
                            <div className="stats-controls__divider"></div>
                            <div className="stats-controls__section">
                                <span className="stats-controls__section-label">통계 옵션</span>
                                <div className="sortable-list">
                                    {statsOptions.map((item, index) => {
                                        if (!['mean', 'median', 'mode'].includes(item.id) && !item.checked) return null;
                                        return (
                                            <div key={item.id} className={`sortable-item ${item.checked ? 'checked' : ''}`}
                                                draggable onDragStart={(e) => handleSortDragStart(e, index, 'stats')}
                                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                onDrop={(e) => handleSortDrop(e, index, 'stats')}
                                                onClick={() => toggleStatOption(item.id)}>
                                                <GripVertical size={14} className="drag-handle" />
                                                <span>{item.label}</span>
                                            </div>
                                        );
                                    })}
                                    {statsOptions.some(item => !['mean', 'median', 'mode'].includes(item.id) && !item.checked) && (
                                        <div style={{ position: 'relative' }} ref={moreStatsRef}>
                                            <div className="more-btn-chip" onClick={() => setIsMoreStatsOpen(!isMoreStatsOpen)}>
                                                <MoreHorizontal size={14} />
                                            </div>
                                            {isMoreStatsOpen && (
                                                <div className="more-stats-dropdown">
                                                    {statsOptions.filter(item => !['mean', 'median', 'mode'].includes(item.id) && !item.checked).map(item => (
                                                        <div
                                                            key={item.id}
                                                            className="more-stats-item"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleStatOption(item.id);
                                                                setIsMoreStatsOpen(false);
                                                            }}
                                                        >
                                                            {item.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    <div className="stats-controls__divider"></div>
                    <div className="stats-controls__section">
                        <span className="stats-controls__section-label">단 설정</span>
                        <div className="toggle-group">
                            <button className={`toggle-chip ${columnLayout === 'single' ? 'active' : ''}`} onClick={() => setColumnLayout('single')}>1단</button>
                            <button className={`toggle-chip ${columnLayout === 'double' ? 'active' : ''}`} onClick={() => setColumnLayout('double')}>2단</button>
                        </div>
                    </div>
                </div>
            )}

            {!isConfigOpen && (
                <div className="result-content">
                    <div className="cross-table-container" style={{ display: 'grid', gridTemplateColumns: columnLayout === 'single' ? '1fr' : 'repeat(2, 1fr)', gap: '12px' }}>
                        {resultData && layoutOptions.map(option => {
                            if (!option.checked) return null;
                            if (option.id === 'table') {
                                return (
                                    <div key="table" className="result-block">
                                        <div className="section-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="blue-bar"></div>
                                                <span className="section-title">표</span>
                                            </div>
                                            <div className="section-actions">
                                                <div className="display-mode-select">
                                                    <div className="custom-filter-wrapper" ref={displayMenuRef} style={{ position: 'relative' }}>
                                                        <div className="custom-filter-trigger" onClick={() => setIsDisplayMenuOpen(!isDisplayMenuOpen)} style={{ width: '96px', height: '32px' }}>
                                                            <span className="trigger-text">{displayMode === 'all' ? '전체' : displayMode === 'value' ? '사례수' : '퍼센트'}</span>
                                                            <ChevronDown size={14} className="trigger-icon" />
                                                        </div>
                                                        {isDisplayMenuOpen && (
                                                            <div className="custom-filter-menu" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: '100%', zIndex: 1000 }}>
                                                                {['all', 'value', 'percent'].map(m => (
                                                                    <div
                                                                        key={m}
                                                                        className={`custom-filter-item ${displayMode === m ? 'selected' : ''}`}
                                                                        onClick={() => { setDisplayMode(m); setIsDisplayMenuOpen(false); }}
                                                                    >
                                                                        <span className="filter-text">{m === 'all' ? '전체' : m === 'value' ? '사례수' : '퍼센트'}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleCopyTable(resultData, hasColLabel2, hasRowLabel2)} className="action-btn">
                                                    <Copy size={16} />
                                                    <span>복사</span>
                                                </button>
                                                <button
                                                    onClick={() => setFullscreenModal({ open: true, type: 'table', dataItem: resultData, chartData, seriesNames, statsOptions, chartMode })}
                                                    className="action-btn"
                                                >
                                                    <Maximize size={16} />
                                                    <span>전체화면</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="table-wrapper">
                                            <table className="cross-table">
                                                <thead>
                                                    {(() => {
                                                        const headerRows = [];
                                                        const totalRows = (colVarLabel ? 1 : 0) + (hasColLabel2 ? 1 : 0) + 1;

                                                        if (colVarLabel) {
                                                            headerRows.push(
                                                                <tr key="var-label-row">
                                                                    <th
                                                                        rowSpan={totalRows}
                                                                        colSpan={hasRowLabel2 ? 2 : 1}
                                                                        className="sticky-col sticky-l0"
                                                                        style={{
                                                                            background: '#f8fafc',
                                                                            borderRight: '1px solid #e2e8f0',
                                                                            borderBottom: '1px solid #e2e8f0',
                                                                            fontWeight: '700',
                                                                            color: '#1e3a8a',
                                                                            fontSize: '11px',
                                                                            textAlign: 'center',
                                                                            verticalAlign: 'middle'
                                                                        }}
                                                                    >
                                                                        문항
                                                                    </th>
                                                                    <th colSpan={resultData.columns.length} style={{ background: '#eff6ff', color: '#1e3a8a', fontSize: '11px', textAlign: 'center', padding: '4px 12px', borderBottom: '1px solid #dbeafe', whiteSpace: 'normal', wordBreak: 'break-all' }}>
                                                                        {colVarLabel}
                                                                    </th>
                                                                </tr>
                                                            );
                                                        }

                                                        if (hasColLabel2) {
                                                            headerRows.push(
                                                                <tr key="col-label2-row">
                                                                    {!colVarLabel && (
                                                                        <th
                                                                            rowSpan={totalRows}
                                                                            colSpan={hasRowLabel2 ? 2 : 1}
                                                                            className="sticky-col sticky-l0"
                                                                            style={{
                                                                                background: '#f8fafc',
                                                                                borderRight: '1px solid #e2e8f0',
                                                                                borderBottom: '1px solid #e2e8f0',
                                                                                fontWeight: '700',
                                                                                color: '#1e3a8a',
                                                                                fontSize: '11px',
                                                                                textAlign: 'center',
                                                                                verticalAlign: 'middle'
                                                                            }}
                                                                        >
                                                                            문항
                                                                        </th>
                                                                    )}
                                                                    {colGroups.map((group, i) => (
                                                                        <th key={i} colSpan={group.count} style={{ background: '#eff6ff', border: '1px solid #dbeafe', color: '#1e3a8a', fontWeight: '700', fontSize: '11px' }}>
                                                                            {group.label2}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            );
                                                        }

                                                        headerRows.push(
                                                            <tr key="base-labels-row">
                                                                {(!colVarLabel && !hasColLabel2) && (
                                                                    <th
                                                                        className="sticky-col sticky-l0"
                                                                        style={{
                                                                            background: '#f8fafc',
                                                                            borderRight: '1px solid #e2e8f0',
                                                                            borderBottom: '1px solid #e2e8f0',
                                                                            fontWeight: '700',
                                                                            color: '#1e3a8a',
                                                                            fontSize: '11px',
                                                                            textAlign: 'center'
                                                                        }}
                                                                    >
                                                                        문항
                                                                    </th>
                                                                )}
                                                                {resultData.columns.map((col, i) => (
                                                                    <th key={i} style={{ background: '#eff6ff', border: '1px solid #dbeafe', color: '#1e3a8a', fontWeight: '700', fontSize: '11px' }}>
                                                                        {col.label || col}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        );
                                                        return headerRows;
                                                    })()}
                                                </thead>
                                                <tbody>
                                                    {resultData.rows.map((row, i) => (
                                                        <tr key={i}>
                                                            {hasRowLabel2 && (
                                                                <td
                                                                    className="label-cell row-group-label sticky-col sticky-l0"
                                                                    style={{
                                                                        display: (i === 0 || (resultData.rows[i - 1].label2 || resultData.rows[i - 1].var_label) !== (row.label2 || row.var_label)) ? 'table-cell' : 'none',
                                                                        verticalAlign: 'middle',
                                                                        background: '#eff6ff',
                                                                        color: '#1e3a8a',
                                                                        fontSize: '11px',
                                                                        fontWeight: '700',
                                                                        textAlign: 'center',
                                                                        borderRight: '1px solid #dbeafe',
                                                                        whiteSpace: 'normal',
                                                                        wordBreak: 'break-all'
                                                                    }}
                                                                    rowSpan={resultData.rows.filter(r => (r.label2 || r.var_label) === (row.label2 || row.var_label)).length}
                                                                >
                                                                    {row.label2 || row.var_label}
                                                                </td>
                                                            )}
                                                            <td className={`label-cell sticky-col ${hasRowLabel2 ? 'sticky-l1' : 'sticky-l0'}`} style={{ textAlign: 'left', fontSize: '11px' }}>{row.label}</td>
                                                            {row.values.map((v, j) => (
                                                                <td key={j} style={{ textAlign: 'right' }}>
                                                                    {displayMode === 'all' ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                                            <span className="cell-value">{v.count}</span>
                                                                            <span className="cell-pct">{v.percent}%</span>
                                                                        </div>
                                                                    ) : (
                                                                        displayMode === 'value' ? v.count : `${v.percent}%`
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            }
                            if (option.id === 'stats') {
                                return (
                                    <div key="stats" className="result-block">
                                        <div className="section-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="blue-bar"></div>
                                                <span className="section-title">통계</span>
                                            </div>
                                            <div className="section-actions">
                                                <button onClick={() => handleCopyStats(resultData, hasColLabel2, hasRowLabel2)} className="action-btn">
                                                    <Copy size={16} />
                                                    <span>복사</span>
                                                </button>
                                                <button
                                                    onClick={() => setFullscreenModal({ open: true, type: 'stats', dataItem: resultData, chartData, seriesNames, statsOptions, chartMode })}
                                                    className="action-btn"
                                                >
                                                    <Maximize size={16} />
                                                    <span>전체화면</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="stats-table-container">
                                            <table className="stats-table">
                                                <thead>
                                                    {(() => {
                                                        const statsTotalRows = (colVarLabel ? 1 : 0) + (hasColLabel2 ? 1 : 0) + 1;
                                                        const rows = [];

                                                        if (colVarLabel) {
                                                            rows.push(
                                                                <tr key="stats-var-row">
                                                                    <th className="stats-th-label" rowSpan={statsTotalRows}>통계</th>
                                                                    <th className="stats-th-data" colSpan={resultData.columns.length} style={{ background: '#eff6ff', color: '#1e3a8a' }}>{colVarLabel}</th>
                                                                </tr>
                                                            );
                                                        }

                                                        if (hasColLabel2) {
                                                            rows.push(
                                                                <tr key="stats-group-row">
                                                                    {!colVarLabel && <th className="stats-th-label" rowSpan={statsTotalRows}>통계</th>}
                                                                    {colGroups.map((group, i) => (
                                                                        <th key={i} className="stats-th-data" colSpan={group.count} style={{ background: '#eff6ff', color: '#1e3a8a' }}>{group.label2}</th>
                                                                    ))}
                                                                </tr>
                                                            );
                                                        }

                                                        rows.push(
                                                            <tr key="stats-base-row">
                                                                {(!colVarLabel && !hasColLabel2) && <th className="stats-th-label">통계</th>}
                                                                {resultData.columns.map((col, i) => (
                                                                    <th key={i} className="stats-th-data" style={{ background: '#eff6ff', color: '#1e3a8a' }}>{col.label || col}</th>
                                                                ))}
                                                            </tr>
                                                        );
                                                        return rows;
                                                    })()}
                                                </thead>
                                                <tbody>
                                                    {statsOptions.filter(opt => opt.checked).map(stat => (
                                                        <tr key={stat.id}>
                                                            <td className="stats-td-label" style={{ color: '#1e3a8a', fontWeight: '700', textAlign: 'center' }}>{stat.label}</td>
                                                            {(resultData.stats[stat.id] || []).map((v, i) => (
                                                                <td key={i} className="stats-td-data">{v}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            }
                            if (option.id === 'chart') {
                                return (
                                    <div key="chart" className="result-block">
                                        <div className="section-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="blue-bar"></div>
                                                <span className="section-title">차트</span>
                                            </div>
                                            <button onClick={() => setFullscreenModal({ open: true, type: 'chart', dataItem: resultData, chartData, seriesNames, statsOptions, chartMode })}><Maximize size={14} /> 전체화면</button>
                                        </div>
                                        <div ref={chartContainerRef} className="cross-tab-chart-container">
                                            <KendoChart data={chartData} seriesNames={seriesNames} initialType={chartMode || 'column'} />
                                        </div>
                                    </div>
                                );
                            }
                            if (option.id === 'ai') {
                                return (
                                    <div key="ai" className="result-block">
                                        <div className="section-header">
                                            <div className="blue-bar"></div>
                                            <span className="section-title">AI 분석</span>
                                        </div>
                                        <div className="ai-analysis-container">
                                            {!aiResult && !isAiLoading && <button className="btn-ai-analysis" onClick={handleRunAiAnalysis}><Bot size={18} /><span>AI 분석 실행</span></button>}
                                            {isAiLoading && <div className="ai-loading"><Loader2 size={32} className="spin-icon" /><span>AI가 데이터를 분석하고 있습니다...</span></div>}
                                            {aiResult && <div className="ai-result-box">
                                                {aiResult.map((text, idx) => <div key={idx} className="ai-result-item"><CheckCircle2 size={16} /><p>{text}</p></div>)}
                                                <button onClick={() => setAiResult(null)}>다시 분석하기</button>
                                            </div>}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
