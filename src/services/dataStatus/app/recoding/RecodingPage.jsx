import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RecodingPageApi } from './RecodingPageApi';
import DataHeader from '../../components/DataHeader';
import Toast from '../../../../components/common/Toast';
import SideBar from '../../components/SideBar';
import { Play, Plus, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from '../../../../components/kendo/KendoGrid';
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import '../../../../assets/css/grid_vertical_borders.css';
import './RecodingPage.css';
import { modalContext } from '../../../../components/common/Modal';

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
    // const [variables, setVariables] = useState([
    //     { id: 'weight_demo', name: 'weight_demo', label: 'Weight Demo' },
    //     { id: 'gender_grp', name: 'gender_grp', label: 'Gender Group' },
    //     { id: 'age_band', name: 'age_band', label: 'Age Band' },
    //     { id: 'region_group', name: 'region_group', label: 'Region Group' },
    //     { id: 'q1_positive', name: 'q1_positive', label: 'Q1 Positive' },
    //     { id: 'heavy_user', name: 'heavy_user', label: 'Usage Segment' },
    //     { id: 'age_group_6', name: 'age_group_6', label: 'Age Group 6' },
    //     { id: 'banner_group', name: 'banner_group', label: 'Banner Group' },
    // ]);

    const auth = useSelector((store) => store.auth);
    const { getRecodedVariables, setRecodedVariable, deleteRecodedVariable } = RecodingPageApi();
    const modal = useContext(modalContext);

    const [variables, setVariables] = useState([]);
    const [selectedVar, setSelectedVar] = useState({ id: null, name: '', label: '', info: [] });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchVariables = async () => {
            // ... existing logic ...
            if (auth?.user?.userId) {
                const userId = auth.user.userId;
                const pageId = "0c1de699-0270-49bf-bfac-7e6513a3f525";

                try {
                    const result = await getRecodedVariables.mutateAsync({ user: userId, pageid: pageId });
                    if (result?.success === "777" && result.resultjson) {
                        const transformedData = Object.values(result.resultjson).map(item => ({
                            id: item.id,
                            name: item.name,
                            label: item.label,
                            type: item.type,
                            info: item.info || [] // Include info array
                        }));
                        setVariables(transformedData);
                        // If we are currently editing a variable, update it from fresh data if found, else keep current or reset?
                        // For now, if no selection, select first.
                        if (selectedVar.id === null && transformedData.length > 0) {
                            setSelectedVar(transformedData[0]);
                        } else if (selectedVar.id) {
                            const found = transformedData.find(v => v.id === selectedVar.id);
                            if (found) setSelectedVar(found);
                        }
                    }
                } catch (error) {
                    console.error("API Error:", error);
                }
            }
        };

        fetchVariables();
    }, [auth?.user?.userId]);

    // ... (useEffect for selectedVar logic - unchanged)

    // ... (filteredVariables, categories state - unchanged)

    // ... (helper functions - unchanged)



    // ... (handleSave - unchanged)

    const [categories, setCategories] = useState([]);
    const [checkedLogics, setCheckedLogics] = useState({});
    const [evaluationResult, setEvaluationResult] = useState(null);
    const [isEvaluationOpen, setIsEvaluationOpen] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '' });

    // Dirty Check State
    const [isDirty, setIsDirty] = useState(false);
    const [initialState, setInitialState] = useState(null);
    const lastSelectedIdRef = useRef(null);

    // Update categories when selected variable changes (only if ID changes)
    useEffect(() => {
        // Function to extract state for comparison
        const getCurrentState = (v, c) => ({
            name: v?.name || '',
            label: v?.label || '',
            categories: c || []
        });

        if (selectedVar?.id !== lastSelectedIdRef.current) {
            lastSelectedIdRef.current = selectedVar?.id;

            if (selectedVar?.id && selectedVar.info) {
                const newCategories = selectedVar.info.map(item => ({
                    id: item.index,
                    realVal: item.index,
                    category: item.label,
                    val: item.value,
                    logic: item.logic
                }));
                setCategories(newCategories);
                setInitialState({
                    name: selectedVar.name,
                    label: selectedVar.label,
                    categories: newCategories // Deep copy not strictly needed if we don't mutate this array directly in place without copy
                });
            } else if (selectedVar?.id === null) {
                // New variable
                // But only if we are truly resetting (handled by handleAddVariable usually, but here for safety)
                // If switching from existing to New, handleAddVariable is called.
                // If just mounting, selectedVar is empty.
                if (selectedVar.name === '') {
                    setCategories([]);
                    setInitialState({ name: '', label: '', categories: [] });
                }
            }
            setIsDirty(false);
        }
    }, [selectedVar]);

    // Check for dirty state
    useEffect(() => {
        if (!initialState) return;

        const currentName = selectedVar.name || '';
        const currentLabel = selectedVar.label || '';

        // Simple comparison for strings
        const nameChanged = currentName !== initialState.name;
        const labelChanged = currentLabel !== initialState.label;

        // Deep comparison for categories
        // We compare key fields: realVal, category, val, logic
        // ID is internal key, might not matter for content, but order matters.
        const categoriesChanged = JSON.stringify(categories.map(c => ({
            realVal: c.realVal, category: c.category, val: c.val, logic: c.logic
        }))) !== JSON.stringify(initialState.categories.map(c => ({
            realVal: c.realVal, category: c.category, val: c.val, logic: c.logic
        })));

        setIsDirty(nameChanged || labelChanged || categoriesChanged);
    }, [selectedVar.name, selectedVar.label, categories, initialState]);

    const handleVariableSelect = (item) => {
        // Prevent selection if same ID
        if (item.id === selectedVar.id) return;

        if (isDirty) {
            modal.showConfirm("알림", "변경사항이 저장되지 않았습니다. 이동하시겠습니까?", {
                btns: [
                    { title: "취소" },
                    {
                        title: "확인",
                        click: () => {
                            setSelectedVar(item);
                        }
                    }
                ]
            });
        } else {
            setSelectedVar(item);
        }
    }

    const filteredVariables = variables.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.label || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Remove old Categories state definition as it is moved up
    // const [categories, setCategories] = useState([]);

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

    const handleAddVariable = () => {
        // Clear selection to start fresh
        setSelectedVar({ id: null, name: '', label: '', info: [] });
        setCategories([]);
        setEvaluationResult(null);
        setCheckedLogics({});
    };

    const saveVariableData = async (categoriesToSave) => {
        if (!auth?.user?.userId) return;
        if (!selectedVar.name) {
            setToast({ show: true, message: '문항 ID를 입력해주세요.' });
            return;
        }

        const userId = auth.user.userId;
        const pageId = "0c1de699-0270-49bf-bfac-7e6513a3f525";
        const variableKey = selectedVar.name;

        const targetCategories = categoriesToSave || categories;

        const variablesPayload = {
            [variableKey]: {
                id: variableKey,
                name: selectedVar.name,
                label: selectedVar.label,
                type: selectedVar.type || "categorical",
                info: targetCategories.map(c => ({
                    index: Number(c.realVal) || 0,
                    label: c.category,
                    logic: c.logic,
                    type: "categorical", // Defaulting type as per request example
                    value: Number(c.val) || 0
                }))
            }
        };

        try {
            const result = await setRecodedVariable.mutateAsync({
                user: userId,
                pageid: pageId,
                variables: variablesPayload
            });

            if (result?.success === "777") {
                modal.showAlert("알림", "저장되었습니다.");
                // Refresh list
                const getResult = await getRecodedVariables.mutateAsync({ user: userId, pageid: pageId });
                if (getResult?.success === "777" && getResult.resultjson) {
                    const transformedData = Object.values(getResult.resultjson).map(item => ({
                        id: item.id,
                        name: item.name,
                        label: item.label,
                        type: item.type,
                        info: item.info || []
                    }));
                    setVariables(transformedData);
                    // Reselect the saved variable to ensure we have latest state
                    const savedVar = transformedData.find(v => v.name === variableKey);
                    if (savedVar) {
                        setSelectedVar(savedVar);

                        // Update state to match server and reset dirty status
                        const savedCategories = (savedVar.info || []).map(item => ({
                            id: item.index,
                            realVal: item.index,
                            category: item.label,
                            val: item.value,
                            logic: item.logic
                        }));
                        setCategories(savedCategories);
                        setInitialState({
                            name: savedVar.name,
                            label: savedVar.label,
                            categories: savedCategories
                        });
                    }
                }
            } else {
                modal.showErrorAlert("알림", result?.message || '저장 실패');
            }
        } catch (error) {
            console.error("Save Error:", error);
            modal.showErrorAlert("오류", "저장 중 오류 발생");
        }
    };

    const handleSave = () => {
        saveVariableData();
    };

    const handleDelete = (id) => {
        setCategories(prev => prev.filter(item => item.id !== id));
    };



    const handleDeleteVariable = () => {
        if (!auth?.user?.userId || !selectedVar.name) return;

        modal.showConfirm("알림", "선택한 문항을 삭제하시겠습니까?", {
            btns: [
                { title: "취소" },
                {
                    title: "삭제",
                    click: async () => {
                        const userId = auth.user.userId;
                        const pageId = "0c1de699-0270-49bf-bfac-7e6513a3f525";

                        try {
                            const result = await deleteRecodedVariable.mutateAsync({
                                user: userId,
                                pageid: pageId,
                                variables: [selectedVar.name]
                            });

                            if (result?.success === "777") {
                                modal.showAlert("알림", "삭제되었습니다.");

                                // Refresh list
                                const getResult = await getRecodedVariables.mutateAsync({ user: userId, pageid: pageId });
                                if (getResult?.success === "777" && getResult.resultjson) {
                                    const transformedData = Object.values(getResult.resultjson).map(item => ({
                                        id: item.id,
                                        name: item.name,
                                        label: item.label,
                                        type: item.type,
                                        info: item.info || []
                                    }));
                                    setVariables(transformedData);
                                    handleAddVariable(); // Reset to Add mode
                                } else {
                                    setVariables([]);
                                    handleAddVariable();
                                }
                            } else {
                                modal.showErrorAlert("알림", result?.message || "삭제 실패");
                            }
                        } catch (error) {
                            console.error("Delete Variable Error:", error);
                            modal.showErrorAlert("오류", "삭제 중 오류가 발생했습니다.");
                        }
                    }
                }
            ]
        });
    };

    return (
        <div className="recoding-page" data-theme="data-dashboard">
            {/* Header */}
            <DataHeader
                title="문항 가공"
                addButtonLabel={selectedVar?.id === null ? null : "문항 추가"}
                onAdd={selectedVar?.id === null ? null : handleAddVariable}
                onDelete={selectedVar?.id === null ? null : handleDeleteVariable}
                deleteButtonLabel="문항 삭제"
                saveButtonLabel={selectedVar?.id === null ? "추가 문항 저장" : "변경사항 저장"}
                onSave={handleSave}
                saveButtonDisabled={!isDirty}
            />

            <Toast
                show={toast.show}
                message={toast.message}
                onClose={() => setToast({ ...toast, show: false })}
            />

            <div className="recoding-layout">
                {/* Sidebar */}
                <SideBar
                    items={filteredVariables}
                    title="문항 목록"
                    selectedId={selectedVar?.id}
                    onItemClick={handleVariableSelect}
                    onSearch={setSearchTerm}
                />

                {/* Content Area */}
                <div className="recoding-content">
                    <div className="recoding-card">
                        <h3 className="recoding-title">
                            {selectedVar?.id === null ? "문항 추가" : "문항 수정"}
                        </h3>

                        {/* Variable Info Inputs */}
                        <div className="recoding-variable-info" style={{ display: 'flex', gap: '24px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="recoding-label">문항 ID</label>
                                <input
                                    type="text"
                                    value={selectedVar?.name || ''}
                                    readOnly={selectedVar?.id !== null}
                                    onChange={(e) => setSelectedVar({ ...selectedVar, name: e.target.value })}
                                    className={`recoding-input ${selectedVar?.id !== null ? 'recoding-input-readonly' : ''}`}
                                    placeholder="예: AgeGroup"
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="recoding-label">문항 라벨</label>
                                <input
                                    type="text"
                                    value={selectedVar?.label || ''}
                                    onChange={(e) => setSelectedVar({ ...selectedVar, label: e.target.value })}
                                    className="recoding-input"
                                    placeholder="예: 연령대 (10대, 20대...)"
                                />
                            </div>
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
                                        className="recoding-copy-btn"
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
