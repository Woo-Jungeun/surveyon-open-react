import React, { useState, useEffect, useRef, useMemo } from 'react';
import { saveAs } from '@progress/kendo-file-saver';
import { X, BarChart2, BarChartHorizontal, Layers, LineChart, PieChart, Donut, Aperture, Filter, MoreHorizontal, AreaChart, Map as MapIcon, LayoutGrid, Download, Cloud, ChevronDown, ChevronUp } from 'lucide-react';
import KendoChart from '../../components/KendoChart';
import './FullscreenModal.css';
import { CHART_THEME_OPTIONS } from '../../constants/chartThemes';

const FullscreenModal = ({
    isOpen,
    type,
    onClose,
    resultData,
    statsOptions,
    chartData,
    seriesNames,
    chartMode,
    suffix,
    displayMode,
    setDisplayMode,
    paletteId,
    setPaletteId,
    tableName,
    renderSettings,
    displayPolicy
}) => {
    const [localChartMode, setLocalChartMode] = useState(chartMode);
    const [localDisplayMode, setLocalDisplayMode] = useState(displayMode);
    const [localPaletteId, setLocalPaletteId] = useState(paletteId || 'default');
    const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const paletteMenuRef = useRef(null);
    const displayMenuRef = useRef(null);

    // [Standard Logic] Recompute chart variables based on resultData and localChartMode
    const { localComputedChartData, localComputedSeriesNames, localComputedSuffix } = useMemo(() => {
        if (!resultData) return {};

        // Donut and Funnel use Percentages, others use Counts
        const usePercent = localChartMode === 'donut' || localChartMode === 'funnel';

        const computedChartData = resultData.columns.map((colObj, colIndex) => {
            let colName = colObj.label || colObj;
            if (typeof colObj === 'object') {
                const parts = [];
                // if (colObj.var_label) parts.push(colObj.var_label);
                if (colObj.label3) parts.push(colObj.label3);
                if (colObj.label2) parts.push(colObj.label2);
                if (colObj.label) parts.push(colObj.label);
                else if (colObj.name) parts.push(colObj.name);
                colName = parts.length > 0 ? parts.filter(Boolean).join('\n') : (colObj.label || colObj.name || String(colObj));
            }
            const dataPoint = { name: colName };
            resultData.rows.forEach(row => {
                const isAggregate = row.label && ['합계', '전체', 'total', 'Total'].includes(row.label);
                if (isAggregate) {
                    dataPoint.total = Number(row.values[colIndex]?.count || 0);
                } else {
                    const val = usePercent
                        ? parseFloat(row.values[colIndex]?.percent || 0)
                        : Number(row.values[colIndex]?.count || 0);
                    dataPoint[row.label] = val;
                }
            });
            return dataPoint;
        });

        const computedSeriesNames = resultData.rows
            .filter(row => !(row.label && ['합계', '전체', 'total', 'Total'].includes(row.label)))
            .map(row => row.label);

        return {
            localComputedChartData: computedChartData,
            localComputedSeriesNames: computedSeriesNames,
            localComputedSuffix: usePercent ? "%" : ""
        };
    }, [resultData, localChartMode]);

    useEffect(() => {
        if (isOpen) {
            setLocalChartMode(chartMode);
            setLocalDisplayMode(displayMode);
            setLocalPaletteId(paletteId || 'default');
        }
    }, [isOpen, chartMode, displayMode, paletteId]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
                setShowDownloadMenu(false);
            }
            if (paletteMenuRef.current && !paletteMenuRef.current.contains(event.target)) {
                setIsPaletteMenuOpen(false);
            }
            if (displayMenuRef.current && !displayMenuRef.current.contains(event.target)) {
                setIsDisplayMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getChartTypeName = (mode) => {
        const typeMap = {
            'column': 'column', 'bar': 'bar', 'stackedColumn': 'stacked_column', 'stacked100Column': 'stacked_100_column',
            'line': 'line', 'pie': 'pie', 'donut': 'donut', 'radarArea': 'radar', 'funnel': 'funnel',
            'scatterPoint': 'scatter', 'area': 'area', 'map': 'map', 'heatmap': 'heatmap', 'wordCloud': 'wordCloud'
        };
        return typeMap[mode] || 'chart';
    };

    const handleDownload = async (format) => {
        const typeName = getChartTypeName(localChartMode || 'column');
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
            let finalWidth = width;
            let finalHeight = height;

            const padding = 10; // Add some padding around the chart
            const minX = Math.min(0, bbox.x) - padding;
            const minY = Math.min(0, bbox.y) - padding;

            const legendDiv = chartContainerRef.current.querySelector('.custom-kendo-legend');
            if (legendDiv) {
                const legendItems = Array.from(legendDiv.children);
                if (legendItems.length > 0) {
                    const canvasHelper = document.createElement('canvas');
                    const ctxWrapper = canvasHelper.getContext('2d');
                    ctxWrapper.font = '12px sans-serif';

                    const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    legendGroup.setAttribute('transform', `translate(${minX + 10}, ${minY + height + 15})`);

                    let curX = 0;
                    let curY = 0;
                    let maxLegendWidth = finalWidth - 20;

                    legendItems.forEach(item => {
                        const box = item.querySelector('div');
                        const span = item.querySelector('span');
                        if (!box || !span) return;

                        const color = box.style.backgroundColor;
                        const text = span.textContent || span.innerText || '';
                        const textWidth = ctxWrapper.measureText(text).width;
                        const itemWidth = 10 + 6 + textWidth + 16;

                        if (curX + itemWidth > maxLegendWidth && curX > 0) {
                            curX = 0;
                            curY += 20;
                        }

                        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        rect.setAttribute('x', curX);
                        rect.setAttribute('y', curY + 2);
                        rect.setAttribute('width', 10);
                        rect.setAttribute('height', 10);
                        rect.setAttribute('fill', color);
                        rect.setAttribute('rx', 2);

                        const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        textNode.setAttribute('x', curX + 16);
                        textNode.setAttribute('y', curY + 11);
                        textNode.setAttribute('font-size', '12px');
                        textNode.setAttribute('fill', item.style.opacity === '0.4' ? '#94a3b8' : '#334155');
                        textNode.setAttribute('font-family', 'sans-serif');
                        textNode.textContent = text;

                        legendGroup.appendChild(rect);
                        legendGroup.appendChild(textNode);

                        curX += itemWidth;
                    });

                    const legendAddedHeight = curY + 30;
                    finalHeight += legendAddedHeight;
                    clonedSvg.appendChild(legendGroup);
                }
            }

            clonedSvg.setAttribute('viewBox', `${minX} ${minY} ${finalWidth} ${finalHeight}`);
            clonedSvg.setAttribute('width', finalWidth);
            clonedSvg.setAttribute('height', finalHeight);

            const svgString = new XMLSerializer().serializeToString(clonedSvg);
            if (format === 'svg') {
                const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                saveAs(blob, `${fileName}.svg`);
            } else if (format === 'png') {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    canvas.width = finalWidth * 2;
                    canvas.height = finalHeight * 2;
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
    

    const getTitle = () => {
        switch (type) {
            case 'table': return '표';
            case 'stats': return '통계';
            case 'chart': return '차트';
            default: return '';
        }
    };

    const getChartAllowedTypes = () => {
        const typeMap = {
            'column': ['column', 'bar'],
            'stackedColumn': ['stackedColumn', 'stacked100Column'],
            'line': ['line'],
            'pie': ['pie'],
            'donut': ['donut'],
            'radarArea': ['radarArea'],
            'funnel': ['funnel'],
            'scatterPoint': ['scatterPoint'],
            'area': ['area'],
            'map': ['map'],
            'heatmap': ['heatmap']
        };
        return typeMap[localChartMode] || typeMap['column'];
    };

    const getChartInitialType = () => {
        const typeMap = {
            'column': 'column',
            'bar': 'bar',
            'stackedColumn': 'stackedColumn',
            'line': 'line',
            'pie': 'pie',
            'donut': 'donut',
            'radarArea': 'radarArea',
            'funnel': 'funnel',
            'scatterPoint': 'scatterPoint',
            'area': 'area',
            'map': 'map',
            'heatmap': 'heatmap',
            'wordCloud': 'wordCloud'
        };
        return typeMap[localChartMode] || 'column';
    };

    const hasColLabel2 = resultData?.columns?.some(c => c.label2);
    const hasColLabel3 = resultData?.columns?.some(c => c.label3);
    const hasVarLabel = resultData?.columns?.some(c => c.var_label);
    const hasRowLabel2 = resultData?.rows?.some(r => r.label2 || r.var_label);

    const effectivePolicy = displayPolicy || { show_n: true, show_percent: true, n_digits: 0, percent_digits: 1 };
    const uiSettings = renderSettings || {};
    
    const gridBorder = `${uiSettings?.theme_grid_width || '1px'} ${uiSettings?.theme_grid_style || 'solid'} ${uiSettings?.theme_grid_color || '#e2e8f0'}`;
    const sectionBorder = `${uiSettings?.theme_section_separator_width || '2px'} ${uiSettings?.theme_section_separator_style || 'dashed'} ${uiSettings?.theme_section_separator_color || '#000'}`;
    const headerGroups = useMemo(() => {
        if (!resultData?.columns) return { row1: [], row2: [], row3: [], showRow2: false, showRow3: false };

        // Row 1 (var_label) grouping
        const row1 = [];
        resultData.columns.forEach((col, idx) => {
            const v = col.var_label || "";
            if (row1.length === 0 || row1[row1.length - 1].label !== v) {
                row1.push({ label: v, count: 1, startIndex: idx });
            } else {
                row1[row1.length - 1].count++;
            }
        });

        // Row 2 (label2) grouping
        const row2 = [];
        resultData.columns.forEach((col, idx) => {
            const v = col.label2 || "";
            if (row2.length === 0 || row2[row2.length - 1].label !== v) {
                row2.push({ label: v, count: 1, startIndex: idx });
            } else {
                row2[row2.length - 1].count++;
            }
        });

        // Row 3 (label3) grouping
        const row3 = [];
        resultData.columns.forEach((col, idx) => {
            const v = col.label3 || "";
            if (row3.length === 0 || row3[row3.length - 1].label !== v) {
                row3.push({ label: v, count: 1, startIndex: idx });
            } else {
                row3[row3.length - 1].count++;
            }
        });

        // Initialize rowSpan
        row1.forEach(g => g.rowSpan = 1);
        row3.forEach(g => g.rowSpan = 1);
        row2.forEach(g => g.rowSpan = 1);

        // Row 1 (var_label) spans into Row 3 (label3) and potentially Row 2 (label2)
        row1.forEach(g1 => {
            if (!g1.label) return;
            const rangeStart = g1.startIndex;
            const rangeEnd = g1.startIndex + g1.count;

            const matchingRow3Groups = row3.filter(g3 => g3.startIndex >= rangeStart && (g3.startIndex + g3.count) <= rangeEnd);
            const matchingRow2Groups = row2.filter(g2 => g2.startIndex >= rangeStart && (g2.startIndex + g2.count) <= rangeEnd);

            if (matchingRow3Groups.length === 1 && matchingRow2Groups.length === 1) {
                const l1 = String(g1.label).replace(/[\r\n\t\s]+/g, ' ').trim();
                const l3 = String(matchingRow3Groups[0].label).replace(/[\r\n\t\s]+/g, ' ').trim();
                const l2 = String(matchingRow2Groups[0].label).replace(/[\r\n\t\s]+/g, ' ').trim();

                if (l1 !== "") {
                    if (hasColLabel3 && hasColLabel2) {
                        if (l1 === l3) {
                            g1.rowSpan = 2;
                            if (l1 === l2) g1.rowSpan = 3;
                        } else if (l1 === l2 && (l3 === "")) {
                            g1.rowSpan = 3;
                        }
                    } else if (hasColLabel3) {
                        if (l1 === l3) g1.rowSpan = 2;
                    } else if (hasColLabel2) {
                        if (l1 === l2) g1.rowSpan = 2;
                    }
                }
            }
        });

        // Row 3 (label3) spans into Row 2 (label2)
        row3.forEach(g3 => {
            if (!g3.label) return;
            const rangeStart = g3.startIndex;
            const rangeEnd = g3.startIndex + g3.count;

            const matchingRow2Groups = row2.filter(g2 => g2.startIndex >= rangeStart && (g2.startIndex + g2.count) <= rangeEnd);
            if (matchingRow2Groups.length === 1) {
                const l3 = String(g3.label).replace(/[\r\n\t\s]+/g, ' ').trim();
                const l2 = String(matchingRow2Groups[0].label).replace(/[\r\n\t\s]+/g, ' ').trim();
                if (l3 === l2 && l2 !== "" && hasColLabel2) {
                    g3.rowSpan = 2;
                }
            }
        });

        // Determine if Row 3 and Row 2 should be rendered based on non-spanned content
        const hasUnspannedRow3 = row3.some(g3 => {
            if (!g3.label) return false;
            return !row1.some(g1 => g1.rowSpan >= 2 && g1.startIndex <= g3.startIndex && (g1.startIndex + g1.count) >= (g3.startIndex + g3.count));
        });

        const hasUnspannedRow2 = row2.some(g2 => {
            if (!g2.label) return false;
            // Check if Row 1 spans Row 2 OR Row 3 spans Row 2
            const coveredByRow1 = row1.some(g1 => g1.rowSpan >= 3 && g1.startIndex <= g2.startIndex && (g1.startIndex + g1.count) >= (g2.startIndex + g2.count));
            const coveredByRow3 = row3.some(g3 => g3.rowSpan >= 2 && g3.startIndex <= g2.startIndex && (g3.startIndex + g3.count) >= (g2.startIndex + g2.count));
            return !coveredByRow1 && !coveredByRow3;
        });

        const showRow3 = hasUnspannedRow3 || row1.some(g1 => g1.rowSpan === 1 && hasColLabel3);
        const showRow2 = hasUnspannedRow2 || row3.some(g3 => g3.rowSpan === 1 && hasColLabel2) || row1.some(g1 => g1.rowSpan < 3 && hasColLabel2 && !hasColLabel3);

        return { row1, row2, row3, showRow2, showRow3 };
    }, [resultData?.columns, hasVarLabel, hasColLabel2, hasColLabel3]);

    if (!isOpen) return null;

    return (
        <div className="fullscreen-modal-overlay" onClick={onClose}>
            <div className="fullscreen-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="fullscreen-modal-header">
                    <div className="fullscreen-modal-title-wrapper">
                        <div className="fullscreen-modal-title-bar"></div>
                        <h3 className="fullscreen-modal-title">{getTitle()}</h3>
                    </div>
                    <div className="fullscreen-modal-actions">
                        {type === 'chart' && (
                            <div className="fullscreen-chart-toolbar">
                                <div className="download-menu-container" ref={downloadMenuRef}>
                                    <button
                                        className={`view-option-btn download-btn ${showDownloadMenu ? 'active' : ''}`}
                                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                        title="차트 다운로드"
                                    >
                                        <Download size={18} />
                                    </button>
                                    {showDownloadMenu && (
                                        <div className="download-dropdown">
                                            <button onClick={() => handleDownload('png')}>PNG (이미지)</button>
                                            <button onClick={() => handleDownload('svg')}>SVG (PPT 용)</button>
                                        </div>
                                    )}
                                </div>
                                <div className="download-menu-container" ref={paletteMenuRef}>
                                    <button
                                        className={`view-option-btn ${isPaletteMenuOpen ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setIsPaletteMenuOpen(!isPaletteMenuOpen); }}
                                        title="색상 테마 설정"
                                    >
                                        {(() => {
                                            const theme = CHART_THEME_OPTIONS.find(opt => opt.id === localPaletteId) || CHART_THEME_OPTIONS[0];
                                            const colors = theme.preview;
                                            return (
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    background: `conic-gradient(${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[0]})`,
                                                    border: '1px solid #e2e8f0'
                                                }}></div>
                                            );
                                        })()}
                                    </button>
                                    {isPaletteMenuOpen && (
                                        <div className="download-dropdown" style={{ top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '160px', zIndex: 1100 }}>
                                            {CHART_THEME_OPTIONS.map((option) => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => {
                                                        setLocalPaletteId(option.id);
                                                        setPaletteId(option.id);
                                                        setIsPaletteMenuOpen(false);
                                                    }}
                                                    className={localPaletteId === option.id ? 'active' : ''}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    <div style={{ display: 'flex', gap: '2px' }}>
                                                        {option.preview.map((color, idx) => (
                                                            <div key={idx} style={{ width: '8px', height: '8px', borderRadius: '1px', background: color }}></div>
                                                        ))}
                                                    </div>
                                                    {option.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="toolbar-divider"></div>
                                <button className={`view-option-btn ${!localChartMode || localChartMode === 'column' ? 'active' : ''}`} onClick={() => setLocalChartMode('column')} title="막대형"><BarChart2 size={18} /></button>
                                <button className={`view-option-btn ${localChartMode === 'stackedColumn' || localChartMode === 'stacked100Column' ? 'active' : ''}`} onClick={() => setLocalChartMode('stackedColumn')} title="누적 막대형"><Layers size={18} /></button>
                                <button className={`view-option-btn ${localChartMode === 'line' ? 'active' : ''}`} onClick={() => setLocalChartMode('line')} title="선형"><LineChart size={18} /></button>
                                <button className={`view-option-btn ${localChartMode === 'pie' ? 'active' : ''}`} onClick={() => setLocalChartMode('pie')} title="원형"><PieChart size={18} /></button>
                                <button className={`view-option-btn ${localChartMode === 'donut' ? 'active' : ''}`} onClick={() => setLocalChartMode('donut')} title="도넛형"><Donut size={18} /></button>
                                <button className={`view-option-btn ${localChartMode === 'radarArea' ? 'active' : ''}`} onClick={() => setLocalChartMode('radarArea')} title="방사형"><Aperture size={18} /></button>
                                <button className={`view-option-btn ${localChartMode === 'scatterPoint' ? 'active' : ''}`} onClick={() => setLocalChartMode('scatterPoint')} title="점도표"><MoreHorizontal size={18} /></button>
                                <button className={`view-option-btn ${localChartMode === 'area' ? 'active' : ''}`} onClick={() => setLocalChartMode('area')} title="영역형"><AreaChart size={18} /></button>
                                <button className={`view-option-btn ${localChartMode === 'heatmap' ? 'active' : ''}`} onClick={() => setLocalChartMode('heatmap')} title="히트맵"><LayoutGrid size={18} /></button>
                                <button className={`view-option-btn ${localChartMode === 'wordCloud' ? 'active' : ''}`} onClick={() => setLocalChartMode('wordCloud')} title="워드클라우드"><Cloud size={18} /></button>
                            </div>
                        )}

                        {type === 'table' && (
                            <div className="fullscreen-table-toolbar">
                                <div className="display-mode-select">
                                    <div className="custom-filter-wrapper" ref={displayMenuRef}>
                                        <div className="custom-filter-trigger modal-trigger" onClick={() => setIsDisplayMenuOpen(!isDisplayMenuOpen)}>
                                            <span className="trigger-text">
                                                {localDisplayMode === 'all' ? '전체' : localDisplayMode === 'value' ? '사례수' : '퍼센트'}
                                            </span>
                                            <ChevronDown size={14} className="trigger-icon" />
                                        </div>
                                        {isDisplayMenuOpen && (
                                            <div className="custom-filter-menu modal-menu">
                                                {['all', 'value', 'percent'].map(m => (
                                                    <div
                                                        key={m}
                                                        className={`custom-filter-item ${localDisplayMode === m ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            if (setDisplayMode) setDisplayMode(m);
                                                            setLocalDisplayMode(m);
                                                            setIsDisplayMenuOpen(false);
                                                        }}
                                                    >
                                                        <span className="filter-text">{m === 'all' ? '전체' : m === 'value' ? '사례수' : '퍼센트'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <button className="fullscreen-modal-close-btn" onClick={onClose} title="닫기">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className={`fullscreen-modal-content ${type === 'chart' ? 'chart-view' : ''}`}>
                    {type === 'table' && resultData && (
                        <div className="fullscreen-table-wrapper" style={{ width: '100%', overflowX: 'auto' }}>

              <style>{`
                  .fullscreen-table-wrapper .cross-table {
                      border-top: ${uiSettings?.theme_table_outer_top_width || '0px'} ${uiSettings?.theme_table_outer_top_style || 'none'} ${uiSettings?.theme_table_outer_top_color || 'transparent'} !important;
                      border-bottom: ${uiSettings?.theme_table_outer_bottom_width || '0px'} ${uiSettings?.theme_table_outer_bottom_style || 'none'} ${uiSettings?.theme_table_outer_bottom_color || 'transparent'} !important;
                      border-left: ${uiSettings?.theme_table_outer_left_width || '0px'} ${uiSettings?.theme_table_outer_left_style || 'none'} ${uiSettings?.theme_table_outer_left_color || 'transparent'} !important;
                      border-right: ${uiSettings?.theme_table_outer_right_width || '0px'} ${uiSettings?.theme_table_outer_right_style || 'none'} ${uiSettings?.theme_table_outer_right_color || 'transparent'} !important;
                      color: ${uiSettings?.theme_text || '#0f172a'} !important;
                  }
                  .fullscreen-table-wrapper .cross-table th {
                      border-bottom: ${uiSettings?.theme_header_divider_width || '1px'} ${uiSettings?.theme_header_divider_style || 'solid'} ${uiSettings?.theme_header_divider_color || '#cbd5e1'} !important;
                      border-right: none !important;
                  }
                  .fullscreen-table-wrapper .cross-table th.sticky-col,
                  .fullscreen-table-wrapper .cross-table td.sticky-col {
                      border-right: ${uiSettings?.theme_stub_divider_width || '1px'} ${uiSettings?.theme_stub_divider_style || 'solid'} ${uiSettings?.theme_stub_divider_color || '#cbd5e1'} !important;
                  }
                  .fullscreen-table-wrapper .cross-table td {
                      border-right: none !important;
                      border-bottom: none !important;
                  }
                  .fullscreen-table-wrapper .cross-table td.sticky-col {
                      background-color: ${uiSettings?.theme_stub_header_bg || '#D9E1F2'} !important;
                      color: ${uiSettings?.theme_stub_header_fg || '#000'} !important;
                  }
              `}</style>

                            <table className="cross-table fullscreen-table" style={{ width: "max-content", tableLayout: "fixed", margin: 0 }}>
                                                <thead>
                                                    {(() => {
                                                        const headerRows = [];
                                                        const totalRows = (hasVarLabel ? 1 : 0) + (headerGroups.showRow2 ? 1 : 0) + (headerGroups.showRow3 ? 1 : 0) + 1;

                                                        if (hasVarLabel) {
                                                            headerRows.push(
                                                                <tr key="var-label-row">
                                                                    <th
                                                                        rowSpan={totalRows}
                                                                        colSpan={hasRowLabel2 ? 2 : 1}
                                                                        className="sticky-col sticky-l0"
                                                                        style={{
                                                                            background: uiSettings?.theme_primary || '#f8fafc',
                                                                            
                                                                            
                                                                            fontWeight: '700',
                                                                            color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                            fontSize: '11px',
                                                                            textAlign: 'center',
                                                                            verticalAlign: 'middle'
                                                                        }}
                                                                    >
                                                                        문항
                                                                    </th>
                                                                    {headerGroups.row1.map((group, i) => (
                                                                        <th key={i}
                                                                            colSpan={group.count}
                                                                            rowSpan={group.rowSpan}
                                                                            style={{
                                                                                background: uiSettings?.theme_primary || '#f8fafc',
                                                                                color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                                fontSize: '11px',
                                                                                textAlign: 'center',
                                                                                padding: '4px 12px',
                                                                                
                                                                                borderLeft: i > 0 ? gridBorder : 'none',
                                                                                whiteSpace: 'normal',
                                                                                wordBreak: 'break-all',
                                                                                verticalAlign: 'middle'
                                                                            }}
                                                                        >
                                                                            {group.label}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            );
                                                        }

                                                        if (headerGroups.showRow3) {
                                                            headerRows.push(
                                                                <tr key="col-label3-row">
                                                                    {!hasVarLabel && (
                                                                        <th
                                                                            rowSpan={totalRows}
                                                                            colSpan={hasRowLabel2 ? 2 : 1}
                                                                            className="sticky-col sticky-l0"
                                                                            style={{
                                                                                background: uiSettings?.theme_primary || '#f8fafc',
                                                                                
                                                                                
                                                                                fontWeight: '700',
                                                                                color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                                fontSize: '11px',
                                                                                textAlign: 'center',
                                                                                verticalAlign: 'middle'
                                                                            }}
                                                                        >
                                                                            문항
                                                                        </th>
                                                                    )}
                                                                    {headerGroups.row3.map((group, i) => {
                                                                        const isSpanned = headerGroups.row1.some(g1 => g1.rowSpan >= 2 && g1.startIndex <= group.startIndex && (g1.startIndex + g1.count) >= (group.startIndex + group.count));
                                                                        if (isSpanned) return null;

                                                                        return (
                                                                            <th key={i} colSpan={group.count} rowSpan={group.rowSpan} style={{ background: uiSettings?.theme_primary || '#f0f9ff',  color: uiSettings?.theme_primary_fg || '#1e3a8a', fontWeight: '700', fontSize: '11px', borderLeft: i > 0 ? gridBorder : 'none' }}>
                                                                                {group.label}
                                                                            </th>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        }

                                                        if (headerGroups.showRow2) {
                                                            headerRows.push(
                                                                <tr key="col-label2-row">
                                                                    {(!hasVarLabel && !headerGroups.showRow3) && (
                                                                        <th
                                                                            rowSpan={totalRows}
                                                                            colSpan={hasRowLabel2 ? 2 : 1}
                                                                            className="sticky-col sticky-l0"
                                                                            style={{
                                                                                background: uiSettings?.theme_primary || '#f8fafc',
                                                                                
                                                                                
                                                                                fontWeight: '700',
                                                                                color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                                fontSize: '11px',
                                                                                textAlign: 'center',
                                                                                verticalAlign: 'middle'
                                                                            }}
                                                                        >
                                                                            문항
                                                                        </th>
                                                                    )}
                                                                    {headerGroups.row2.map((group, i) => {
                                                                        // Check if spanning from row1 (rowSpan >= 3) OR row3 (rowSpan >= 2)
                                                                        const coveredByRow1 = headerGroups.row1.some(g1 => g1.rowSpan >= 3 && g1.startIndex <= group.startIndex && (g1.startIndex + g1.count) >= (group.startIndex + group.count));
                                                                        const coveredByRow3 = headerGroups.row3.some(g3 => g3.rowSpan >= 2 && g3.startIndex <= group.startIndex && (g3.startIndex + g3.count) >= (group.startIndex + group.count));
                                                                        if (coveredByRow1 || coveredByRow3) return null;

                                                                        return (
                                                                            <th key={i} colSpan={group.count} style={{ background: uiSettings?.theme_primary || '#f8fafc',  color: uiSettings?.theme_primary_fg || '#1e3a8a', fontWeight: '700', fontSize: '11px', borderLeft: i > 0 ? gridBorder : 'none' }}>
                                                                                {group.label}
                                                                            </th>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        }

                                                        // 마지막 라벨 행
                                                        headerRows.push(
                                                            <tr key="label-row">
                                                                {(!hasVarLabel && !headerGroups.showRow2 && !headerGroups.showRow3) && (
                                                                    <th
                                                                        rowSpan={totalRows}
                                                                        colSpan={hasRowLabel2 ? 2 : 1}
                                                                        className="sticky-col sticky-l0"
                                                                        style={{
                                                                            background: uiSettings?.theme_primary || '#f8fafc',
                                                                            
                                                                            
                                                                            fontWeight: '700',
                                                                            color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                            fontSize: '11px',
                                                                            textAlign: 'center',
                                                                            verticalAlign: 'middle'
                                                                        }}
                                                                    >
                                                                        문항
                                                                    </th>
                                                                )}
                                                                {resultData.columns.map((col, i) => (
                                                                    <th key={i} style={{ minWidth: '80px', background: uiSettings?.theme_primary || '#f8fafc',  color: uiSettings?.theme_primary_fg || '#64748b', fontSize: '11px', fontWeight: '600', borderLeft: i > 0 ? gridBorder : 'none' }}>
                                                                        {col?.label ?? col}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        );

                                                        return headerRows;
                                                    })()}
                                                </thead>
                                                <tbody>
                                                    {resultData.rows.map((row, i) => {
                                                        const isSingleVal = row.type === 'stat' || row.stat_type;
                                                        const isHideAll = row.hide === 'all' || row.hide === 'all ';
                                                        const isHideN = row.hide === 'n' || isHideAll || effectivePolicy?.show_n === false;
                                                        const isHideP = row.hide === 'p' || isHideAll || effectivePolicy?.show_percent === false;
                                                        const labelColor = row.color || 'inherit';

                                                        let rN = effectivePolicy?.n_digits ?? 0;
                                                        let rP = effectivePolicy?.percent_digits ?? 1;
                                                        if (row.round !== undefined && row.round !== null && row.round !== '') {
                                                            rN = Number(row.round);
                                                            rP = Number(row.round);
                                                        }

                                                        const formatN = (val) => val === null || val === undefined || val === '' ? '-' : Number(val).toLocaleString(undefined, { minimumFractionDigits: rN, maximumFractionDigits: rN });
                                                        const formatP = (val) => val === null || val === undefined || val === '' ? '-' : Number(val).toLocaleString(undefined, { minimumFractionDigits: rP, maximumFractionDigits: rP });

                                                        const isBaseRow = String(row.row_role ?? "").toLowerCase() === "base" || String(row.label ?? "").toLowerCase() === "base" || row.is_base;
                                                        const isSectionAgg = ['top', 'bottom', 'mean', 'std'].some(role => String(row.row_role ?? row.stat_type ?? "").toLowerCase().includes(role));
                                                        const topBorderAttr = isBaseRow ? 'none' : (isSectionAgg ? sectionBorder : gridBorder);

                                                        return (
                                                        <tr key={i}>
                                                            {hasRowLabel2 && (
                                                                <td
                                                                    className="label-cell row-group-label sticky-col sticky-l0"
                                                                    style={{
                                                                        display: (i === 0 || (resultData.rows[i - 1].label2 || resultData.rows[i - 1].var_label) !== (row.label2 || row.var_label)) ? 'table-cell' : 'none',
                                                                        verticalAlign: 'middle',
                                                                        background: uiSettings?.theme_primary || '#f8fafc',
                                                                        color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                        fontSize: '11px',
                                                                        fontWeight: '700',
                                                                        textAlign: 'center',
                                                                        borderTop: topBorderAttr,
                                                                        whiteSpace: 'normal',
                                                                        wordBreak: 'break-all'
                                                                    }}
                                                                    rowSpan={resultData.rows.filter(r => (r.label2 || r.var_label) === (row.label2 || row.var_label)).length}
                                                                >
                                                                    {row.label2 || row.var_label}
                                                                </td>
                                                            )}
                                                            <td className={`label-cell sticky-col ${hasRowLabel2 ? 'sticky-l1' : 'sticky-l0'}`} style={{ textAlign: 'left', fontSize: '11px', color: labelColor, borderTop: topBorderAttr }}>{row.label}</td>
                                                            {row.values.map((v, j) => (
                                                                <td
                                                                    key={j}
                                                                    className={`${v.sig_vs_total === 'up' ? 'sig-highlight-up' : v.sig_vs_total === 'down' ? 'sig-highlight-down' : ''}`}
                                                                    style={{ textAlign: 'right', position: 'relative', borderLeft: j > 0 ? gridBorder : 'none', borderTop: topBorderAttr }}
                                                                >
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', width: '100%', color: labelColor }}>
                                                                        {isHideAll ? null : isSingleVal ? (
                                                                            <span className="cell-value-single" style={{ fontWeight: '600' }}>
                                                                                {row.prefix || ''}{formatN(v.count)}{row.postfix || ''}
                                                                            </span>
                                                                        ) : displayMode === 'all' ? (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                                                {!isHideN && <span className="cell-value">{formatN(v.count)}</span>}
                                                                                {!isHideP && <span className="cell-pct">{row.prefix || ''}{formatP(v.percent)}%{row.postfix || ''}</span>}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="cell-value-single">
                                                                                {displayMode === 'value' && !isHideN ? formatN(v.count) : null}
                                                                                {displayMode === 'percent' && !isHideP ? `${row.prefix || ''}${formatP(v.percent)}%${row.postfix || ''}` : null}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                        </div>
                    )}

                    {type === 'stats' && resultData && resultData.stats && (
                        <div className="fullscreen-table-wrapper" style={{ width: '100%', overflowX: 'auto' }}>
                            <table className="cross-table fullscreen-table" style={{ width: 'max-content', minWidth: '100%', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th rowSpan={(hasVarLabel ? 1 : 0) + (hasColLabel2 ? 1 : 0) + (hasColLabel3 ? 1 : 0) + 1} colSpan={hasRowLabel2 ? 2 : 1} className="fullscreen-table-header-sticky" style={{ zIndex: 40, top: 0, left: 0, height: (hasVarLabel ? 25 : 0) + (hasColLabel2 ? 25 : 0) + (hasColLabel3 ? 25 : 0) + 36, borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', verticalAlign: 'middle', textAlign: 'center' }}>통계</th>
                                        {hasVarLabel && (() => {
                                            const varGroups = [];
                                            resultData.columns.forEach(col => {
                                                const var_label = col.var_label || '';
                                                const label3 = col.label3 || '';
                                                const label2 = col.label2 || '';

                                                let rowSpan = 1;
                                                if (var_label) {
                                                    const matchL3 = hasColLabel3 && (var_label === label3);
                                                    const matchL2 = hasColLabel2 && (var_label === label2);
                                                    const emptyL3 = hasColLabel3 && (label3 === "" || label3 === null);

                                                    if (hasColLabel3 && hasColLabel2) {
                                                        if (matchL3 && matchL2) rowSpan = 3;
                                                        else if (matchL3) rowSpan = 2;
                                                        else if (matchL2 && emptyL3) rowSpan = 3;
                                                    } else if (hasColLabel3) {
                                                        if (matchL3) rowSpan = 2;
                                                    } else if (hasColLabel2) {
                                                        if (matchL2) rowSpan = 2;
                                                    }
                                                }

                                                if (varGroups.length > 0 && varGroups[varGroups.length - 1].var_label === var_label) {
                                                    varGroups[varGroups.length - 1].colspan += 1;
                                                    varGroups[varGroups.length - 1].rowSpan = Math.min(varGroups[varGroups.length - 1].rowSpan, rowSpan);
                                                } else {
                                                    varGroups.push({ var_label, colspan: 1, rowSpan });
                                                }
                                            });
                                            return varGroups.map((group, idx) => (
                                                <th key={`fs-stat-var-group-${idx}`} colSpan={group.colspan} rowSpan={group.rowSpan} className="fullscreen-table-header" style={{ fontWeight: 'bold', top: 0, height: `${group.rowSpan * 25}px`, zIndex: 20, background: '#dbeafe', color: '#1e40af', fontSize: '11px' }}>
                                                    {group.var_label}
                                                </th>
                                            ));
                                        })()}
                                        {!hasVarLabel && hasColLabel3 && (() => {
                                            const colGroups3 = [];
                                            resultData.columns.forEach(col => {
                                                const label3 = col.label3 || '';
                                                if (colGroups3.length > 0 && colGroups3[colGroups3.length - 1].label3 === label3) {
                                                    colGroups3[colGroups3.length - 1].colspan += 1;
                                                } else {
                                                    colGroups3.push({ label3, colspan: 1 });
                                                }
                                            });
                                            return colGroups3.map((group, idx) => (
                                                <th key={`fs-stat-group3-top-${idx}`} colSpan={group.colspan} className="fullscreen-table-header" style={{ fontWeight: 'bold', top: 0, height: '30px', zIndex: 20 }}>
                                                    {group.label3}
                                                </th>
                                            ));
                                        })()}
                                        {!hasVarLabel && !hasColLabel3 && hasColLabel2 && (() => {
                                            const colGroups = [];
                                            resultData.columns.forEach(col => {
                                                const label2 = col.label2 || '';
                                                if (colGroups.length > 0 && colGroups[colGroups.length - 1].label2 === label2) {
                                                    colGroups[colGroups.length - 1].colspan += 1;
                                                } else {
                                                    colGroups.push({ label2, colspan: 1 });
                                                }
                                            });
                                            return colGroups.map((group, idx) => (
                                                <th key={`fs-stat-group-${idx}`} colSpan={group.colspan} className="fullscreen-table-header" style={{ fontWeight: 'bold', top: 0, height: '30px', zIndex: 20 }}>
                                                    {group.label2}
                                                </th>
                                            ));
                                        })()}
                                        {!hasVarLabel && !hasColLabel3 && !hasColLabel2 && resultData.columns.map((col, idx) => (
                                            <th key={`fs-stat-col-${idx}`} className="fullscreen-table-header" style={{ width: '180px', minWidth: '180px', top: 0, zIndex: 20, verticalAlign: 'middle', textAlign: 'center' }}>
                                                <div>{col?.label ?? col}</div>
                                                <div className="fullscreen-stats-n" style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                                                    N={resultData.stats.n?.[idx] || 0}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                    {hasColLabel3 && (
                                        <tr>
                                            {(() => {
                                                const colGroups3 = [];
                                                resultData.columns.forEach(col => {
                                                    const label3 = col.label3 || '';
                                                    const label2 = col.label2 || '';
                                                    const var_label = col.var_label || '';

                                                    const isSpannedByVar = (hasVarLabel && (var_label === label3 || (var_label === label2 && (label3 === "" || label3 === null) && hasColLabel2)));
                                                    let rowSpan = 1;
                                                    if (!isSpannedByVar && label3 === label2 && label3 !== "" && hasColLabel2) {
                                                        rowSpan = 2;
                                                    }

                                                    if (colGroups3.length > 0 && colGroups3[colGroups3.length - 1].label3 === label3) {
                                                        colGroups3[colGroups3.length - 1].colspan += 1;
                                                        colGroups3[colGroups3.length - 1].rowSpan = Math.min(colGroups3[colGroups3.length - 1].rowSpan, rowSpan);
                                                    } else {
                                                        colGroups3.push({ label3, colspan: 1, rowSpan, isSpannedByVar });
                                                    }
                                                });
                                                return colGroups3.map((group, idx) => {
                                                    if (group.isSpannedByVar) return null;
                                                    return (
                                                        <th key={`fs-stat-group3-${idx}`} colSpan={group.colspan} rowSpan={group.rowSpan} className="fullscreen-table-header" style={{ fontWeight: 'bold', top: '25px', height: `${group.rowSpan * 25}px`, zIndex: 20, borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', background: '#f0f9ff' }}>
                                                            {group.label3}
                                                        </th>
                                                    );
                                                });
                                            })()}
                                        </tr>
                                    )}
                                    {hasColLabel2 && (
                                        <tr>
                                            {(() => {
                                                const colGroups = [];
                                                resultData.columns.forEach(col => {
                                                    const label2 = col.label2 || '';
                                                    const label3 = col.label3 || '';
                                                    const var_label = col.var_label || '';

                                                    const coveredByVar = (hasVarLabel && var_label === label2 && (!hasColLabel3 || var_label === label3 || label3 === "" || label3 === null));
                                                    const coveredByLabel3 = (hasColLabel3 && label3 === label2 && label3 !== "");
                                                    const isSpanned = coveredByVar || coveredByLabel3;

                                                    if (colGroups.length > 0 && colGroups[colGroups.length - 1].label2 === label2) {
                                                        colGroups[colGroups.length - 1].colspan += 1;
                                                    } else {
                                                        colGroups.push({ label2, colspan: 1, isSpanned });
                                                    }
                                                });
                                                return colGroups.map((group, idx) => {
                                                    if (group.isSpanned) return null;
                                                    return (
                                                        <th key={`fs-stat-group2-${idx}`} colSpan={group.colspan} className="fullscreen-table-header" style={{ fontWeight: 'bold', top: (hasVarLabel && hasColLabel3) ? '50px' : (hasVarLabel || hasColLabel3) ? '25px' : '0', height: '25px', zIndex: 20, borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                                                            {group.label2}
                                                        </th>
                                                    );
                                                });
                                            })()}
                                        </tr>
                                    )}
                                    {((hasVarLabel && !hasColLabel2) || (hasVarLabel && hasColLabel2) || (!hasVarLabel && hasColLabel2) || hasColLabel3) && (
                                        <tr>
                                            {resultData.columns.map((col, idx) => (
                                                <th key={`fs-stat-label-${idx}`} className="fullscreen-table-header" style={{ top: (hasVarLabel && hasColLabel3 && hasColLabel2) ? '75px' : ((hasVarLabel && hasColLabel3) || (hasVarLabel && hasColLabel2) || (hasColLabel3 && hasColLabel2)) ? '50px' : (hasVarLabel || hasColLabel3 || hasColLabel2) ? '25px' : '0', height: '50px', zIndex: 20, verticalAlign: 'middle', textAlign: 'center' }}>
                                                    <div style={{ wordBreak: 'break-all' }}>{col?.label ?? col}</div>
                                                    <div className="fullscreen-stats-n" style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                                                        N={resultData.stats.n?.[idx] || 0}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {statsOptions.filter(opt => opt.checked).map((stat, statIdx) => {
                                        const statKey = stat.id.toLowerCase();
                                        const statValues = resultData.stats[statKey] || [];
                                        return (
                                            <tr key={statIdx}>
                                                <td colSpan={hasRowLabel2 ? 2 : 1} className="fullscreen-table-cell-sticky" style={{ left: 0, zIndex: 10, background: '#eff6ff', color: '#334155', fontWeight: 'bold', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                                                    {stat.label}
                                                </td>
                                                {statValues.map((val, colIdx) => (
                                                    <td key={colIdx} className="fullscreen-table-cell" style={{ width: '180px', minWidth: '180px', textAlign: 'center' }}>
                                                        {val === null || val === undefined || val === '' ? '-' : (typeof val === 'number' ? val.toFixed(2) : val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {type === 'chart' && (
                        <div className="fullscreen-chart-wrapper" ref={chartContainerRef} style={{ overflow: 'hidden', height: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <KendoChart
                                    data={localComputedChartData}
                                    seriesNames={localComputedSeriesNames}
                                    allowedTypes={getChartAllowedTypes()}
                                    initialType={getChartInitialType()}
                                    suffix={localComputedSuffix}
                                    paletteId={localPaletteId}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default FullscreenModal;
