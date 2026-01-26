import React, { useState, useEffect, useCallback } from 'react';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search } from 'lucide-react';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from '@progress/kendo-react-grid';
import '@progress/kendo-theme-default/dist/all.css';
import './WeightPage.css';

// Move initial data outside component to prevent re-creation on every render
const INITIAL_GRID_DATA = [
    { category: '18-24', col1: { count: 10, pct: 6.7 }, col2: { count: 13, pct: 7.7 }, col3: { count: 16, pct: 8.6 } },
    { category: '25-29', col1: { count: 16, pct: 10.7 }, col2: { count: 19, pct: 11.3 }, col3: { count: 22, pct: 11.8 } },
    { category: '30-34', col1: { count: 22, pct: 14.7 }, col2: { count: 25, pct: 14.9 }, col3: { count: 28, pct: 15.1 } },
    { category: '35-39', col1: { count: 28, pct: 18.7 }, col2: { count: 31, pct: 18.5 }, col3: { count: 34, pct: 18.3 } },
    { category: '40-49', col1: { count: 34, pct: 22.7 }, col2: { count: 37, pct: 22.0 }, col3: { count: 40, pct: 21.5 } },
    { category: '50+', col1: { count: 40, pct: 26.7 }, col2: { count: 43, pct: 25.6 }, col3: { count: 46, pct: 24.7 } },
];

