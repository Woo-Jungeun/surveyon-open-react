import React, { useState, useEffect, useRef, memo, useMemo, useContext } from 'react';
import { Cloud, BarChart2, LineChart, PieChart, Donut, AreaChart, LayoutGrid, Radar, Layers, Percent, Filter, Aperture, MoveVertical, MoreHorizontal, Waves, GitCommitVertical, Target, X, Download, Copy, ChevronDown, Check, BarChartHorizontal, LayoutList } from 'lucide-react';
import { exportImage, exportSVG } from '@progress/kendo-drawing';
import { saveAs } from '@progress/kendo-file-saver';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import Toast from '../../../../components/common/Toast';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import KendoChart from '../../components/KendoChart';
import AdvancedFilterPopup from './AdvancedFilterPopup';
import './FrequencyAnalysisPage.css';
import '@progress/kendo-theme-default/dist/all.css';
import { CHART_THEME_OPTIONS } from '../../constants/chartThemes';
import { useSelector } from 'react-redux';
import { FrequencyAnalysisPageApi } from './FrequencyAnalysisPageApi';
import OverviewVariablePopup from './OverviewVariablePopup';
import { RecodingPageApi } from '../recoding/RecodingPageApi';
import { Settings } from 'lucide-react';
import { VariablePageApi } from '../variable/VariablePageApi';
import { DpRequestPageApi } from '../hsrt/dpRequest/DpRequestPageApi';
import PageListPopup from '../variable/PageListPopup';
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

