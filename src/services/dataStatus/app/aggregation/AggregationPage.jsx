import React, { useState, useEffect, useRef } from 'react';
import { Cloud, BarChart2, LineChart, PieChart, Donut, AreaChart, LayoutGrid, Radar, Layers, Percent, Filter, Aperture, MoveVertical, MoreHorizontal, Waves, GitCommitVertical, Target, X, Download } from 'lucide-react';
import { exportImage, exportSVG } from '@progress/kendo-drawing';
import { saveAs } from '@progress/kendo-file-saver';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import KendoChart from '../../components/KendoChart';
import './AggregationPage.css';
import '@progress/kendo-theme-default/dist/all.css';
import { useSelector } from 'react-redux';
import { VariablePageApi } from '../variable/VariablePageApi';
import { AggregationPageApi } from './AggregationPageApi';

const AggregationCard = ({ q }) => {
    const [chartMode, setChartMode] = useState('column');
    const [showChart, setShowChart] = useState(true);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
                setShowDownloadMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Chart type name mapping
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
            <div className="agg-card-header">
                <div className="agg-card-title-group">
                    <div className="agg-card-id">{q.id}</div>
                    <div className="agg-card-label">{q.label}</div>
                </div>
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
            <div className="agg-card-body">
                {/* Table */}
                <div className="agg-table-container">
                    <table className="agg-table">
                        <thead>
                            <tr>
                                <th>항목</th>
                                <th>완료</th>
                                <th>선정탈락</th>
                                <th>쿼터오버</th>
                                <th>합계</th>
                            </tr>
                        </thead>
                        <tbody>
                            {q.data.map((row, i) => (
                                <tr key={i}>
                                    <td>{row.name}</td>
                                    <td>{row['완료']}</td>
                                    <td>{row['선정탈락']}</td>
                                    <td>{row['쿼터오버']}</td>
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
};

const AggregationPage = () => {
    const auth = useSelector((store) => store.auth);
    const { getOriginalVariables } = VariablePageApi();
    const { getAggregationData } = AggregationPageApi();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [selectedFilters, setSelectedFilters] = useState(['전체']);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Total Filter States
    const [selectedTotalFilters, setSelectedTotalFilters] = useState(['전체']);
    const [isTotalFilterOpen, setIsTotalFilterOpen] = useState(false);
    const totalFilterRef = useRef(null);

    const filterRef = useRef(null);
    const mainRef = useRef(null);
    const fetchingRef = useRef(new Set());

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

    const [questions, setQuestions] = useState([]);

    useEffect(() => {
        const fetchQuestions = async () => {
            if (auth?.user?.userId) {
                const userId = auth.user.userId;
                const pageId = sessionStorage.getItem("pageId");

                if (pageId) {
                    try {
                        const result = await getOriginalVariables.mutateAsync({ user: userId, pageid: pageId });
                        if (result?.success === "777" && result.resultjson) {

                            // 기본 질문 목록 우선 세팅 (데이터는 로딩 전 임시값 혹은 0)
                            const initialQuestions = Object.values(result.resultjson).map(item => {
                                const initialData = item.info && Array.isArray(item.info) ? item.info.map((o, idx) => ({
                                    name: o.label || o.value || `보기 ${idx + 1}`,
                                    value: o.value !== undefined ? String(o.value) : undefined,
                                    label: o.label,
                                    '완료': 0,
                                    '선정탈락': 0,
                                    '쿼터오버': 0,
                                    total: 0
                                })) : [
                                    { name: '해당없음', value: '해당없음', '완료': 0, '선정탈락': 0, '쿼터오버': 0, total: 0 }
                                ];

                                return {
                                    id: item.id,
                                    label: item.label || item.name || item.id,
                                    n: 0,
                                    data: initialData,
                                    isLoaded: false
                                };
                            });

                            setQuestions(initialQuestions);
                            // 화면 노출/선택 시점에 5개씩 가져오도록 분리
                        }
                    } catch (error) {
                        console.error("Aggregation Variable Fetch Error:", error);
                    }
                }
            }
        };

        fetchQuestions();
    }, [auth?.user?.userId]);

    // 활성 아이템 기준 5개씩 데이터 분할 조회
    useEffect(() => {
        if (!activeId || questions.length === 0 || !auth?.user?.userId) return;

        const fetchChunkData = async () => {
            const index = questions.findIndex(q => q.id === activeId);
            if (index === -1) return;

            // 선택된 문항 포함 이후 5개 (사용자가 스크롤 내리는 흐름 반영)
            const targetQuestions = questions.slice(index, index + 5);
            const idsToFetch = targetQuestions
                .filter(q => !q.isLoaded && !fetchingRef.current.has(q.id))
                .map(q => q.id);

            if (idsToFetch.length === 0) return;

            // 로딩 상태 등록 (중복 요청 방지)
            idsToFetch.forEach(id => fetchingRef.current.add(id));

            try {
                const pageId = sessionStorage.getItem("pageId");
                const payload = {
                    pageid: pageId,
                    x_info: idsToFetch,
                    start: index,
                    limit: 5,
                    user: auth.user.userId
                };

                const aggResult = await getAggregationData.mutateAsync(payload);
                if (aggResult?.success === "777" && aggResult.resultjson) {
                    const resultsArray = aggResult.resultjson.results || [];

                    setQuestions(prevQuestions => prevQuestions.map(q => {
                        // 이번에 가져온 타겟들이 아니면 그대로 둠
                        if (!idsToFetch.includes(q.id)) return q;

                        const tableInfo = resultsArray.find(r => r.table_id === q.id);

                        // 응답 결과에 해당 문항이 없으면 기본값으로 두고 로드완료 처리
                        if (!tableInfo) {
                            return { ...q, isLoaded: true };
                        }

                        const aggInfoRows = tableInfo.result.rows || [];

                        const updatedData = q.data.map(opt => {
                            const optionValue = opt.value !== undefined ? String(opt.value) : opt.name;
                            const row = aggInfoRows.find(r => r.key === `${q.id}__${optionValue}`);

                            let done = 0;
                            let fail = 0;
                            let quota = 0;

                            if (row && row.cells) {
                                // 셀의 count 항목들을 모두 합산하여 완료(done)로 처리
                                const values = Object.values(row.cells).map(c => c.count || 0);
                                done = values.reduce((sum, val) => sum + val, 0);
                            }

                            return {
                                ...opt,
                                '완료': done,
                                '선정탈락': fail,
                                '쿼터오버': quota,
                                total: done + fail + quota
                            };
                        });

                        return {
                            ...q,
                            n: updatedData.reduce((acc, cur) => acc + cur.total, 0),
                            data: updatedData,
                            isLoaded: true
                        };
                    }));
                }
            } catch (error) {
                console.error("Aggregation Chunk Fetch Error:", error);
            } finally {
                // 백그라운드 요청 완료 시 상태 제거
                idsToFetch.forEach(id => fetchingRef.current.delete(id));
            }
        };

        fetchChunkData();
    }, [activeId, questions.length, auth?.user?.userId]);

    const filteredQuestions = questions.filter(q =>
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sidebarItems = filteredQuestions.map(q => ({
        id: q.id,
        name: q.id,
        label: q.label
    }));

    const scrollToId = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveId(id);
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
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
            <DataHeader title="문항 집계 현황">
                {/* 전체 필터 드롭다운 */}
                <div className="response-filter-container" ref={totalFilterRef} style={{ marginRight: '16px' }}>
                    <span className="response-filter-label">전체 필터</span>
                    <div className="custom-filter-wrapper">
                        <div
                            className={`custom-filter-trigger ${isTotalFilterOpen ? 'open' : ''}`}
                            onClick={() => setIsTotalFilterOpen(!isTotalFilterOpen)}
                        >
                            <span className="trigger-text">
                                {selectedTotalFilters.includes('전체') ? '전체' : (selectedTotalFilters.length === 0 ? '선택항목 없음' : `${selectedTotalFilters.length}개 선택됨`)}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trigger-icon">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        {isTotalFilterOpen && (
                            <div className="custom-filter-menu">
                                {totalFilterList.map((filter, index) => {
                                    const isChecked = selectedTotalFilters.includes('전체') || selectedTotalFilters.includes(filter);

                                    return (
                                        <div
                                            key={index}
                                            className={`custom-filter-item ${isChecked ? 'selected' : ''}`}
                                            onClick={() => handleTotalFilterToggle(filter)}
                                        >
                                            <div className={`checkbox-custom ${isChecked ? 'checked' : ''}`}>
                                                {isChecked && (
                                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

                <button
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
                </button>
            </DataHeader>
            <div className="aggregation-layout">
                <SideBar
                    title="문항 목록"
                    items={sidebarItems}
                    selectedId={activeId}
                    onItemClick={(item) => scrollToId(item.id)} // 스크롤 위치에 따라 선택된 아이템 표시
                    onSearch={setSearchTerm}
                />

                <div className="agg-main" ref={mainRef}>
                    {filteredQuestions.map(q => (
                        <AggregationCard key={q.id} q={q} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AggregationPage;
