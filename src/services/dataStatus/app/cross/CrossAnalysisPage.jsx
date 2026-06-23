import React, { useState, useEffect, useRef, memo, useMemo, useContext } from 'react';
import { Cloud, BarChart2, LineChart, PieChart, Donut, AreaChart, LayoutGrid, Radar, Layers, Percent, Filter, Aperture, MoveVertical, MoreHorizontal, Waves, GitCommitVertical, Target, X, Download, Copy, ChevronDown, Check } from 'lucide-react';
import { exportImage, exportSVG } from '@progress/kendo-drawing';
import { saveAs } from '@progress/kendo-file-saver';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import Toast from '../../../../components/common/Toast';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import KendoChart from '../../components/KendoChart';
import AdvancedFilterPopup from '../frequency/AdvancedFilterPopup';
import '../frequency/FrequencyAnalysisPage.css';
import '@progress/kendo-theme-default/dist/all.css';
import { CHART_THEME_OPTIONS } from '../../constants/chartThemes';
import { useSelector } from 'react-redux';
import CrossOptionModal from './CrossOptionModal';
import { FrequencyAnalysisPageApi } from '../frequency/FrequencyAnalysisPageApi';
import OverviewVariablePopup from '../frequency/OverviewVariablePopup';
import { RecodingPageApi } from '../recoding/RecodingPageApi';
import { Settings } from 'lucide-react';
import { VariablePageApi } from '../variable/VariablePageApi';
import PageListPopup from '../variable/PageListPopup';
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