const AggregationCard = memo(({ q, paletteId, setPaletteId, onDisplayModeChange, showN, showPct, decimalN, decimalPct }) => {
    const [chartMode, setChartMode] = useState('column');
    const [showChart, setShowChart] = useState(true);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [displayMode, setDisplayMode] = useState('all');
    const [toast, setToast] = useState({ show: false, message: '' });
    const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
    // const [paletteId, setPaletteId] = useState('default'); // Moved to parent
    const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
    const [isChartTypeMenuOpen, setIsChartTypeMenuOpen] = useState(false);
    const [showLegend, setShowLegend] = useState(false);
    const [selectedChartGroups, setSelectedChartGroups] = useState([]);
    const [isGroupFilterMenuOpen, setIsGroupFilterMenuOpen] = useState(false);
    const [chartDataType, setChartDataType] = useState(() => {
        if (!showPct && showN) return 'frequency';
        return 'percentage';
    });
    const [showChartValues, setShowChartValues] = useState(true);
    const [isChartOptionsOpen, setIsChartOptionsOpen] = useState(false);

    const cardRef = useRef(null);
    const [isIntersected, setIsIntersected] = useState(false);

    useEffect(() => {
        if (!cardRef.current) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsIntersected(true);
                observer.disconnect();
            }
        }, {
            rootMargin: '400px' // Load 400px before coming into viewport
        });
        observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, [q.id]);

    useEffect(() => {
        if (!showPct && showN) {
            setChartDataType('frequency');
        } else if (showPct) {
            setChartDataType('percentage');
        }
    }, [showN, showPct]);

    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const displayMenuRef = useRef(null);
    const paletteMenuRef = useRef(null);
    const chartTypeMenuRef = useRef(null);
    const groupFilterMenuRef = useRef(null);
    const chartOptionsMenuRef = useRef(null);

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
            if (chartTypeMenuRef.current && !chartTypeMenuRef.current.contains(event.target)) {
                setIsChartTypeMenuOpen(false);
            }
            if (groupFilterMenuRef.current && !groupFilterMenuRef.current.contains(event.target)) {
                setIsGroupFilterMenuOpen(false);
            }
            if (chartOptionsMenuRef.current && !chartOptionsMenuRef.current.contains(event.target)) {
                setIsChartOptionsOpen(false);
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
                setToast({ show: true, message: "복사 완료 (Ctrl+V)" });
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

    const availableChartGroups = useMemo(() => {
        if (!q.data) return [];
        const groups = new Set();

        if (q.columns && q.columns.length > 0) {
            q.columns.forEach(col => {
                const groupName = col.label2 || col.label;
                groups.add(groupName);
            });
        } else {
            q.data.forEach(d => {
                const parts = String(d.name).split('\n');
                const groupName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
                groups.add(groupName);
            });
        }
        return Array.from(groups);
    }, [q.data, q.columns]);

    const prevAvailableGroupsStr = useRef("");
    useEffect(() => {
        const currentGroupsStr = availableChartGroups.join(",");
        if (availableChartGroups.length > 0 && prevAvailableGroupsStr.current !== currentGroupsStr) {
            setSelectedChartGroups(availableChartGroups);
            prevAvailableGroupsStr.current = currentGroupsStr;
        }
    }, [availableChartGroups]);

    const chartData = useMemo(() => {
        if (!q.data) return [];

        if (q.columns && q.columns.length > 0) {
            return q.columns.filter(col => {
                const groupName = col.label2 || col.label;
                return selectedChartGroups.includes(groupName);
            }).map((col, cIdx) => {
                const labelParts = [col.label3, col.label2, col.label || col.name || `c${cIdx}`];
                const validParts = labelParts
                    .map(p => String(p || '').trim())
                    .filter(p => p !== '');
                const fullLabel = validParts.reverse().join('\n');

                const dataPoint = { name: fullLabel };

                q.data.forEach((row, index) => {
                    dataPoint[`series_${index}`] = row[col.key];
                    dataPoint[`series_${index}_pct`] = row[`${col.key}_pct`];
                });
                return dataPoint;
            });
        }

        return q.data.filter(d => {
            const parts = String(d.name).split('\n');
            const groupName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
            return selectedChartGroups.includes(groupName);
        });
    }, [q.data, q.columns, selectedChartGroups]);

    return (
        <div id={q.id} ref={cardRef} className="agg-card">
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
                            <Copy size={14} /> 복사
                        </button>
                    </div>
                </div>

                <div style={{ width: showChart ? 'calc(50% - 16px)' : 'auto', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <div className="view-options">
                        {/* 다운로드 버튼 */}
                        {/* 1. 다운로드 버튼 */}
                        {showChart && (
                            <div className="download-menu-container" ref={downloadMenuRef} style={{ marginRight: '2px' }}>
                                <button
                                    className={`view-option-btn download-btn ${showDownloadMenu ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }}
                                    title="차트 다운로드"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                >
                                    <Download size={15} />
                                </button>
                                {showDownloadMenu && (
                                    <div className="download-dropdown" style={{ top: 'calc(100% + 4px)', right: 0, left: 'auto' }}>
                                        <button onClick={() => handleDownload('png')}>PNG (이미지)</button>
                                        <button onClick={() => handleDownload('svg')}>SVG (PPT용)</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 2. 팔레트 메뉴 */}
                        {showChart && (
                            <div className="download-menu-container" ref={paletteMenuRef} style={{ marginRight: '2px' }}>
                                <button
                                    className={`view-option-btn ${isPaletteMenuOpen ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setIsPaletteMenuOpen(!isPaletteMenuOpen); }}
                                    title="색상 테마 설정"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                                >
                                    {(() => {
                                        const theme = CHART_THEME_OPTIONS.find(opt => opt.id === paletteId) || CHART_THEME_OPTIONS[0];
                                        const colors = theme.preview;
                                        return (
                                            <div style={{
                                                width: '16px',
                                                height: '16px',
                                                borderRadius: '50%',
                                                background: `conic-gradient(${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[0]})`
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

                        {/* 3. 차트 닫기 버튼 (색상 바로 오른쪽) */}
                        {showChart && (
                            <button
                                className={`view-option-btn close-chart-btn`}
                                onClick={() => setShowChart(false)}
                                title="차트 숨기기"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <X size={18} />
                            </button>
                        )}

                        {/* 구분선 */}
                        {showChart && (chartMode !== 'heatmap' || availableChartGroups.length > 0) && (
                            <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />
                        )}

                        {/* 4. 범례 보기 */}
                        {showChart && chartMode !== 'heatmap' && (
                            <button
                                onClick={() => setShowLegend(!showLegend)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '4px 8px', border: `1px solid ${showLegend ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px',
                                    background: showLegend ? '#eff6ff' : '#fff',
                                    color: showLegend ? '#2563eb' : '#64748b',
                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', height: '28px'
                                }}
                                title="범례 보기/숨기기"
                            >
                                <LayoutList size={14} style={{ flexShrink: 0 }} />
                                <span style={{ whiteSpace: 'nowrap' }}>범례</span>
                            </button>
                        )}

                        {/* 구분선 */}
                        {showChart && chartMode !== 'heatmap' && (
                            <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />
                        )}

                        {/* 차트 옵션 */}
                        {showChart && (
                            <div style={{ position: 'relative' }} ref={chartOptionsMenuRef}>
                                <button
                                    onClick={() => setIsChartOptionsOpen(!isChartOptionsOpen)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '4px 8px', border: `1px solid ${isChartOptionsOpen ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px',
                                        background: isChartOptionsOpen ? '#eff6ff' : '#fff',
                                        color: isChartOptionsOpen ? '#2563eb' : '#64748b',
                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', height: '28px'
                                    }}
                                    title="차트 옵션"
                                >
                                    <Settings size={14} style={{ flexShrink: 0 }} />
                                    <span style={{ whiteSpace: 'nowrap' }}>옵션</span>
                                </button>

                                {isChartOptionsOpen && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)', zIndex: 1000,
                                        minWidth: '220px', padding: '16px',
                                        display: 'flex', flexDirection: 'column', gap: '16px'
                                    }}>
                                        <div>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px', textAlign: 'left' }}>차트 표출 데이터</span>
                                            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '4px' }}>
                                                <div
                                                    onClick={() => setChartDataType('frequency')}
                                                    style={{
                                                        flex: 1, textAlign: 'center', padding: '6px 0', fontSize: '12px',
                                                        fontWeight: chartDataType === 'frequency' ? 700 : 500,
                                                        color: chartDataType === 'frequency' ? '#2563eb' : '#64748b',
                                                        background: chartDataType === 'frequency' ? '#fff' : 'transparent',
                                                        borderRadius: '4px', cursor: 'pointer',
                                                        boxShadow: chartDataType === 'frequency' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    빈도
                                                </div>
                                                <div
                                                    onClick={() => setChartDataType('percentage')}
                                                    style={{
                                                        flex: 1, textAlign: 'center', padding: '6px 0', fontSize: '12px',
                                                        fontWeight: chartDataType === 'percentage' ? 700 : 500,
                                                        color: chartDataType === 'percentage' ? '#2563eb' : '#64748b',
                                                        background: chartDataType === 'percentage' ? '#fff' : 'transparent',
                                                        borderRadius: '4px', cursor: 'pointer',
                                                        boxShadow: chartDataType === 'percentage' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    비율
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ height: '1px', background: '#e2e8f0' }} />
                                        <div>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px', textAlign: 'left' }}>차트 값 표기</span>
                                            <div
                                                onClick={() => setShowChartValues(!showChartValues)}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '4px 0' }}
                                            >
                                                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>값 표출하기</span>
                                                <div style={{
                                                    width: '36px', height: '20px', background: showChartValues ? '#3b82f6' : '#e2e8f0',
                                                    borderRadius: '20px', position: 'relative', transition: 'background 0.2s', flexShrink: 0
                                                }}>
                                                    <div style={{
                                                        position: 'absolute', top: '2px', left: showChartValues ? '18px' : '2px',
                                                        width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
                                                        transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                    }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 구분선 */}
                        {showChart && availableChartGroups.length > 0 && (
                            <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />
                        )}

                        {/* 5. 그룹 필터 */}
                        {showChart && availableChartGroups.length > 0 && (
                            <div className="download-menu-container" ref={groupFilterMenuRef}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsGroupFilterMenuOpen(!isGroupFilterMenuOpen); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '4px 8px', border: `1px solid ${(selectedChartGroups.length > 0 && selectedChartGroups.length < availableChartGroups.length) ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px',
                                        background: (selectedChartGroups.length > 0 && selectedChartGroups.length < availableChartGroups.length) ? '#eff6ff' : '#fff',
                                        color: (selectedChartGroups.length > 0 && selectedChartGroups.length < availableChartGroups.length) ? '#2563eb' : '#64748b',
                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', height: '28px', maxWidth: '220px'
                                    }}
                                    title="그룹 필터"
                                >
                                    <Filter size={14} style={{ flexShrink: 0 }} />
                                    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', width: '100%' }}>
                                        {selectedChartGroups.length === availableChartGroups.length ? (
                                            <span style={{ whiteSpace: 'nowrap' }}>그룹 필터 (전체)</span>
                                        ) : selectedChartGroups.length === 0 ? (
                                            <span style={{ whiteSpace: 'nowrap' }}>선택 없음</span>
                                        ) : selectedChartGroups.length === 1 ? (
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {selectedChartGroups[0]}
                                            </span>
                                        ) : (
                                            <>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
                                                    {selectedChartGroups[0]}
                                                </span>
                                                <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                                                    &nbsp;외 {selectedChartGroups.length - 1}개
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </button>
                                {isGroupFilterMenuOpen && (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', zIndex: 1100,
                                        minWidth: '200px', padding: '8px',
                                        display: 'flex', flexDirection: 'column', gap: '4px'
                                    }}>
                                        <div style={{ padding: '4px 8px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>X축 그룹 보기</span>
                                            <button
                                                onClick={() => setSelectedChartGroups(availableChartGroups)}
                                                style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                                            >
                                                초기화
                                            </button>
                                        </div>
                                        <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div
                                                onClick={() => {
                                                    if (selectedChartGroups.length === availableChartGroups.length) {
                                                        setSelectedChartGroups([]);
                                                    } else {
                                                        setSelectedChartGroups(availableChartGroups);
                                                    }
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #cbd5e1', marginBottom: '4px' }}
                                            >
                                                <div style={{
                                                    width: '14px', height: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    border: `1px solid ${selectedChartGroups.length === availableChartGroups.length ? '#2563eb' : '#cbd5e1'}`,
                                                    borderRadius: '3px',
                                                    background: selectedChartGroups.length === availableChartGroups.length ? '#2563eb' : '#fff'
                                                }}>
                                                    {selectedChartGroups.length === availableChartGroups.length && <Check size={10} color="#fff" strokeWidth={3} />}
                                                </div>
                                                <span>전체 선택</span>
                                            </div>
                                            {availableChartGroups.map(group => {
                                                const isChecked = selectedChartGroups.includes(group);
                                                return (
                                                    <div
                                                        key={group}
                                                        onClick={() => {
                                                            setSelectedChartGroups(prev =>
                                                                prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
                                                            );
                                                        }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', fontSize: '13px', color: '#334155', borderRadius: '4px', background: isChecked ? '#f8fafc' : 'transparent', ':hover': { background: '#f8fafc' } }}
                                                    >
                                                        <div style={{
                                                            width: '14px', height: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            border: `1px solid ${isChecked ? '#2563eb' : '#cbd5e1'}`,
                                                            borderRadius: '3px',
                                                            background: isChecked ? '#2563eb' : '#fff'
                                                        }}>
                                                            {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                                                        </div>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 구분선 */}
                        {showChart && <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />}

                        {/* 6. 차트 타입 메뉴 (항상 표시 - 닫힌 차트를 열기 위함) */}
                        <div className="download-menu-container" ref={chartTypeMenuRef}>
                            <button
                                className={`view-option-btn ${!showChart || isChartTypeMenuOpen ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!showChart) {
                                        setShowChart(true);
                                    } else {
                                        setIsChartTypeMenuOpen(!isChartTypeMenuOpen);
                                    }
                                }}
                                title={!showChart ? "차트 보기" : "차트 타입 변경"}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: (!showChart || isChartTypeMenuOpen) ? '#eff6ff' : 'transparent', border: (!showChart || isChartTypeMenuOpen) ? '1px solid #bfdbfe' : 'none', cursor: 'pointer', color: (!showChart || isChartTypeMenuOpen) ? '#2563eb' : '#64748b' }}
                            >
                                {(() => {
                                    const CHART_TYPE_OPTIONS = [
                                        { id: 'column', icon: <BarChart2 size={15} /> },
                                        { id: 'bar', icon: <BarChartHorizontal size={15} /> },
                                        { id: 'stackedColumn', icon: <Layers size={15} /> },
                                        { id: 'stacked100Column', icon: <Percent size={15} /> },
                                        { id: 'line', icon: <LineChart size={15} /> },
                                        { id: 'pie', icon: <PieChart size={15} /> },
                                        { id: 'donut', icon: <Donut size={15} /> },
                                        { id: 'radarArea', icon: <Aperture size={15} /> },
                                        { id: 'scatterPoint', icon: <MoreHorizontal size={15} /> },
                                        { id: 'area', icon: <AreaChart size={15} /> },
                                        { id: 'heatmap', icon: <LayoutGrid size={15} /> },
                                        { id: 'wordCloud', icon: <Cloud size={15} /> }
                                    ];
                                    return CHART_TYPE_OPTIONS.find(opt => opt.id === chartMode)?.icon || <BarChart2 size={15} />;
                                })()}
                            </button>
                            {isChartTypeMenuOpen && (
                                <div className="download-dropdown" style={{ top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '160px', zIndex: 1100, position: 'absolute', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxHeight: '250px', overflowY: 'auto' }}>
                                    {[
                                        { id: 'column', label: '세로 막대형', icon: <BarChart2 size={16} /> },
                                        { id: 'bar', label: '가로 막대형', icon: <BarChartHorizontal size={16} /> },
                                        { id: 'stackedColumn', label: '누적 막대형', icon: <Layers size={16} /> },
                                        { id: 'stacked100Column', label: '100% 누적 막대형', icon: <Percent size={16} /> },
                                        { id: 'line', label: '선형', icon: <LineChart size={16} /> },
                                        { id: 'pie', label: '원형', icon: <PieChart size={16} /> },
                                        { id: 'donut', label: '도넛형', icon: <Donut size={16} /> },
                                        { id: 'radarArea', label: '방사형', icon: <Aperture size={16} /> },
                                        { id: 'scatterPoint', label: '점도표', icon: <MoreHorizontal size={16} /> },
                                        { id: 'area', label: '영역형', icon: <AreaChart size={16} /> },
                                        { id: 'heatmap', label: '히트맵', icon: <LayoutGrid size={16} /> },
                                        { id: 'wordCloud', label: '워드클라우드', icon: <Cloud size={16} /> }
                                    ].map((option) => (
                                        <button key={option.id} onClick={(e) => { e.stopPropagation(); setChartMode(option.id); setShowChart(true); setIsChartTypeMenuOpen(false); }} className={chartMode === option.id ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {option.icon}
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="agg-card-body">
                {q.html ? (
                    <div className="agg-table-container" style={{ background: '#fff', padding: '16px', boxSizing: 'border-box' }} dangerouslySetInnerHTML={{ __html: q.html }} />
                ) : (
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
                                                const pctRaw = row[`${col.key}_pct`];
                                                const pct = pctRaw !== undefined && !isNaN(Number(pctRaw)) ? Number(pctRaw).toFixed(decimalPct) : pctRaw;
                                                const formattedCount = count !== undefined && !isNaN(Number(count)) ? Number(count).toFixed(decimalN) : count;
                                                return (
                                                    <td key={col.key}>
                                                        {displayMode === 'all' && (
                                                            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                                                                {showN && <span>{formattedCount}</span>}
                                                                {showPct && pct !== undefined && (
                                                                    <span style={{ color: showN ? '#888' : 'inherit', fontSize: showN ? '0.85em' : 'inherit' }}>
                                                                        {showN ? '(' : ''}{pct}%{showN ? ')' : ''}
                                                                    </span>
                                                                )}
                                                                {!showN && !showPct && '-'}
                                                            </div>
                                                        )}
                                                        {displayMode === 'value' && formattedCount}
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
                )}

                {/* 차트 영역 */}
                {showChart && (
                    <div className="agg-chart-container" ref={chartContainerRef}>
                        {!q.isLoaded ? (
                            <div style={{ color: '#888', fontSize: '13px' }}>데이터를 불러오는 중입니다...</div>
                        ) : !isIntersected ? (
                            <div style={{ color: '#888', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '360px' }}>차트를 준비 중입니다...</div>
                        ) : q.data.length === 0 ? (
                            <div style={{ color: '#888', fontSize: '13px' }}>조회된 데이터가 없습니다.</div>
                        ) : (() => {
                            // ─── 차트 데이터 기준 (최종) ───────────────────────────────────
                            // 도넛(Donut) / 깔때기(Funnel) → 퍼센트(_pct)
                            // 그 외 모든 차트 (원형 포함)  → 사례수(count)
                            // ────────────────────────────────────────────────────────────────
                            const usePercentFields = chartDataType === 'percentage';

                            const chartSeries = q.columns && q.columns.length > 0
                                ? q.data.map((row, index) => {
                                    return {
                                        field: usePercentFields ? `series_${index}_pct` : `series_${index}`,
                                        name: row.name
                                    };
                                })
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
                                    key={`${q.id}-${chartMode}-${paletteId}-${selectedChartGroups.join(',')}-${chartDataType}`}
                                    data={chartData}
                                    seriesNames={chartSeries}
                                    initialType={chartMode}
                                    labelLimit={10}
                                    suffix={usePercentFields ? "%" : ""}
                                    paletteId={paletteId}
                                    allowedTypes={allowedTypes}
                                    hideHeader={true}
                                    externalShowLegend={showLegend}
                                    showLabels={showChartValues}
                                    decimals={usePercentFields ? decimalPct : decimalN}
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

const FrequencyAnalysisPage = () => {
    const auth = useSelector((store) => store.auth);
    const { getOverviewList, getOverviewData, getSurveyProgressStyled, getSurveyProgressChartData, exportSurveyProgressXlsx } = FrequencyAnalysisPageApi();
    const [searchTerm, setSearchTerm] = useState('');
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
    const [selectedTotalFilters, setSelectedTotalFilters] = useState(['전체']);
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

    const [showN, setShowN] = useState(true);
    const [localDecimalN, setLocalDecimalN] = useState(0);
    const [decimalN, setDecimalN] = useState(0);

    const [showPct, setShowPct] = useState(true);
    const [localDecimalPct, setLocalDecimalPct] = useState(1);
    const [decimalPct, setDecimalPct] = useState(1);

    useEffect(() => {
        const t = setTimeout(() => {
            setDecimalN(localDecimalN === '' ? 0 : localDecimalN);
        }, 500);
        return () => clearTimeout(t);
    }, [localDecimalN]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDecimalPct(localDecimalPct === '' ? 1 : localDecimalPct);
        }, 500);
        return () => clearTimeout(t);
    }, [localDecimalPct]);    // 개요(Overview) 변수 관련 상태
    const [isOverviewPopupOpen, setIsOverviewPopupOpen] = useState(false);
    const [overviewVariables, setOverviewVariables] = useState([]);
    const [bannerVariables, setBannerVariables] = useState([]);
    const [originalVariables, setOriginalVariables] = useState([]);

    // 필터 드롭다운 관련 상태
    const [dropdownFilterList, setDropdownFilterList] = useState([]);
    const [selectedDropdownFilters, setSelectedDropdownFilters] = useState({});
    const [tempDropdownFilters, setTempDropdownFilters] = useState({});
    const [isDropdownFilterOpen, setIsDropdownFilterOpen] = useState(false);
    const dropdownFilterMenuRef = useRef(null);

    // 필터 칩 더보기/접기 관련 상태
    const [isChipsExpanded, setIsChipsExpanded] = useState(false);
    const [hasMoreChips, setHasMoreChips] = useState(false);
    const [maxVisibleIndex, setMaxVisibleIndex] = useState(-1);
    const [containerWidth, setContainerWidth] = useState(0);
    const chipsContainerRef = useRef(null);
    const measuringRef = useRef(null);

    const toggleDropdownFilterOpen = () => {
        if (!isDropdownFilterOpen) {
            setTempDropdownFilters({ ...selectedDropdownFilters });
        }
        setIsDropdownFilterOpen(!isDropdownFilterOpen);
    };

    const handleApplyDropdownFilters = () => {
        setSelectedDropdownFilters({ ...tempDropdownFilters });
        applyDropdownFilters(tempDropdownFilters);
        setIsDropdownFilterOpen(false);
    };

    const handleRemoveFilterChip = (tableId) => {
        const nextSelected = { ...selectedDropdownFilters };
        delete nextSelected[tableId];
        setSelectedDropdownFilters(nextSelected);
        setTempDropdownFilters(prev => {
            const next = { ...prev };
            delete next[tableId];
            return next;
        });
        applyDropdownFilters(nextSelected);
    };

    const handleResetAllFilters = () => {
        setSelectedDropdownFilters({});
        setTempDropdownFilters({});
        applyDropdownFilters({});
    };

    useEffect(() => {
        if (!chipsContainerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(chipsContainerRef.current);
        return () => observer.disconnect();
    }, []);

    React.useLayoutEffect(() => {
        if (!measuringRef.current) return;

        const container = measuringRef.current;
        const children = Array.from(container.children);
        if (children.length <= 1) {
            setHasMoreChips(false);
            setMaxVisibleIndex(-1);
            setIsChipsExpanded(false);
            return;
        }

        const chipsElements = children.slice(0, -1);
        const dummyButton = children[children.length - 1];

        const currentContainerWidth = container.clientWidth;
        const buttonWidth = dummyButton.offsetWidth;
        const gap = 6;

        const lastChip = chipsElements[chipsElements.length - 1];
        const isOverflowing = lastChip.offsetTop > 40;

        setHasMoreChips(isOverflowing);

        if (!isOverflowing) {
            setMaxVisibleIndex(-1);
            setIsChipsExpanded(false);
        } else {
            let maxIdx = -1;
            for (let i = 0; i < chipsElements.length; i++) {
                const chipEl = chipsElements[i];
                if (chipEl.offsetTop <= 40) {
                    if (chipEl.offsetLeft + chipEl.offsetWidth + gap + buttonWidth <= currentContainerWidth) {
                        maxIdx = i;
                    }
                }
            }
            if (maxIdx === -1 && chipsElements.length > 0) {
                maxIdx = 0;
            }
            setMaxVisibleIndex(maxIdx);
        }
    }, [selectedDropdownFilters, containerWidth, dropdownFilterList]);

    const { getRecodedList, getRecodedVariables } = RecodingPageApi();
    const { getOriginalVariables } = VariablePageApi();

    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false); // 엑셀 다운로드 확인 모달 열림 여부
    const [excelShowPct, setExcelShowPct] = useState(true); // 엑셀 다운로드 시 % 표출 여부
    const [excelShowBaseParenthesis, setExcelShowBaseParenthesis] = useState(true); // 엑셀 다운로드 시 Base 기본 괄호 여부
    const [excelDecimalPct, setExcelDecimalPct] = useState(1); // 엑셀 다운로드 시 % 소수점 자리수

    const handleExcelExport = async () => {
        const pageId = sessionStorage.getItem('pageId');
        const user = auth?.user?.userId;
        if (!pageId || !user) return;

        try {
            loadingSpinner.show();

            const selectedBannerIds = (() => {
                const baseInfo = selectedVariableIds.length > 0 ? selectedVariableIds : (selectedFilters?.includes('전체') ? [] : (selectedFilters || []));
                const displayIds = baseInfo.filter(id => id !== 'answerStateCode');
                if (baseInfo.includes('answerStateCode')) {
                    displayIds.push('answerStateCode');
                }
                return displayIds;
            })();

            const requestData = {
                pageid: pageId,
                user: user,
                search: searchTerm,
                show_n: showN,
                show_percent: showPct,
                excel_show_percent: excelShowPct,
                percent_digits: Number(excelDecimalPct === '' ? 1 : excelDecimalPct),
                base_bracket: excelShowBaseParenthesis
            };

            if (filterLogic) {
                requestData.filter_expression = filterLogic;
            }

            if (selectedBannerIds.length > 0) {
                requestData.x_info = selectedBannerIds;
            }

            const result = await exportSurveyProgressXlsx.mutateAsync(requestData);
            const payload = result?.resultjson || result || {};

            if (result?.success === "777" && payload.content_base64) {
                const binaryString = window.atob(payload.content_base64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: payload.content_type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', payload.filename || `survey_progress_${pageId}.xlsx`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                modal.showAlert('오류', '엑셀 데이터 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('Excel Export Error:', error);
            modal.showAlert('오류', '엑셀 다운로드 중 문제가 발생했습니다.');
        } finally {
            loadingSpinner.hide();
        }
    };

    const handleChildCheckboxChange = (tableId, logicStr) => {
        setTempDropdownFilters(prev => {
            const currentLogics = prev[tableId] || [];
            let newLogics;
            if (currentLogics.includes(logicStr)) {
                newLogics = currentLogics.filter(l => l !== logicStr);
            } else {
                newLogics = [...currentLogics, logicStr];
            }
            return { ...prev, [tableId]: newLogics };
        });
    };

    const handleParentCheckboxChange = (table) => {
        const tableId = table.id;
        const allLogics = (table.info || []).map(opt => opt.logic).filter(Boolean);
        if (allLogics.length === 0) return;

        setTempDropdownFilters(prev => {
            const currentLogics = prev[tableId] || [];
            let newLogics;
            if (currentLogics.length === allLogics.length) {
                newLogics = [];
            } else {
                newLogics = allLogics;
            }
            return { ...prev, [tableId]: newLogics };
        });
    };

    const applyDropdownFilters = (selections) => {
        const blocks = [];
        Object.entries(selections).forEach(([tableId, logics]) => {
            if (logics && logics.length > 0) {
                const parsedItems = [];
                let canCombine = true;

                for (const logicStr of logics) {
                    // Try matching "var in [val]" (supporting case insensitivity and optional spaces)
                    let match = logicStr.match(/^(.+?)\s*in\s*\[\s*(.*?)\s*\]$/i);
                    if (match) {
                        parsedItems.push({ variable: match[1].trim(), value: match[2].trim() });
                        continue;
                    }
                    // Try matching "var == val"
                    match = logicStr.match(/^(.+?)\s*==\s*(.+)$/);
                    if (match) {
                        parsedItems.push({ variable: match[1].trim(), value: match[2].trim().replace(/^\[|\]$/g, '') });
                        continue;
                    }
                    // If it doesn't match either, we cannot combine
                    canCombine = false;
                    break;
                }

                if (canCombine && parsedItems.length > 0) {
                    const grouped = {};
                    parsedItems.forEach(item => {
                        if (!grouped[item.variable]) {
                            grouped[item.variable] = [];
                        }
                        if (!grouped[item.variable].includes(item.value)) {
                            grouped[item.variable].push(item.value);
                        }
                    });

                    const combinedExprs = Object.entries(grouped).map(([variable, values]) => {
                        return `${variable} in [${values.join(',')}]`;
                    });

                    if (combinedExprs.length === 1) {
                        blocks.push(combinedExprs[0]);
                    } else {
                        blocks.push(`(${combinedExprs.join(' and ')})`);
                    }
                } else {
                    if (logics.length === 1) {
                        blocks.push(logics[0]);
                    } else {
                        blocks.push(`(${logics.join(' or ')})`);
                    }
                }
            }
        });
        const combined = blocks.join(' and ');
        setFilterLogic(combined);
        setSidebarPage(1);
    };

    const fetchDropdownFilterList = async () => {
        const pageId = sessionStorage.getItem("pageId");
        const userId = auth?.user?.userId;
        if (!pageId || !userId) return;

        try {
            const payload = {
                pageid: pageId,
                use_recoded: false,
                start: 0,
                limit: 10000,
                search: "",
                user: userId
            };
            const result = await getOverviewList.mutateAsync(payload);
            if (result?.success === "777" && result.resultjson) {
                setDropdownFilterList(result.resultjson.tables || []);
            }
        } catch (error) {
            console.error("Failed to fetch dropdown filter list:", error);
        }
    };

    useEffect(() => {
        if (auth?.user?.userId) {
            fetchDropdownFilterList();
        }
    }, [auth?.user?.userId]);

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
            if (dropdownFilterMenuRef.current && !dropdownFilterMenuRef.current.contains(event.target)) {
                setIsDropdownFilterOpen(false);
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
                color: color,
                html: item.html
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
                filter_expression: filterLogic,
                // 검색어가 있다면 API에 전달 (API 지원 여부에 따라)
                search: searchTerm,
                n_digits: Number(decimalN === '' ? 0 : decimalN),
                percent_digits: Number(decimalPct === '' ? 1 : decimalPct)
            };
            if (!(showN && showPct)) {
                payload.show_n = showN;
                payload.show_percent = showPct;
            }
            const result = await getSurveyProgressStyled.mutateAsync(payload);
            if (result?.success === "777" && result.resultjson) {
                // 전역 스타일 주입
                if (result.resultjson.style_css) {
                    const styleId = "survey-progress-global-style";
                    let styleEl = document.getElementById(styleId);
                    if (!styleEl) {
                        styleEl = document.createElement("style");
                        styleEl.id = styleId;
                        document.head.appendChild(styleEl);
                    }
                    styleEl.textContent = result.resultjson.style_css;
                }

                const overviewList = result.resultjson.tables || [];
                const newQuestions = parseOverviewList(overviewList);

                // 페이지별 데이터 교체 (서버사이드 페이징)
                setQuestions(prevQuestions => {
                    const isSameList = prevQuestions.length === newQuestions.length &&
                        prevQuestions.every((q, idx) => q.id === newQuestions[idx].id);

                    if (isSameList) {
                        return prevQuestions.map((q, idx) => ({
                            ...q,
                            html: newQuestions[idx].html
                        }));
                    }

                    // 리스트가 변경되었을 때만 activeId 및 스크롤을 처리
                    setTimeout(() => {
                        if (newQuestions.length > 0) {
                            setActiveId(prevActive => {
                                const exists = newQuestions.some(q => q.id === prevActive);
                                if (!exists) {
                                    if (mainRef.current) {
                                        mainRef.current.scrollTo(0, 0);
                                    }
                                    return newQuestions[0].id;
                                }
                                return prevActive;
                            });
                        } else {
                            setActiveId(null);
                        }
                    }, 0);

                    return newQuestions;
                });

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

    // 페이지 변경 또는 필터 변경 또는 표출 정책 변경 시 재조회
    useEffect(() => {
        if (auth?.user?.userId) {
            fetchQuestions(sidebarPage);
        }
    }, [auth?.user?.userId, sidebarPage, filterLogic, showN, showPct, decimalN, decimalPct]);

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
            setSelectedDropdownFilters({}); // 페이지 변경 시 선택된 드롭다운 필터 초기화
            setTempDropdownFilters({}); // 페이지 변경 시 템프 드롭다운 필터 초기화
            fetchDropdownFilterList(); // 페이지 변경 시 필터 리스트도 재조회
            fetchQuestions(1);
        };
        window.addEventListener('pageSelected', handlePageSelected);
        return () => window.removeEventListener('pageSelected', handlePageSelected);
    }, [auth?.user?.userId]);

    // 배너 설정 변경 시 데이터 로드 상태 초기화 하여 재조회 유도
    useEffect(() => {
        if (questions.length > 0) {
            setQuestions(prev => prev.map(q => ({ ...q, isLoaded: false })));
        }
    }, [selectedVariableIds]);


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

                const payload = {
                    pageid: pageId,
                    user: userId,
                    start: (sidebarPage - 1) * SIDEBAR_PAGE_SIZE + index,  // 전체 순번에 해당하는 인덱스
                    limit: limit, // 가져올 갯수
                    weight_col: "",
                    filter_expression: filterLogic, // 배너 설정 조건식 적용
                    include_stats: [],
                    search: searchTerm, // 검색어 추가
                    n_digits: Number(decimalN === '' ? 0 : decimalN),
                    percent_digits: Number(decimalPct === '' ? 1 : decimalPct)
                };
                if (!(showN && showPct)) {
                    payload.show_n = showN;
                    payload.show_percent = showPct;
                }

                const aggResult = await getSurveyProgressChartData.mutateAsync(payload);
                if (aggResult?.success === "777" && aggResult.resultjson) {
                    const resultsArray = aggResult.resultjson.tables || [];

                    setQuestions(prevQuestions => prevQuestions.map(q => {
                        if (!tableIdsToSet.includes(q.id)) return q;
                        const tableInfo = resultsArray.find(r => r.table_id === q.id);
                        if (!tableInfo) return { ...q, isLoaded: true };

                        const tableColumns = (tableInfo.series || []).map(s => ({
                            key: s.key,
                            label: s.label,
                            label2: s.label2,
                            label3: s.label3,
                            parent_label: s.parent_label
                        }));

                        const updatedData = (tableInfo.labels || []).map((lbl, i) => {
                            let rowData = {
                                name: lbl.label,
                                value: lbl.key
                            };
                            let totalCount = 0;
                            if (tableColumns.length > 0) {
                                tableInfo.series.forEach(s => {
                                    const c = s.count ? (s.count[i] || 0) : 0;
                                    const p = s.percent ? (s.percent[i] || 0) : 0;
                                    rowData[s.key] = c;
                                    rowData[`${s.key}_pct`] = p;
                                    if (totalCount === 0) totalCount = c;
                                });
                            } else {
                                rowData['전체'] = 0;
                                rowData.total_pct = 0;
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
    }, [activeId, questions, sidebarPage, auth?.user?.userId, selectedVariableIds, showN, showPct, decimalN, decimalPct]);

    const handleDisplayModeChange = async (qId, newMode) => {
        const index = questions.findIndex(q => q.id === qId);
        if (index === -1) return;

        const pageId = sessionStorage.getItem("pageId");
        if (!pageId || !auth?.user?.userId) return;

        const payload = {
            pageid: pageId,
            user: auth.user.userId,
            start: (sidebarPage - 1) * SIDEBAR_PAGE_SIZE + index,
            limit: 1,
            filter_expression: filterLogic,
            search: searchTerm,
            n_digits: Number(decimalN === '' ? 0 : decimalN),
            percent_digits: Number(decimalPct === '' ? 1 : decimalPct)
        };
        const show_n = newMode === 'all' || newMode === 'value';
        const show_percent = newMode === 'all' || newMode === 'percent';
        if (!(show_n && show_percent)) {
            payload.show_n = show_n;
            payload.show_percent = show_percent;
        }

        try {
            const result = await getSurveyProgressStyled.mutateAsync(payload);
            if (result?.success === "777" && result.resultjson && result.resultjson.tables) {
                const updatedTable = result.resultjson.tables[0];
                if (updatedTable && updatedTable.html) {
                    setQuestions(prev => prev.map(q =>
                        q.id === qId ? { ...q, html: updatedTable.html } : q
                    ));
                }
            }
        } catch (e) {
            console.error("Failed to refetch table HTML for display mode change", e);
        }
    };

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
            <DataHeader title="진행현황표">
                {/* 배너 영역 그룹 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* 배너 문항 선택 드롭다운 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap' }}>배너</span>
                        <div className="custom-filter-wrapper" ref={variableDropdownRef}>
                            <div
                                className={`custom-filter-trigger ${isVariableDropdownOpen ? 'open' : ''}`}
                                onClick={() => setIsVariableDropdownOpen(!isVariableDropdownOpen)}
                                style={{ width: '240px' }}
                            >
                                <span className="trigger-text">
                                    {(() => {
                                        if (overviewVariables.length === 0 && selectedVariableIds.length === 1 && selectedVariableIds[0] === 'answerStateCode') return '응답현황';
                                        if (overviewVariables.length === 0 && selectedVariableIds.length === 0) return '배너 문항 선택';
                                        if (selectedVariableIds.length === 0) return '선택 안함';
                                        if (selectedVariableIds.length === overviewVariables.length + 1) return '전체';
                                        const displayNames = [];
                                        selectedVariableIds.forEach(id => {
                                            if (id !== 'answerStateCode') {
                                                const v = overviewVariables.find(ov => ov.id === id);
                                                displayNames.push(v ? (v.label || v.id) : id);
                                            }
                                        });
                                        if (selectedVariableIds.includes('answerStateCode')) {
                                            displayNames.push('응답현황');
                                        }
                                        return displayNames.join(', ');
                                    })()}
                                </span>
                                <ChevronDown size={14} className="trigger-icon" />
                            </div>
                            {isVariableDropdownOpen && (
                                <div className="custom-filter-menu" style={{ width: '240px' }}>
                                    <div
                                        className="custom-filter-item"

                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedVariableIds.length === overviewVariables.length + 1) {
                                                setSelectedVariableIds([]);
                                                setFilterLogic('');
                                            } else {
                                                const allIds = [...overviewVariables.map(v => v.id), 'answerStateCode'];
                                                setSelectedVariableIds(allIds);
                                                const totalLogic = overviewVariables.map(v => v.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
                                                setFilterLogic(totalLogic);
                                            }
                                        }}
                                    >
                                        <div className={`checkbox-custom ${(selectedVariableIds.length === overviewVariables.length + 1) ? 'checked' : ''}`}>
                                            {(selectedVariableIds.length === overviewVariables.length + 1) && <Check size={12} color="#fff" strokeWidth={3} />}
                                        </div>
                                        <span className="filter-text" style={{ fontWeight: '600' }}>전체</span>
                                    </div>
                                    {overviewVariables.map(v => {
                                        const isChecked = selectedVariableIds.includes(v.id);
                                        return (
                                            <div
                                                key={v.id}
                                                className="custom-filter-item"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    let newIds;
                                                    if (isChecked) {
                                                        newIds = selectedVariableIds.filter(id => id !== v.id);
                                                    } else {
                                                        newIds = [...selectedVariableIds, v.id];
                                                    }
                                                    setSelectedVariableIds(newIds);
                                                    const totalLogic = newIds.filter(id => id !== 'answerStateCode').map(id => overviewVariables.find(ov => ov.id === id)?.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
                                                    setFilterLogic(totalLogic);
                                                }}
                                            >
                                                <div className={`checkbox-custom ${isChecked ? 'checked' : ''}`}>
                                                    {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                                                </div>
                                                <span className="filter-text">{v.label || v.id}</span>
                                            </div>
                                        );
                                    })}
                                    <div
                                        className="custom-filter-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            let newIds;
                                            const isAnswerCodeChecked = selectedVariableIds.includes('answerStateCode');
                                            if (isAnswerCodeChecked) {
                                                newIds = selectedVariableIds.filter(id => id !== 'answerStateCode');
                                            } else {
                                                newIds = [...selectedVariableIds, 'answerStateCode'];
                                            }
                                            setSelectedVariableIds(newIds);
                                            // filterLogic does not need answerStateCode logic string, keeps existing logic
                                            const totalLogic = newIds.filter(id => id !== 'answerStateCode').map(id => overviewVariables.find(ov => ov.id === id)?.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
                                            setFilterLogic(totalLogic);
                                        }}
                                    >
                                        <div className={`checkbox-custom ${selectedVariableIds.includes('answerStateCode') ? 'checked' : ''}`}>
                                            {selectedVariableIds.includes('answerStateCode') && <Check size={12} color="#fff" strokeWidth={3} />}
                                        </div>
                                        <span className="filter-text">응답현황</span>
                                    </div>
                                    {/* {overviewVariables.length === 0 && (
                                        <div className="custom-filter-item" style={{ color: '#999', justifyContent: 'center' }}>
                                            조회된 변수가 없습니다.
                                        </div>
                                    )} */}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 배너 설정 버튼 - 로직 편집 팝업 열기 */}
                    <button
                        onClick={() => setIsFilterPopupOpen(true)}
                        className={`advanced-filter-btn`}
                    >
                        <Filter size={15} />
                        배너 설정
                    </button>

                    <div style={{ width: '1px', height: '20px', background: '#cbd5e1', margin: '0 4px' }} />

                    {/* N Control Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden'
                    }}>
                        <div
                            onClick={() => {
                                if (showN && !showPct) {
                                    modal.showAlert("알림", "최소 1개 이상의 지표(N 또는 %)를 선택해야 합니다.");
                                    return;
                                }
                                setShowN(!showN);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%', cursor: 'pointer', background: '#eef2ff' }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '4px',
                                background: showN ? '#1e3a8a' : '#fff',
                                border: `1.5px solid ${showN ? '#1e3a8a' : '#1e3a8a'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {showN && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#3730a3', userSelect: 'none' }}>N</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', height: '100%', background: showN ? '#ffffff' : '#f8fafc' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: showN ? '#1e293b' : '#94a3b8' }}>소수점</span>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '38px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                background: showN ? '#ffffff' : '#f1f5f9'
                            }}>
                                <input
                                    type="text"
                                    disabled={!showN}
                                    value={localDecimalN}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                        if (val !== '') {
                                            let num = parseInt(val);
                                            if (num > 13) num = 13;
                                            setLocalDecimalN(num);
                                        } else {
                                            setLocalDecimalN('');
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setLocalDecimalN(prev => Math.min(13, (prev === '' ? 0 : prev) + 1));
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setLocalDecimalN(prev => Math.max(0, (prev === '' ? 0 : prev) - 1));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (localDecimalN === '') setLocalDecimalN(0);
                                    }}
                                    style={{
                                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                                        textAlign: 'center', fontSize: '13px', fontWeight: 800, color: showN ? '#1e3a8a' : '#94a3b8',
                                        outline: 'none', padding: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* % Control Group */}
                    <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: '20px', border: '1px solid #cbd5e1', background: '#f8fafc', height: '32px', overflow: 'hidden'
                    }}>
                        <div
                            onClick={() => {
                                if (showPct && !showN) {
                                    modal.showAlert("알림", "최소 1개 이상의 지표(N 또는 %)를 선택해야 합니다.");
                                    return;
                                }
                                setShowPct(!showPct);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', height: '100%', cursor: 'pointer', background: '#eef2ff' }}
                        >
                            <div style={{
                                width: '16px', height: '16px', borderRadius: '4px',
                                background: showPct ? '#1e3a8a' : '#fff',
                                border: `1.5px solid ${showPct ? '#1e3a8a' : '#1e3a8a'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {showPct && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#3730a3', userSelect: 'none' }}>%</span>
                        </div>
                        <div style={{ width: '1px', height: '100%', background: '#cbd5e1' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px', height: '100%', background: showPct ? '#ffffff' : '#f8fafc' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: showPct ? '#1e293b' : '#94a3b8' }}>소수점</span>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '38px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                background: showPct ? '#ffffff' : '#f1f5f9'
                            }}>
                                <input
                                    type="text"
                                    disabled={!showPct}
                                    value={localDecimalPct}
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                        if (val !== '') {
                                            let num = parseInt(val);
                                            if (num > 13) num = 13;
                                            setLocalDecimalPct(num);
                                        } else {
                                            setLocalDecimalPct('');
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setLocalDecimalPct(prev => Math.min(13, (prev === '' ? 1 : prev) + 1));
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setLocalDecimalPct(prev => Math.max(0, (prev === '' ? 1 : prev) - 1));
                                        }
                                    }}
                                    onBlur={() => {
                                        if (localDecimalPct === '') setLocalDecimalPct(1);
                                    }}
                                    style={{
                                        width: '100%', height: '100%', border: 'none', background: 'transparent',
                                        textAlign: 'center', fontSize: '13px', fontWeight: 800, color: showPct ? '#1e3a8a' : '#94a3b8',
                                        outline: 'none', padding: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div> {/* 배너 영역 그룹 끝 */}

                {/* 배너 영역 임시 숨김 처리 */}
                {false && (
                    <>
                        <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 8px' }} />

                        {/* 배너 영역 그룹 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* 베너 드롭다운 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#444', whiteSpace: 'nowrap' }}>베너</span>
                                <div className="custom-filter-wrapper" ref={bannerDropdownRef}>
                                    <div
                                        className={`custom-filter-trigger ${isBannerDropdownOpen ? 'open' : ''}`}
                                        onClick={() => setIsBannerDropdownOpen(!isBannerDropdownOpen)}
                                        style={{ width: '250px' }}
                                    >
                                        <span className="trigger-text">
                                            {(() => {
                                                if (bannerVariables.length === 0) return '배너 문항 선택';
                                                if (selectedBannerVariableIds.length === 0) return '선택 안함';
                                                if (selectedBannerVariableIds.length === bannerVariables.length) return '전체';
                                                const displayNames = [];
                                                selectedBannerVariableIds.forEach(id => {
                                                    const v = bannerVariables.find(ov => ov.id === id);
                                                    displayNames.push(v ? (v.label || v.id) : id);
                                                });
                                                return displayNames.join(', ');
                                            })()}
                                        </span>
                                        <ChevronDown size={14} className="trigger-icon" />
                                    </div>
                                    {isBannerDropdownOpen && (
                                        <div className="custom-filter-menu" style={{ width: '250px' }}>
                                            <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                                <input
                                                    type="text"
                                                    placeholder="문항을 검색하세요"
                                                    value={bannerSearchTerm}
                                                    onChange={(e) => setBannerSearchTerm(e.target.value)}
                                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '13px' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div
                                                className="custom-filter-item"

                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (selectedBannerVariableIds.length === bannerVariables.length) {
                                                        setSelectedBannerVariableIds([]);
                                                        setBannerLogic('');
                                                    } else {
                                                        const allIds = bannerVariables.map(v => v.id);
                                                        setSelectedBannerVariableIds(allIds);
                                                        const totalLogic = bannerVariables.map(v => v.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
                                                        setBannerLogic(totalLogic);
                                                    }
                                                }}
                                            >
                                                <div className={`checkbox-custom ${(selectedBannerVariableIds.length === bannerVariables.length) ? 'checked' : ''}`}>
                                                    {(selectedBannerVariableIds.length === bannerVariables.length) && <Check size={12} color="#fff" strokeWidth={3} />}
                                                </div>
                                                <span className="filter-text" style={{ fontWeight: '600' }}>전체</span>
                                            </div>
                                            {bannerVariables
                                                .filter(v => (v.label || v.id).toLowerCase().includes(bannerSearchTerm.toLowerCase()))
                                                .map(v => {
                                                    const isChecked = selectedBannerVariableIds.includes(v.id);
                                                    return (
                                                        <div
                                                            key={`banner-${v.id}`}
                                                            className="custom-filter-item"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                let newIds;
                                                                if (isChecked) {
                                                                    newIds = selectedBannerVariableIds.filter(id => id !== v.id);
                                                                } else {
                                                                    newIds = [...selectedBannerVariableIds, v.id];
                                                                }
                                                                setSelectedBannerVariableIds(newIds);
                                                                const totalLogic = newIds.map(id => bannerVariables.find(ov => ov.id === id)?.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
                                                                setBannerLogic(totalLogic);
                                                            }}
                                                        >
                                                            <div className={`checkbox-custom ${isChecked ? 'checked' : ''}`}>
                                                                {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                                                            </div>
                                                            <span className="filter-text">{v.label || v.id}</span>
                                                        </div>
                                                    );
                                                })}
                                            {bannerVariables.length === 0 && (
                                                <div className="custom-filter-item" style={{ color: '#999', justifyContent: 'center' }}>
                                                    조회된 배너 변수가 없습니다.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>


                        </div> {/* 배너 영역 그룹 끝 */}
                    </>
                )}

                {/* 엑셀다운로드 */}
                <button
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '32px',
                        padding: '0 16px',
                        border: '1.5px solid #1e3a8a',
                        borderRadius: '6px',
                        background: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#1e3a8a',
                        cursor: 'pointer',
                        marginLeft: '12px'
                    }}
                    onClick={() => {
                        setExcelShowBaseParenthesis(true);
                        setExcelDecimalPct(decimalPct);
                        setIsExcelModalOpen(true);
                    }}
                >
                    <Download size={16} strokeWidth={2.5} />
                    엑셀 다운로드
                </button>
            </DataHeader>

            {/* 필터 드롭다운 한 줄 영역 */}
            {currentPageId && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    background: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    zIndex: 99
                }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>필터</span>

                    {/* 필터 선택 드롭다운 */}
                    <div className="custom-filter-wrapper" ref={dropdownFilterMenuRef} style={{ position: 'relative', width: '320px' }}>
                        <div
                            className={`custom-filter-trigger ${isDropdownFilterOpen ? 'open' : ''}`}
                            onClick={toggleDropdownFilterOpen}
                            title={(() => {
                                const activeFilters = isDropdownFilterOpen ? tempDropdownFilters : selectedDropdownFilters;
                                const selectedSummaryTooltip = [];
                                Object.entries(activeFilters).forEach(([tableId, logics]) => {
                                    if (logics && logics.length > 0) {
                                        const table = dropdownFilterList.find(t => t.id === tableId);
                                        if (table) {
                                            const tableName = table.name || table.label || tableId;
                                            const selectedOptionLabels = logics.map(logicStr => {
                                                const opt = (table.info || []).find(o => o.logic === logicStr);
                                                return opt ? opt.label : '';
                                            }).filter(Boolean);
                                            selectedSummaryTooltip.push(`${tableName}: ${selectedOptionLabels.join(', ')}`);
                                        }
                                    }
                                });
                                return selectedSummaryTooltip.length > 0 ? selectedSummaryTooltip.join('\n') : undefined;
                            })()}
                            style={{
                                width: '100%',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                background: '#fff',
                                padding: '0 12px',
                                cursor: 'pointer',
                                userSelect: 'none'
                            }}
                        >
                            <span className="trigger-text" style={{ fontSize: '12px', color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {(() => {
                                    const activeFilters = isDropdownFilterOpen ? tempDropdownFilters : selectedDropdownFilters;
                                    const selectedSummary = [];
                                    Object.entries(activeFilters).forEach(([tableId, logics]) => {
                                        if (logics && logics.length > 0) {
                                            const table = dropdownFilterList.find(t => t.id === tableId);
                                            if (table) {
                                                logics.forEach(logicStr => {
                                                    const opt = (table.info || []).find(o => o.logic === logicStr);
                                                    if (opt && opt.label) {
                                                        selectedSummary.push(opt.label);
                                                    }
                                                });
                                            }
                                        }
                                    });
                                    return selectedSummary.length > 0 ? selectedSummary.join(', ') : '필터 선택';
                                })()}
                            </span>
                            <ChevronDown size={14} className="trigger-icon" style={{ color: '#94a3b8' }} />
                        </div>

                        {isDropdownFilterOpen && (
                            <div className="custom-filter-menu" style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                left: 0,
                                width: '325px',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                zIndex: 1000,
                                padding: '8px',
                                boxSizing: 'border-box'
                            }}>
                                {dropdownFilterList.length === 0 ? (
                                    <div style={{ padding: '16px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                                        필터 데이터가 없습니다.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {dropdownFilterList.map(table => {
                                            const tableId = table.id;
                                            const allLogics = (table.info || []).map(opt => opt.logic).filter(Boolean);
                                            const currentLogics = tempDropdownFilters[tableId] || [];
                                            const isParentChecked = allLogics.length > 0 && currentLogics.length === allLogics.length;
                                            const isParentIndeterminate = currentLogics.length > 0 && currentLogics.length < allLogics.length;

                                            return (
                                                <div key={tableId} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>
                                                    {/* Parent Node */}
                                                    <div
                                                        className="filter-parent-node"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '6px 8px',
                                                            cursor: 'pointer',
                                                            borderRadius: '4px',
                                                            userSelect: 'none'
                                                        }}
                                                        onClick={() => handleParentCheckboxChange(table)}
                                                    >
                                                        <div
                                                            className={`filter-checkbox-custom ${isParentChecked ? 'checked' : ''}`}
                                                            style={{
                                                                width: '16px',
                                                                height: '16px',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '4px',
                                                                background: '#fff',
                                                                borderColor: (isParentChecked || isParentIndeterminate) ? '#1e3a8a' : '#cbd5e1',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            {isParentChecked && <Check size={12} color="#1e3a8a" strokeWidth={3} />}
                                                            {isParentIndeterminate && <div style={{ width: '8px', height: '2px', background: '#1e3a8a' }} />}
                                                        </div>
                                                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                                                            {table.name || table.label || tableId}
                                                        </span>
                                                    </div>

                                                    {/* Children Option Nodes */}
                                                    <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                                        {(table.info || []).map(opt => {
                                                            const logicStr = opt.logic;
                                                            const isChildChecked = currentLogics.includes(logicStr);

                                                            return (
                                                                <div
                                                                    key={opt.logic || opt.index}
                                                                    className="filter-child-node"
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '8px',
                                                                        padding: '4px 8px',
                                                                        cursor: 'pointer',
                                                                        borderRadius: '4px',
                                                                        userSelect: 'none'
                                                                    }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleChildCheckboxChange(tableId, logicStr);
                                                                    }}
                                                                >
                                                                    <div
                                                                        className={`filter-checkbox-custom ${isChildChecked ? 'checked' : ''}`}
                                                                        style={{
                                                                            width: '16px',
                                                                            height: '16px',
                                                                            border: '1px solid #cbd5e1',
                                                                            borderRadius: '4px',
                                                                            background: '#fff',
                                                                            borderColor: isChildChecked ? '#1e3a8a' : '#cbd5e1',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            flexShrink: 0
                                                                        }}
                                                                    >
                                                                        {isChildChecked && <Check size={12} color="#1e3a8a" strokeWidth={3} />}
                                                                    </div>
                                                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                                                                        {opt.label}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 필터 적용/추가 버튼 */}
                    <button
                        onClick={handleApplyDropdownFilters}
                        style={{
                            height: '36px',
                            padding: '0 16px',
                            background: '#1e3a8a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = '#172e6b';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = '#1e3a8a';
                            e.currentTarget.style.transform = 'none';
                        }}
                    >
                        필터 추가
                    </button>

                    {/* 적용된 조건 조합 칩 리스트 */}
                    {(() => {
                        const activeFilterChips = Object.entries(selectedDropdownFilters)
                            .map(([tableId, logics]) => {
                                if (!logics || logics.length === 0) return null;
                                const table = dropdownFilterList.find(t => t.id === tableId);
                                if (!table) return null;

                                const namePart = table.name || table.id || '';
                                const labelPart = table.label || table.title || '';

                                // Find option labels corresponding to selected logics
                                const selectedOptionLabels = logics.map(logicStr => {
                                    const opt = (table.info || []).find(o => o.logic === logicStr);
                                    return opt ? opt.label : '';
                                }).filter(Boolean);

                                const displayText = `${namePart}. ${labelPart} (${selectedOptionLabels.join(', ')})`;
                                return { tableId, displayText };
                            })
                            .filter(Boolean);

                        if (activeFilterChips.length === 0) return null;

                        return (
                            <>
                                <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginLeft: '8px', whiteSpace: 'nowrap' }}>
                                    적용된 필터
                                </span>

                                <div style={{ flex: 1, position: 'relative', minWidth: 0, display: 'flex', alignItems: 'center' }}>
                                    {/* Visible container */}
                                    <div
                                        toughness="chips-wrapper"
                                        ref={chipsContainerRef}
                                        style={{
                                            display: 'flex',
                                            gap: '6px',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            flex: 1,
                                            maxHeight: isChipsExpanded ? '300px' : '56px',
                                            overflow: 'hidden',
                                            transition: 'max-height 0.25s ease-in-out',
                                        }}
                                    >
                                        {activeFilterChips.map((chip, idx) => {
                                            const isHidden = !isChipsExpanded && hasMoreChips && idx > maxVisibleIndex;
                                            return (
                                                <div
                                                    key={`chip-${chip.tableId}`}
                                                    style={{
                                                        display: isHidden ? 'none' : 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        background: '#eff6ff',
                                                        border: '1px solid #bfdbfe',
                                                        borderRadius: '16px',
                                                        padding: '4px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: 500,
                                                        color: '#1e40af',
                                                        userSelect: 'none',
                                                        transition: 'all 0.15s ease-in-out'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '11px', lineHeight: '1.2' }}>{chip.displayText}</span>
                                                    <span
                                                        onClick={() => handleRemoveFilterChip(chip.tableId)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '12px',
                                                            height: '12px',
                                                            borderRadius: '50%',
                                                            fontSize: '9px',
                                                            color: '#3b82f6',
                                                            fontWeight: 700,
                                                            transition: 'all 0.15s'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.background = '#dbeafe';
                                                            e.currentTarget.style.color = '#1d4ed8';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.background = 'transparent';
                                                            e.currentTarget.style.color = '#3b82f6';
                                                        }}
                                                    >
                                                        ✕
                                                    </span>
                                                </div>
                                            );
                                        })}

                                        {isChipsExpanded && hasMoreChips && (
                                            <button
                                                onClick={() => setIsChipsExpanded(false)}
                                                style={{
                                                    fontSize: '11px',
                                                    color: '#1e3a8a',
                                                    background: '#eff6ff',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '12px',
                                                    padding: '2px 10px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.15s ease-in-out',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = '#dbeafe';
                                                    e.currentTarget.style.borderColor = '#93c5fd';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = '#eff6ff';
                                                    e.currentTarget.style.borderColor = '#bfdbfe';
                                                }}
                                            >
                                                접기 ▴
                                            </button>
                                        )}

                                        {!isChipsExpanded && hasMoreChips && (
                                            <button
                                                onClick={() => setIsChipsExpanded(true)}
                                                style={{
                                                    fontSize: '11px',
                                                    color: '#1e3a8a',
                                                    background: '#eff6ff',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '12px',
                                                    padding: '2px 10px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.15s ease-in-out',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = '#dbeafe';
                                                    e.currentTarget.style.borderColor = '#93c5fd';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = '#eff6ff';
                                                    e.currentTarget.style.borderColor = '#bfdbfe';
                                                }}
                                            >
                                                더보기 ▾
                                            </button>
                                        )}
                                    </div>

                                    {/* Shadow Measuring Container */}
                                    <div
                                        ref={measuringRef}
                                        style={{
                                            position: 'absolute',
                                            visibility: 'hidden',
                                            pointerEvents: 'none',
                                            left: 0,
                                            right: 0,
                                            top: 0,
                                            display: 'flex',
                                            gap: '6px',
                                            flexWrap: 'wrap',
                                            alignItems: 'center'
                                        }}
                                    >
                                        {activeFilterChips.map((chip) => (
                                            <div
                                                key={`shadow-chip-${chip.tableId}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: '#eff6ff',
                                                    border: '1px solid #bfdbfe',
                                                    borderRadius: '16px',
                                                    padding: '4px 10px',
                                                    fontSize: '11px',
                                                    fontWeight: 500,
                                                    color: '#1e40af',
                                                    userSelect: 'none',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                <span style={{ fontSize: '11px', lineHeight: '1.2' }}>{chip.displayText}</span>
                                                <span style={{ fontSize: '9px', fontWeight: 700, marginLeft: '6px' }}>✕</span>
                                            </div>
                                        ))}
                                        <button
                                            style={{
                                                fontSize: '11px',
                                                color: '#1e3a8a',
                                                background: '#eff6ff',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: '12px',
                                                padding: '2px 10px',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                whiteSpace: 'nowrap',
                                                visibility: 'hidden'
                                            }}
                                        >
                                            더보기 ▾
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '12px', flexShrink: 0 }}>
                                    <button
                                        onClick={handleResetAllFilters}
                                        style={{
                                            fontSize: '11px',
                                            color: '#475569',
                                            background: '#f1f5f9',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '12px',
                                            padding: '2px 10px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s ease-in-out',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = '#e2e8f0';
                                            e.currentTarget.style.color = '#1e293b';
                                            e.currentTarget.style.borderColor = '#94a3b8';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = '#f1f5f9';
                                            e.currentTarget.style.color = '#475569';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                        }}
                                    >
                                        전체 초기화
                                    </button>
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
            {currentPageId && (
                <div className="aggregation-layout">
                    <SideBar
                        className="compact-sidebar"
                        title="테이블 목록"
                        totalCount={totalQuestions}
                        items={sidebarItems}
                        selectedId={activeId}
                        onItemClick={(item) => scrollToId(item.id)}
                        onSearch={setSearchTerm}
                        searchPlaceholder="변수명 또는 라벨 검색"
                        onScrollEnd={handleSidebarScrollEnd}
                        currentPage={sidebarPage}
                        totalPages={totalSidebarPages}
                        onPageChange={handlePageChange}
                    />

                    <div className="agg-main" ref={mainRef}>
                        {questions.length > 0 ? (
                            questions.map(q => (
                                <AggregationCard key={q.id} q={q} paletteId={globalPaletteId} setPaletteId={setGlobalPaletteId} onDisplayModeChange={handleDisplayModeChange} showN={showN} showPct={showPct} decimalN={decimalN} decimalPct={decimalPct} />
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

            {isExcelModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.4)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Download size={22} color="#1e3a8a" strokeWidth={2.5} />
                            엑셀 다운로드
                        </h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#475569', fontWeight: 500, lineHeight: '1.5' }}>
                            진행현황표를 엑셀 파일로 다운로드 하시겠습니까?
                        </p>
                        <div style={{ marginBottom: '28px', padding: '16px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none'
                                    }}
                                    onClick={() => setExcelShowPct(!excelShowPct)}
                                >
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '5px',
                                        background: excelShowPct ? '#1e3a8a' : '#fff',
                                        border: `1.5px solid ${excelShowPct ? '#1e3a8a' : '#cbd5e1'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        transition: 'all 0.15s'
                                    }}>
                                        {excelShowPct && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>% 표출 여부</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>% 소수점</span>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '42px', height: '22px', border: '1.5px solid #cbd5e1', borderRadius: '12px',
                                        background: '#ffffff'
                                    }}>
                                        <input
                                            type="text"
                                            value={excelDecimalPct}
                                            onChange={(e) => {
                                                let val = e.target.value.replace(/[^0-9]/g, '');
                                                if (val !== '') {
                                                    let num = parseInt(val);
                                                    if (num > 13) num = 13;
                                                    setExcelDecimalPct(num);
                                                } else {
                                                    setExcelDecimalPct('');
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setExcelDecimalPct(prev => Math.min(13, (prev === '' ? 1 : prev) + 1));
                                                } else if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setExcelDecimalPct(prev => Math.max(0, (prev === '' ? 1 : prev) - 1));
                                                }
                                            }}
                                            onBlur={() => {
                                                if (excelDecimalPct === '') setExcelDecimalPct(1);
                                            }}
                                            style={{
                                                width: '100%', height: '100%', border: 'none', background: 'transparent',
                                                textAlign: 'center', fontSize: '13px', fontWeight: 800, color: '#1e3a8a',
                                                outline: 'none', padding: 0
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none'
                                }}
                                onClick={() => setExcelShowBaseParenthesis(!excelShowBaseParenthesis)}
                            >
                                <div style={{
                                    width: '20px', height: '20px', borderRadius: '5px',
                                    background: excelShowBaseParenthesis ? '#1e3a8a' : '#fff',
                                    border: `1.5px solid ${excelShowBaseParenthesis ? '#1e3a8a' : '#cbd5e1'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.15s'
                                }}>
                                    {excelShowBaseParenthesis && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Base 기본 (괄호)</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setIsExcelModalOpen(false)}
                                onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                                onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                                style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'background 0.2s' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={async () => {
                                    setIsExcelModalOpen(false);
                                    await handleExcelExport();
                                }}
                                onMouseOver={(e) => e.target.style.background = '#1e40af'}
                                onMouseOut={(e) => e.target.style.background = '#1e3a8a'}
                                style={{ padding: '10px 24px', background: '#1e3a8a', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, transition: 'background 0.2s' }}
                            >
                                다운로드
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FrequencyAnalysisPage;
