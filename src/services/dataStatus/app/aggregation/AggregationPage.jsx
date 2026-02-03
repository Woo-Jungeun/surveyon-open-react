import React, { useState, useEffect, useRef } from 'react';
import { BarChart2, LineChart, PieChart, Donut, AreaChart, LayoutGrid, Radar, Layers, Percent, Filter, Aperture, MoveVertical, MoreHorizontal, Waves, GitCommitVertical, Target, X, Download } from 'lucide-react';
import { exportImage, exportSVG } from '@progress/kendo-drawing';
import { saveAs } from '@progress/kendo-file-saver';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import KendoChart from '../../components/KendoChart';
import './AggregationPage.css';
import '@progress/kendo-theme-default/dist/all.css';

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
                                        PNG 이미지
                                    </button>
                                    <button onClick={() => handleDownload('svg')}>
                                        SVG 벡터
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
                </div>
            </div>
            <div className="agg-card-body">
                {/* Table */}
                <div className="agg-table-container">
                    <table className="agg-table">
                        <thead>
                            <tr>
                                <th>항목</th>
                                <th>Banner A</th>
                                <th>Banner B</th>
                                <th>Banner C</th>
                                <th>합계</th>
                            </tr>
                        </thead>
                        <tbody>
                            {q.data.map((row, i) => (
                                <tr key={i}>
                                    <td>{row.name}</td>
                                    <td>{row['Banner A']}</td>
                                    <td>{row['Banner B']}</td>
                                    <td>{row['Banner C']}</td>
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
    const [searchTerm, setSearchTerm] = useState('');
    const [activeId, setActiveId] = useState(null);
    const [selectedFilters, setSelectedFilters] = useState(['전체']);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null);
    const mainRef = useRef(null);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFilterToggle = (filter) => {
        if (filter === '전체') {
            setSelectedFilters(['전체']);
            return;
        }

        setSelectedFilters(prev => {
            // Remove '전체' if selecting specific item
            let newFilters = prev.filter(f => f !== '전체');

            if (newFilters.includes(filter)) {
                newFilters = newFilters.filter(f => f !== filter);
            } else {
                newFilters = [...newFilters, filter];
            }

            // If nothing selected, revert to '전체'
            if (newFilters.length === 0) {
                return ['전체'];
            }
            return newFilters;
        });
    };

    // 응답필터 목록
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

    const questions = [
        {
            id: 'q1',
            label: '서비스 전반적인 만족도는?',
            n: 240,
            data: [
                { name: 'Very Low', 'Banner A': 20, 'Banner B': 16, 'Banner C': 8, total: 44 },
                { name: 'Low', 'Banner A': 5, 'Banner B': 16, 'Banner C': 50, total: 48 },
                { name: 'Neutral', 'Banner A': 11, 'Banner B': 16, 'Banner C': 30, total: 57 },
                { name: 'High', 'Banner A': 16, 'Banner B': 16, 'Banner C': 40, total: 72 },
                { name: 'Very High', 'Banner A': 10, 'Banner B': 10, 'Banner C': 20, total: 40 },
            ]
        },
        {
            id: 'q2',
            label: '선호하는 기능을 모두 선택하세요',
            n: 240,
            data: [
                { name: 'Option A', 'Banner A': 20, 'Banner B': 15, 'Banner C': 25, total: 60 },
                { name: 'Option B', 'Banner A': 10, 'Banner B': 30, 'Banner C': 10, total: 50 },
                { name: 'Option C', 'Banner A': 25, 'Banner B': 15, 'Banner C': 20, total: 60 },
                { name: 'Option D', 'Banner A': 15, 'Banner B': 20, 'Banner C': 35, total: 70 },
            ]
        },
        {
            id: 'gender',
            label: '귀하의 성별은?',
            n: 240,
            data: [
                { name: 'Male', 'Banner A': 40, 'Banner B': 35, 'Banner C': 45, total: 120 },
                { name: 'Female', 'Banner A': 40, 'Banner B': 45, 'Banner C': 35, total: 120 },
            ]
        },
        {
            id: 'age',
            label: '귀하의 연령대는?',
            n: 240,
            data: [
                { name: '20s', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
                { name: '30s', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
                { name: '40s', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
                { name: '50s', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
            ]
        },
        {
            id: 'region',
            label: '거주 지역은?',
            n: 240,
            data: [
                { name: 'Seoul', 'Banner A': 30, 'Banner B': 30, 'Banner C': 30, total: 90 },
                { name: 'Busan', 'Banner A': 20, 'Banner B': 20, 'Banner C': 20, total: 60 },
                { name: 'Incheon', 'Banner A': 15, 'Banner B': 15, 'Banner C': 15, total: 45 },
                { name: 'Others', 'Banner A': 15, 'Banner B': 15, 'Banner C': 15, total: 45 },
            ]
        },
        {
            id: 'weight_demo',
            label: '가중치 적용',
            n: 240,
            data: [
                { name: 'Applied', 'Banner A': 80, 'Banner B': 80, 'Banner C': 80, total: 240 },
            ]
        }
    ];

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
                {/* 응답필터 드롭다운 */}
                <div className="response-filter-container" ref={filterRef}>
                    <span className="response-filter-label">
                        응답필터
                    </span>
                    <div className="custom-filter-wrapper">
                        <div
                            className={`custom-filter-trigger ${isFilterOpen ? 'open' : ''}`}
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                        >
                            <span className="trigger-text">
                                {selectedFilters.includes('전체')
                                    ? '전체'
                                    : `${selectedFilters.length}개 선택됨`}
                            </span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trigger-icon">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>

                        {isFilterOpen && (
                            <div className="custom-filter-menu">
                                {filterList.map((filter, index) => (
                                    <div
                                        key={index}
                                        className={`custom-filter-item ${selectedFilters.includes(filter) ? 'selected' : ''}`}
                                        onClick={() => handleFilterToggle(filter)}
                                    >
                                        <div className={`checkbox-custom ${selectedFilters.includes(filter) ? 'checked' : ''}`}>
                                            {selectedFilters.includes(filter) && (
                                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="filter-text">{filter}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
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
