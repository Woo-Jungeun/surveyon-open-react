
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Copy, Maximize, Settings, Download, BarChart2, Layers, LineChart, PieChart, Donut, Aperture, Filter, MoreHorizontal, AreaChart, Map as MapIcon, LayoutGrid, Bot, Loader2, CheckCircle2, GripVertical, ChevronLeft, ChevronRight, Maximize2, ChevronDown, ChevronsUpDown, ChevronUp, X, Cloud, Check, LayoutList, BarChartHorizontal, Percent } from 'lucide-react';
import KendoChart from '../../components/KendoChart';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { saveAs } from '@progress/kendo-file-saver';
import { CHART_THEME_OPTIONS } from '../../constants/chartThemes';

const computeLocalVars = (dataItem, chartMode) => {
    if (!dataItem) return {};

    // 최종 기준: 도넛형(Donut)만 퍼센트(_pct) 사용
    // 그 외 원형(Pie) 포함 모든 차트는 사례수(count) 사용
    const usePercent = chartMode === 'donut' || chartMode === 'funnel';

    const chartData = dataItem.columns.map((colObj, colIndex) => {
        let colName = colObj.label || colObj;
        if (typeof colObj === 'object') {
            const parts = [];
            if (colObj.label) parts.push(colObj.label);
            else if (colObj.name) parts.push(colObj.name);
            if (colObj.label2) parts.push(colObj.label2);
            if (colObj.label3) parts.push(colObj.label3);
            colName = parts.length > 0 ? parts.filter(Boolean).join('\n') : (colObj.label || colObj.name || String(colObj));
        }

        const dataPoint = { name: colName };
        dataItem.rows.forEach(row => {
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
    }).filter(d => !['전체', '합계', 'total', 'Total'].includes(d.name));

    const seriesNames = dataItem.rows
        .filter(row => !(row.label && ['합계', '전체', 'total', 'Total'].includes(row.label)))
        .map(row => row.label);

    const hasColLabel2 = dataItem.columns?.some(c => c.label2);
    const hasColLabel3 = dataItem.columns?.some(c => c.label3);
    const hasVarLabel = dataItem.columns?.some(c => c.var_label);
    const hasRowLabel2 = dataItem.rows?.some(r => r.label2 || r.var_label);

    return {
        chartData,
        seriesNames,
        suffix: usePercent ? "%" : "",
        hasColLabel2,
        hasColLabel3,
        hasVarLabel,
        hasRowLabel2
    };
};


const formatCountValue = (val, policy) => {
    if (val === null || val === undefined || val === '') return '-';
    const digits = policy?.n_digits ?? 0;
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const formatPercentValue = (val, policy) => {
    if (val === null || val === undefined || val === '') return '-';
    const digits = policy?.percent_digits ?? 1;
    return Number(val).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export const ResultSectionBlock = ({
    resultData,
    displayPolicy,
    renderSettings,
    dataIndex,
    isConfigOpen,
    setIsConfigOpen,
    setToast,
    setFullscreenModal,
    tableName,
    isExpanded,
    onToggleExpand,
    isAnyExpanded,
    tableMode,
    paletteId,
    setPaletteId
}) => {
    const [chartMode, setChartMode] = useState(null);
    const activeChartMode = chartMode || 'column';
    const [showLegend, setShowLegend] = useState(false);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [selectedChartGroups, setSelectedChartGroups] = useState([]);

    const [isStatsOptionsOpen, setIsStatsOptionsOpen] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
    const [displayMode, setDisplayMode] = useState('all');
    const [columnLayout, setColumnLayout] = useState('single');
    const [isMoreStatsOpen, setIsMoreStatsOpen] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isPaletteMenuOpen, setIsPaletteMenuOpen] = useState(false);
    const paletteMenuRef = useRef(null);
    const [isChartTypeMenuOpen, setIsChartTypeMenuOpen] = useState(false);
    const chartTypeMenuRef = useRef(null);

    const { chartData: fullChartData, seriesNames, hasColLabel2, hasColLabel3, hasVarLabel, hasRowLabel2, suffix } = useMemo(() =>
        computeLocalVars(resultData, activeChartMode),
        [resultData, activeChartMode]
    );

    const availableChartGroups = useMemo(() => {
        if (!fullChartData) return [];
        const groups = new Set();
        fullChartData.forEach(d => {
            const parts = d.name.split('\n');
            const groupName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
            groups.add(groupName);
        });
        return Array.from(groups);
    }, [fullChartData]);

    const prevAvailableGroupsStr = useRef("");

    useEffect(() => {
        const currentGroupsStr = availableChartGroups.join(",");
        if (availableChartGroups.length > 0 && prevAvailableGroupsStr.current !== currentGroupsStr) {
            setSelectedChartGroups(availableChartGroups);
            prevAvailableGroupsStr.current = currentGroupsStr;
        }
    }, [availableChartGroups]);

    const chartData = useMemo(() => {
        if (!fullChartData) return [];
        return fullChartData.filter(d => {
            const parts = d.name.split('\n');
            const groupName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
            return selectedChartGroups.includes(groupName);
        });
    }, [fullChartData, selectedChartGroups]);

    
    const uiSettings = renderSettings || {};
    const effectivePolicy = displayPolicy || {};
    
    const headerBorder = `${uiSettings?.theme_header_divider_width || '1px'} ${uiSettings?.theme_header_divider_style || 'solid'} ${uiSettings?.theme_header_divider_color || '#cbd5e1'}`;
    const stubBorder = `${uiSettings?.theme_stub_divider_width || '1px'} ${uiSettings?.theme_stub_divider_style || 'solid'} ${uiSettings?.theme_stub_divider_color || '#cbd5e1'}`;
    const gridBorder = `${uiSettings?.theme_grid_width || '1px'} ${uiSettings?.theme_grid_style || 'solid'} ${uiSettings?.theme_grid_color || '#e2e8f0'}`;
    const sectionBorder = `${uiSettings?.theme_section_separator_width || '2px'} ${uiSettings?.theme_section_separator_style || 'dashed'} ${uiSettings?.theme_section_separator_color || '#000'}`;

    const topOuter = `${uiSettings?.theme_table_outer_top_width || '0px'} ${uiSettings?.theme_table_outer_top_style || 'none'} ${uiSettings?.theme_table_outer_top_color || 'transparent'}`;
    const bottomOuter = `${uiSettings?.theme_table_outer_bottom_width || '0px'} ${uiSettings?.theme_table_outer_bottom_style || 'none'} ${uiSettings?.theme_table_outer_bottom_color || 'transparent'}`;
    const leftOuter = `${uiSettings?.theme_table_outer_left_width || '0px'} ${uiSettings?.theme_table_outer_left_style || 'none'} ${uiSettings?.theme_table_outer_left_color || 'transparent'}`;
    const rightOuter = `${uiSettings?.theme_table_outer_right_width || '0px'} ${uiSettings?.theme_table_outer_right_style || 'none'} ${uiSettings?.theme_table_outer_right_color || 'transparent'}`;

    const chartContainerRef = useRef(null);
    const displayMenuRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const moreStatsRef = useRef(null);
    const filterMenuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (paletteMenuRef.current && !paletteMenuRef.current.contains(e.target)) {
                setIsPaletteMenuOpen(false);
            }
            if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
                setIsFilterMenuOpen(false);
            }
            if (chartTypeMenuRef.current && !chartTypeMenuRef.current.contains(e.target)) {
                setIsChartTypeMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [layoutOptions, setLayoutOptions] = useState([
        { id: 'table', label: '표', checked: true },
        { id: 'stats', label: '통계', checked: true },
        { id: 'chart', label: '차트', checked: false },
        { id: 'ai', label: 'AI 분석', checked: false }
    ]);

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

    const handleCopyTable = async (dataItem, hasColLabel2, hasColLabel3, hasRowLabel2) => {
        try {
            let clipboardText = "";
            if (hasColLabel2 || hasColLabel3 || hasRowLabel2) {
                const headerRows = [];
                if (hasColLabel3) headerRows.push([(hasRowLabel2 ? '대분류' : ''), '문항', ...dataItem.columns.map(c => c.label3 || '')].filter(Boolean).join('\t'));
                if (hasColLabel2) headerRows.push([(hasRowLabel2 ? '' : ''), '', ...dataItem.columns.map(c => c.label2 || '')].filter(Boolean).join('\t'));
                headerRows.push([(hasRowLabel2 ? '' : ''), '', ...dataItem.columns.map(c => c?.label ?? c)].filter(Boolean).join('\t'));

                const rows = dataItem.rows.map(row =>
                    [(hasRowLabel2 ? (row.label2 || row.var_label || '') : ''), row.label, ...row.values.map(v => {
                        if (displayMode === 'value') return v.count;
                        if (displayMode === 'percent') return `${v.percent}%`;
                        return `${v.count} (${v.percent}%)`;
                    })].join('\t')
                ).join('\n');

                clipboardText = `${headerRows.join('\n')}\n${rows}`;
            } else {
                const headers = ['문항', ...dataItem.columns.map(c => c?.label ?? c)].join('\t');
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

    const handleCopyStats = async (dataItem, hasColLabel2, hasColLabel3, hasRowLabel2) => {
        try {
            let clipboardText = "";
            if (hasColLabel2 || hasColLabel3 || hasRowLabel2) {
                const headerRows = [];
                if (hasColLabel3) headerRows.push(['통계분류', '통계항목', ...dataItem.columns.map(c => c.label3 || '')].join('\t'));
                if (hasColLabel2) headerRows.push(['', '', ...dataItem.columns.map(c => c.label2 || '')].join('\t'));
                headerRows.push(['', '', ...dataItem.columns.map(c => c?.label ?? c)].join('\t'));

                const rows = statsOptions.filter(opt => opt.checked).map(stat => {
                    const statKey = stat.id.toLowerCase();
                    const statValues = dataItem.stats[statKey] || [];
                    return [stat.label, '', ...statValues].join('\t');
                }).join('\n');
                clipboardText = `${headerRows.join('\n')}\n${rows}`;
            } else {
                const headers = ['통계', ...dataItem.columns.map(c => c?.label ?? c)].join('\t');
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
            const rect = svgElement.getBoundingClientRect();

            // 여백(Padding)을 주어 Y축 긴 라벨이나 끝부분 막대가 잘리지 않도록 보호
            const padding = 20;
            const width = Math.max(bbox.width, rect.width) + padding * 2;
            const height = Math.max(bbox.height, rect.height) + padding * 2;

            const clonedSvg = svgElement.cloneNode(true);
            let finalWidth = width;
            let finalHeight = height;

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
            className={`result-section ${tableMode === 'merged' ? 'is-expanded is-merged' : (isExpanded ? 'is-expanded' : 'is-narrow')} ${isConfigOpen ? 'is-config-open' : ''}`}
            style={{
                marginTop: dataIndex > 0 ? (tableMode === 'merged' || isExpanded ? '20px' : '8px') : '0'
            }}
        >
            <div
                className="result-header"
                onClick={() => {
                    if (isConfigOpen) {
                        setIsConfigOpen(false);
                    } else if (tableMode !== 'merged') {
                        onToggleExpand();
                    }
                }}
                style={{ cursor: (isConfigOpen || tableMode !== 'merged') ? 'pointer' : 'default' }}
            >
                <div className="result-tabs" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div className="result-tab">
                        결과 {resultData.y_info && <span className="y-info-label" title={resultData.y_info}>{resultData.y_info}</span>}
                    </div>
                    {!isConfigOpen && (tableMode === 'merged' || isExpanded) && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); setIsStatsOptionsOpen(!isStatsOptionsOpen); }} className={`stats-toggle-btn ${isStatsOptionsOpen ? 'active' : ''}`}>
                                <Settings size={14} />
                                <span>옵션 설정</span>
                            </button>
                            {isStatsOptionsOpen && (
                                <div className="inline-options-container" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '4px 12px', borderRadius: '6px',  }}>
                                    <div className="stats-controls__section" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                                        <span className="stats-controls__section-label" style={{ marginBottom: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>배치 옵션</span>
                                        <div className="sortable-list" style={{ flexWrap: 'nowrap', gap: '4px' }}>
                                            {layoutOptions.map((item, index) => {
                                                if (item.id === 'stats') return null; // [USER-REQUEST] 통계 임시 주석
                                                return (
                                                    <div key={item.id} className={`sortable-item ${item.checked ? 'checked' : ''} ${item.id === 'ai' ? 'disabled' : ''}`}
                                                        style={{ padding: '2px 8px', fontSize: '12px', gap: '4px', minWidth: 'auto', marginBottom: 0 }}
                                                        draggable={item.id !== 'ai'}
                                                        onDragStart={(e) => item.id !== 'ai' && handleSortDragStart(e, index, 'layout')}
                                                        onDragOver={(e) => { if (item.id !== 'ai') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
                                                        onDrop={(e) => item.id !== 'ai' && handleSortDrop(e, index, 'layout')}
                                                        onClick={(e) => { e.stopPropagation(); item.id !== 'ai' && toggleLayoutOption(item.id); }}>
                                                        <GripVertical size={12} className="drag-handle" style={item.id === 'ai' ? { display: 'none' } : {}} />
                                                        <span>{item.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="stats-controls__divider" style={{ width: '1px', height: '16px', margin: 0, background: '#e2e8f0' }}></div>
                                    <div className="stats-controls__section" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                                        <span className="stats-controls__section-label" style={{ marginBottom: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>단 설정</span>
                                        <div className="toggle-group" style={{ height: '24px' }}>
                                            <button className={`toggle-chip ${columnLayout === 'single' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '0 8px', height: '24px' }} onClick={(e) => { e.stopPropagation(); setColumnLayout('single'); }}>1단</button>
                                            <button className={`toggle-chip ${columnLayout === 'double' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '0 8px', height: '24px' }} onClick={(e) => { e.stopPropagation(); setColumnLayout('double'); }}>2단</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="result-actions">
                    {tableMode !== 'merged' && !isConfigOpen && (
                        <button
                            className={`wide-view-toggle-btn ${isExpanded ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                            title={isExpanded ? "원래대로 보기" : "넓게 보기"}
                        >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                </div>
            </div>


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
                                                <button onClick={() => handleCopyTable(resultData, hasColLabel2, hasColLabel3, hasRowLabel2)} className="action-btn">
                                                    <Copy size={16} />
                                                    <span>복사</span>
                                                </button>
                                                <button
                                                    onClick={() => setFullscreenModal({
                                                        open: true,
                                                        type: 'table',
                                                        dataItem: resultData,
                                                        chartData,
                                                        seriesNames,
                                                        statsOptions,
                                                        chartMode,
                                                        displayMode,
                                                        setDisplayMode, // Pass the setter
                                                        paletteId,
                                                        tableName
                                                    })}
                                                    className="action-btn"
                                                >
                                                    <Maximize size={16} />
                                                    <span>전체화면</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="table-wrapper">
                                            
              <style>{`
                  .table-wrapper .cross-table {
                      font-size: ${uiSettings.font_size ? uiSettings.font_size + 'px' : '12px'} !important;
                      border-top: ${topOuter} !important;
                      border-bottom: ${bottomOuter} !important;
                      border-left: ${leftOuter} !important;
                      border-right: ${rightOuter} !important;
                      color: ${uiSettings.theme_text || '#0f172a'} !important;
                  }
                  .table-wrapper .cross-table th {
                        border-bottom: ${headerBorder} !important;
                        border-right: none !important;
                    }
                    .table-wrapper .cross-table td {
                        border-right: none !important;
                        border-bottom: none !important;
                    }
                    .table-wrapper .cross-table th.sticky-col,
                    .table-wrapper .cross-table td.sticky-col {
                        border-right: ${stubBorder} !important;
                    }
                    .table-wrapper .cross-table td.sticky-col {
                        background-color: ${uiSettings?.theme_stub_header_bg || '#D9E1F2'} !important;
                        color: ${uiSettings?.theme_stub_header_fg || '#000'} !important;
                    }
                `}</style>
                                            <table className="cross-table" style={{ width: "max-content", tableLayout: "fixed", margin: 0 }}>
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
                                                        const isSectionAgg = ['top', 'bottom', 'bot', 'mean', 'std'].some(role => String(row.row_role ?? row.stat_type ?? "").toLowerCase().includes(role));
                                                        let customTopBorderAttr = undefined;
                                                        if (row.line && row.line !== 'none') {
                                                            const lineStyle = row.line === 'thick' ? 'solid' : row.line;
                                                            const lineWidth = row.line === 'double' ? '3px' : '2px';
                                                            customTopBorderAttr = `${lineWidth} ${lineStyle} #475569`;
                                                        }
                                                        const topBorderAttr = customTopBorderAttr || (isBaseRow ? 'none' : (isSectionAgg ? sectionBorder : gridBorder));

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
                                    </div>
                                );
                            }
                            if (option.id === 'stats') {
                                return null; /* [USER-REQUEST] 통계 임시 주석
                                return (
                                    <div key="stats" className="result-block">
                                        <div className="section-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="blue-bar"></div>
                                                <span className="section-title">통계</span>
                                            </div>
                                            <div className="section-actions">
                                                <button onClick={() => handleCopyStats(resultData, hasColLabel2, hasColLabel3, hasRowLabel2)} className="action-btn">
                                                    <Copy size={16} />
                                                    <span>복사</span>
                                                </button>
                                                <button
                                                    onClick={() => setFullscreenModal({
                                                        open: true,
                                                        type: 'stats',
                                                        dataItem: resultData,
                                                        chartData,
                                                        seriesNames,
                                                        statsOptions,
                                                        chartMode,
                                                        displayMode,
                                                        setDisplayMode, // Pass the setter
                                                        paletteId,
                                                        tableName
                                                    })}
                                                    className="action-btn"
                                                >
                                                    <Maximize size={16} />
                                                    <span>전체화면</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="stats-table-container">
                                            <table className="stats-table" style={{ width: "max-content", tableLayout: "fixed", margin: 0 }}>
                                                <thead>
                                                    {(() => {
                                                        const statsTotalRows = (hasVarLabel ? 1 : 0) + (headerGroups.showRow2 ? 1 : 0) + (headerGroups.showRow3 ? 1 : 0) + 1;
                                                        const rows = [];

                                                        if (hasVarLabel) {
                                                            rows.push(
                                                                <tr key="stats-var-label-row">
                                                                    <th
                                                                        rowSpan={statsTotalRows}
                                                                        className="stats-th-label"
                                                                        style={{
                                                                            background: uiSettings?.theme_primary || '#f8fafc',
                                                                            
                                                                            
                                                                            fontWeight: '700',
                                                                            color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                            fontSize: '11px',
                                                                            textAlign: 'center',
                                                                            verticalAlign: 'middle'
                                                                        }}
                                                                    >
                                                                        통계
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
                                                                                
                                                                                borderRight: i < headerGroups.row1.length - 1 ? '1px solid #dbeafe' : 'none',
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
                                                            rows.push(
                                                                <tr key="stats-col-label3-row">
                                                                    {!hasVarLabel && (
                                                                        <th
                                                                            rowSpan={statsTotalRows}
                                                                            className="stats-th-label"
                                                                            style={{
                                                                                background: uiSettings?.theme_primary || '#f8fafc',
                                                                                
                                                                                
                                                                                fontWeight: '700',
                                                                                color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                                fontSize: '11px',
                                                                                textAlign: 'center',
                                                                                verticalAlign: 'middle'
                                                                            }}
                                                                        >
                                                                            통계
                                                                        </th>
                                                                    )}
                                                                    {headerGroups.row3.map((group, i) => {
                                                                        const isSpanned = headerGroups.row1.some(g1 => g1.rowSpan >= 2 && g1.startIndex <= group.startIndex && (g1.startIndex + g1.count) >= (group.startIndex + group.count));
                                                                        if (isSpanned) return null;
                                                                        return (
                                                                            <th key={i} colSpan={group.count} rowSpan={group.rowSpan} style={{ background: uiSettings?.theme_primary || '#f0f9ff',  color: uiSettings?.theme_primary_fg || '#1e3a8a', fontWeight: '700', fontSize: '11px' }}>
                                                                                {group.label}
                                                                            </th>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        }

                                                        if (headerGroups.showRow2) {
                                                            rows.push(
                                                                <tr key="stats-col-label2-row">
                                                                    {(!hasVarLabel && !headerGroups.showRow3) && (
                                                                        <th
                                                                            rowSpan={statsTotalRows}
                                                                            className="stats-th-label"
                                                                            style={{
                                                                                background: uiSettings?.theme_primary || '#f8fafc',
                                                                                
                                                                                
                                                                                fontWeight: '700',
                                                                                color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                                fontSize: '11px',
                                                                                textAlign: 'center',
                                                                                verticalAlign: 'middle'
                                                                            }}
                                                                        >
                                                                            통계
                                                                        </th>
                                                                    )}
                                                                    {headerGroups.row2.map((group, i) => {
                                                                        const coveredByRow1 = headerGroups.row1.some(g1 => g1.rowSpan >= 3 && g1.startIndex <= group.startIndex && (g1.startIndex + g1.count) >= (group.startIndex + group.count));
                                                                        const coveredByRow3 = headerGroups.row3.some(g3 => g3.rowSpan >= 2 && g3.startIndex <= group.startIndex && (g3.startIndex + g3.count) >= (group.startIndex + group.count));
                                                                        if (coveredByRow1 || coveredByRow3) return null;
                                                                        return (
                                                                            <th key={i} colSpan={group.count} style={{ background: uiSettings?.theme_primary || '#f8fafc',  color: uiSettings?.theme_primary_fg || '#1e3a8a', fontWeight: '700', fontSize: '11px' }}>
                                                                                {group.label}
                                                                            </th>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        }

                                                        rows.push(
                                                            <tr key="stats-label-row">
                                                                {(!hasVarLabel && !headerGroups.showRow2 && !headerGroups.showRow3) && (
                                                                    <th
                                                                        rowSpan={statsTotalRows}
                                                                        className="stats-th-label"
                                                                        style={{
                                                                            background: uiSettings?.theme_primary || '#f8fafc',
                                                                            
                                                                            
                                                                            fontWeight: '700',
                                                                            color: uiSettings?.theme_primary_fg || '#1e3a8a',
                                                                            fontSize: '11px',
                                                                            textAlign: 'center',
                                                                            verticalAlign: 'middle'
                                                                        }}
                                                                    >
                                                                        통계
                                                                    </th>
                                                                )}
                                                                {resultData.columns.map((col, i) => (
                                                                    <th key={i} style={{ minWidth: '80px', background: uiSettings?.theme_primary || '#f8fafc',  color: uiSettings?.theme_primary_fg || '#64748b', fontSize: '11px', fontWeight: '600' }}>
                                                                        {col?.label ?? col}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        );

                                                        return rows;
                                                    })()}
                                                </thead>
                                                <tbody>
                                                    {statsOptions.filter(opt => opt.checked).map(stat => (
                                                        <tr key={stat.id}>
                                                            <td className="stats-td-label" style={{ color: uiSettings?.theme_primary_fg || '#1e3a8a', fontWeight: '700', textAlign: 'center' }}>{stat.label}</td>
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
                                */
                            }
                            if (option.id === 'chart') {
                                return (
                                    <div key="chart" className="result-block">
                                        <div className="section-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="blue-bar"></div>
                                                <span className="section-title">차트</span>
                                            </div>
                                            <div className="section-actions">
                                                <div className="chart-type-toolbar">
                                                    <div className="download-menu-container" ref={downloadMenuRef} style={{ marginRight: '4px' }}>
                                                        <button className={`view-option-btn download-btn ${showDownloadMenu ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowDownloadMenu(!showDownloadMenu); }} title="다운로드">
                                                            <Download size={16} />
                                                        </button>
                                                        {showDownloadMenu && (
                                                            <div className="download-dropdown" style={{ top: 'calc(100% + 4px)', right: 0, left: 'auto' }}>
                                                                <button onClick={() => handleDownload('png')}>PNG (이미지)</button>
                                                                <button onClick={() => handleDownload('svg')}>SVG (PPT용)</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="download-menu-container" ref={paletteMenuRef} style={{ marginRight: '4px' }}>
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
                                                                        width: '16px',
                                                                        height: '16px',
                                                                        borderRadius: '50%',
                                                                        background: `conic-gradient(${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[0]})`,
                                                                    }}></div>
                                                                );
                                                            })()}
                                                        </button>
                                                        {isPaletteMenuOpen && (
                                                            <div className="download-dropdown" style={{ top: 'calc(100% + 4px)', right: 0, left: 'auto', minWidth: '160px', zIndex: 1100, position: 'absolute', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
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

                                                    <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />

                                                    <button
                                                        onClick={() => setShowLegend(!showLegend)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                            padding: '4px 8px', border: `1px solid ${showLegend ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px',
                                                            background: showLegend ? '#eff6ff' : '#fff',
                                                            color: showLegend ? '#2563eb' : '#64748b',
                                                            fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', height: '100%'
                                                        }}
                                                        title="범례 보기/숨기기"
                                                    >
                                                        <LayoutList size={14} style={{ flexShrink: 0 }} />
                                                        <span style={{ whiteSpace: 'nowrap' }}>범례</span>
                                                    </button>

                                                    <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />

                                                    {availableChartGroups.length > 0 && (
                                                        <div style={{ position: 'relative' }} ref={filterMenuRef}>
                                                            <button
                                                                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                                    padding: '4px 8px', border: `1px solid ${(selectedChartGroups.length > 0 && selectedChartGroups.length < availableChartGroups.length) ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px',
                                                                    background: (selectedChartGroups.length > 0 && selectedChartGroups.length < availableChartGroups.length) ? '#eff6ff' : '#fff',
                                                                    color: (selectedChartGroups.length > 0 && selectedChartGroups.length < availableChartGroups.length) ? '#2563eb' : '#64748b',
                                                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', height: '100%',
                                                                    maxWidth: '220px'
                                                                }}
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

                                                            {isFilterMenuOpen && (
                                                                <div style={{
                                                                    position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                                                                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', zIndex: 1000,
                                                                    minWidth: '200px', padding: '8px',
                                                                    display: 'flex', flexDirection: 'column', gap: '4px'
                                                                }}>
                                                                    <div style={{ padding: '4px 8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}
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
                                                                                    <span style={{ wordBreak: 'keep-all', lineHeight: 1.2 }}>{group}</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px', alignSelf: 'center' }} />
                                                    
                                                    {columnLayout === 'double' ? (
                                                        <div className="download-menu-container" ref={chartTypeMenuRef}>
                                                            <button
                                                                className={`view-option-btn ${isChartTypeMenuOpen ? 'active' : ''}`}
                                                                onClick={(e) => { e.stopPropagation(); setIsChartTypeMenuOpen(!isChartTypeMenuOpen); }}
                                                                title="차트 타입 변경"
                                                            >
                                                                {(() => {
                                                                    const CHART_TYPE_OPTIONS = [
                                                                        { id: 'column', icon: <BarChart2 size={16} /> },
                                                                        { id: 'bar', icon: <BarChartHorizontal size={16} /> },
                                                                        { id: 'stackedColumn', icon: <Layers size={16} /> },
                                                                        { id: 'stacked100Column', icon: <Percent size={16} /> },
                                                                        { id: 'line', icon: <LineChart size={16} /> },
                                                                        { id: 'pie', icon: <PieChart size={16} /> },
                                                                        { id: 'donut', icon: <Donut size={16} /> },
                                                                        { id: 'radarArea', icon: <Aperture size={16} /> },
                                                                        { id: 'scatterPoint', icon: <MoreHorizontal size={16} /> },
                                                                        { id: 'area', icon: <AreaChart size={16} /> },
                                                                        { id: 'heatmap', icon: <LayoutGrid size={16} /> },
                                                                        { id: 'wordCloud', icon: <Cloud size={16} /> }
                                                                    ];
                                                                    return CHART_TYPE_OPTIONS.find(opt => opt.id === activeChartMode)?.icon || <BarChart2 size={16} />;
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
                                                                        <button key={option.id} onClick={(e) => { e.stopPropagation(); setChartMode(option.id); setIsChartTypeMenuOpen(false); }} className={activeChartMode === option.id ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            {option.icon}
                                                                            {option.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button className={`view-option-btn ${activeChartMode === 'column' ? 'active' : ''}`} onClick={() => setChartMode('column')} title="세로 막대형"><BarChart2 size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'bar' ? 'active' : ''}`} onClick={() => setChartMode('bar')} title="가로 막대형"><BarChartHorizontal size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'stackedColumn' ? 'active' : ''}`} onClick={() => setChartMode('stackedColumn')} title="누적 막대형"><Layers size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'stacked100Column' ? 'active' : ''}`} onClick={() => setChartMode('stacked100Column')} title="100% 누적 막대형"><Percent size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'line' ? 'active' : ''}`} onClick={() => setChartMode('line')} title="선형"><LineChart size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'pie' ? 'active' : ''}`} onClick={() => setChartMode('pie')} title="원형"><PieChart size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'donut' ? 'active' : ''}`} onClick={() => setChartMode('donut')} title="도넛형"><Donut size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'radarArea' ? 'active' : ''}`} onClick={() => setChartMode('radarArea')} title="방사형"><Aperture size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'scatterPoint' ? 'active' : ''}`} onClick={() => setChartMode('scatterPoint')} title="점도표"><MoreHorizontal size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'area' ? 'active' : ''}`} onClick={() => setChartMode('area')} title="영역형"><AreaChart size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'heatmap' ? 'active' : ''}`} onClick={() => setChartMode('heatmap')} title="히트맵"><LayoutGrid size={16} /></button>
                                                            <button className={`view-option-btn ${activeChartMode === 'wordCloud' ? 'active' : ''}`} onClick={() => setChartMode('wordCloud')} title="워드클라우드"><Cloud size={16} /></button>
                                                        </>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => setFullscreenModal({
                                                        open: true,
                                                        type: 'chart',
                                                        dataItem: resultData,
                                                        chartData,
                                                        seriesNames,
                                                        statsOptions,
                                                        chartMode: activeChartMode,
                                                        suffix,
                                                        displayMode,
                                                        paletteId,
                                                        tableName
                                                    })}
                                                    className="action-btn"
                                                >
                                                    <Maximize size={16} />
                                                    <span>전체화면</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div ref={chartContainerRef} className="cross-tab-chart-container">
                                            <KendoChart
                                                key={`${activeChartMode}-${paletteId}`}
                                                data={chartData}
                                                seriesNames={seriesNames}
                                                initialType={activeChartMode}
                                                suffix={suffix}
                                                paletteId={paletteId}
                                                allowedTypes={(() => {
                                                    if (activeChartMode === 'column' || activeChartMode === 'bar') return ['column', 'bar'];
                                                    if (activeChartMode === 'stackedColumn' || activeChartMode === 'stacked100Column') return ['stackedColumn', 'stacked100Column'];
                                                    return [activeChartMode];
                                                })()}
                                                externalShowLegend={showLegend}
                                                hideHeader={true}
                                            />
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
