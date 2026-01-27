import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Save, Play, Search, Grid, BarChart2, Download, Plus, X, Settings, List, ChevronRight, GripVertical, LineChart, Map, Table, PieChart, Donut, AreaChart } from 'lucide-react';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import KendoChart from '../../components/KendoChart';
import '@progress/kendo-theme-default/dist/all.css';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import CreateTablePopup from './CreateTablePopup';
import './CrossTabPage.css';

const CrossTabPage = () => {
    // Mock Data
    const [tables, setTables] = useState([
        { id: 1, name: 'Banner by Q1', row: ['q1'], col: ['banner'] },
        { id: 2, name: 'Region by Q2', row: ['q2'], col: ['region'] },
        { id: 3, name: 'Gender by Q1', row: ['q1'], col: ['gender'] },
    ]);
    const [selectedTableId, setSelectedTableId] = useState(1);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tableSearchTerm, setTableSearchTerm] = useState('');
    const [variableSearchTerm, setVariableSearchTerm] = useState('');
    const [selectedWeight, setSelectedWeight] = useState("없음");
    const [chartMode, setChartMode] = useState(null);
    const [isStatsOptionsOpen, setIsStatsOptionsOpen] = useState(true);

    // Variables for Drag & Drop
    const [variables, setVariables] = useState([
        { id: 'banner', name: 'banner', label: 'Banner' },
        { id: 'q1', name: 'q1', label: 'Q1 Satisfaction' },
        { id: 'q2', name: 'q2', label: 'Q2 Usage' },
        { id: 'gender', name: 'gender', label: 'Gender' },
        { id: 'age', name: 'age', label: 'Age' },
        { id: 'region', name: 'region', label: 'Region' },
    ]);

    const [rowVars, setRowVars] = useState([{ id: 'q1', name: 'q1' }]);
    const [colVars, setColVars] = useState([{ id: 'banner', name: 'banner' }]);
    const [draggedItem, setDraggedItem] = useState(null);

    // Layout Options (Order & Visibility)
    const [layoutOptions, setLayoutOptions] = useState([
        { id: 'table', label: '표', checked: true, fixed: true },
        { id: 'stats', label: '통계', checked: true, fixed: false }
    ]);
    const [statsOptions, setStatsOptions] = useState([
        { id: 'Mean', label: 'Mean', checked: true },
        { id: 'Std', label: 'Std', checked: true },
        { id: 'Min', label: 'Min', checked: true },
        { id: 'Max', label: 'Max', checked: true },
        { id: 'N', label: 'N', checked: true },
    ]);

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

    const toggleLayoutOption = (id) => {
        setLayoutOptions(layoutOptions.map(opt =>
            opt.fixed ? opt : (opt.id === id ? { ...opt, checked: !opt.checked } : opt)
        ));
    };

    const toggleStatOption = (id) => {
        setStatsOptions(statsOptions.map(opt =>
            opt.id === id ? { ...opt, checked: !opt.checked } : opt
        ));
    };

    // Filter tables based on search term
    const filteredTables = tables.filter(table =>
        table.name.toLowerCase().includes(tableSearchTerm.toLowerCase())
    );

    // Filter variables based on search term
    const filteredVariables = variables.filter(variable =>
        variable.name.toLowerCase().includes(variableSearchTerm.toLowerCase()) ||
        variable.label.toLowerCase().includes(variableSearchTerm.toLowerCase())
    );

    // Result Data (Mock)
    const resultData = {
        columns: ['Very Low', 'Low', 'Neutral', 'High', 'Very High'],
        rows: [
            { label: '합계', values: [48, 57, 66, 75, 84], total: 330 },
            { label: 'Banner A', values: [10, 13, 16, 19, 22], total: 80 },
            { label: 'Banner B', values: [16, 19, 22, 25, 28], total: 110 },
            { label: 'Banner C', values: [22, 25, 28, 31, 34], total: 140 },
        ],
        stats: {
            mean: [2.25, 2.21, 2.18, 2.16, 2.14],
            std: [0.77, 0.78, 0.79, 0.80, 0.80],
            min: [1, 1, 1, 1, 1],
            max: [3, 3, 3, 3, 3],
            n: [48, 57, 66, 75, 84]
        }
    };

    const chartData = resultData.columns.map((colName, colIndex) => {
        const dataPoint = { name: colName };
        resultData.rows.forEach(row => {
            if (row.label === '합계') {
                dataPoint.total = row.values[colIndex];
            } else {
                dataPoint[row.label] = row.values[colIndex];
            }
        });
        return dataPoint;
    });

    const seriesNames = resultData.rows
        .filter(row => row.label !== '합계')
        .map(row => row.label);

    const handleTableSelect = (item) => {
        setSelectedTableId(item.id);
        setIsConfigOpen(false);

        // Load table configuration
        const newRowVars = item.row.map(id => variables.find(v => v.id === id) || { id, name: id });
        const newColVars = item.col.map(id => variables.find(v => v.id === id) || { id, name: id });
        setRowVars(newRowVars);
        setColVars(newColVars);
    };

    const handleCreateTable = (name) => {
        const newTable = {
            id: tables.length + 1,
            name: name,
            row: [],
            col: []
        };
        setTables([...tables, newTable]);
        setSelectedTableId(newTable.id);
        setTableSearchTerm('');
        // Reset current config for new table and open config
        setRowVars([]);
        setColVars([]);
        setIsConfigOpen(true);
    };

    const handleDragStart = (e, item) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, type) => {
        e.preventDefault();
        if (!draggedItem) return;

        const newItem = { id: draggedItem.id, name: draggedItem.name };

        if (type === 'row') {
            if (!rowVars.find(v => v.id === newItem.id)) {
                setRowVars([...rowVars, newItem]);
            }
        } else if (type === 'col') {
            if (!colVars.find(v => v.id === newItem.id)) {
                setColVars([...colVars, newItem]);
            }
        }
        setDraggedItem(null);
    };

    const removeVar = (id, type) => {
        if (type === 'row') {
            setRowVars(rowVars.filter(v => v.id !== id));
        } else {
            setColVars(colVars.filter(v => v.id !== id));
        }
    };

    return (
        <div className="cross-tab-page" data-theme="data-dashboard">
            <DataHeader
                title="교차 테이블"
                onAdd={() => setIsModalOpen(true)}
                addButtonLabel="교차 테이블 추가"
            />

            <div className="cross-tab-layout">
                {/* Sidebar */}
                <SideBar
                    title="테이블 목록"
                    items={filteredTables}
                    selectedId={selectedTableId}
                    onItemClick={handleTableSelect}
                    onSearch={setTableSearchTerm}
                />

                {/* Main Content */}
                <div className="cross-tab-main">
                    {/* Config Section */}
                    <div className="config-section">
                        <div className="config-header">
                            <div className="config-header__left-group">
                                <div
                                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                                    className="config-header__toggle"
                                >
                                    {isConfigOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>

                                {rowVars.length > 0 && (
                                    <div className="config-header__row-label">
                                        {variables.find(v => v.id === rowVars[0].id)?.label}
                                    </div>
                                )}

                                <div className="config-header__separator"></div>

                                <div className="config-header__title-group">
                                    <span className="config-header__title-label">테이블 명</span>
                                    <input
                                        type="text"
                                        className="config-title-input"
                                        defaultValue="Banner by Q1"
                                    />
                                </div>
                            </div>
                            <div className="action-buttons">
                                <button className="btn-save"><Save size={14} /> 교차 테이블 저장</button>
                                <button className="btn-run"><ChevronRight size={16} /> 실행</button>
                            </div>
                        </div>

                        {isConfigOpen && (
                            <div className="config-body">
                                {/* Variable Panel */}
                                <div className="variable-panel">
                                    <div className="variable-search">
                                        <div className="search-input-wrapper">
                                            <Search size={14} className="search-icon" />
                                            <input
                                                type="text"
                                                placeholder="문항을 검색하세요."
                                                className="search-input"
                                                value={variableSearchTerm}
                                                onChange={(e) => setVariableSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="variable-list">
                                        {filteredVariables.map(v => (
                                            <div
                                                key={v.id}
                                                className="variable-item"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, v)}
                                            >
                                                <div className="variable-item__name">{v.name}</div>
                                                <div className="variable-item__label">{v.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Drop Zones Container */}
                                <div className="drop-zones-container">
                                    {/* Top Row: Axis Info & Column Drop Zone */}
                                    <div className="drop-zones-top">
                                        <div className="corner-label">
                                            세로 × 가로
                                        </div>
                                        <div
                                            className="col-drop-zone"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, 'col')}
                                        >
                                            <span className="drop-zone-label">가로축 (열)</span>
                                            <div className="drop-zone-area">
                                                {colVars.length === 0 ? (
                                                    <span className="drop-zone-placeholder">문항을 여기로 드래그하세요</span>
                                                ) : (
                                                    colVars.map(v => (
                                                        <div key={v.id} className="dropped-tag">
                                                            {v.name}
                                                            <X size={14} className="remove" onClick={() => removeVar(v.id, 'col')} />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Row: Row Drop Zone & Center Content */}
                                    <div className="drop-zones-bottom">
                                        <div
                                            className="row-drop-zone"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, 'row')}
                                        >
                                            <span className="drop-zone-label">세로축 (행)</span>
                                            <div className="drop-zone-area vertical">
                                                {rowVars.length === 0 ? (
                                                    <div className="drop-zone-placeholder vertical">문항을 여기로<br />드래그하세요</div>
                                                ) : (
                                                    rowVars.map(v => (
                                                        <div key={v.id} className="dropped-tag row-tag">
                                                            {v.name}
                                                            <X size={14} className="remove" onClick={() => removeVar(v.id, 'row')} />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Center Content: Filter & Weight */}
                                        <div className="center-content">
                                            <div>
                                                <div className="center-content__label">필터식</div>
                                                <input type="text" className="center-content__input" placeholder="예: age >= 20" />
                                            </div>
                                            <div>
                                                <div className="center-content__label">가중치 문항</div>
                                                <DropDownList
                                                    data={["없음", "weight_demo"]}
                                                    value={selectedWeight}
                                                    onChange={(e) => setSelectedWeight(e.target.value)}
                                                    style={{ width: '100%', height: '42px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Result Section */}
                    <div className="result-section">
                        <div className="result-header">
                            <div className="result-tabs">
                                <div className="result-tab">결과</div>
                            </div>
                            <div className="view-options">
                                <button className="view-option-btn active" title="표"><Table size={18} /></button>
                                <button className={`view-option-btn ${chartMode === 'bar' ? 'active' : ''}`} onClick={() => setChartMode(chartMode === 'bar' ? null : 'bar')} title="막대형 차트"><BarChart2 size={18} /></button>
                                <button className={`view-option-btn ${chartMode === 'line' ? 'active' : ''}`} onClick={() => setChartMode(chartMode === 'line' ? null : 'line')} title="선형 차트"><LineChart size={18} /></button>
                                <button className={`view-option-btn ${chartMode === 'pie' ? 'active' : ''}`} onClick={() => setChartMode(chartMode === 'pie' ? null : 'pie')} title="원형 차트"><PieChart size={18} /></button>
                                <button className={`view-option-btn ${chartMode === 'donut' ? 'active' : ''}`} onClick={() => setChartMode(chartMode === 'donut' ? null : 'donut')} title="도넛형 차트"><Donut size={18} /></button>
                                <button className={`view-option-btn ${chartMode === 'area' ? 'active' : ''}`} onClick={() => setChartMode(chartMode === 'area' ? null : 'area')} title="영역형 차트"><AreaChart size={18} /></button>
                                <button className="view-option-btn" title="지도"><Map size={18} /></button>
                                <button className="view-option-btn" title="그리드"><Grid size={18} /></button>
                            </div>
                        </div>

                        <div className="result-content">
                            {/* Stats Controls */}
                            <div className="stats-controls" style={{ flexDirection: 'row', alignItems: 'center', gap: '24px', padding: '16px 24px', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#333' }}>옵션 설정</span>
                                </div>

                                <div style={{ width: '1px', height: '20px', background: '#e0e0e0' }}></div>

                                <div className="stats-section" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', margin: 0 }}>
                                    <div className="stats-section-title" style={{ marginBottom: 0, marginRight: '0', whiteSpace: 'nowrap', fontSize: '13px', color: '#666', fontWeight: '600' }}>배치 옵션 (드래그 및 선택)</div>
                                    <div className="sortable-list">
                                        {layoutOptions.map((item, index) => (
                                            <div
                                                key={item.id}
                                                className={`sortable-item ${item.checked ? 'checked' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleSortDragStart(e, index, 'layout')}
                                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                onDrop={(e) => handleSortDrop(e, index, 'layout')}
                                                onClick={() => toggleLayoutOption(item.id)}
                                                style={{ cursor: item.fixed ? 'default' : 'pointer' }}
                                            >
                                                <GripVertical size={14} className="drag-handle" style={{ color: '#ccc' }} />
                                                <span>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="stats-section" style={{ flexDirection: 'row', alignItems: 'center', gap: '16px', margin: 0 }}>
                                    <div className="stats-section-title" style={{ marginBottom: 0, marginRight: '0', whiteSpace: 'nowrap', fontSize: '13px', color: '#666', fontWeight: '600' }}>통계 옵션 (드래그 및 선택)</div>
                                    <div className="sortable-list">
                                        {statsOptions.map((item, index) => (
                                            <div
                                                key={item.id}
                                                className={`sortable-item ${item.checked ? 'checked' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleSortDragStart(e, index, 'stats')}
                                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                onDrop={(e) => handleSortDrop(e, index, 'stats')}
                                                onClick={() => toggleStatOption(item.id)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <GripVertical size={14} className="drag-handle" style={{ color: '#ccc' }} />
                                                <span>{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Result Rendering */}
                            <div className="cross-table-container">
                                {layoutOptions.map(option => {
                                    if (!option.checked) return null;

                                    if (option.id === 'table') {
                                        return (
                                            <div key="table" className="result-block" style={{ marginBottom: '24px' }}>
                                                <div className="table-chart-wrapper" style={{ display: 'flex', gap: '24px', alignItems: 'stretch' }}>
                                                    <div className="table-wrapper" style={{ flex: 1, transition: 'flex 0.3s ease', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                        <div className="section-header">
                                                            <div className="blue-bar"></div>
                                                            <span className="section-title">표</span>
                                                        </div>
                                                        <div style={{ overflow: 'auto', flex: 1, background: '#fff', borderRadius: '8px', paddingRight: '16px' }}>
                                                            <table className="cross-table" style={{ width: '100%', height: '100%' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th style={{ width: '150px', textAlign: 'left', paddingLeft: '16px' }}>문항</th>
                                                                        {resultData.columns.map((col, i) => (
                                                                            <th key={i} style={{ textAlign: 'right', paddingRight: '16px' }}>
                                                                                {col}
                                                                                <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#888', marginTop: '4px' }}>(n={resultData.stats.n[i]})</div>
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {resultData.rows.map((row, i) => (
                                                                        <tr key={i}>
                                                                            <td className="label-cell" style={{ paddingLeft: '16px' }}>{row.label}</td>
                                                                            {row.values.map((val, j) => (
                                                                                <td key={j} className="data-cell" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                                                                    <div className="cell-value">{val}</div>
                                                                                    <div className="cell-pct">{(val / row.total * 100).toFixed(1)}%</div>
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                    {chartMode && (
                                                        <div className="chart-wrapper" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                                            <div className="section-header">
                                                                <div className="blue-bar"></div>
                                                                <span className="section-title">차트</span>
                                                            </div>
                                                            <div className="cross-tab-chart-container" style={{ flex: 1, border: '1px solid #eee', borderRadius: '8px', padding: '16px', background: '#fff' }}>
                                                                <KendoChart
                                                                    data={chartData}
                                                                    seriesNames={seriesNames}
                                                                    allowedTypes={
                                                                        chartMode === 'bar' ? ['column', 'bar'] :
                                                                            chartMode === 'line' ? ['line'] :
                                                                                chartMode === 'pie' ? ['pie'] :
                                                                                    chartMode === 'donut' ? ['donut'] :
                                                                                        chartMode === 'area' ? ['area'] : []
                                                                    }
                                                                    initialType={
                                                                        chartMode === 'bar' ? 'column' :
                                                                            chartMode === 'line' ? 'line' :
                                                                                chartMode === 'pie' ? 'pie' :
                                                                                    chartMode === 'donut' ? 'donut' :
                                                                                        chartMode === 'area' ? 'area' : 'column'
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    if (option.id === 'stats') {
                                        return (
                                            <div key="stats" className="result-block">
                                                <div className="section-header">
                                                    <div className="blue-bar"></div>
                                                    <span className="section-title">통계</span>
                                                </div>
                                                <div style={{ overflow: 'auto', background: '#fff', borderRadius: '8px', paddingRight: '16px' }}>
                                                    <table className="cross-table">
                                                        <thead>
                                                            <tr>
                                                                <th style={{ width: '150px', textAlign: 'left', paddingLeft: '16px', background: '#f5f5f5' }}>통계</th>
                                                                {resultData.columns.map((col, i) => (
                                                                    <th key={i} style={{ textAlign: 'right', paddingRight: '16px', background: '#fff', borderBottom: '1px solid #eee' }}>{col}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {statsOptions.filter(opt => opt.checked).map((stat) => {
                                                                const statKey = stat.id.toLowerCase();
                                                                const statValues = resultData.stats[statKey] || [];
                                                                return (
                                                                    <tr key={stat.id} className="stats-row">
                                                                        <td className="label-cell" style={{ paddingLeft: '16px' }}>Region Group_{stat.label}</td>
                                                                        {statValues.map((v, i) => (
                                                                            <td key={i} style={{ textAlign: 'right', paddingRight: '16px' }}>
                                                                                {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(4)) : v}
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
                                    return null;
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <CreateTablePopup
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateTable}
            />
        </div >
    );
};

export default CrossTabPage;