const WeightPage = () => {
    // Mock Data for Weights (Sidebar)
    const [weights, setWeights] = useState([
        { id: 'weight_demo', name: 'weight_demo', label: 'Weight Demo' },
    ]);
    const [selectedWeight, setSelectedWeight] = useState(weights[0]);
    const [weightSearchTerm, setWeightSearchTerm] = useState('');

    const filteredWeights = weights.filter(item =>
        (item.name || '').toLowerCase().includes(weightSearchTerm.toLowerCase()) ||
        (item.label || '').toLowerCase().includes(weightSearchTerm.toLowerCase())
    );

    // Mock Data for Questions (Inner List)
    const [questions, setQuestions] = useState([
        { id: 'q1', title: '문항1', desc: '서비스 전반적인 만족도는?', type: '단일', count: '1000/1000', color: 'blue' },
        { id: 'q2', title: '문항2', desc: '선호하는 기능을 모두 선택하세요', type: '복수', count: '980/1000', color: 'green' },
        { id: 'age', title: '연령대', desc: '귀하의 연령대는?', type: '단일', count: '1000/1000', color: 'blue' },
        { id: 'gender', title: '성별', desc: '귀하의 성별은?', type: '단일', count: '1000/1000', color: 'blue' },
    ]);

    // Drag and Drop State
    const [rowItems, setRowItems] = useState([]);
    const [colItems, setColItems] = useState([]);

    const handleDeleteWeight = (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            setWeights(prev => prev.filter(w => w.id !== id));
            if (selectedWeight?.id === id) {
                setSelectedWeight(null);
            }
        }
    };

    const handleDragStart = (e, item) => {
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e, target) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json');
        if (data) {
            const item = JSON.parse(data);
            if (target === 'row') {
                if (!rowItems.find(i => i.id === item.id)) {
                    setRowItems([...rowItems, item]);
                }
            } else if (target === 'col') {
                if (!colItems.find(i => i.id === item.id)) {
                    setColItems([...colItems, item]);
                }
            }
        }
    };

    const removeDroppedItem = (id, target) => {
        if (target === 'row') {
            setRowItems(rowItems.filter(i => i.id !== id));
        } else {
            setColItems(colItems.filter(i => i.id !== id));
        }
    };

    // Analysis Result State
    const [isCalculated, setIsCalculated] = useState(false);
    const [weightName, setWeightName] = useState('');

    // Reset calculation when items change
    useEffect(() => {
        setIsCalculated(false);
    }, [rowItems, colItems]);

    const handleRunAnalysis = () => {
        if (rowItems.length === 0 && colItems.length === 0) {
            alert('가로축과 세로축에 문항을 추가해주세요.');
            return;
        }
        setIsCalculated(true);
    };

    // Question List Panel State
    const [isQuestionPanelOpen, setIsQuestionPanelOpen] = useState(true);
    const [questionSearchTerm, setQuestionSearchTerm] = useState('');

    // Filter questions based on search term
    const filteredQuestions = questions.filter(q =>
        q.title.toLowerCase().includes(questionSearchTerm.toLowerCase()) ||
        q.desc.toLowerCase().includes(questionSearchTerm.toLowerCase())
    );

    // Distribution Grid Toggle States
    const [isCurrentDistOpen, setIsCurrentDistOpen] = useState(true);
    const [isTargetDistOpen, setIsTargetDistOpen] = useState(true);

    // Kendo Grid Data & Handlers
    const [gridData, setGridData] = useState(INITIAL_GRID_DATA);
    const [targetGridData, setTargetGridData] = useState(() =>
        INITIAL_GRID_DATA.map(item => ({
            ...item,
            col1: '', col2: '', col3: '' // Empty initial targets
        }))
    );


    const handleTargetChange = useCallback((dataItem, field, value) => {
        setTargetGridData(prevData =>
            prevData.map(item =>
                item.category === dataItem.category ? { ...item, [field]: value } : item
            )
        );
    }, []); // No dependencies needed with functional setState

    const CurrentDistCell = useCallback((props) => {
        const { count, pct } = props.dataItem[props.field];
        return (
            <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>{count}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{pct}%</div>
            </td>
        );
    }, []);

    const TargetEditCell = useCallback((props) => {
        const value = props.dataItem[props.field];
        const handleChange = (e) => {
            handleTargetChange(props.dataItem, props.field, e.target.value);
        };
        return (
            <td style={{ padding: '4px' }}>
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    placeholder="N"
                    style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        textAlign: 'right',
                        fontSize: '13px'
                    }}
                />
            </td>
        );
    }, [handleTargetChange]);

    return (
        <div className="weight-page" data-theme="data-dashboard">
            <DataHeader title="가중치 생성" />

            <div className="weight-layout">
                {/* Sidebar - Weight List */}
                <SideBar
                    title="가중치 목록"
                    items={filteredWeights}
                    selectedId={selectedWeight?.id}
                    onItemClick={setSelectedWeight}
                    onSearch={setWeightSearchTerm}
                    onDelete={handleDeleteWeight}
                />

                {/* Main Content Area */}
                <div className="weight-main-content">
                    <div className="weight-content-card">
                        {/* Header for Calculation Setting */}
                        <div className="weight-header">
                            <h3>가중치 계산 설정</h3>
                        </div>

                        <div className="weight-layout">
                            {/* Inner Left - Question List */}
                            <div className={`question-panel ${!isQuestionPanelOpen ? 'collapsed' : ''}`}>
                                <div className="question-panel-header">
                                    {isQuestionPanelOpen && <h3 className="question-panel-title">문항 목록</h3>}
                                    <button
                                        onClick={() => setIsQuestionPanelOpen(!isQuestionPanelOpen)}
                                        className="toggle-button"
                                    >
                                        {isQuestionPanelOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                                    </button>
                                </div>
                                {isQuestionPanelOpen && (
                                    <>
                                        {/* Search Input */}
                                        <div className="search-container">
                                            <div className="search-input-wrapper">
                                                <Search size={14} className="search-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="문항을 검색하세요."
                                                    value={questionSearchTerm}
                                                    onChange={(e) => setQuestionSearchTerm(e.target.value)}
                                                    className="search-input"
                                                />
                                            </div>
                                        </div>
                                        {/* Question List */}
                                        <div className="question-list">
                                            {filteredQuestions.map(q => (
                                                <div
                                                    key={q.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, q)}
                                                    className="question-item"
                                                >
                                                    <div className="question-item-header">
                                                        <span className="question-title">{q.title}</span>
                                                        <span className={`question-type-badge ${q.color}`}>
                                                            {q.type}
                                                        </span>
                                                    </div>
                                                    <p className="question-desc">{q.desc}</p>
                                                    <div className="question-count">{q.count}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Inner Right - Drop Zones */}
                            <div className="drop-zones-container">
                                {/* Top Row: Axis Info & Column Drop Zone */}
                                <div className="drop-zones-top">
                                    {/* Empty Top-Left Corner */}
                                    <div className="corner-label">
                                        세로 × 가로
                                    </div>

                                    {/* Column Drop Zone */}
                                    <div
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, 'col')}
                                        style={{
                                            flex: 1,
                                            background: '#f8faff',
                                            borderRadius: '0 12px 0 0',
                                            borderBottom: '1px solid #e0e0e0',
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px', display: 'block' }}>가로축 (열)</span>
                                        <div style={{
                                            flex: 1,
                                            border: '2px dashed #d0d7de',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: colItems.length === 0 ? 'center' : 'flex-start',
                                            background: '#fff',
                                            padding: '8px',
                                            gap: '8px',
                                            overflowX: 'auto'
                                        }}>
                                            {colItems.length === 0 ? (
                                                <span style={{ color: '#999', fontSize: '14px' }}>문항을 여기로 드래그하세요</span>
                                            ) : (
                                                colItems.map(item => (
                                                    <div key={item.id} style={{
                                                        padding: '6px 12px',
                                                        background: '#e3f2fd',
                                                        borderRadius: '20px',
                                                        border: '1px solid #90caf9',
                                                        color: '#1976d2',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {item.title}
                                                        <button
                                                            onClick={() => removeDroppedItem(item.id, 'col')}
                                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', color: '#1976d2' }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Row: Row Drop Zone & Result Area */}
                                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                                    {/* Row Drop Zone */}
                                    <div
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, 'row')}
                                        style={{
                                            width: '240px',
                                            background: '#f9fff9',
                                            borderRadius: '0 0 0 12px',
                                            borderRight: '1px solid #e0e0e0',
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    >
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '8px', display: 'block' }}>세로축 (행)</span>
                                        <div style={{
                                            flex: 1,
                                            border: '2px dashed #d0d7de',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: rowItems.length === 0 ? 'center' : 'stretch',
                                            justifyContent: rowItems.length === 0 ? 'center' : 'flex-start',
                                            background: '#fff',
                                            padding: '12px',
                                            gap: '8px',
                                            overflowY: 'auto'
                                        }}>
                                            {rowItems.length === 0 ? (
                                                <span style={{ color: '#999', fontSize: '14px', lineHeight: '1.5', textAlign: 'center' }}>문항을 여기로 드래그하세요</span>
                                            ) : (
                                                rowItems.map(item => (
                                                    <div key={item.id} style={{
                                                        padding: '8px 12px',
                                                        background: '#e8f5e9',
                                                        borderRadius: '6px',
                                                        border: '1px solid #a5d6a7',
                                                        color: '#2e7d32',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        {item.title}
                                                        <button
                                                            onClick={() => removeDroppedItem(item.id, 'row')}
                                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', color: '#2e7d32' }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Result Area */}
                                    <div style={{
                                        flex: 1,
                                        background: '#fff',
                                        borderRadius: '0 0 12px 0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden'
                                    }}>
                                        {!isCalculated ? (
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                                <div style={{ textAlign: 'center', color: '#999', marginBottom: '24px' }}>
                                                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>세로축과 가로축에 문항을 추가 후</p>
                                                    <p style={{ fontSize: '16px' }}>실행 버튼을 누르면 교차분석 결과가 여기에 표시됩니다</p>
                                                </div>
                                                <button
                                                    onClick={handleRunAnalysis}
                                                    style={{
                                                        padding: '12px 32px',
                                                        background: 'var(--primary-color)',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '15px',
                                                        fontWeight: '700',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                                    }}
                                                >
                                                    <ChevronRight size={18} />
                                                    실행
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Scrollable Content Area */}
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
                                                    {/* Current Distribution */}
                                                    <div>
                                                        <div
                                                            onClick={() => setIsCurrentDistOpen(!isCurrentDistOpen)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                cursor: 'pointer',
                                                                marginBottom: '12px',
                                                                padding: '8px 0'
                                                            }}
                                                        >
                                                            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#333', margin: 0 }}>현재 분포</h4>
                                                            {isCurrentDistOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                                                        </div>
                                                        {isCurrentDistOpen && (
                                                            <div className="cmn_grid singlehead">
                                                                <KendoGrid
                                                                    parentProps={{
                                                                        data: gridData,
                                                                        dataItemKey: "category",
                                                                        height: "auto",
                                                                        sortable: false,
                                                                        filterable: false,
                                                                        pageable: false
                                                                    }}
                                                                >
                                                                    <Column field="category" title="Variable" width="150px" />
                                                                    <Column field="col1" title="Banner A" cell={CurrentDistCell} />
                                                                    <Column field="col2" title="Banner B" cell={CurrentDistCell} />
                                                                    <Column field="col3" title="Banner C" cell={CurrentDistCell} />
                                                                </KendoGrid>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Target Distribution */}
                                                    <div>
                                                        <div
                                                            onClick={() => setIsTargetDistOpen(!isTargetDistOpen)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                cursor: 'pointer',
                                                                marginBottom: '12px',
                                                                padding: '8px 0'
                                                            }}
                                                        >
                                                            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#333', margin: 0 }}>목표 분포</h4>
                                                            {isTargetDistOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                                                        </div>
                                                        {isTargetDistOpen && (
                                                            <div className="cmn_grid singlehead">
                                                                <KendoGrid
                                                                    parentProps={{
                                                                        data: targetGridData,
                                                                        dataItemKey: "category",
                                                                        height: "auto",
                                                                        sortable: false,
                                                                        filterable: false,
                                                                        pageable: false
                                                                    }}
                                                                >
                                                                    <Column field="category" title="Variable" width="150px" />
                                                                    <Column field="col1" title="Banner A" cell={TargetEditCell} />
                                                                    <Column field="col2" title="Banner B" cell={TargetEditCell} />
                                                                    <Column field="col3" title="Banner C" cell={TargetEditCell} />
                                                                </KendoGrid>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Fixed Save Section */}
                                                <div className="save-section">
                                                    <label className="save-label">가중치 문항명</label>
                                                    <div className="save-input-group">
                                                        <div className="save-prefix">
                                                            weight_
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={weightName}
                                                            onChange={(e) => setWeightName(e.target.value)}
                                                            placeholder="예: region_gender"
                                                            className="save-input"
                                                        />
                                                        <button className="save-button">
                                                            가중치 문항 생성
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeightPage;
