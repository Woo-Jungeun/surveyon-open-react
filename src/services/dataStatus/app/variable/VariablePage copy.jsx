import React, { useState, useEffect } from 'react';
import DataHeader from '../../components/DataHeader';
import { ChevronDown, Plus } from 'lucide-react';
import VariablePageModal from './VariablePageModal';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import '../../../../assets/css/grid_vertical_borders.css';
import './VariablePage.css';
import { VariablePageApi } from './VariablePageApi';

const VariablePage = () => {
    const { getVariableList } = VariablePageApi();
    const [variables, setVariables] = useState([]);

    useEffect(() => {
        getVariableList.mutate({}, {
            onSuccess: (res) => {
                if (res && res.data) {
                    setVariables(res.data);
                }
            },
            onError: (err) => {
                console.error("문항 목록 조회 실패", err);
            }
        });
    }, []);

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
                    className="variable-input"
                />
            </td>
        );
    };

    const CategoryCell = (props) => {
        return (
            <td style={props.style} className={props.className}>
                <div className="category-cell-container">
                    <div className="category-cell-content">
                        {props.dataItem.category}
                    </div>
                    <button
                        onClick={() => SetEditingCategoryPopupOpen(props.dataItem)}
                        className="category-edit-btn"
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
                <div className="count-cell">
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
                    className="variable-input-readonly"
                />
            </td>
        );
    };

    const getCell = (field) => {
        switch (field) {
            case 'sysName':
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

    const handleAddVariable = () => {
        setVariables(prev => {
            const newId = prev.length > 0 ? Math.max(...prev.map(v => v.id)) + 1 : 1;
            const newName = `var_${newId}`;
            return [...prev, {
                id: newId,
                sysName: '',
                name: newName,
                label: '',
                category: '',
                logic: '',
                count: '0 / 0',
                type: '범주형'
            }];
        });
    };

    return (
        <div className="variable-page" data-theme="data-dashboard">
            <DataHeader
                title="문항관리"
                addButtonLabel="문항 추가"
                onAdd={handleAddVariable}
                saveButtonLabel="변경사항 저장"
                onSave={() => alert('변경사항 저장 클릭')}
            />

            <div className="variable-page-content">
                <div className="variable-page-card">
                    <div className="cmn_grid singlehead">
                        <KendoGrid
                            parentProps={{
                                data: variables,
                                dataItemKey: "id",
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
                                    headerClassName="k-header-center variable-column-header"
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
