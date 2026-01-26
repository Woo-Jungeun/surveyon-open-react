import React, { useState } from 'react';
import DataHeader from '../../components/DataHeader';
import { ChevronDown, Plus } from 'lucide-react';
import VariablePageModal from './VariablePageModal';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import '../../../../assets/css/grid_vertical_borders.css';

const VariablePage = () => {
    // todo api 연동 필요 
    const [variables, setVariables] = useState([
        { id: 1, name: 'banner', label: 'Banner', category: '{1;Banner A}{2;Banner B}{3;Banner C}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
        { id: 2, name: 'q1', label: 'Q1 Satisfaction', category: '{1;Very Low}{2;Low}{3;Neutral}{4;High}{5;Very High}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
        { id: 3, name: 'q2', label: 'Q2 Usage', category: '{1;Never}{2;Sometimes}{3;Often}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
        { id: 4, name: 'gender', label: 'Gender', category: '{1;Male}{2;Female}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
        { id: 5, name: 'age', label: 'Age', category: '{18;18}{25;25}{35;35}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '연속형' },
        { id: 6, name: 'region', label: '지역', category: '{1;서울}{2;부산}{3;광주}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
    ]);

    const [editingCategoryPopupOpen, SetEditingCategoryPopupOpen] = useState(null); // 보기 변경 팝업 open
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);

    const [columns, setColumns] = useState([
        { field: 'sysName', title: '시스템 문항', show: true, width: '150px' },
        { field: 'name', title: '문항 이름', show: true, width: '150px' },
        { field: 'label', title: '문항', show: true, minWidth: 200 },
        { field: 'category', title: '보기', show: true, minWidth: 250 },
        { field: 'logic', title: '로직', show: true, width: '200px' },
        { field: 'count', title: '카운트 (값/로직/오류)', show: true, width: '180px' },
        { field: 'type', title: '타입', show: true, width: '150px' }
    ]);

    // Map variables to include sysName (duplicate of name for display)
    const gridData = variables.map(v => ({ ...v, sysName: v.name }));

    const handleCategorySave = (id, newCategoryStr) => {
        setVariables(variables.map(v => v.id === id ? { ...v, category: newCategoryStr } : v));
        SetEditingCategoryPopupOpen(null);
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

    const InputCell = (props) => {
        return (
            <td style={props.style} className={props.className}>
                <input
                    type="text"
                    defaultValue={props.dataItem[props.field]}
                    style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--grid-border)',
                        color: 'var(--color-dark-gray)',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--grid-border)'}
                />
            </td>
        );
    };

    const CategoryCell = (props) => {
        return (
            <td style={props.style} className={props.className}>
                <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
                    <div
                        style={{
                            width: '100%',
                            padding: '8px 50px 8px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--grid-border)',
                            background: 'var(--color-bg-gray)',
                            color: 'var(--color-medium-gray)',
                            fontSize: '13px',
                            minHeight: '36px',
                            whiteSpace: 'normal',
                            wordBreak: 'break-all',
                            lineHeight: '1.4'
                        }}
                    >
                        {props.dataItem.category}
                    </div>
                    <button
                        onClick={() => SetEditingCategoryPopupOpen(props.dataItem)}
                        style={{
                            position: 'absolute',
                            right: '4px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--primary-border-light)',
                            background: '#fff',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: 'var(--primary-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary-bg-light)';
                            e.currentTarget.style.borderColor = 'var(--primary-color)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.borderColor = 'var(--primary-border-light)';
                        }}
                    >
                        변경
                    </button>
                </div>
            </td>
        );
    };

    const TypeCell = (props) => {
        const handleChange = (e) => {
            const newType = e.target.value;
            setVariables(variables.map(v => v.id === props.dataItem.id ? { ...v, type: newType } : v));
        };

        return (
            <td style={props.style} className={props.className}>
                <DropDownList
                    data={["범주형", "연속형", "텍스트"]}
                    value={props.dataItem.type}
                    onChange={handleChange}
                    style={{ width: '100%' }}
                />
            </td>
        );
    };

    const CountCell = (props) => {
        return (
            <td style={props.style} className={props.className}>
                <div style={{ color: 'var(--color-medium-gray)', fontSize: '13px' }}>
                    {props.dataItem.count}
                </div>
            </td>
        );
    };

    const ReadOnlyCell = (props) => {
        return (
            <td style={props.style} className={props.className}>
                <input
                    type="text"
                    value={props.dataItem[props.field]}
                    readOnly
                    style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--grid-border)',
                        background: 'var(--color-disabled-bg)',
                        color: 'var(--color-medium-gray)',
                        fontSize: '13px',
                        outline: 'none'
                    }}
                />
            </td>
        );
    };

    const getCell = (field) => {
        switch (field) {
            case 'sysName':
                return ReadOnlyCell;
            case 'name':
            case 'label':
            case 'logic':
                return InputCell;
            case 'category':
                return CategoryCell;
            case 'type':
                return TypeCell;
            case 'count':
                return CountCell;
            default:
                return null;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5', position: 'relative' }} data-theme="data-dashboard">
            <DataHeader
                title="문항관리"
                addButtonLabel="문항 추가"
                onAdd={() => alert('문항 추가 클릭')}
                saveButtonLabel="변경사항 저장"
                onSave={() => alert('변경사항 저장 클릭')}
            />

            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                <div style={{
                    background: '#fff',
                    borderRadius: '8px',
                    padding: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    minHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box'
                }}>
                    <div className="cmn_grid singlehead">
                        <KendoGrid
                            parentProps={{
                                data: gridData,
                                sort,
                                filter,
                                sortChange: ({ sort }) => setSort(sort),
                                filterChange: ({ filter }) => setFilter(filter),
                                height: "100%"
                            }}
                        >
                            {columns.filter(c => c.show).map((c) => (
                                <Column
                                    key={c.field}
                                    field={c.field}
                                    title={c.title}
                                    width={c.width}
                                    minWidth={c.minWidth}
                                    columnMenu={columnMenu}
                                    cell={getCell(c.field)}
                                    headerClassName="k-header-center"
                                    headerStyle={{
                                        textAlign: 'center',
                                        color: '#666',
                                        fontWeight: '600'
                                    }}
                                />
                            ))}
                        </KendoGrid>
                    </div>
                </div>
            </div>

            {/* Category Edit Modal */}
            {editingCategoryPopupOpen && (
                <VariablePageModal
                    variable={editingCategoryPopupOpen}
                    onClose={() => SetEditingCategoryPopupOpen(null)}
                    onSave={handleCategorySave}
                />
            )}
        </div>
    );
};

export default VariablePage;
