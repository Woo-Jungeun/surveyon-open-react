import React, { useState } from 'react';
import DataHeader from '../../components/DataHeader';
import SideBar from '../../components/SideBar';
import { Play, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import KendoGrid from '../../../../components/kendo/KendoGrid';
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import '../../../../assets/css/grid_vertical_borders.css';

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

    const EditableCell = (props) => {
        const { dataItem, field } = props;
        const isEditable = columns.find(c => c.field === field)?.editable;

        const handleChange = (e) => {
            const newData = categories.map(item =>
                item.id === dataItem.id ? { ...item, [field]: e.target.value } : item
            );
            setCategories(newData);
        };

        if (!isEditable) {
            return (
                <td className={props.className} style={props.style}>
                    <div style={{ padding: '8px', fontSize: '13px', color: '#666' }}>
                        {dataItem[field]}
                    </div>
                </td>
            );
        }

        return (
            <td className={props.className} style={props.style}>
                <input
                    type="text"
                    value={dataItem[field]}
                    onChange={handleChange}
                    style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid #eee',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                    }}
                />
            </td>
        );
    };

    const CheckCell = (props) => {
        const result = checkedLogics[props.dataItem.id];
        return (
            <td className={props.className} style={{ ...props.style, textAlign: 'center' }}>
                {result && (
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>
                        {result}
                    </span>
                )}
            </td>
        );
    };

    const DeleteCell = (props) => {
        return (
            <td className={props.className} style={{ ...props.style, textAlign: 'center' }}>
                <button
                    onClick={() => {
                        const newData = categories.filter(item => item.id !== props.dataItem.id);
                        setCategories(newData);
                    }}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#ccc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%'
                    }}
                >
                    <Trash2 size={16} />
                </button>
            </td>
        );
    };

    const CustomCell = (props) => {
        if (props.field === 'check') return <CheckCell {...props} />;
        if (props.field === 'delete') return <DeleteCell {...props} />;
        return <EditableCell {...props} />;
    };



    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5' }} data-theme="data-dashboard">
            {/* Header */}
            <DataHeader
                title="문항 가공"
                addButtonLabel="문항 추가"
                onAdd={() => alert('문항 추가 클릭')}
                saveButtonLabel="변경사항 저장"
                onSave={() => alert('변경사항 저장 클릭')}
            />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Sidebar */}
                <SideBar
                    items={variables}
                    selectedId={selectedVar?.id}
                    onItemClick={setSelectedVar}
                    onSearch={(val) => console.log(val)}
                />

                {/* Content Area */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '8px',
                        padding: '24px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        minHeight: '100%', // Fill height
                        display: 'flex',
                        flexDirection: 'column',
                        boxSizing: 'border-box'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#333' }}>문항 수정</h3>

                        {/* Variable Info Inputs */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#555' }}>문항 ID</label>
                            <input
                                type="text"
                                value={selectedVar?.name || ''}
                                readOnly
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', background: '#f9f9f9', marginBottom: '16px' }}
                            />

                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#555' }}>문항 라벨</label>
                            <input
                                type="text"
                                value={selectedVar?.label || ''}
                                onChange={(e) => setSelectedVar({ ...selectedVar, label: e.target.value })}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                            />
                        </div>

                        {/* Evaluation Result Section */}
                        {evaluationResult && (
                            <div style={{
                                marginBottom: '24px',
                                background: '#f8f9fa',
                                borderRadius: '8px',
                                border: '1px solid #eee',
                                animation: 'fadeIn 0.3s ease-in-out',
                                overflow: 'hidden'
                            }}>
                                <div
                                    onClick={() => setIsEvaluationOpen(!isEvaluationOpen)}
                                    style={{
                                        padding: '16px 20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: isEvaluationOpen ? '1px solid #eee' : 'none',
                                        userSelect: 'none'
                                    }}
                                >
                                    <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '4px', height: '16px', background: 'var(--primary-color)', borderRadius: '2px' }}></span>
                                        평가 결과
                                    </h4>
                                    {isEvaluationOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                                </div>

                                {isEvaluationOpen && (
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>전체 N:</span>
                                                    <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.n}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>표준편차:</span>
                                                    <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.stdDev}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>평균:</span>
                                                    <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.mean}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>최대:</span>
                                                    <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.max}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '13px', color: '#666', fontWeight: '600', width: '80px' }}>최소:</span>
                                                    <span style={{ fontSize: '14px', color: '#111', fontWeight: '700' }}>{evaluationResult.min}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Categories Grid Section */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#333' }}>보기</h4>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => {
                                            const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 0;
                                            setCategories([...categories, { id: newId, realVal: String(newId), category: '', val: '', logic: '' }]);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: '600', color: '#555' }}
                                    >
                                        <Plus size={14} /> 보기 추가
                                    </button>
                                </div>
                            </div>

                            <div className="cmn_grid singlehead" style={{ flex: 1 }}>
                                <KendoGrid
                                    parentProps={{
                                        data: categories,
                                        sort,
                                        filter,
                                        sortChange: ({ sort }) => setSort(sort),
                                        filterChange: ({ filter }) => setFilter(filter),
                                        height: "100%"
                                    }}
                                >
                                    {columns.filter(c => c.show).map((c) => {
                                        if (c.field === 'check') {
                                            return (
                                                <Column
                                                    key={c.field}
                                                    field={c.field}
                                                    title={c.title}
                                                    width={c.width}
                                                    minWidth={c.minWidth}
                                                    cell={CustomCell}
                                                    headerCell={() => (
                                                        <div className="k-header-center" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                                                            <button
                                                                onClick={handleLogicCheck}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid var(--primary-color)',
                                                                    background: '#fff',
                                                                    color: 'var(--primary-color)',
                                                                    fontSize: '12px',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                로직 체크
                                                            </button>
                                                        </div>
                                                    )}
                                                    headerClassName="k-header-center"
                                                    headerStyle={{
                                                        textAlign: 'center',
                                                        color: '#666',
                                                        fontWeight: '600'
                                                    }}
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
                                                    cell={CustomCell}
                                                    headerClassName="k-header-center"
                                                    headerStyle={{
                                                        textAlign: 'center',
                                                        color: '#666',
                                                        fontWeight: '600'
                                                    }}
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
                                                cell={CustomCell}
                                                headerClassName="k-header-center"
                                                headerStyle={{
                                                    textAlign: 'center',
                                                    color: '#666',
                                                    fontWeight: '600'
                                                }}
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
