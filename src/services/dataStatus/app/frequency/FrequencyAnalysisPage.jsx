import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Cloud, BarChart2, LineChart, PieChart, Donut, AreaChart, LayoutGrid, Radar, Layers, Percent, Filter, Aperture, MoveVertical, MoreHorizontal, Waves, GitCommitVertical, Target, X, Download, Copy } from 'lucide-react';
import { exportImage, exportSVG } from '@progress/kendo-drawing';
import { saveAs } from '@progress/kendo-file-saver';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import Toast from '../../../../components/common/Toast';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import KendoChart from '../../components/KendoChart';
import LogicEditPopup from '../../../dataManagement/app/mapManagement/LogicEditPopup';
import './FrequencyAnalysisPage.css';
import '@progress/kendo-theme-default/dist/all.css';
import { useSelector } from 'react-redux';
import { FrequencyAnalysisPageApi } from './FrequencyAnalysisPageApi';

const AggregationCard = memo(({ q }) => {
    const [chartMode, setChartMode] = useState('column');
    const [showChart, setShowChart] = useState(true);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [displayMode, setDisplayMode] = useState('all');
    const [toast, setToast] = useState({ show: false, message: '' });
    const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const displayMenuRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
                setShowDownloadMenu(false);
            }
            if (displayMenuRef.current && !displayMenuRef.current.contains(event.target)) {
                setIsDisplayMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Chart type name mapping
    const handleCopyTable = React.useCallback(async () => {
        try {
            let headersText = "항목\t";
            if (q.columns) {
                headersText += q.columns.map(c => c.label).join('\t') + "\t합계";
            } else {
                headersText += "완료\t선정탈락\t쿼터오버\t합계";
            }

            let rowsText = q.data.map(row => {
                let rowText = `${row.name}\t`;
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
                    rowText += `${row['완료'] || 0}\t${row['선정탈락'] || 0}\t${row['쿼터오버'] || 0}\t${row.total || 0}`;
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
            // Find the chart element first
            const chartElement = chartContainerRef.current.querySelector('.k-chart');

            if (!chartElement) {
                alert('차트를 찾을 수 없습니다.');
                return;
            }

            // Find the SVG element within the chart
            const svgElement = chartElement.querySelector('svg');

            if (!svgElement) {
                alert('차트 SVG를 찾을 수 없습니다.');
                return;
            }

            // Get SVG dimensions
            const bbox = svgElement.getBBox();
            const viewBox = svgElement.getAttribute('viewBox');
            let width, height;

            if (viewBox) {
                const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
                width = vbWidth;
                height = vbHeight;
            } else {
                width = bbox.width || svgElement.width.baseVal.value || 800;
                height = bbox.height || svgElement.height.baseVal.value || 600;
            }

            // Clone and prepare SVG
            const clonedSvg = svgElement.cloneNode(true);
            clonedSvg.setAttribute('width', width);
            clonedSvg.setAttribute('height', height);
            if (!viewBox) {
                clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }

            const svgString = new XMLSerializer().serializeToString(clonedSvg);

            if (format === 'svg') {
                // Direct SVG download
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
                // Convert SVG to PNG with proper dimensions
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    // Use SVG dimensions for canvas
                    canvas.width = width * 2; // 2x for better quality
                    canvas.height = height * 2;

                    // Fill white background
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw image scaled
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
                        <div className="agg-card-id">{q.id}</div>
                        <div className="agg-card-label" style={{ whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word', lineHeight: '1.4' }}>{q.label}</div>
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
                            <Copy size={14} /> 복사
                        </button>
                    </div>
                </div>

                <div style={{ width: showChart ? 'calc(50% - 16px)' : 'auto', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    <div className="view-options">
                        {/* Download Button */}
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

                        <button
                            className={`view-option-btn close-chart-btn ${!showChart ? 'active' : ''}`}
                            onClick={() => setShowChart(false)}
                            title="차트 숨기기"
                        >
                            <X size={18} />
                        </button>
                        <button className={`view-option-btn ${showChart && (chartMode === 'column' || chartMode === 'bar') ? 'active' : ''}`} onClick={() => { setChartMode('column'); setShowChart(true); }} title="막대형 차트"><BarChart2 size={18} /></button>
                        <button className={`view-option-btn ${showChart && (chartMode === 'stackedColumn' || chartMode === 'stacked100Column') ? 'active' : ''}`} onClick={() => { setChartMode('stackedColumn'); setShowChart(true); }} title="누적형 차트"><Layers size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'line' ? 'active' : ''}`} onClick={() => { setChartMode('line'); setShowChart(true); }} title="선형 차트"><LineChart size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'pie' ? 'active' : ''}`} onClick={() => { setChartMode('pie'); setShowChart(true); }} title="원형 차트"><PieChart size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'donut' ? 'active' : ''}`} onClick={() => { setChartMode('donut'); setShowChart(true); }} title="도넛형 차트"><Donut size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'radarArea' ? 'active' : ''}`} onClick={() => { setChartMode('radarArea'); setShowChart(true); }} title="방사형 차트"><Aperture size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'funnel' ? 'active' : ''}`} onClick={() => { setChartMode('funnel'); setShowChart(true); }} title="깔때기 차트"><Filter size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'scatterPoint' ? 'active' : ''}`} onClick={() => { setChartMode('scatterPoint'); setShowChart(true); }} title="점 도표"><MoreHorizontal size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'area' ? 'active' : ''}`} onClick={() => { setChartMode('area'); setShowChart(true); }} title="영역형 차트"><AreaChart size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'heatmap' ? 'active' : ''}`} onClick={() => { setChartMode('heatmap'); setShowChart(true); }} title="히트맵"><LayoutGrid size={18} /></button>
                        <button className={`view-option-btn ${showChart && chartMode === 'wordCloud' ? 'active' : ''}`} onClick={() => { setChartMode('wordCloud'); setShowChart(true); }} title="워드클라우드"><Cloud size={18} /></button>
                    </div>
                </div>
            </div>
            <div className="agg-card-body">
                {/* Table */}
                <div className="agg-table-container">
                    <table className="agg-table">
                        <thead>
                            <tr>
                                <th>항목</th>
                                {q.columns ? q.columns.map(col => <th key={col.key}>{col.label}</th>) : (
                                    <>
                                        <th>완료</th>
                                        <th>선정탈락</th>
                                        <th>쿼터오버</th>
                                    </>
                                )}
                                <th>합계</th>
                            </tr>
                        </thead>
                        <tbody>
                            {q.data.map((row, i) => (
                                <tr key={i}>
                                    <td>{row.name}</td>
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
                                        <>
                                            <td>{row['완료']}</td>
                                            <td>{row['선정탈락']}</td>
                                            <td>{row['쿼터오버']}</td>
                                        </>
                                    )}
                                    <td>{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Chart */}
                {showChart && (
                    <div className="agg-chart-container" ref={chartContainerRef}>
                        <KendoChart
                            data={q.data}
                            initialType={chartMode}
                            allowedTypes={
                                chartMode === 'column' || chartMode === 'bar' ? ['column', 'bar'] :
                                    chartMode === 'wordCloud' ? ['wordCloud'] :
                                        chartMode === 'stackedColumn' || chartMode === 'stacked100Column' ? ['stackedColumn', 'stacked100Column'] :
                                            chartMode === 'line' ? ['line'] :
                                                chartMode === 'pie' ? ['pie'] :
                                                    chartMode === 'donut' ? ['donut'] :
                                                        chartMode === 'area' ? ['area'] :
                                                            chartMode === 'heatmap' ? ['heatmap'] :
                                                                chartMode === 'radarLine' ? ['radarLine'] :
                                                                    chartMode === 'funnel' ? ['funnel'] :
                                                                        chartMode === 'scatterPoint' ? ['scatterPoint'] :
                                                                            chartMode === 'radarArea' ? ['radarArea'] : []
                            }
                        />
                    </div>
                )}
            </div>
        </div>
    );
});
AggregationCard.displayName = 'AggregationCard';

const FrequencyAnalysisPage = () => {
    const auth = useSelector((store) => store.auth);
    const { getOverviewList, getOverviewData } = FrequencyAnalysisPageApi();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeId, setActiveId] = useState(null);

    // 고급 필터 팝업 상태
    const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
    const [filterLogic, setFilterLogic] = useState('');

    const [selectedFilters, setSelectedFilters] = useState(['전체']);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Total Filter States (이제 팝업으로 대체)
    const [selectedTotalFilters, setSelectedTotalFilters] = useState(['전체']);
    const [isTotalFilterOpen, setIsTotalFilterOpen] = useState(false);
    const totalFilterRef = useRef(null);

    const filterRef = useRef(null);
    const mainRef = useRef(null);
    const fetchingRef = useRef(new Set());
    const isClickingRef = useRef(false);
    const clickTimeoutRef = useRef(null);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
            if (totalFilterRef.current && !totalFilterRef.current.contains(event.target)) {
                setIsTotalFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFilterToggle = (filter) => {
        if (filter === '전체') {
            setSelectedFilters(prev => prev.includes('전체') ? [] : ['전체']);
            return;
        }

        setSelectedFilters(prev => {
            let newFilters = prev.filter(f => f !== '전체');

            if (newFilters.includes(filter)) {
                newFilters = newFilters.filter(f => f !== filter);
            } else {
                newFilters = [...newFilters, filter];
            }
            return newFilters;
        });
    };

    const handleTotalFilterToggle = (filter) => {
        if (filter === '전체') {
            setSelectedTotalFilters(prev => prev.includes('전체') ? [] : ['전체']);
            return;
        }

        setSelectedTotalFilters(prev => {
            let newFilters = prev.filter(f => f !== '전체');
            if (newFilters.includes(filter)) {
                newFilters = newFilters.filter(f => f !== filter);
            } else {
                newFilters = [...newFilters, filter];
            }
            return newFilters;
        });
    };
    const totalFilterList = ['전체', 'reccoded_SQ1', 'reccoded_SQ2'];

    // 전체 배너 목록
    const filterList = [
        '전체',
        'LIFE_STYLE_AGE_라이프스타일 나이',
        '라이프스타일_나이',
        'GENDER_성별',
        'JOB_GROUP_직업군',
        '지오그룹',
        'AREA_GROUP_지역그룹',
        '지역그룹',
        'AREA_CAPITAL_수도권/비수도권',
        '수도권/비수도권'
    ];

    const QUESTION_LIST_LIMIT = 20;
    const [questions, setQuestions] = useState([]);
    const [listStart, setListStart] = useState(0);
    const [hasMoreQuestions, setHasMoreQuestions] = useState(true);
    const isFetchingListRef = useRef(false);

    const parseOverviewList = (overviewList) =>
        overviewList.map(item => {
            const optionsList = item.options || item.info || [];
            const initialData = optionsList.length > 0
                ? optionsList.map((o, idx) => ({
                    name: o.label || o.value || o.name || `보기 ${idx + 1}`,
                    value: o.value !== undefined ? String(o.value) : (o.id || o.name),
                    label: o.label || o.name,
                    '완료': 0, '선정탈락': 0, '쿼터오버': 0, total: 0
                }))
                : [{ name: '해당없음', value: '해당없음', '완료': 0, '선정탈락': 0, '쿼터오버': 0, total: 0 }];

            return {
                id: item.table_id || item.id,
                target_id: item.id || item.table_id,
                label: item.title || item.label || item.name || item.table_id || item.id,
                n: 0,
                data: initialData,
                isLoaded: false
            };
        });

    const fetchQuestions = async (start) => {
        if (isFetchingListRef.current) return;
        if (!auth?.user?.userId) return;
        const pageId = sessionStorage.getItem("pageId");
        if (!pageId) return;

        isFetchingListRef.current = true;
        try {
            const payload = {
                pageid: pageId,
                user: auth.user.userId,
                start,
                limit: QUESTION_LIST_LIMIT
            };
            const result = await getOverviewList.mutateAsync(payload);
            if (result?.success === "777" && result.resultjson) {
                const overviewList = result.resultjson.tables || [];
                const newQuestions = parseOverviewList(overviewList);

                if (start === 0) {
                    setQuestions(newQuestions);
                } else {
                    setQuestions(prev => {
                        // 중복 제거 후 추가
                        const existingIds = new Set(prev.map(q => q.id));
                        const unique = newQuestions.filter(q => !existingIds.has(q.id));
                        return [...prev, ...unique];
                    });
                }

                const fetched = overviewList.length;
                setHasMoreQuestions(fetched >= QUESTION_LIST_LIMIT);
                setListStart(start + fetched);
            }
        } catch (error) {
            console.error("Aggregation Variable Fetch Error:", error);
        } finally {
            isFetchingListRef.current = false;
        }
    };

    // 초기 로드
    useEffect(() => {
        if (auth?.user?.userId) {
            setQuestions([]);
            setListStart(0);
            setHasMoreQuestions(true);
            fetchQuestions(0);
        }
    }, [auth?.user?.userId]);

    // 대시보드(페이지) 선택 팝업 닫힐 때 재조회
    useEffect(() => {
        const handlePageSelected = () => {
            if (!auth?.user?.userId) return;
            setQuestions([]);
            setListStart(0);
            setHasMoreQuestions(true);
            setActiveId(null);
            // isFetchingListRef 강제 해제 후 재조회
            isFetchingListRef.current = false;
            fetchQuestions(0);
        };
        window.addEventListener('pageSelected', handlePageSelected);
        return () => window.removeEventListener('pageSelected', handlePageSelected);
    }, [auth?.user?.userId]);

    // 활성 아이템 기준 5개씩 데이터 분할 조회
    useEffect(() => {
        if (!activeId || questions.length === 0 || !auth?.user?.userId) return;

        const fetchChunkData = async () => {
            const index = questions.findIndex(q => q.id === activeId);
            if (index === -1) return;

            // 이미 로드된 문항이면 API를 다시 태우지 않음
            if (questions[index].isLoaded) return;

            const limit = 10;
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
                    x_info: [startTargetId], // 시작 포인트의 실제 target_id
                    start: index,  // tables 순번에 해당하는 시작 인덱스
                    limit: limit, // 가져올 갯수
                    weight_col: "", // 또는 실제 사용하는 가중치
                    filter_expression: "",
                    include_stats: []
                };

                const aggResult = await getOverviewData.mutateAsync(payload);
                if (aggResult?.success === "777" && aggResult.resultjson) {
                    const resultsArray = aggResult.resultjson.results || [];

                    setQuestions(prevQuestions => prevQuestions.map(q => {
                        // 이번에 가져온 타겟들이 아니면 그대로 둠
                        if (!tableIdsToSet.includes(q.id)) return q;

                        const tableInfo = resultsArray.find(r => r.table_id === q.id);

                        // 응답 결과에 해당 문항이 없으면 기본값으로 두고 로드완료 처리
                        if (!tableInfo) {
                            return { ...q, isLoaded: true };
                        }

                        const aggInfoRows = tableInfo.result.rows || [];
                        const aggInfoCols = tableInfo.result.columns || [];

                        // UI Columns (배너 등): result.columns 에서 추출
                        const tableColumns = aggInfoCols.map(c => ({
                            key: c.key,
                            label: c.label || c.var_label || c.name || c.key
                        }));

                        // UI Rows (문항 보기): result.rows 에서 추출
                        let optionRows = aggInfoRows;

                        const updatedData = optionRows.map(row => {
                            let rowData = {
                                name: row.label || row.var_label || row.name || row.key,
                                value: row.key
                            };
                            let totalCount = 0;

                            if (tableColumns.length > 0) {
                                // 배너가 적용된 경우 각 컬럼(배너 옵션)에 대해 값을 매핑
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
                                // 단일 빈도분석이나 배너가 없는 경우
                                if (row.cells && Object.keys(row.cells).length > 0) {
                                    const firstKey = Object.keys(row.cells)[0];
                                    totalCount = Number(row.cells[firstKey].count || 0);
                                } else {
                                    totalCount = Number(row.value || 0);
                                }
                                rowData['전체'] = totalCount;
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
                // 백그라운드 요청 완료 시 상태 제거
                tableIdsToSet.forEach(id => fetchingRef.current.delete(id));
            }
        };

        fetchChunkData();
    }, [activeId, questions.length, auth?.user?.userId]);

    const filteredQuestions = useMemo(() => {
        return questions.filter(q =>
            q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [questions, searchTerm]);

    const sidebarItems = useMemo(() => {
        return filteredQuestions.map(q => ({
            id: q.id,
            name: q.id,
            label: q.label
        }));
    }, [filteredQuestions]);

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

    // 사이드바 스크롤 끝 도달 시 추가 문항 로드
    const handleSidebarScrollEnd = () => {
        if (hasMoreQuestions && !isFetchingListRef.current) {
            fetchQuestions(listStart);
        }
    };

    // 오른쪽 스크롤 시 왼쪽 사이드바 목록 자동 스크롤 동기화
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
    }, [filteredQuestions]);

    return (
        <div className="aggregation-page" data-theme="data-dashboard">
            <DataHeader title="빈도분석">
                {/* 고급 필터 버튼 - LogicEditPopup 오픈 */}
                <button
                    onClick={() => setIsFilterPopupOpen(true)}
                    className={`advanced-filter-btn ${filterLogic ? 'active' : ''}`}
                >
                    <Filter size={15} />
                    고급 필터{filterLogic ? ' ✓' : ''}
                </button>

                {/* 전체 배너 드롭다운 */}
                <div className="response-filter-container" ref={filterRef}>
                    <span className="response-filter-label">
                        전체 배너
                    </span>
                    <div className="custom-filter-wrapper">
                        <div
                            className={`custom-filter-trigger ${isFilterOpen ? 'open' : ''}`}
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
                            <span className="trigger-text">
                                {selectedFilters.includes('전체')
                                    ? '전체'
                                    : (selectedFilters.length === 0 ? '선택항목 없음' : `${selectedFilters.length}개 선택됨`)}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trigger-icon">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>

                        {isFilterOpen && (
                            <div className="custom-filter-menu">
                                {filterList.map((filter, index) => {
                                    const isChecked = selectedFilters.includes('전체') || selectedFilters.includes(filter);

                                    return (
                                        <div
                                            key={index}
                                            className={`custom-filter-item ${isChecked ? 'selected' : ''}`}
                                            onClick={() => handleFilterToggle(filter)}
                                        >
                                            <div className={`checkbox-custom ${isChecked ? 'checked' : ''}`}>
                                                {isChecked && (
                                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className="filter-text">{filter}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                {/*todo 엑셀다운로드 임시 주석 */}
                {/* <button
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '38px',
                        padding: '0 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        background: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#444',
                        cursor: 'pointer',
                        marginLeft: '12px',
                        marginTop: '5px'
                    }}
                    onClick={() => { }}
                >
                    <Download size={16} />
                    엑셀 다운로드
                </button> */}
            </DataHeader>
            <div className="aggregation-layout">
                <SideBar
                    // title="문항 목록"
                    items={sidebarItems}
                    selectedId={activeId}
                    onItemClick={(item) => scrollToId(item.id)}
                    onSearch={setSearchTerm}
                    searchPlaceholder="문항을 검색하세요."
                    onScrollEnd={handleSidebarScrollEnd}
                />

                <div className="agg-main" ref={mainRef}>
                    {filteredQuestions.map(q => (
                        <AggregationCard key={q.id} q={q} />
                    ))}
                </div>
            </div>

            {/* 고급 필터 LogicEditPopup */}
            {isFilterPopupOpen && (
                <LogicEditPopup
                    variable={{ id: 'filter', logic: filterLogic }}
                    variablesList={questions.map(q => ({ sysName: q.id, label: q.label }))}
                    onClose={() => setIsFilterPopupOpen(false)}
                    onSave={(_, logicStr) => {
                        setFilterLogic(logicStr);
                        setIsFilterPopupOpen(false);
                    }}
                    theme="data-dashboard"
                />
            )}
        </div>
    );
};

export default FrequencyAnalysisPage;
