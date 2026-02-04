import React from 'react';
import { X } from 'lucide-react';
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
        return typeMap[chartMode] || [];
    };

    const getChartInitialType = () => {
        const typeMap = {
            'column': 'column',
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
        return typeMap[chartMode] || 'column';
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
                        <div className="fullscreen-chart-wrapper">
                            <KendoChart
                                data={chartData}
                                seriesNames={seriesNames}
                                allowedTypes={getChartAllowedTypes()}
                                initialType={getChartInitialType()}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FullscreenModal;