const AggregationCard = memo(({ q, paletteId, setPaletteId }) => {
    const [chartMode, setChartMode] = useState('column');
    const [showChart, setShowChart] = useState(true);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [displayMode, setDisplayMode] = useState('all');
    const [toast, setToast] = useState({ show: false, message: '' });
    const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
    // const [paletteId, setPaletteId] = useState('default'); // Moved to parent
    const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
    const [showPercentSymbol, setShowPercentSymbol] = useState(false);
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const displayMenuRef = useRef(null);
    const paletteMenuRef = useRef(null);

    // 외부 영역 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
                setShowDownloadMenu(false);
            }
            if (displayMenuRef.current && !displayMenuRef.current.contains(event.target)) {
                setIsDisplayMenuOpen(false);
            }
            if (paletteMenuRef.current && !paletteMenuRef.current.contains(event.target)) {
                setIsPaletteMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 차트 타입명 매핑
    const handleCopyTable = React.useCallback(async () => {
        try {
            let headersText;
            if (q.columns) {
                const hasLabel2 = q.columns.some(col => col.label2);
                if (hasLabel2) {
                    let row1 = "코드\t항목\t";
                    let row2 = "\t\t";
                    let prevLabel2 = null;

                    q.columns.forEach((col) => {
                        const label2 = col.label2;
                        if (label2) {
                            if (label2 === prevLabel2) {
                                row1 += "\t"; // empty cell to continue span
                            } else {
                                row1 += `${label2}\t`;
                                prevLabel2 = label2;
                            }
                            row2 += `${col.label}\t`;
                        } else {
                            row1 += `${col.label}\t`;
                            row2 += `\t`;
                            prevLabel2 = null;
                        }
                    });
                    row1 += "합계";
                    headersText = `${row1}\n${row2}`;
                } else {
                    headersText = "코드\t항목\t" + q.columns.map(c => c.label).join('\t') + "\t합계";
                }
            } else {
                headersText = "코드\t항목\t사례수\t합계";
            }

            let rowsText = q.data.map(row => {
                let rowText = `${row.value ?? '-'}\t${row.name}\t`;
                if (q.columns) {
                    const rowValues = q.columns.map(col => {
                        const count = row[col.key] ?? 0;
                        const pct = row[`${col.key}_pct`];
                        if (displayMode === 'value') return `${count}`;
                        if (displayMode === 'percent') return pct !== undefined ? `${pct}%` : '-';
                        return pct !== undefined ? `${count} (${pct}%)` : `${count}`;
                    });
                    rowText += rowValues.join('\t') + `\t${row.total}`;
                } else {
                    rowText += `${row.total || 0}\t${row.total || 0}`;
                }
                return rowText;
            }).join('\n');

            await navigator.clipboard.writeText(`${headersText}\n${rowsText}`);

            setToast(prev => ({ ...prev, show: false }));
            setTimeout(() => {
                setToast({ show: true, message: "표 복사 완료 (Ctrl+V)" });
            }, 50);
        } catch (e) {
            console.error(e);
            setToast(prev => ({ ...prev, show: false }));
            setTimeout(() => {
                setToast({ show: true, message: "복사 실패" });
            }, 50);
        }
    }, [q, displayMode]);

    const getChartTypeName = (mode) => {
        const typeMap = {
            'column': 'column',
            'bar': 'bar',
            'stackedColumn': 'stacked_column',
            'stacked100Column': 'stacked_100_column',
            'line': 'line',
            'pie': 'pie',
            'donut': 'donut',
            'radarArea': 'radar',
            'funnel': 'funnel',
            'scatterPoint': 'scatter',
            'area': 'area',
            'heatmap': 'heatmap'
        };
        return typeMap[mode] || 'chart';
    };

    const handleDownload = async (format) => {
        if (!chartContainerRef.current) {
            alert('차트를 찾을 수 없습니다.');
            return;
        }

        try {
            // 차트 DOM 요소 찾기
            const chartElement = chartContainerRef.current.querySelector('.k-chart');

            if (!chartElement) {
                alert('차트를 찾을 수 없습니다.');
                return;
            }

            // 차트 내 SVG 요소 찾기
            const svgElement = chartElement.querySelector('svg');

            if (!svgElement) {
                alert('차트 SVG를 찾을 수 없습니다.');
                return;
            }

            // SVG 해상도 추출
            const bbox = svgElement.getBBox();
            const viewBox = svgElement.getAttribute('viewBox');
            const rect = svgElement.getBoundingClientRect();

            const padding = 20;
            let width, height;
            let minX = 0, minY = 0;

            if (viewBox) {
                const [vx, vy, vbWidth, vbHeight] = viewBox.split(' ').map(Number);
                minX = vx;
                minY = vy;
                width = vbWidth;
                height = vbHeight;
            } else {
                minX = Math.min(0, bbox.x) - padding;
                minY = Math.min(0, bbox.y) - padding;
                width = Math.max(bbox.width, rect.width) + padding * 2;
                height = Math.max(bbox.height, rect.height) + padding * 2;
            }

            // SVG 복제 및 설정
            const clonedSvg = svgElement.cloneNode(true);
            let finalWidth = width;
            let finalHeight = height;

            // HTML 범례가 있으면 SVG의 하단에 수동으로 그려 넣음 (SVG/PNG 다운로드 모두 적용)
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
                // SVG 파일 다운로드
                const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const chartTypeName = getChartTypeName(chartMode);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${q.id}_${chartTypeName}.svg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else if (format === 'png') {
                // PNG 다운로드를 위해 캔버스 변환
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    // 캔버스를 SVG 크기에 맞춤
                    canvas.width = finalWidth * 2; // 화질 저하 방지를 위해 2배 확대
                    canvas.height = finalHeight * 2;

                    // 흰색 배경 채우기
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // 이미지 그리기
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        const chartTypeName = getChartTypeName(chartMode);
                        saveAs(blob, `${q.id}_${chartTypeName}.png`);
                    });
                };

                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
            }

            setShowDownloadMenu(false);
        } catch (error) {
            console.error('Chart export error:', error);
            alert('차트 다운로드 중 오류가 발생했습니다.');
        }
    };

    const { hasLabel2, headerGroups } = useMemo(() => {
        if (!q.columns) return { hasLabel2: false, headerGroups: [] };
        const hasL2 = q.columns.some(col => col.label2);
        if (!hasL2) return { hasLabel2: false, headerGroups: [] };

        const groups = [];
        let currentGroup = null;

        q.columns.forEach((col) => {
            const label2 = col.label2;
            if (label2) {
                if (currentGroup && currentGroup.label2 === label2 && currentGroup.isGroup) {
                    currentGroup.span += 1;
                    currentGroup.cols.push(col);
                } else {
                    if (currentGroup) groups.push(currentGroup);
                    currentGroup = { isGroup: true, label2, span: 1, cols: [col] };
                }
            } else {
                if (currentGroup) {
                    groups.push(currentGroup);
                    currentGroup = null;
                }
                groups.push({ isGroup: false, span: 1, cols: [col] });
            }
        });
        if (currentGroup) groups.push(currentGroup);

        return { hasLabel2: true, headerGroups: groups };
    }, [q.columns]);

    return (
        <div id={q.id} className="agg-card">
            <Toast
                show={toast.show}
                message={toast.message}
                onClose={() => setToast(prev => ({ ...prev, show: false }))}
            />
            <div className="agg-card-header" style={{ gap: '32px' }}>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', minWidth: 0, gap: '16px' }}>
                    <div className="agg-card-title-group" style={{ flex: 1, minWidth: 0 }}>
                        <div className="agg-card-id">{q.label}</div>
                        <div className="agg-card-label" style={{ whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word', lineHeight: '1.4' }}>{q.id}</div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div className="custom-filter-wrapper" ref={displayMenuRef} style={{ position: 'relative', width: '85px' }}>
                            <div
                                className={`custom-filter-trigger ${isDisplayMenuOpen ? 'open' : ''}`}
                                onClick={() => setIsDisplayMenuOpen(!isDisplayMenuOpen)}
                                style={{
                                    height: '36px',
                                    padding: '0 8px 0 10px',
                                    gap: '4px',
                                    background: '#fff',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#495057',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    userSelect: 'none'
                                }}
                            >
                                <span className="trigger-text">
                                    {displayMode === 'all' ? '전체' : displayMode === 'value' ? '사례수' : '퍼센트'}
                                </span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trigger-icon" style={{ flexShrink: 0 }}>
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>

                            {isDisplayMenuOpen && (
                                <div className="custom-filter-menu" style={{
                                    position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                                    width: '100%',
                                    padding: '4px',
                                    background: '#fff', border: '1px solid #e2e8f0',
                                    borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    zIndex: 1000, overflow: 'hidden'
                                }}>
                                    {[{ label: '전체', value: 'all' }, { label: '사례수', value: 'value' }, { label: '퍼센트', value: 'percent' }].map((item) => (
                                        <div
                                            key={item.value}
                                            onClick={() => {
                                                setDisplayMode(item.value);
                                                setIsDisplayMenuOpen(false);
                                            }}
                                            style={{
                                                padding: '6px 8px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                color: displayMode === item.value ? '#3b82f6' : '#495057',
                                                background: displayMode === item.value ? '#eff6ff' : 'transparent',
                                                transition: 'background 0.1s',
                                                textAlign: 'center',
                                                borderRadius: '4px',
                                                userSelect: 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (displayMode !== item.value) e.currentTarget.style.background = '#f1f5f9';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (displayMode !== item.value) e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleCopyTable}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', background: '#f8f9fa',
                                border: '1px solid #e9ecef', borderRadius: '6px',
                                fontSize: '13px', fontWeight: '500', color: '#495057',
                                cursor: 'pointer', flexShrink: 0, height: '36px'
                            }}
                        >
                            <Copy size={14} /> 표 복사
                        </button>
                    </div>
                </div>

                <div style={{ width: showChart ? 'calc(50% - 16px)' : 'auto', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <div className="view-options">
                        {/* 다운로드 버튼 */}
                        {showChart && (
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
                                        <button onClick={() => handleDownload('png')}>
                                            PNG (이미지)
                                        </button>
                                        <button onClick={() => handleDownload('svg')}>
                                            SVG (PPT용)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {showChart && (
                            <div className="download-menu-container" ref={paletteMenuRef} style={{ marginRight: '0' }}>
                                <button
                                    className={`view-option-btn ${isPaletteMenuOpen ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setIsPaletteMenuOpen(!isPaletteMenuOpen); }}
                                    title="색상 테마 설정"
                                >
                                    {(() => {
                                        const theme = CHART_THEME_OPTIONS.find(opt => opt.id === paletteId) || CHART_THEME_OPTIONS[0];
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
                                                onClick={() => { setPaletteId(option.id); setIsPaletteMenuOpen(false); }}
                                                className={paletteId === option.id ? 'active' : ''}
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
                        )}

                        {showChart && (
                            <button
                                className={`view-option-btn ${showPercentSymbol ? 'active' : ''}`}
                                onClick={() => setShowPercentSymbol(!showPercentSymbol)}
                                title="% 표출"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}
                            >
                                %
                            </button>
                        )}

                        <button
                            className={`view-option-btn close-chart-btn ${!showChart ? 'active' : ''}`}
                            onClick={() => setShowChart(false)}
                            title="차트 숨기기"
                        >
                            <X size={18} />
                        </button>
                        <button className={`view-option-btn ${showChart && (chartMode === 'column' || chartMode === 'bar') ? 'active' : ''}`} onClick={() => { setChartMode('column'); setShowChart(true); }} title="막대형"><BarChart2 size={18} /></button>
                        <button className={`view-option-btn ${showChart && (chartMode === 'stackedColumn' || chartMode === 'stacked100Column') ? 'active' : ''}`} onClick={() => { setChartMode('stackedColumn'); setShowChart(true); }} title="누적 막대형"><Layers size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'line' ? 'active' : ''}`} onClick={() => { setChartMode('line'); setShowChart(true); }} title="선형"><LineChart size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'pie' ? 'active' : ''}`} onClick={() => { setChartMode('pie'); setShowChart(true); }} title="원형"><PieChart size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'donut' ? 'active' : ''}`} onClick={() => { setChartMode('donut'); setShowChart(true); }} title="도넛형"><Donut size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'radarArea' ? 'active' : ''}`} onClick={() => { setChartMode('radarArea'); setShowChart(true); }} title="방사형"><Aperture size={18} /></button>
                        {/* <button className={`view-option-btn ${showChart && chartMode === 'funnel' ? 'active' : ''}`} onClick={() => { setChartMode('funnel'); setShowChart(true); }} title="깔때기 차트"><Filter size={18} /></button> */}
                        <button className={`view-option-btn ${showChart && chartMode === 'scatterPoint' ? 'active' : ''}`} onClick={() => { setChartMode('scatterPoint'); setShowChart(true); }} title="점도표"><MoreHorizontal size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'area' ? 'active' : ''}`} onClick={() => { setChartMode('area'); setShowChart(true); }} title="영역형"><AreaChart size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'heatmap' ? 'active' : ''}`} onClick={() => { setChartMode('heatmap'); setShowChart(true); }} title="히트맵"><LayoutGrid size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'wordCloud' ? 'active' : ''}`} onClick={() => { setChartMode('wordCloud'); setShowChart(true); }} title="워드클라우드"><Cloud size={18} /></button>
                    </div>
                </div>
            </div>
            <div className="agg-card-body">
                {/* 데이터 테이블 */}
                <div className="agg-table-container">
                    <table className="agg-table">
                        <thead>
                            {!q.columns ? (
                                <tr>
                                    <th className="sticky-col1">코드</th>
                                    <th className="sticky-col2">항목</th>
                                    <th>합계</th>
                                </tr>
                            ) : !hasLabel2 ? (
                                <tr>
                                    <th className="sticky-col1">코드</th>
                                    <th className="sticky-col2">항목</th>
                                    {q.columns.map(col => <th key={col.key}>{col.label}</th>)}
                                    <th>합계</th>
                                </tr>
                            ) : (
                                <>
                                    <tr>
                                        <th className="sticky-col1" rowSpan={2} style={{ verticalAlign: 'middle' }}>코드</th>
                                        <th className="sticky-col2" rowSpan={2} style={{ verticalAlign: 'middle' }}>항목</th>
                                        {headerGroups.map((g, i) => (
                                            g.isGroup ? (
                                                <th key={`group-${i}`} colSpan={g.span} style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', height: '39px' }}>
                                                    {g.label2}
                                                </th>
                                            ) : (
                                                <th key={`group-${i}`} rowSpan={2} style={{ background: '#f8fafc', verticalAlign: 'middle' }}>
                                                    {g.cols[0].label}
                                                </th>
                                            )
                                        ))}
                                        <th rowSpan={2} style={{ verticalAlign: 'middle' }}>합계</th>
                                    </tr>
                                    <tr>
                                        {headerGroups.flatMap((g) =>
                                            g.isGroup ? g.cols.map(col => (
                                                <th key={col.key} style={{ top: '39px', zIndex: 9 }}>{col.label}</th>
                                            )) : []
                                        )}
                                    </tr>
                                </>
                            )}
                        </thead>
                        <tbody>
                            {!q.isLoaded ? (
                                <tr>
                                    <td colSpan={(q.columns?.length || 1) + 3} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                                        데이터를 불러오는 중입니다...
                                    </td>
                                </tr>
                            ) : q.data.length === 0 ? (
                                <tr>
                                    <td colSpan={(q.columns?.length || 1) + 3} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                                        조회된 데이터가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                q.data.map((row, i) => (
                                    <tr key={i}>
                                        <td className="sticky-col1" style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', background: '#f8fafc' }}>{row.value || '-'}</td>
                                        <td className="sticky-col2" style={{ textAlign: 'left', fontSize: '12px', paddingLeft: '12px', fontWeight: '600', color: '#334155' }}>{row.name}</td>
                                        {q.columns ? q.columns.map(col => {
                                            const count = row[col.key] ?? 0;
                                            const pct = row[`${col.key}_pct`];
                                            return (
                                                <td key={col.key}>
                                                    {displayMode === 'all' && (
                                                        <>
                                                            {count}
                                                            {pct !== undefined && <span style={{ color: '#888', fontSize: '0.85em', marginLeft: '4px' }}>({pct}%)</span>}
                                                        </>
                                                    )}
                                                    {displayMode === 'value' && count}
                                                    {displayMode === 'percent' && (pct !== undefined ? `${pct}%` : '-')}
                                                </td>
                                            );
                                        }) : (
                                            <td>{row.total}</td>
                                        )}
                                        <td>{row.total}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 차트 영역 */}
                {showChart && (
                    <div className="agg-chart-container" ref={chartContainerRef}>
                        {!q.isLoaded ? (
                            <div style={{ color: '#888', fontSize: '13px' }}>데이터를 불러오는 중입니다...</div>
                        ) : q.data.length === 0 ? (
                            <div style={{ color: '#888', fontSize: '13px' }}>조회된 데이터가 없습니다.</div>
                        ) : (() => {
                            // ─── 차트 데이터 기준 (최종) ───────────────────────────────────
                            // 도넛(Donut) / 깔때기(Funnel) → 퍼센트(_pct)
                            // 그 외 모든 차트 (원형 포함)  → 사례수(count)
                            // ────────────────────────────────────────────────────────────────
                            const usePercentFields = ['donut', 'funnel'].includes(chartMode);

                            const chartSeries = q.columns
                                ? q.columns.map(col => ({
                                    field: usePercentFields ? `${col.key}_pct` : col.key,
                                    name: col.label2 ? `${col.label2} - ${col.label}` : col.label
                                }))
                                : [{ field: usePercentFields ? 'total_pct' : 'total', name: '전체' }];

                            // 차트별 허용 타입 (토글 제한)
                            let allowedTypes = [chartMode];
                            if (chartMode === 'column' || chartMode === 'bar') {
                                allowedTypes = ['column', 'bar'];
                            } else if (chartMode === 'stackedColumn' || chartMode === 'stacked100Column') {
                                allowedTypes = ['stackedColumn', 'stacked100Column'];
                            }

                            return (
                                <KendoChart
                                    key={`${q.id}-${chartMode}-${paletteId}`}
                                    data={q.data}
                                    seriesNames={chartSeries}
                                    initialType={chartMode}
                                    labelLimit={10}
                                    suffix={usePercentFields && showPercentSymbol ? "%" : ""}
                                    isPercent={usePercentFields}
                                    paletteId={paletteId}
                                    allowedTypes={allowedTypes}
                                />
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
});
AggregationCard.displayName = 'AggregationCard';

const CrossAnalysisPage = () => {
    const auth = useSelector((store) => store.auth);
    const { getOverviewList, getOverviewData } = FrequencyAnalysisPageApi();
    const [searchTerm, setSearchTerm] = useState('');
    const [optionModalOpen, setOptionModalOpen] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [sidebarPage, setSidebarPage] = useState(1);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const SIDEBAR_PAGE_SIZE = 20;

    const [currentPageId, setCurrentPageId] = useState(sessionStorage.getItem("pageId"));

    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const alertTimerRef = useRef(null);

    const { pageList: getPageList } = VariablePageApi();
    const [isPageListOpen, setIsPageListOpen] = useState(false);
    const [pageListData, setPageListData] = useState([]);

    const handleOpenPageList = async () => {
        const userId = auth?.user?.userId;
        const mergePn = sessionStorage.getItem("merge_pn");

        if (!userId || !mergePn) {
            modal.showErrorAlert("알림", "프로젝트 정보가 없습니다.");
            return;
        }

        try {
            const result = await getPageList.mutateAsync({ user: userId, pn: mergePn });
            if (result?.success === "777" && result.resultjson) {
                setPageListData(result.resultjson);
                setIsPageListOpen(true);
            }
        } catch (e) {
            console.error(e);
            modal.showErrorAlert("오류", "대시보드 목록 조회 중 오류가 발생했습니다.");
        }
    };

    const handlePageSelectedPopup = (page) => {
        const pageId = page.pageid || page.id;
        const pageTitle = page.title || page.name;
        sessionStorage.setItem("pageId", pageId);
        sessionStorage.setItem("pagetitle", pageTitle);
        setIsPageListOpen(false);
        window.location.reload();
    };

    // 고급 필터 팝업 상태
    const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
    const [filterLogic, setFilterLogic] = useState('');

    const [selectedFilters, setSelectedFilters] = useState(['전체']);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // 필터 상태 (이제 팝업으로 대체)
    const [isTotalFilterOpen, setIsTotalFilterOpen] = useState(false);
    const totalFilterRef = useRef(null);

    // 신규 필터 문항 선택 드롭다운 상태
    const [isVariableDropdownOpen, setIsVariableDropdownOpen] = useState(false);
    const [selectedVariableIds, setSelectedVariableIds] = useState(['answerStateCode']);
    const variableDropdownRef = useRef(null);

    // 베너 드롭다운 상태
    const [isBannerDropdownOpen, setIsBannerDropdownOpen] = useState(false);
    const [selectedBannerVariableIds, setSelectedBannerVariableIds] = useState([]);
    const bannerDropdownRef = useRef(null);
    const [bannerLogic, setBannerLogic] = useState('');
    const [bannerSearchTerm, setBannerSearchTerm] = useState('');

    const [globalPaletteId, setGlobalPaletteId] = useState('default');

    // 개요(Overview) 변수 관련 상태
    const [isOverviewPopupOpen, setIsOverviewPopupOpen] = useState(false);
    const [overviewVariables, setOverviewVariables] = useState([]);
    const [bannerVariables, setBannerVariables] = useState([]);
    const [originalVariables, setOriginalVariables] = useState([]);
    const { getRecodedList } = RecodingPageApi();
    const { getOriginalVariables } = VariablePageApi();

    const fetchOverviewVars = async () => {
        if (!auth?.user?.userId) return;
        const pageId = sessionStorage.getItem("pageId");
        if (!pageId) return;

        try {
            const result = await getRecodedList.mutateAsync({ user: auth.user.userId, pageid: pageId });
            if (result?.success === "777" && result.resultjson) {
                const overviewVars = Object.values(result.resultjson)
                    .filter(v => v.id.startsWith('overview_'))
                    .map(v => ({ ...v, label: v.label || v.id }));
                setOverviewVariables(overviewVars);

                setSelectedVariableIds(prev => {
                    const validIds = prev.filter(id => id === 'answerStateCode' || overviewVars.some(v => v.id === id));
                    if (validIds.length !== prev.length) {
                        const totalLogic = validIds.filter(id => id !== 'answerStateCode').map(id => overviewVars.find(ov => ov.id === id)?.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
                        setFilterLogic(totalLogic);
                    }
                    return validIds;
                });
            }
        } catch (error) {
            console.error("Failed to fetch overview variables:", error);
        }
    };

    const fetchBannerVars = async () => {
        if (!auth?.user?.userId) return;
        const pageId = sessionStorage.getItem("pageId");
        if (!pageId) return;

        try {
            const payload = {
                pageid: pageId,
                user: auth.user.userId,
                start: 0,
                limit: 10000
            };
            const result = await getOverviewList.mutateAsync(payload);
            if (result?.success === "777" && result.resultjson) {
                const overviewList = result.resultjson.tables || [];
                const bannerVars = overviewList.map(item => ({
                    id: item.table_id || item.id,
                    label: item.title || item.label || item.name || item.table_id || item.id,
                    logic: item.filter_expression || item.logic || ''
                }));
                setBannerVariables(bannerVars);

                setSelectedBannerVariableIds(prev => {
                    const validIds = prev.filter(id => bannerVars.some(v => v.id === id));
                    if (validIds.length !== prev.length) {
                        const totalLogic = validIds.map(id => bannerVars.find(ov => ov.id === id)?.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
                        setBannerLogic(totalLogic);
                    }
                    return validIds;
                });
            }
        } catch (error) {
            console.error("Failed to fetch banner variables:", error);
        }
    };

    const fetchOriginalVars = async () => {
        if (!auth?.user?.userId) return;
        const pageId = sessionStorage.getItem("pageId");
        if (!pageId) return;

        try {
            const result = await getOriginalVariables.mutateAsync({
                user: auth.user.userId,
                pageid: pageId
            });
            if (result?.success === "777" && result.resultjson) {
                const vars = Object.values(result.resultjson).map(item => ({
                    sysName: item.id,
                    label: item.label
                }));
                setOriginalVariables(vars);
            }
        } catch (error) {
            console.error("Failed to fetch original variables:", error);
        }
    };

    useEffect(() => {
        if (!auth?.user?.userId) return;

        const checkPid = () => {
            const pid = sessionStorage.getItem("pageId");
            setCurrentPageId(pid);
            if (pid) {
                fetchOverviewVars();
                fetchBannerVars();
                fetchOriginalVars();
                if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
            } else {
                if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
                alertTimerRef.current = setTimeout(() => {
                    const finalPid = sessionStorage.getItem("pageId");
                    setCurrentPageId(finalPid);
                    if (sessionStorage.getItem("merge_pn") && !finalPid) {
                        setQuestions([]); // 이전 문항 데이터 초기화
                        setActiveId(null);
                        modal.showAlert("알림", "선택된 대시보드 정보가 없습니다.", null, handleOpenPageList);
                    }
                }, 1000);
            }
        };

        checkPid();

        return () => {
            if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
        };
    }, [auth?.user?.userId]);

    const filterRef = useRef(null);
    const mainRef = useRef(null);
    const fetchingRef = useRef(new Set());
    const isClickingRef = useRef(false);
    const clickTimeoutRef = useRef(null);

    // 검색어 변경 시 페이지 초기화
    useEffect(() => {
        setSidebarPage(1);
    }, [searchTerm]);

    // 외부 영역 클릭 시 필터 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
            if (totalFilterRef.current && !totalFilterRef.current.contains(event.target)) {
                setIsTotalFilterOpen(false);
            }
            if (variableDropdownRef.current && !variableDropdownRef.current.contains(event.target)) {
                setIsVariableDropdownOpen(false);
            }
            if (bannerDropdownRef.current && !bannerDropdownRef.current.contains(event.target)) {
                setIsBannerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFilterToggle = (filterId) => {
        if (filterId === '전체') {
            setSelectedFilters(['전체']);
            return;
        }

        setSelectedFilters(prev => {
            let newFilters = prev.filter(f => f !== '전체');
            if (newFilters.includes(filterId)) {
                newFilters = newFilters.filter(f => f !== filterId);
            } else {
                newFilters = [...newFilters, filterId];
            }
            if (newFilters.length === 0) return ['전체'];
            return newFilters;
        });
    };

    const [questions, setQuestions] = useState([]);
    const isFetchingListRef = useRef(false);

    const parseOverviewList = (overviewList) =>
        overviewList.map(item => {
            const optionsList = item.options || item.info || [];
            const initialData = optionsList.length > 0
                ? optionsList.map((o, idx) => ({
                    name: o.label || o.value || o.name || `보기 ${idx + 1}`,
                    value: o.value !== undefined ? String(o.value) : (o.id || o.name),
                    label: o.label || o.name,
                    total: 0
                }))
                : [];

            const rawType = (item.type || '').toLowerCase();
            let color = 'default';
            if (rawType.includes('single')) color = 'single';
            else if (rawType.includes('multi')) color = 'multi';
            else if (rawType.includes('rank')) color = 'rank';
            else if (rawType.includes('minrank')) color = 'minrank';
            else if (rawType.includes('maxrank')) color = 'maxrank';
            else if (rawType.includes('scale')) color = 'scale';
            else if (rawType.includes('dummy')) color = 'dummy';
            else if (rawType.includes('custom')) color = 'custom';
            else if (rawType.includes('문자') || rawType.includes('open')) color = 'open-text';
            else if (rawType.includes('숫자')) color = 'open-num';

            return {
                id: item.table_id || item.id,
                target_id: item.id || item.table_id,
                label: item.title || item.label || item.name || item.table_id || item.id,
                n: 0,
                data: initialData,
                isLoaded: false,
                type: item.type,
                color: color
            };
        });

    const fetchQuestions = async (page) => {
        if (isFetchingListRef.current) return;
        if (!auth?.user?.userId) return;
        const pageId = sessionStorage.getItem("pageId");
        if (!pageId) return;

        isFetchingListRef.current = true;
        try {
            const start = (page - 1) * SIDEBAR_PAGE_SIZE;
            const payload = {
                pageid: pageId,
                user: auth.user.userId,
                start,
                limit: SIDEBAR_PAGE_SIZE,
                // 검색어가 있다면 API에 전달 (API 지원 여부에 따라)
                search: searchTerm
            };
            const result = await getOverviewList.mutateAsync(payload);
            if (result?.success === "777" && result.resultjson) {
                const overviewList = result.resultjson.tables || [];
                const newQuestions = parseOverviewList(overviewList);

                // 페이지별 데이터 교체 (서버사이드 페이징)
                setQuestions(newQuestions);

                // 목록이 갱신되면 항상 첫 번째 항목을 선택하고 스크롤을 맨 위로 이동
                if (newQuestions.length > 0) {
                    setActiveId(newQuestions[0].id);
                    if (mainRef.current) {
                        mainRef.current.scrollTo(0, 0);
                    }
                } else {
                    setActiveId(null);
                }

                // 전체 갯수 저장
                if (result.resultjson.total !== undefined) {
                    setTotalQuestions(result.resultjson.total);
                } else if (page === 1 && overviewList.length < SIDEBAR_PAGE_SIZE) {
                    setTotalQuestions(overviewList.length);
                } else if (page === 1) {
                    // total이 없을 경우 추측 (임시)
                    setTotalQuestions(1000);
                }
            }
        } catch (error) {
            console.error("Aggregation Variable Fetch Error:", error);
        } finally {
            isFetchingListRef.current = false;
        }
    };

    // 페이지 변경 시 재조회
    useEffect(() => {
        if (auth?.user?.userId) {
            fetchQuestions(sidebarPage);
        }
    }, [auth?.user?.userId, sidebarPage]);

    // 검색어 변경 시 1페이지로 리셋 및 재조회
    useEffect(() => {
        setSidebarPage(1);
        if (auth?.user?.userId) {
            fetchQuestions(1);
        }
    }, [searchTerm]);

    // 대시보드(페이지) 선택 팝업 닫힐 때 재조회
    useEffect(() => {
        const handlePageSelected = () => {
            if (!auth?.user?.userId) return;
            setCurrentPageId(sessionStorage.getItem("pageId"));
            setQuestions([]);
            setSidebarPage(1);
            setTotalQuestions(0);
            setActiveId(null);
            isFetchingListRef.current = false;
            fetchOverviewVars(); // 페이지 변경 시 오버뷰 변수도 다시 조회
            fetchOriginalVars();
            fetchQuestions(1);
        };
        window.addEventListener('pageSelected', handlePageSelected);
        return () => window.removeEventListener('pageSelected', handlePageSelected);
    }, [auth?.user?.userId]);

    // 필터 조건이나 배너 변경 시 데이터 로드 상태 초기화 하여 재조회 유도
    useEffect(() => {
        if (questions.length > 0) {
            setQuestions(prev => prev.map(q => ({ ...q, isLoaded: false })));
        }
    }, [filterLogic, selectedFilters, selectedVariableIds]);


    // 활성 아이템 기준 5개씩 데이터 분할 조회
    useEffect(() => {
        if (!activeId || questions.length === 0 || !auth?.user?.userId) return;

        const fetchChunkData = async () => {
            const index = questions.findIndex(q => q.id === activeId);
            if (index === -1) return;

            // 이미 로드된 문항이면 API를 다시 태우지 않음
            if (questions[index].isLoaded) return;

            const limit = 20;
            // 선택된 문항부터 limit개만큼 타겟으로 잡음
            const targetQuestions = questions.slice(index, index + limit);

            const tableIdsToSet = targetQuestions
                .filter(q => !q.isLoaded && !fetchingRef.current.has(q.id))
                .map(q => q.id);

            if (tableIdsToSet.length === 0) return;

            // 로딩 상태 등록 (중복 요청 방지, table_id 기준)
            tableIdsToSet.forEach(id => fetchingRef.current.add(id));

            try {
                const pageId = sessionStorage.getItem("pageId");
                const userId = auth.user.userId;
                const startTargetId = questions[index].target_id;

                const payload = {
                    pageid: pageId,
                    user: userId,
                    x_info: (() => {
                        const baseInfo = selectedVariableIds.length > 0 ? selectedVariableIds : (selectedFilters.includes('전체') ? [] : selectedFilters);
                        const displayIds = baseInfo.filter(id => id !== 'answerStateCode');
                        if (baseInfo.includes('answerStateCode')) {
                            displayIds.push('answerStateCode');
                        }
                        return displayIds;
                    })(), // 고급 필터 또는 배너 필터 적용
                    start: (sidebarPage - 1) * SIDEBAR_PAGE_SIZE + index,  // 전체 순번에 해당하는 인덱스
                    limit: limit, // 가져올 갯수
                    weight_col: "",
                    filter_expression: filterLogic, // 고급 필터 적용
                    include_stats: [],
                    search: searchTerm // 검색어 추가
                };

                const aggResult = await getOverviewData.mutateAsync(payload);
                if (aggResult?.success === "777" && aggResult.resultjson) {
                    const resultsArray = aggResult.resultjson.results || [];

                    setQuestions(prevQuestions => prevQuestions.map(q => {
                        if (!tableIdsToSet.includes(q.id)) return q;
                        const tableInfo = resultsArray.find(r => r.table_id === q.id);
                        if (!tableInfo) return { ...q, isLoaded: true };

                        const aggInfoRows = tableInfo.result.rows || [];
                        const aggInfoCols = tableInfo.result.columns || [];
                        const tableColumns = aggInfoCols.map(c => ({
                            key: c.key,
                            label: c.label || c.var_label || c.name || c.key,
                            label2: c.label2
                        }));

                        let optionRows = aggInfoRows;
                        const updatedData = optionRows.map(row => {
                            let rowData = {
                                name: row.label || row.var_label || row.name || row.key,
                                value: row.key === 'total' ? '' : (row.value ?? row.key)
                            };
                            let totalCount = 0;
                            if (tableColumns.length > 0) {
                                tableColumns.forEach(banner => {
                                    let val = 0;
                                    let pct = 0;
                                    if (row.cells && row.cells[banner.key]) {
                                        val = Number(row.cells[banner.key].count || 0);
                                        pct = Number(row.cells[banner.key].percent || 0);
                                    }
                                    rowData[banner.key] = val;
                                    rowData[`${banner.key}_pct`] = pct;
                                    totalCount += val;
                                });
                            } else {
                                let pct = 0;
                                if (row.cells && Object.keys(row.cells).length > 0) {
                                    const firstKey = Object.keys(row.cells)[0];
                                    totalCount = Number(row.cells[firstKey].count || 0);
                                    pct = Number(row.cells[firstKey].percent || 0);
                                } else {
                                    totalCount = Number(row.value || 0);
                                }
                                rowData['전체'] = totalCount;
                                rowData.total_pct = pct;
                            }
                            rowData.total = totalCount;
                            return rowData;
                        });

                        const columnsForUI = tableColumns.length > 0 ? tableColumns : [{ key: 'total', label: '전체' }];
                        return {
                            ...q,
                            n: updatedData.reduce((acc, cur) => acc + cur.total, 0),
                            columns: columnsForUI,
                            data: updatedData,
                            isLoaded: true
                        };
                    }));
                }
            } catch (error) {
                console.error("Aggregation Chunk Fetch Error:", error);
            } finally {
                tableIdsToSet.forEach(id => fetchingRef.current.delete(id));
            }
        };
        fetchChunkData();
    }, [activeId, questions, sidebarPage, auth?.user?.userId, selectedVariableIds]);

    const totalSidebarPages = Math.ceil(totalQuestions / SIDEBAR_PAGE_SIZE);

    const sidebarItems = useMemo(() => {
        return questions.map(q => ({
            id: q.id,
            name: q.id,
            label: q.label,
            type: q.type,
            color: q.color
        }));
    }, [questions]);

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalSidebarPages) return;
        setSidebarPage(newPage);
    };

    const scrollToId = (id) => {
        isClickingRef.current = true;
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

        // 현재 목록에 없는 문항이면 해당 문항이 포함될 구간을 재조회
        const existsInList = questions.some(q => q.id === id);
        if (!existsInList && hasMoreQuestions) {
            // 목록에 없으면 현재 listStart부터 추가 로드
            fetchQuestions(listStart);
        }

        const element = document.getElementById(id);
        if (element) {
            setActiveId(id);
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // DOM에 아직 없으면 state 업데이트 후 스크롤 시도
            setActiveId(id);
        }

        clickTimeoutRef.current = setTimeout(() => {
            isClickingRef.current = false;
        }, 1500);
    };

    // 사이드바 스크롤 끝 도달 시 추가 문항 로드 (페이징 방식에서는 사용 안 함)
    const handleSidebarScrollEnd = () => { };

    // 오른쪽 스크롤 시 왼쪽 사이드바 목록 자동 스크롤 및 페이지 동기화 (페이징 방식에서는 페이지 내에서만 동작)
    useEffect(() => {
        if (activeId && !isClickingRef.current) {
            const sidebarItemEl = document.getElementById(`sidebar-item-${activeId}`);
            if (sidebarItemEl) {
                sidebarItemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [activeId]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isClickingRef.current) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            {
                root: mainRef.current,
                rootMargin: '-40% 0px -60% 0px',
                threshold: 0
            }
        );

        const cards = document.querySelectorAll('.agg-card');
        cards.forEach((card) => observer.observe(card));

        return () => {
            cards.forEach((card) => observer.unobserve(card));
        };
    }, [questions]);

    return (
        <div className="aggregation-page" data-theme="data-dashboard">
            <DataHeader title="문항">
                <button className="data-header-btn" onClick={() => setOptionModalOpen(true)}>
                    <Settings size={16} />
                    <span>옵션 설정</span>
                </button>
            </DataHeader>
            {currentPageId && (
                <div className="aggregation-layout">
                    <SideBar
                        // title="문항 목록"
                        items={sidebarItems}
                        selectedId={activeId}
                        onItemClick={(item) => scrollToId(item.id)}
                        onSearch={setSearchTerm}
                        searchPlaceholder="문항을 검색하세요."
                        onScrollEnd={handleSidebarScrollEnd}
                        currentPage={sidebarPage}
                        totalPages={totalSidebarPages}
                        onPageChange={handlePageChange}
                    />

                    <div className="agg-main" ref={mainRef}>
                        {questions.length > 0 ? (
                            questions.map(q => (
                                <AggregationCard key={q.id} q={q} paletteId={globalPaletteId} setPaletteId={setGlobalPaletteId} />
                            ))
                        ) : (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                color: '#94a3b8',
                                fontSize: '15px',
                                background: '#fff',
                                borderRadius: '16px',
                                border: '1px dashed #e2e8f0'
                            }}>
                                <div style={{ fontSize: '40px' }}>🔍</div>
                                조회된 데이터가 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 고급 필터 팝업 */}
            {isFilterPopupOpen && (
                <AdvancedFilterPopup
                    variablesList={originalVariables.length > 0 ? originalVariables : questions.map(q => ({ sysName: q.id, label: q.label }))}
                    initialVariables={overviewVariables}
                    onClose={() => setIsFilterPopupOpen(false)}
                    onSave={(varId, logicStr, label) => {
                        setFilterLogic(logicStr);
                        setSelectedVariableIds((prev) => prev.includes(varId) ? prev : [...prev, varId]); // 저장된 변수를 선택 목록에 추가
                        setIsFilterPopupOpen(false);
                        fetchOverviewVars(); // 팝업 닫힐 때 목록 최신화
                    }}
                    auth={auth}
                    pageId={sessionStorage.getItem("pageId")}
                    onSaved={fetchOverviewVars}
                    activeVariableId={selectedVariableIds.length === 1 ? selectedVariableIds[0] : null}
                    onDeleteActive={(deletedVarId) => {
                        setSelectedVariableIds(prev => {
                            const newIds = prev.filter(id => id !== deletedVarId);
                            const totalLogic = newIds.filter(id => id !== 'answerStateCode').map(id => overviewVariables.find(ov => ov.id === id)?.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
                            setFilterLogic(totalLogic);
                            return newIds;
                        });
                        fetchOverviewVars();
                    }}
                />
            )}

            {/* 집계용 recoded 변수 관리 팝업 */}
            <OverviewVariablePopup
                isOpen={isOverviewPopupOpen}
                onClose={() => setIsOverviewPopupOpen(false)}
                auth={auth}
                pageId={sessionStorage.getItem("pageId")}
                onSaved={fetchOverviewVars}
            />

            <PageListPopup
                isOpen={isPageListOpen}
                onClose={() => setIsPageListOpen(false)}
                data={pageListData}
                onSelect={handlePageSelectedPopup}
            />

            {/* Settings Modal */}
            {optionModalOpen && (
                <CrossOptionModal
                    onClose={() => setOptionModalOpen(false)}
                    onApply={(opts) => {
                        console.log('Applied Options:', opts);
                        // Save options
                    }}
                />
            )}
        </div>
    );
};

export default CrossAnalysisPage;

