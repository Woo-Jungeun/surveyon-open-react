import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Search, Copy } from 'lucide-react';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from '@progress/kendo-react-grid';
import '@progress/kendo-theme-default/dist/all.css';
import './WeightPage.css';
import { useSelector } from 'react-redux';
import { RecodingPageApi } from '../recoding/RecodingPageApi';
import { WeightPageApi } from './WeightPageApi';
import { VariablePageApi } from '../variable/VariablePageApi';
import { modalContext } from "@/components/common/Modal";

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
    const auth = useSelector((store) => store.auth);
    const modal = useContext(modalContext);
    const { getRecodedVariables } = RecodingPageApi();
    const { getWeightVariable, evaluateTable, deleteWeight } = WeightPageApi();
    const { getOriginalVariables } = VariablePageApi();

    // Mock Data for Weights (Sidebar)
    const [weights, setWeights] = useState([]);
    const [selectedWeight, setSelectedWeight] = useState(null);
    const [weightSearchTerm, setWeightSearchTerm] = useState('');

    useEffect(() => {
        const fetchWeights = async () => {
            if (auth?.user?.userId) {
                const userId = auth.user.userId;
                const pageId = sessionStorage.getItem("pageId");

                if (pageId) {
                    try {
                        const result = await getRecodedVariables.mutateAsync({ user: userId, pageid: pageId });
                        if (result?.success === "777" && result.resultjson) {
                            const transformedData = Object.values(result.resultjson)
                                .map(item => ({
                                    ...item,
                                    name: item.id,
                                }))
                                .filter(item => item.id && item.id.startsWith('weight_'));
                            setWeights(transformedData);
                            if (transformedData.length > 0) {
                                setSelectedWeight(transformedData[0]);
                            }
                        }
                    } catch (error) {
                        console.error("Weight Fetch Error:", error);
                    }
                }
            }
        };

        fetchWeights();
    }, [auth?.user?.userId]);

    const filteredWeights = weights.filter(item =>
        (item.name || '').toLowerCase().includes(weightSearchTerm.toLowerCase()) ||
        (item.label || '').toLowerCase().includes(weightSearchTerm.toLowerCase())
    );

    // Grid Columns State (Dynamic)
    const [gridColumns, setGridColumns] = useState([
        { field: 'col1', title: 'Banner A' },
        { field: 'col2', title: 'Banner B' },
        { field: 'col3', title: 'Banner C' }
    ]);

    // Detail fetch effect
    useEffect(() => {
        const fetchWeightDetail = async () => {
            if (!selectedWeight || !selectedWeight.id) return;
            const pageId = sessionStorage.getItem("pageId");
            if (!pageId) return;

            try {
                const result = await getWeightVariable.mutateAsync({
                    pageid: pageId,
                    weight_variable_name: selectedWeight.id
                });

                if (result?.success === "777" && result.resultjson) {
                    const data = result.resultjson;

                    const yIds = data.y_info || [];
                    const xIds = data.x_info || [];
                    const vars = data.variables_json || {};

                    const parseItem = (id) => ({
                        id: id,
                        title: vars[id]?.label || id,
                        type: '단일',
                        color: 'purple'
                    });

                    setRowItems(yIds.map(parseItem));
                    setColItems(xIds.map(parseItem));
                    setIsCalculated(true);
                    setWeightName(data.weight_variable.replace('weight_', ''));

                    const yVar = yIds.length > 0 ? vars[yIds[0]] : null;
                    const xVar = xIds.length > 0 ? vars[xIds[0]] : null;

                    if (yVar && xVar) {
                        const newCols = (xVar.info || []).map((xItem, xIndex) => ({
                            field: `col${xIndex + 1}`,
                            title: xItem.label
                        }));
                        setGridColumns(newCols);

                        const newTargetGridData = (yVar.info || []).map((yItem) => {
                            const rowId = `${yVar.id}__${yItem.index}`;
                            const row = { category: yItem.label, rowId: yItem.index };

                            (xVar.info || []).forEach((xItem, xIndex) => {
                                const colId = `${xVar.id}__${xItem.index}`;
                                const targetKey = `${rowId}-${colId}`;
                                const targetVal = data.targets_json?.[targetKey] ?? '';
                                row[`col${xIndex + 1}`] = targetVal;
                            });

                            return row;
                        });
                        setTargetGridData(newTargetGridData);

                        // Fetch evaluate table for "현재 분포"
                        const evalPayload = {
                            user: auth?.user?.userId,
                            pageid: pageId,
                            variables: vars,
                            weight_col: "",
                            filter_expression: "",
                            include_stats: [],
                            table: {
                                id: "weight_eval",
                                name: "Weight Evaluation",
                                x_info: xIds,
                                y_info: yIds
                            }
                        };
                        try {
                            const evalResult = await evaluateTable.mutateAsync(evalPayload);
                            if (evalResult?.success === "777" && evalResult.resultjson) {
                                const evalData = evalResult.resultjson;
                                const evalCols = evalData.columns || [];
                                const evalRows = evalData.rows || [];
                                const evalColKeys = evalCols.map(c => c.key);

                                const newCurrentGridData = (yVar.info || []).map((yItem) => {
                                    const row = { category: yItem.label };
                                    const evalRow = evalRows.find(r => r.label === yItem.label || r.key === `${yIds[0]}__${yItem.index}` || String(r.value) === String(yItem.index));

                                    (xVar.info || []).forEach((xItem, xIndex) => {
                                        let count = '-', pct = '-';
                                        if (evalRow) {
                                            const matchCol = evalCols.find(c => c.label === xItem.label || c.key === `${xIds[0]}__${xItem.index}` || String(c.value) === String(xItem.index));
                                            const cell = matchCol ? evalRow.cells?.[matchCol.key] : null;
                                            if (cell) {
                                                count = cell.count ?? 0;
                                                pct = cell.percent ?? "0.0";
                                            }
                                        }
                                        row[`col${xIndex + 1}`] = { count, pct };
                                    });
                                    return row;
                                });
                                setGridData(newCurrentGridData);
                            } else {
                                const fakeData = (yVar.info || []).map((yItem) => {
                                    const row = { category: yItem.label };
                                    (xVar.info || []).forEach((xItem, xIndex) => {
                                        row[`col${xIndex + 1}`] = { count: '-', pct: '-' };
                                    });
                                    return row;
                                });
                                setGridData(fakeData);
                            }
                        } catch (e) {
                            console.error("Evaluate table error:", e);
                            const fakeData = (yVar.info || []).map((yItem) => {
                                const row = { category: yItem.label };
                                (xVar.info || []).forEach((xItem, xIndex) => {
                                    row[`col${xIndex + 1}`] = { count: '-', pct: '-' };
                                });
                                return row;
                            });
                            setGridData(fakeData);
                        }
                    }
                }
            } catch (error) {
                console.error("Fetch Detail Error:", error);
            }
        };

        fetchWeightDetail();
    }, [selectedWeight?.id, auth?.user?.userId]);

    // Dynamic Data for Questions (Inner List)
    const [questions, setQuestions] = useState([]);
    const [rawVariables, setRawVariables] = useState({});

    useEffect(() => {
        const fetchQuestions = async () => {
            if (auth?.user?.userId) {
                const userId = auth.user.userId;
                const pageId = sessionStorage.getItem("pageId");

                if (pageId) {
                    try {
                        const result = await getOriginalVariables.mutateAsync({ user: userId, pageid: pageId });
                        if (result?.success === "777" && result.resultjson) {
                            setRawVariables(result.resultjson);
                            const transformedData = Object.values(result.resultjson).map(item => {
                                let typeLabel = item.type;
                                let color = 'gray';
                                if (item.type === 'categorical') {
                                    typeLabel = '범주형';
                                    color = 'purple';
                                } else if (item.type === 'continuous') {
                                    typeLabel = '연속형';
                                    color = 'orange';
                                } else if (item.type === 'text') {
                                    typeLabel = '텍스트';
                                    color = 'blue';
                                }

                                return {
                                    id: item.id,
                                    title: item.name || item.id,
                                    desc: item.label || '',
                                    type: typeLabel,
                                    count: '',
                                    color: color
                                };
                            });
                            setQuestions(transformedData);
                        }
                    } catch (error) {
                        console.error("Variable Fetch Error:", error);
                    }
                }
            }
        };

        fetchQuestions();
    }, [auth?.user?.userId]);

    // Drag and Drop State
    const [rowItems, setRowItems] = useState([]);
    const [colItems, setColItems] = useState([]);

    const handleDeleteWeight = (id) => {
        modal.showConfirm("알림", '정말 삭제하시겠습니까?', async () => {
            const pageId = sessionStorage.getItem("pageId");
            if (!pageId) return;

            try {
                const result = await deleteWeight.mutateAsync({
                    user: auth?.user?.userId,
                    pageid: pageId,
                    weight_variable_name: id
                });

                if (result?.success === "777") {
                    setWeights(prev => prev.filter(w => w.id !== id));
                    if (selectedWeight?.id === id) {
                        setSelectedWeight(null);
                    }
                    modal.showAlert("알림", '가중치가 삭제되었습니다.');
                } else {
                    modal.showAlert("알림", '가중치 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error("Delete Weight Error:", error);
                modal.showAlert("알림", '가중치 삭제 중 오류가 발생했습니다.');
            }
        });
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
                    setIsCalculated(false);
                }
            } else if (target === 'col') {
                if (!colItems.find(i => i.id === item.id)) {
                    setColItems([...colItems, item]);
                    setIsCalculated(false);
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
        setIsCalculated(false);
    };

    // Analysis Result State
    const [isCalculated, setIsCalculated] = useState(false);
    const [weightName, setWeightName] = useState('');

    // Reset calculation when items change is now handled directly in drop handlers

    const handleRunAnalysis = async () => {
        if (rowItems.length === 0 && colItems.length === 0) {
            modal.showAlert("알림", '가로축과 세로축에 문항을 추가해주세요.');
            return;
        }

        setWeightName(''); // Reset weight name when running analysis

        const yIds = rowItems.map(r => r.id);
        const xIds = colItems.map(c => c.id);
        const yVar = yIds.length > 0 ? rawVariables[yIds[0]] : null;
        const xVar = xIds.length > 0 ? rawVariables[xIds[0]] : null;

        if (!yVar || !xVar) {
            modal.showAlert("알림", '가로축과 세로축 문항 데이터가 유효하지 않습니다.');
            return;
        }

        const pageId = sessionStorage.getItem("pageId");

        // 1. Generate columns from xVar
        const newCols = (xVar.info || []).map((xItem, xIndex) => ({
            field: `col${xIndex + 1}`,
            title: xItem.label
        }));
        setGridColumns(newCols);

        // 2. Setup Initial Target Grid with empty targets
        const newTargetGridData = (yVar.info || []).map((yItem) => {
            const row = { category: yItem.label, rowId: yItem.index };
            (xVar.info || []).forEach((xItem, xIndex) => {
                row[`col${xIndex + 1}`] = '';
            });
            return row;
        });
        setTargetGridData(newTargetGridData);

        // 3. Evaluate table for Current grid
        const evalPayload = {
            user: auth?.user?.userId,
            pageid: pageId,
            variables: {
                [yVar.id]: yVar,
                [xVar.id]: xVar
            },
            weight_col: "",
            filter_expression: "",
            include_stats: [],
            table: {
                id: "eval_run",
                name: "Evaluation Run",
                x_info: xIds,
                y_info: yIds
            }
        };

        try {
            const evalResult = await evaluateTable.mutateAsync(evalPayload);
            if (evalResult?.success === "777" && evalResult.resultjson) {
                const evalData = evalResult.resultjson;
                const evalCols = evalData.columns || [];
                const evalRows = evalData.rows || [];

                const newCurrentGridData = (yVar.info || []).map((yItem) => {
                    const row = { category: yItem.label };
                    const evalRow = evalRows.find(r => r.label === yItem.label || r.key === `${yIds[0]}__${yItem.index}` || String(r.value) === String(yItem.index));

                    (xVar.info || []).forEach((xItem, xIndex) => {
                        let count = '-', pct = '-';
                        if (evalRow) {
                            const matchCol = evalCols.find(c => c.label === xItem.label || c.key === `${xIds[0]}__${xItem.index}` || String(c.value) === String(xItem.index));
                            const cell = matchCol ? evalRow.cells?.[matchCol.key] : null;
                            if (cell) {
                                count = cell.count ?? 0;
                                pct = cell.percent ?? "0.0";
                            }
                        }
                        row[`col${xIndex + 1}`] = { count, pct };
                    });
                    return row;
                });
                setGridData(newCurrentGridData);
            }
        } catch (e) {
            console.error("Evaluate Run Error:", e);
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

    // Dynamic grid container width to allow fluid column expansion
    const [gridContainerWidth, setGridContainerWidth] = useState(1000);
    const resizeObserverRef = useRef(null);

    const contentAreaRef = useCallback((node) => {
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
        }
        if (node !== null) {
            setGridContainerWidth(node.getBoundingClientRect().width);
            resizeObserverRef.current = new ResizeObserver((entries) => {
                if (entries[0]) {
                    setGridContainerWidth(entries[0].contentRect.width);
                }
            });
            resizeObserverRef.current.observe(node);
        }
    }, []);

    // Calculate column width to fill container if there are few columns, 
    // but guarantee at least 120px minimum for horizontal scrolling.
    // 150px (Variable column) + 30px (Scrollbar and padding buffers) = 180px
    const dynamicColWidth = Math.max(120, Math.floor((gridContainerWidth - 180) / Math.max(1, gridColumns.length)));


    const handleTargetChange = useCallback((dataItem, field, value) => {
        setTargetGridData(prevData =>
            prevData.map(item =>
                item.category === dataItem.category ? { ...item, [field]: value } : item
            )
        );
    }, []); // No dependencies needed with functional setState

    // Toast State
    const [toast, setToast] = useState({ show: false, message: '' });

    // Toast Timer
    useEffect(() => {
        if (toast.show) {
            const timer = setTimeout(() => {
                setToast({ ...toast, show: false });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.show]);

    // Copy to Clipboard (Excel format)
    const handleCopyToClipboard = async () => {
        try {
            const rows = targetGridData.map(item => {
                const cols = gridColumns.map(c => item[c.field]);
                return cols.join('\t');
            }).join('\n');

            await navigator.clipboard.writeText(rows);

            setToast({ show: true, message: '복사 완료 (Ctrl+V)' });
        } catch (err) {
            console.error('Failed to copy:', err);
            setToast({ show: true, message: '복사 실패' });
        }
    };

    const CurrentDistCell = useCallback((props) => {
        const cellData = props.dataItem[props.field];
        if (!cellData) {
            return (
                <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>-</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>-</div>
                </td>
            );
        }
        const { count, pct } = cellData;
        return (
            <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>{count}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{pct !== '-' ? `${pct}%` : '-'}</div>
            </td>
        );
    }, []);

    // Handle Paste from Excel
    const handlePaste = useCallback((e, dataItem, field) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('text');

        // Parse Excel data (rows by newline, cols by tab)
        const rows = clipboardData.split(/\r\n|\n|\r/).filter(row => row.trim() !== '');
        if (rows.length === 0) return;

        // Find start position
        const startRowIndex = targetGridData.findIndex(item => item.category === dataItem.category);
        if (startRowIndex === -1) return;

        const columns = gridColumns.map(c => c.field);
        const startColIndex = columns.indexOf(field);
        if (startColIndex === -1) return;

        setTargetGridData(prevData => {
            const newData = [...prevData];

            rows.forEach((row, rIdx) => {
                const currentRowIndex = startRowIndex + rIdx;
                if (currentRowIndex >= newData.length) return;

                const cells = row.split('\t');
                cells.forEach((cellValue, cIdx) => {
                    const currentColIndex = startColIndex + cIdx;
                    if (currentColIndex < columns.length) {
                        const fieldName = columns[currentColIndex];
                        newData[currentRowIndex] = {
                            ...newData[currentRowIndex],
                            [fieldName]: cellValue.trim()
                        };
                    }
                });
            });

            return newData;
        });
    }, [targetGridData]);

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
                    onPaste={(e) => handlePaste(e, props.dataItem, props.field)}
                    placeholder="N"
                    style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        fontSize: '13px'
                    }}
                />
            </td>
        );
    }, [handleTargetChange, handlePaste]);

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
                                            background: '#eff6ff',
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
                                                        {item.id}
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
                                            background: '#f0fdf4',
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
                                                        {item.id}
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
                                                    <p style={{ fontSize: '16px' }}>실행 버튼을 누르면 교차분석 결과가 이 영역에 표시됩니다</p>
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
                                                <div ref={contentAreaRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
                                                    {/* Current Distribution */}
                                                    <div>
                                                        <div
                                                            onClick={() => setIsCurrentDistOpen(!isCurrentDistOpen)}
                                                            className="weight-section-header"
                                                        >
                                                            <h4 className="weight-section-title">현재 분포</h4>
                                                            {isCurrentDistOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                                                        </div>
                                                        {isCurrentDistOpen && (
                                                            <div className="cmn_grid singlehead" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
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
                                                                    <Column field="category" title="Variable" width="150px" locked={true} />
                                                                    {gridColumns.map(col => (
                                                                        <Column key={col.field} field={col.field} title={col.title} cell={CurrentDistCell} width={`${dynamicColWidth}px`} headerCell={() => (
                                                                            <span style={{ fontWeight: '600' }}>{col.title}</span>
                                                                        )} />
                                                                    ))}
                                                                </KendoGrid>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Target Distribution */}
                                                    <div style={{ marginTop: '32px' }}>
                                                        <div
                                                            onClick={() => setIsTargetDistOpen(!isTargetDistOpen)}
                                                            className="weight-section-header"
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                                                                <h4 className="weight-section-title">목표 분포</h4>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleCopyToClipboard(); }}
                                                                    style={{
                                                                        border: 'none',
                                                                        background: '#f1f5f9',
                                                                        cursor: 'pointer',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        color: '#64748b',
                                                                        fontSize: '11px',
                                                                        fontWeight: '600'
                                                                    }}
                                                                    title="데이터 복사"
                                                                >
                                                                    <Copy size={12} />
                                                                    복사
                                                                </button>
                                                                {toast.show && (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        left: '100%',
                                                                        top: '50%',
                                                                        transform: 'translateY(-50%)',
                                                                        marginLeft: '8px',
                                                                        background: '#1e293b',
                                                                        color: '#fff',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '11px',
                                                                        fontWeight: '500',
                                                                        whiteSpace: 'nowrap',
                                                                        zIndex: 10,
                                                                        animation: 'fadeIn 0.2s ease-out',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}>
                                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }}></div>
                                                                        {toast.message}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isTargetDistOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                                                        </div>
                                                        {isTargetDistOpen && (
                                                            <div className="cmn_grid singlehead" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
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
                                                                    <Column field="category" title="Variable" width="150px" locked={true} />
                                                                    {gridColumns.map(col => (
                                                                        <Column key={col.field} field={col.field} title={col.title} cell={TargetEditCell} width={`${dynamicColWidth}px`} headerCell={() => (
                                                                            <span style={{ fontWeight: '600' }}>{col.title}</span>
                                                                        )} />
                                                                    ))}
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

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default WeightPage;
