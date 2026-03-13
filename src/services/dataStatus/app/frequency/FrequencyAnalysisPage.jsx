import React, { useState, useEffect, useRef, memo, useMemo, useContext } from 'react';
import { Cloud, BarChart2, LineChart, PieChart, Donut, AreaChart, LayoutGrid, Radar, Layers, Percent, Filter, Aperture, MoveVertical, MoreHorizontal, Waves, GitCommitVertical, Target, X, Download, Copy, ChevronDown, Check } from 'lucide-react';
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
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);
    const displayMenuRef = useRef(null);
    const paletteMenuRef = useRef(null);

    // Close dropdown when clicking outside
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

    // Chart type name mapping
    const handleCopyTable = React.useCallback(async () => {
        try {
            let headersText = "코드\t항목\t";
            if (q.columns) {
                headersText += q.columns.map(c => c.label).join('\t') + "\t합계";
            } else {
                headersText += "사례수\t합계";
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
                        {/* <button className={`view-option-btn ${showChart && chartMode === 'funnel' ? 'active' : ''}`} onClick={() => { setChartMode('funnel'); setShowChart(true); }} title="깔때기 차트"><Filter size={18} /></button> */}
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
                                <th style={{ width: '50px' }}>코드</th>
                                <th style={{ minWidth: '180px' }}>항목</th>
                                {q.columns && q.columns.map(col => <th key={col.key}>{col.label}</th>)}
                                <th>합계</th>
                            </tr>
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
                                        <td style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', background: '#f8fafc' }}>{row.value || '-'}</td>
                                        <td style={{ textAlign: 'left', fontSize: '12px', paddingLeft: '12px', fontWeight: '600', color: '#334155' }}>{row.name}</td>
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

                {/* Chart */}
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
                                    name: col.label
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
                                    suffix={usePercentFields ? "%" : ""}
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

const FrequencyAnalysisPage = () => {
    const auth = useSelector((store) => store.auth);
    const { getOverviewList, getOverviewData } = FrequencyAnalysisPageApi();
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

    // Total Filter States (이제 팝업으로 대체)
    const [selectedTotalFilters, setSelectedTotalFilters] = useState(['전체']);
    const [isTotalFilterOpen, setIsTotalFilterOpen] = useState(false);
    const totalFilterRef = useRef(null);

    // 신규 필터 문항 선택 드롭다운 상태
    const [isVariableDropdownOpen, setIsVariableDropdownOpen] = useState(false);
    const [selectedVariableIds, setSelectedVariableIds] = useState([]);
    const variableDropdownRef = useRef(null);
    const [globalPaletteId, setGlobalPaletteId] = useState('default');

    // Overview 변수 관련 상태
    const [isOverviewPopupOpen, setIsOverviewPopupOpen] = useState(false);
    const [overviewVariables, setOverviewVariables] = useState([]);
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
            }
        } catch (error) {
            console.error("Failed to fetch overview variables:", error);
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
                fetchOriginalVars();
                if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
            } else {
                if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
                alertTimerRef.current = setTimeout(() => {
                    const finalPid = sessionStorage.getItem("pageId");
                    setCurrentPageId(finalPid);
                    if (sessionStorage.getItem("merge_pn") && !finalPid) {
                        setQuestions([]); // Clear stale questions
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

    // Close filter dropdown when clicking outside
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
            else if (rawType.includes('dummy')) color = 'dummy';
            else if (rawType.includes('open')) color = 'open';

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
                    x_info: selectedVariableIds.length > 0 ? selectedVariableIds : (selectedFilters.includes('전체') ? [] : selectedFilters), // 고급 필터 또는 배너 필터 적용
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
                            label: c.label || c.var_label || c.name || c.key
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
            <DataHeader title="빈도분석">
                {/* 필터 문항 선택 드롭다운 */}
                <div className="custom-filter-wrapper" ref={variableDropdownRef}>
                    <div
                        className={`custom-filter-trigger ${isVariableDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsVariableDropdownOpen(!isVariableDropdownOpen)}
                        style={{ width: '240px' }}
                    >
                        <span className="trigger-text">
                            {(() => {
                                if (overviewVariables.length === 0) return '필터 문항 선택';
                                if (selectedVariableIds.length === 0) return '선택 안함';
                                if (selectedVariableIds.length === overviewVariables.length) return '전체';
                                return selectedVariableIds.map(id => {
                                    const v = overviewVariables.find(ov => ov.id === id);
                                    return v ? (v.label || v.id) : id;
                                }).join(', ');
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
                                    if (selectedVariableIds.length === overviewVariables.length && overviewVariables.length > 0) {
                                        setSelectedVariableIds([]);
                                        setFilterLogic('');
                                    } else {
                                        const allIds = overviewVariables.map(v => v.id);
                                        setSelectedVariableIds(allIds);
                                        const totalLogic = allIds.map(id => overviewVariables.find(v => v.id === id)?.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
                                        setFilterLogic(totalLogic);
                                    }
                                }}
                            >
                                <div className={`checkbox-custom ${(selectedVariableIds.length === overviewVariables.length && overviewVariables.length > 0) ? 'checked' : ''}`}>
                                    {(selectedVariableIds.length === overviewVariables.length && overviewVariables.length > 0) && <Check size={12} color="#fff" strokeWidth={3} />}
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
                                            const totalLogic = newIds.map(id => overviewVariables.find(ov => ov.id === id)?.logic).filter(Boolean).map(l => `(${l})`).join(' and ');
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
                            {overviewVariables.length === 0 && (
                                <div className="custom-filter-item" style={{ color: '#999', justifyContent: 'center' }}>
                                    조회된 변수가 없습니다.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 고급 필터 버튼 - LogicEditPopup 오픈 */}
                <button
                    onClick={() => setIsFilterPopupOpen(true)}
                    className={`advanced-filter-btn`}
                >
                    <Filter size={15} />
                    필터 문항 설정
                </button>
                {/* 
                <button
                    className="overview-settings-btn"
                    onClick={() => setIsOverviewPopupOpen(true)}
                >
                    <Settings size={15} />
                    배너 설정
                </button> */}
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
                        setSelectedVariableId(varId); // 선택된 변수로 자동 변경
                        setIsFilterPopupOpen(false);
                        fetchOverviewVars(); // 팝업 닫힐 때 목록 최신화
                    }}
                    auth={auth}
                    pageId={sessionStorage.getItem("pageId")}
                    onSaved={fetchOverviewVars}
                    activeVariableId={selectedVariableId}
                    onDeleteActive={() => {
                        setSelectedVariableId(null);
                        setFilterLogic('');
                        setIsFilterPopupOpen(false);
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
        </div>
    );
};

export default FrequencyAnalysisPage;
