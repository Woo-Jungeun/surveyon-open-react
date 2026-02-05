import React, { useState, useEffect, useContext, useRef } from 'react';
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
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";

import { useSelector } from 'react-redux';

const VariablePage = () => {
    const { getOriginalVariables } = VariablePageApi();
    const auth = useSelector((store) => store.auth);
    const [variables, setVariables] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);
    // todo 가라데이터 
    // const [variables, setVariables] = useState([
    //     { id: 1, sysName: 'banner', name: 'banner', label: 'Banner', category: '{1;Banner A}{2;Banner B}{3;Banner C}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
    //     { id: 2, sysName: 'q1', name: 'q1', label: 'Q1 Satisfaction', category: '{1;Very Low}{2;Low}{3;Neutral}{4;High}{5;Very High}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
    //     { id: 3, sysName: 'q2', name: 'q2', label: 'Q2 Usage', category: '{1;Never}{2;Sometimes}{3;Often}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
    //     { id: 4, sysName: 'gender', name: 'gender', label: 'Gender', category: '{1;Male}{2;Female}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
    //     { id: 5, sysName: 'age', name: 'age', label: 'Age', category: '{18;18}{25;25}{35;35}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '연속형' },
    //     { id: 6, sysName: 'region', name: 'region', label: '지역', category: '{1;서울}{2;부산}{3;광주}', logic: 'q1 > 3', count: '값 240 / 로직 240', type: '범주형' },
    // ]);

    // Hide loading spinner only after data is rendered
    useEffect(() => {
        if (isDataLoaded && variables.length >= 0) {
            // Use setTimeout to ensure DOM has updated
            setTimeout(() => {
                loadingSpinner.hide();
            }, 100);
        }
    }, [isDataLoaded, variables]);

    const [originalVariables, setOriginalVariables] = useState([]); // Store original data for comparison
    const [hasChanges, setHasChanges] = useState(false);

    // Deep compare to check for changes
    useEffect(() => {
        if (!isDataLoaded) return;

        const isDifferent = JSON.stringify(variables.map(v => {
            const { isNew, ...rest } = v; // Exclude UI flags from comparison if needed, but new rows make list different
            // Actually, if it's new, it defaults to different list length or content.
            // We should compare significant fields.
            return {
                sysName: v.sysName,
                name: v.name,
                label: v.label,
                category: v.category,
                logic: v.logic,
                type: v.type
            };
        })) !== JSON.stringify(originalVariables.map(v => ({
            sysName: v.sysName,
            name: v.name,
            label: v.label,
            category: v.category,
            logic: v.logic,
            type: v.type
        })));

        setHasChanges(isDifferent);
    }, [variables, originalVariables, isDataLoaded]);

    useEffect(() => {
        const fetchVariables = async () => {
            if (auth?.user?.userId) {
                const userId = auth.user.userId;
                const pageId = "0c1de699-0270-49bf-bfac-7e6513a3f525";

                try {
                    const result = await getOriginalVariables.mutateAsync({ user: userId, pageid: pageId });

                    if (result.success === "777") {
                        if (result.resultjson) {
                            const transformedData = Object.values(result.resultjson).map(item => {
                                let typeLabel = item.type;
                                if (item.type === 'categorical') typeLabel = '범주형';
                                else if (item.type === 'continuous') typeLabel = '연속형';
                                else if (item.type === 'text') typeLabel = '텍스트';

                                return {
                                    id: item.id,
                                    sysName: item.id,
                                    name: item.name,
                                    label: item.label,
                                    category: item.info ? item.info.map(i => `{${i.value};${i.label}}`).join('') : '',
                                    logic: '',
                                    count: '',
                                    type: typeLabel
                                };
                            });
                            setVariables(transformedData);
                            setOriginalVariables(JSON.parse(JSON.stringify(transformedData))); // Deep copy
                            setIsDataLoaded(true);
                        }
                    } else {
                        modal.showErrorAlert("에러", result?.message); //오류 팝업 표출
                        loadingSpinner.hide();
                    }
                } catch (error) {
                    console.error("API Error:", error);
                    modal.showErrorAlert("에러", "문항 목록 조회 중 오류가 발생했습니다.");
                    loadingSpinner.hide();
                }
            }
        };

        fetchVariables();
    }, [auth?.user?.userId]);



    const [editingCategoryPopupOpen, SetEditingCategoryPopupOpen] = useState(null); // 보기 변경 팝업 open
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [skip, setSkip] = useState(0);
    const [pageSize, setPageSize] = useState(100);

    const pageChange = (event) => {
        setSkip(event.page.skip);
        setPageSize(event.page.take);
    };

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
        const textareaRef = useRef(null);

        const adjustHeight = () => {
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
            }
        };

        useEffect(() => {
            adjustHeight();
        }, [props.dataItem[props.field]]);

        const handleBlur = (e) => {
            const newValue = e.target.value;
            // Only update if value changed to avoid unnecessary re-renders
            if (props.dataItem[props.field] !== newValue) {
                setVariables(prev => prev.map(v =>
                    v.id === props.dataItem.id ? { ...v, [props.field]: newValue } : v
                ));
            }
        };

        return (
            <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
                <textarea
                    ref={textareaRef}
                    defaultValue={props.dataItem[props.field]}
                    className="variable-input"
                    rows={1}
                    onInput={adjustHeight}
                    onBlur={handleBlur}
                />
            </td>
        );
    };

    const CategoryCell = (props) => {
        return (
            <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
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
            <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
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
            <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
                <div className="count-cell">
                    {props.dataItem.count}
                </div>
            </td>
        );
    };

    const ReadOnlyCell = (props) => {
        return (
            <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
                <div className="variable-text-readonly">
                    {props.dataItem[props.field]}
                </div>
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

    const handleAddVariable = () => {
        setVariables(prev => {
            // 고유 ID 생성 (Key 충돌 방지)
            const newId = Date.now();

            // 'var_N' 형태의 고유한 시스템 문항 이름 생성
            let counter = 1;
            while (prev.some(v => v.sysName === `var_${counter}`)) {
                counter++;
            }
            const newName = `var_${counter}`;

            return [{
                id: newId,
                sysName: newName,
                name: newName,
                label: '',
                category: '',
                logic: '',
                count: '0 / 0',
                type: '범주형',
                isNew: true
            }, ...prev];
        });
    };

    const rowRender = (trElement, props) => {
        const isNew = props.dataItem.isNew;
        const trProps = {
            ...trElement.props,
            style: {
                ...trElement.props.style,
                backgroundColor: isNew ? '#e6f4ff' : trElement.props.style?.backgroundColor,
            }
        };
        return React.cloneElement(trElement, { ...trProps }, trElement.props.children);
    };



    return (
        <div className="variable-page" data-theme="data-dashboard">
            <DataHeader
                title="문항 관리"
                addButtonLabel="문항 추가"
                onAdd={handleAddVariable}
                saveButtonLabel="변경사항 저장"
                onSave={() => alert('변경사항 저장 클릭')}
                saveButtonDisabled={!hasChanges}
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
                                height: "100%",
                                rowRender: rowRender,
                                pageable: true,
                                total: variables.length,
                                skip: skip,
                                pageSize: pageSize,
                                onPageChange: pageChange

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
