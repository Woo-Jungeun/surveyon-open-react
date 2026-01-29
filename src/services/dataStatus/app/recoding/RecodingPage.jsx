import React, { useState, useEffect } from 'react';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import { Play, Plus, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from '../../../../components/kendo/KendoGrid';
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import '../../../../assets/css/grid_vertical_borders.css';
import './RecodingPage.css';

const EditableCell = (props) => {
    const { dataItem, field, columns, onUpdate, onPaste } = props;
    const isEditable = columns.find(c => c.field === field)?.editable;

    if (!isEditable) {
        return (
            <td className={props.className} style={props.style}>
                <div className="recoding-cell-readonly">
                    {dataItem[field]}
                </div>
            </td>
        );
    }

    return (
        <td className={props.className} style={props.style}>
            <input
                type="text"
                defaultValue={dataItem[field]}
                placeholder={field === 'logic' ? "로직 (예: age >= 20 && age < 30)" : ""}
                onBlur={(e) => {
                    if (onUpdate && e.target.value !== dataItem[field]) {
                        onUpdate(dataItem.id, field, e.target.value);
                    }
                }}
                onPaste={(e) => onPaste && onPaste(e, dataItem, field)}
                className="recoding-cell-input"
            />
        </td>
    );
};

const CheckCell = (props) => {
    const { dataItem, checkedLogics } = props;
    const result = checkedLogics[dataItem.id];
    return (
        <td className={`${props.className} recoding-check-cell`} style={props.style}>
            {result && (
                <span className="recoding-check-result">
                    {result}
                </span>
            )}
        </td>
    );
};

const DeleteCell = (props) => {
    const { dataItem, onDelete } = props;
    return (
        <td className={`${props.className} recoding-delete-cell`} style={props.style}>
            <button
                onClick={() => onDelete && onDelete(dataItem.id)}
                className="recoding-delete-btn"
            >
                <Trash2 size={16} />
            </button>
        </td>
    );
};

const CustomCell = (props) => {
    const { field, columns, checkedLogics, onUpdate, onDelete, onPaste } = props;
    if (field === 'check') return <CheckCell {...props} checkedLogics={checkedLogics} />;
    if (field === 'delete') return <DeleteCell {...props} onDelete={onDelete} />;
    return <EditableCell {...props} columns={columns} onUpdate={onUpdate} onPaste={onPaste} />;
};

const RecodingPage = () => {
    // Mock Data
    const [variables, setVariables] = useState([
        { id: 'weight_demo', name: 'weight_demo', label: 'Weight Demo' },
        { id: 'gender_grp', name: 'gender_grp', label: 'Gender Group' },
        { id: 'age_band', name: 'age_band', label: 'Age Band' },
        { id: 'region_group', name: 'region_group', label: 'Region Group' },
        { id: 'q1_positive', name: 'q1_positive', label: 'Q1 Positive' },
        { id: 'heavy_user', name: 'heavy_user', label: 'Usage Segment' },
        { id: 'age_group_6', name: 'age_group_6', label: 'Age Group 6' },
        { id: 'banner_group', name: 'banner_group', label: 'Banner Group' },
    ]);

    const [selectedVar, setSelectedVar] = useState(variables[0]);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVariables = variables.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.label || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Mock Categories for the selected variable
    const [categories, setCategories] = useState([
        { id: 0, realVal: '0', category: '__CONFIG__{"rowVars":["q1"],"colVars":["banr', val: '', logic: '1==0' },
        { id: 1, realVal: '1', category: 'Low Weight', val: '0.8', logic: 'q1 == 1' },
        { id: 2, realVal: '2', category: 'Mid Weight', val: '1', logic: 'q1 == 2' },
        { id: 3, realVal: '3', category: 'High Weight', val: '1.2', logic: 'q1 == 3' },
        { id: 4, realVal: '4', category: 'Very High Weight', val: '1.4', logic: 'q1 == 4' },
        { id: 5, realVal: '5', category: 'Extreme Weight', val: '1.6', logic: 'q1 == 5' },
    ]);

    const [checkedLogics, setCheckedLogics] = useState({});
    const [evaluationResult, setEvaluationResult] = useState(null);
    const [isEvaluationOpen, setIsEvaluationOpen] = useState(true);
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

    const handleCopyToClipboard = async () => {
        try {
            // Header
            const headers = columns.filter(c => c.show && c.field !== 'delete' && c.field !== 'check').map(c => c.title).join('\t');
            // Rows
            const rows = categories.map(item => {
                return columns.filter(c => c.show && c.field !== 'delete' && c.field !== 'check').map(c => item[c.field]).join('\t');
            }).join('\n');

            const text = `${headers}\n${rows}`;
            await navigator.clipboard.writeText(text);

            setToast({ show: true, message: '복사 완료 (Ctrl+V)' });
        } catch (err) {
            console.error('Failed to copy:', err);
            setToast({ show: true, message: '복사 실패' });
        }
    };

    // Grid State
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [columns, setColumns] = useState([
        { field: 'realVal', title: '코드', show: true, width: '80px', editable: false },
        { field: 'category', title: '보기', show: true, minWidth: 200, editable: true },
        { field: 'val', title: '가공값', show: true, width: '120px', editable: true },
        { field: 'logic', title: '로직', show: true, minWidth: 200, editable: true },
        { field: 'check', title: '로직체크', show: true, width: '120px', editable: false },
        { field: 'delete', title: '삭제', show: true, width: '100px', editable: false },
    ]);

    const handleLogicCheck = () => {
        // Check all logics at once
        const newChecks = {};
        categories.forEach(cat => {
            newChecks[cat.id] = `${Math.floor(Math.random() * 50) + 10} / ${(Math.random() * 30 + 10).toFixed(1)}%`;
        });
        setCheckedLogics(newChecks);

        // Set mock evaluation result
        setEvaluationResult({
            n: 165,
            mean: 0.8484848484848485,
            stdDev: 0.334075474032776,
            min: 0.8,
            max: 1.6
        });
    };

    // Handle Paste from Excel
    const handlePaste = (e, dataItem, field) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('text');

        // Parse Excel data (rows by newline, cols by tab)
        const rows = clipboardData.split(/\r\n|\n|\r/).filter(row => row.trim() !== '');
        if (rows.length === 0) return;

        // Find start position
        const startRowIndex = categories.findIndex(item => item.id === dataItem.id);
        if (startRowIndex === -1) return;

        // Editable columns in order
        const editableColumns = columns.filter(c => c.editable).map(c => c.field);
        const startColIndex = editableColumns.indexOf(field);
        if (startColIndex === -1) return;

        setCategories(prevData => {
            const newData = [...prevData];

            rows.forEach((row, rIdx) => {
                const currentRowIndex = startRowIndex + rIdx;

                // If row exists, update it. If not, create new row? 
                // For now, let's only update existing rows to be safe, or maybe add new rows if needed.
                // WeightPage logic only updates existing rows. Let's stick to that for now.
                if (currentRowIndex >= newData.length) return;

                const cells = row.split('\t');
                cells.forEach((cellValue, cIdx) => {
                    const currentColIndex = startColIndex + cIdx;
                    if (currentColIndex < editableColumns.length) {
                        const fieldName = editableColumns[currentColIndex];
                        newData[currentRowIndex] = {
                            ...newData[currentRowIndex],
                            [fieldName]: cellValue.trim()
                        };
                    }
                });
            });

            return newData;
        });
    };

    const columnMenu = (props) => (
        <ExcelColumnMenu
            {...props}
            columns={columns}
            onColumnsChange={setColumns}
            filter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
        />
    );

    const handleUpdate = (id, field, value) => {
        setCategories(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleDelete = (id) => {
        setCategories(prev => prev.filter(item => item.id !== id));
    };

    const handleAddVariable = () => {
        setSelectedVar({ id: null, name: '', label: '' });
        setCategories([]);
        setEvaluationResult(null);
        setCheckedLogics({});
    };

    const handleSave = () => {
        // In a real app, this would send 'categories' (and logic checks) to the server
        console.log('Saving recoding rules:', categories);
        alert('재코딩 규칙이 저장되었습니다.');
    };

    return (
        <div className="recoding-page" data-theme="data-dashboard">
            {/* Header */}
            <DataHeader
                title="문항 가공"
                addButtonLabel={selectedVar?.id === null ? null : "문항 추가"}
                onAdd={selectedVar?.id === null ? null : handleAddVariable}
                saveButtonLabel={selectedVar?.id === null ? "추가 문항 저장" : "변경사항 저장"}
                onSave={handleSave}
            />

            {/* Toast Message */}
            {toast.show && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1e293b',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    zIndex: 2000,
                    animation: 'fadeIn 0.2s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></div>
                    {toast.message}
                </div>
            )}

            <div className="recoding-layout">
                {/* Sidebar */}
                <SideBar
                    items={filteredVariables}
                    title="문항 목록"
                    selectedId={selectedVar?.id}
                    onItemClick={setSelectedVar}
                    onSearch={setSearchTerm}
                />

                {/* Content Area */}
                <div className="recoding-content">
                    <div className="recoding-card">
                        <h3 className="recoding-title">
                            {selectedVar?.id === null ? "문항 추가" : "문항 수정"}
                        </h3>

                        {/* Variable Info Inputs */}
                        <div className="recoding-variable-info">
                            <label className="recoding-label">문항 ID</label>
                            <input
                                type="text"
                                value={selectedVar?.name || ''}
                                readOnly={selectedVar?.id !== null}
                                onChange={(e) => setSelectedVar({ ...selectedVar, name: e.target.value })}
                                className={`recoding-input ${selectedVar?.id !== null ? 'recoding-input-readonly' : ''}`}
                                placeholder="예: AgeGroup"
                            />

                            <label className="recoding-label">문항 라벨</label>
                            <input
                                type="text"
                                value={selectedVar?.label || ''}
                                onChange={(e) => setSelectedVar({ ...selectedVar, label: e.target.value })}
                                className="recoding-input"
                                placeholder="예: 연령대 (10대, 20대...)"
                            />
                        </div>

                        {/* Evaluation Result Section */}
                        {evaluationResult && (
                            <div className="recoding-evaluation">
                                <div
                                    onClick={() => setIsEvaluationOpen(!isEvaluationOpen)}
                                    className={`recoding-evaluation-header ${isEvaluationOpen ? 'open' : ''}`}
                                >
                                    <h4 className="recoding-evaluation-title">
                                        <span className="recoding-evaluation-indicator"></span>
                                        평가 결과
                                    </h4>
                                    {isEvaluationOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                                </div>

                                {isEvaluationOpen && (
                                    <div className="recoding-evaluation-content">
                                        <div className="recoding-evaluation-grid">
                                            <div className="recoding-evaluation-column">
                                                <div className="recoding-evaluation-row">
                                                    <span className="recoding-evaluation-label">전체 N:</span>
                                                    <span className="recoding-evaluation-value">{evaluationResult.n}</span>
                                                </div>
                                                <div className="recoding-evaluation-row">
                                                    <span className="recoding-evaluation-label">표준편차:</span>
                                                    <span className="recoding-evaluation-value">{evaluationResult.stdDev}</span>
                                                </div>
                                                <div className="recoding-evaluation-row">
                                                    <span className="recoding-evaluation-label">평균:</span>
                                                    <span className="recoding-evaluation-value">{evaluationResult.mean}</span>
                                                </div>
                                            </div>
                                            <div className="recoding-evaluation-column">
                                                <div className="recoding-evaluation-row">
                                                    <span className="recoding-evaluation-label">최대:</span>
                                                    <span className="recoding-evaluation-value">{evaluationResult.max}</span>
                                                </div>
                                                <div className="recoding-evaluation-row">
                                                    <span className="recoding-evaluation-label">최소:</span>
                                                    <span className="recoding-evaluation-value">{evaluationResult.min}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Categories Grid Section */}
                        <div className="recoding-categories">
                            <div className="recoding-categories-header">
                                <h4 className="recoding-categories-title">보기</h4>
                                <div className="recoding-categories-actions">
                                    <button
                                        onClick={handleCopyToClipboard}
                                        title="데이터 복사"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            border: 'none',
                                            background: '#f3f4f6',
                                            cursor: 'pointer',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            color: '#4b5563',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s',
                                            marginRight: '8px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                    >
                                        <Copy size={14} />
                                        복사
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 0;
                                            setCategories([...categories, { id: newId, realVal: String(newId), category: '', val: '', logic: '' }]);
                                        }}
                                        className="recoding-add-category-btn"
                                    >
                                        <Plus size={14} /> 보기 추가
                                    </button>
                                </div>
                            </div>

                            <div className="cmn_grid singlehead recoding-grid-container">
                                <KendoGrid
                                    parentProps={{
                                        data: categories,
                                        dataItemKey: "id",
                                        sort,
                                        filter,
                                        sortChange: ({ sort }) => setSort(sort),
                                        filterChange: ({ filter }) => setFilter(filter),
                                        height: "100%"
                                    }}
                                >
                                    {columns.filter(c => c.show).map((c) => {
                                        const cellRender = (props) => (
                                            <CustomCell
                                                {...props}
                                                columns={columns}
                                                checkedLogics={checkedLogics}
                                                onUpdate={handleUpdate}
                                                onDelete={handleDelete}
                                                onPaste={handlePaste}
                                            />
                                        );

                                        if (c.field === 'check') {
                                            return (
                                                <Column
                                                    key={c.field}
                                                    field={c.field}
                                                    title={c.title}
                                                    width={c.width}
                                                    minWidth={c.minWidth}
                                                    cell={cellRender}
                                                    headerCell={() => (
                                                        <div className="k-header-center recoding-logic-check-header">
                                                            <button
                                                                onClick={handleLogicCheck}
                                                                className="recoding-logic-check-btn"
                                                            >
                                                                로직 체크
                                                            </button>
                                                        </div>
                                                    )}
                                                    headerClassName="k-header-center recoding-column-header"
                                                />
                                            );
                                        }
                                        if (c.field === 'delete') {
                                            return (
                                                <Column
                                                    key={c.field}
                                                    field={c.field}
                                                    title={c.title}
                                                    width={c.width}
                                                    minWidth={c.minWidth}
                                                    columnMenu={undefined}
                                                    cell={cellRender}
                                                    headerClassName="k-header-center recoding-column-header"
                                                />
                                            );
                                        }
                                        return (
                                            <Column
                                                key={c.field}
                                                field={c.field}
                                                title={c.title}
                                                width={c.width}
                                                minWidth={c.minWidth}
                                                columnMenu={columnMenu}
                                                cell={cellRender}
                                                headerClassName="k-header-center recoding-column-header"
                                            />
                                        );
                                    })}
                                </KendoGrid>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecodingPage;
