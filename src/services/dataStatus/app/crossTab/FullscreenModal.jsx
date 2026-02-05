import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from '@progress/kendo-file-saver';
import { X, BarChart2, BarChartHorizontal, Layers, LineChart, PieChart, Donut, Aperture, Filter, MoreHorizontal, AreaChart, Map, LayoutGrid, Download } from 'lucide-react';
import KendoChart from '../../components/KendoChart';
import './FullscreenModal.css';

const FullscreenModal = ({
    isOpen,
    type,
    onClose,
    resultData,
    statsOptions,
    chartData,
    seriesNames,
    chartMode
}) => {
    const [localChartMode, setLocalChartMode] = useState(chartMode);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const chartContainerRef = useRef(null);
    const downloadMenuRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setLocalChartMode(chartMode);
        }
    }, [isOpen, chartMode]);

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

    const getChartTypeName = (mode) => {
        const map = {
            'column': '막대형', 'stackedColumn': '누적막대형', 'stacked100Column': '100%누적막대형',
            'line': '선형', 'pie': '원형', 'donut': '도넛형', 'radarArea': '방사형',
            'funnel': '깔때기', 'scatterPoint': '점도표', 'area': '영역형', 'map': '지도', 'heatmap': '트리맵'
        };
        return map[mode] || '차트';
    };

    const handleDownload = (format) => {
        if (!chartContainerRef.current) return;
        const svgElement = chartContainerRef.current.querySelector('svg');
        if (!svgElement) {
            alert('차트 이미지를 찾을 수 없습니다.');
            return;
        }

        const bbox = svgElement.getBoundingClientRect();
        let width = bbox.width;
        let height = bbox.height;

        // Clone and prepare SVG
        const clonedSvg = svgElement.cloneNode(true);
        clonedSvg.setAttribute('width', width);
        clonedSvg.setAttribute('height', height);

        const svgString = new XMLSerializer().serializeToString(clonedSvg);

        if (format === 'svg') {
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `crosstab_${localChartMode}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
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

                canvas.toBlob((blob) => {
                    saveAs(blob, `crosstab_${localChartMode}.png`);
                });
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
        }
        setShowDownloadMenu(false);
    };
    if (!isOpen) return null;

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
            'heatmap': 'heatmap'
        };
        return typeMap[localChartMode] || 'column';
    };

    return (
        <div className="fullscreen-modal-overlay" onClick={onClose}>
            <div className="fullscreen-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="fullscreen-modal-header">
                    <div className="fullscreen-modal-title-wrapper">
                        <div className="fullscreen-modal-title-bar"></div>
                        <h3 className="fullscreen-modal-title">{getTitle()}</h3>
                    </div>
                    {type === 'chart' && (
                        <div className="fullscreen-chart-toolbar" style={{
                            display: 'flex',
                            gap: '2px',
                            marginRight: '16px',
                            background: '#f1f5f9',
                            padding: '4px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div className="download-menu-container" ref={downloadMenuRef} style={{ marginRight: '8px' }}>
                                <button
                                    className={`view-option-btn download-btn ${showDownloadMenu ? 'active' : ''}`}
                                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                    title="차트 다운로드"
                                >
                                    <Download size={18} />
                                </button>
                                {showDownloadMenu && (
                                    <div className="download-dropdown">
                                        <button onClick={() => handleDownload('png')}>PNG 이미지</button>
                                        <button onClick={() => handleDownload('svg')}>SVG 벡터</button>
                                    </div>
                                )}
                            </div>
                            <button className={`view-option-btn ${!localChartMode || localChartMode === 'column' ? 'active' : ''}`} onClick={() => setLocalChartMode('column')} title="세로 막대형"><BarChart2 size={18} /></button>
                            {/* <button className={`view-option-btn ${localChartMode === 'bar' ? 'active' : ''}`} onClick={() => setLocalChartMode('bar')} title="가로 막대형"><BarChartHorizontal size={18} /></button> */}
                            <button className={`view-option-btn ${localChartMode === 'stackedColumn' || localChartMode === 'stacked100Column' ? 'active' : ''}`} onClick={() => setLocalChartMode('stackedColumn')} title="누적형 차트"><Layers size={18} /></button>
                            <button className={`view-option-btn ${localChartMode === 'line' ? 'active' : ''}`} onClick={() => setLocalChartMode('line')} title="선형 차트"><LineChart size={18} /></button>
                            <button className={`view-option-btn ${localChartMode === 'pie' ? 'active' : ''}`} onClick={() => setLocalChartMode('pie')} title="원형 차트"><PieChart size={18} /></button>
                            <button className={`view-option-btn ${localChartMode === 'donut' ? 'active' : ''}`} onClick={() => setLocalChartMode('donut')} title="도넛형 차트"><Donut size={18} /></button>
                            <button className={`view-option-btn ${localChartMode === 'radarArea' ? 'active' : ''}`} onClick={() => setLocalChartMode('radarArea')} title="방사형 차트"><Aperture size={18} /></button>
                            <button className={`view-option-btn ${localChartMode === 'funnel' ? 'active' : ''}`} onClick={() => setLocalChartMode('funnel')} title="깔때기 차트"><Filter size={18} /></button>
                            <button className={`view-option-btn ${localChartMode === 'scatterPoint' ? 'active' : ''}`} onClick={() => setLocalChartMode('scatterPoint')} title="점 도표"><MoreHorizontal size={18} /></button>
                            <button className={`view-option-btn ${localChartMode === 'area' ? 'active' : ''}`} onClick={() => setLocalChartMode('area')} title="영역형 차트"><AreaChart size={18} /></button>
                            <button className={`view-option-btn ${localChartMode === 'map' ? 'active' : ''}`} onClick={() => setLocalChartMode('map')} title="지도"><Map size={18} /></button>
                            <button className={`view-option-btn ${localChartMode === 'heatmap' ? 'active' : ''}`} onClick={() => setLocalChartMode('heatmap')} title="트리맵"><LayoutGrid size={18} /></button>
                        </div>
                    )}
                    <button className="fullscreen-modal-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Content */}
                <div className={`fullscreen-modal-content ${type === 'chart' ? 'chart-view' : ''}`}>
                    {type === 'table' && resultData && (
                        <div className="fullscreen-table-wrapper">
                            <table className="cross-table fullscreen-table">
                                <thead>
                                    <tr>
                                        <th className="fullscreen-table-header-sticky">문항</th>
                                        {resultData.columns.map((col, idx) => (
                                            <th key={idx} className="fullscreen-table-header">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultData.rows.map((row, rowIdx) => (
                                        <tr key={rowIdx}>
                                            <td className="fullscreen-table-cell-sticky">
                                                {row.label}
                                            </td>
                                            {row.values.map((val, colIdx) => (
                                                <td key={colIdx} className="fullscreen-table-cell">
                                                    <div className="fullscreen-cell-content">
                                                        <div className="cell-value">{val.count}</div>
                                                        <div className="cell-pct">{val.percent}%</div>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {type === 'stats' && resultData && resultData.stats && (
                        <div className="fullscreen-table-wrapper">
                            <table className="cross-table fullscreen-table">
                                <thead>
                                    <tr>
                                        <th className="fullscreen-table-header-sticky">통계</th>
                                        {resultData.columns.map((col, idx) => (
                                            <th key={idx} className="fullscreen-table-header">
                                                <div>{col}</div>
                                                <div className="fullscreen-stats-n">
                                                    N={resultData.stats.n?.[idx] || 0}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {statsOptions.filter(opt => opt.checked).map((stat, statIdx) => {
                                        const statKey = stat.id.toLowerCase();
                                        const statValues = resultData.stats[statKey] || [];
                                        return (
                                            <tr key={statIdx}>
                                                <td className="fullscreen-table-cell-sticky">
                                                    {stat.label}
                                                </td>
                                                {statValues.map((val, colIdx) => (
                                                    <td key={colIdx} className="fullscreen-table-cell">
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

                    {type === 'chart' && chartData && chartData.length > 0 && (
                        <div className="fullscreen-chart-wrapper" ref={chartContainerRef} style={{ overflowX: 'auto', overflowY: 'hidden', height: '100%', flex: 1 }}>
                            <div style={{
                                width: `${Math.max(100, chartData.length * 120)}px`,
                                minWidth: '100%',
                                height: '100%'
                            }}>
                                <KendoChart
                                    data={chartData}
                                    seriesNames={seriesNames}
                                    allowedTypes={getChartAllowedTypes()}
                                    initialType={getChartInitialType()}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FullscreenModal;
