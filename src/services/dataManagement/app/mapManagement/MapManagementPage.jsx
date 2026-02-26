import React, { useState, useEffect, useContext, useRef } from 'react';
import DataHeader from '@/services/dataStatus/components/DataHeader';
import MapManagementPageModal from './MapManagementPageModal';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { Checkbox } from "@progress/kendo-react-inputs";
import '../../../../assets/css/grid_vertical_borders.css';
import './MapManagementPage.css';
import { MapManagementPageApi } from './MapManagementPageApi';
import { modalContext } from "@/components/common/Modal.jsx";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { useSelector } from 'react-redux';
import { Plus, Trash2 } from 'lucide-react';

// Context for sharing state with grid cells to prevent unmount loops
const MapManagementContext = React.createContext(null);

// --- Stable Cell Components moved outside MapManagementPage ---

const InputCell = (props) => {
    const { setVariables, editingRowId } = useContext(MapManagementContext);
    const textareaRef = useRef(null);
    const { dataItem, field, style, className } = props;

    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [dataItem[field], editingRowId]);

    const handleBlur = (e) => {
        const newValue = e.target.value;
        if (dataItem[field] !== newValue) {
            setVariables(prev => prev.map(v =>
                v.id === dataItem.id ? { ...v, [field]: newValue } : v
            ));
        }
    };

    const isEditing = dataItem.id === editingRowId || dataItem.isNew;

    if (!isEditing) {
        return (
            <td style={{ ...style, verticalAlign: 'middle' }} className={className}>
                <div className="variable-text-readonly" style={{ background: 'transparent', border: 'none', pointerEvents: 'none' }}>
                    {dataItem[field]}
                </div>
            </td>
        );
    }

    return (
        <td style={{ ...style, verticalAlign: 'middle' }} className={className}>
            <textarea
                ref={textareaRef}
                defaultValue={dataItem[field]}
                className="variable-input"
                rows={1}
                onInput={adjustHeight}
                onBlur={handleBlur}
                autoFocus
            />
        </td>
    );
};

const CategoryCell = (props) => {
    const { SetEditingCategoryPopupOpen, editingRowId } = useContext(MapManagementContext);
    const isEditing = props.dataItem.id === editingRowId || props.dataItem.isNew;

    return (
        <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
            <div className="category-cell-container">
                <div className="category-cell-content" style={{ border: !isEditing ? 'none' : undefined, background: !isEditing ? 'transparent' : undefined, pointerEvents: !isEditing ? 'none' : undefined }}>
                    {props.dataItem.category}
                </div>
                {isEditing && (
                    <button
                        onClick={() => SetEditingCategoryPopupOpen(props.dataItem)}
                        className="category-edit-btn"
                    >
                        변경
                    </button>
                )}
            </div>
        </td>
    );
};

const TypeCell = (props) => {
    const { setVariables, editingRowId } = useContext(MapManagementContext);
    const { dataItem, style, className } = props;

    const handleChange = (e) => {
        const newType = e.target.value;
        setVariables(prev => prev.map(v => v.id === dataItem.id ? { ...v, type: newType } : v));
    };

    const typeOptions = ["Single", "Multi", "multi", "Dummy", "OPEN", "Open", "CUSTOM", "string", "numeric"];
    const isEditing = dataItem.id === editingRowId || dataItem.isNew;

    if (!isEditing) {
        return (
            <td style={{ ...style, verticalAlign: 'middle' }} className={className}>
                <div className="variable-text-readonly" style={{ background: 'transparent', border: 'none', pointerEvents: 'none' }}>
                    {dataItem.type}
                </div>
            </td>
        );
    }

    return (
        <td style={{ ...style, verticalAlign: 'middle' }} className={className}>
            <DropDownList
                data={typeOptions}
                value={dataItem.type}
                onChange={handleChange}
                style={{ width: '100%' }}
            />
        </td>
    );
};

const CheckboxCell = (props) => {
    const { setVariables, editingRowId } = useContext(MapManagementContext);
    const { dataItem, field, style, className } = props;

    const handleChange = (e) => {
        const isChecked = e.target.checked;
        setVariables(prev => prev.map(v => v.id === dataItem.id ? { ...v, [field]: isChecked } : v));
    };

    const isEditing = dataItem.id === editingRowId || dataItem.isNew;

    return (
        <td style={{ ...style, textAlign: 'center', verticalAlign: 'middle' }} className={className}>
            <Checkbox
                value={dataItem[field] || false}
                onChange={handleChange}
                disabled={!isEditing}
                className="dm-custom-checkbox"
                style={{ cursor: isEditing ? 'pointer' : 'default' }}
            />
        </td>
    );
};

const multilineHeader = (props) => {
    return (
        <span style={{
            display: 'block',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            lineHeight: '1.2',
            width: '100%'
        }}>
            {props.title}
        </span>
    );
};

const ReadOnlyCell = (props) => (
    <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
        <div className="variable-text-readonly" style={{ pointerEvents: 'none' }}>{props.dataItem[props.field]}</div>
    </td>
);

const CountCell = (props) => (
    <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
        <div className="count-cell">{props.dataItem.count}</div>
    </td>
);

const AddCell = (props) => {
    const { onAdd } = useContext(MapManagementContext);
    return (
        <td style={{ ...props.style, textAlign: 'center', verticalAlign: 'middle' }}>
            <button onClick={onAdd} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#16a34a' }}>
                <Plus size={18} />
            </button>
        </td>
    );
};

const DeleteCell = (props) => {
    const { onDelete } = useContext(MapManagementContext);
    return (
        <td style={{ ...props.style, textAlign: 'center', verticalAlign: 'middle' }}>
            <button
                onClick={() => onDelete(props.dataItem.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
                <Trash2 size={16} />
            </button>
        </td>
    );
};

const getCell = (field) => {
    switch (field) {
        case 'sysName': return ReadOnlyCell;
        case 'name':
        case 'label':
        case 'logic':
        case 'minQuestions':
        case 'memo':
        case 'startPos':
        case 'valLen':
        case 'valCnt':
        case 'totalLen':
        case 'etcOpen':
        case 'spssName': return InputCell;
        case 'category': return CategoryCell;
        case 'type': return TypeCell;
        case 'count': return CountCell;
        case 'multiValChange':
        case 'excludeOpenMerge':
        case 'verificationVar':
        case 'excludeOutput': return CheckboxCell;
        case 'add': return AddCell;
        case 'delete': return DeleteCell;
        default: return null;
    }
};

const MapManagementPage = () => {
    const { getMapVariables } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);
    const [variables, setVariables] = useState([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // Trigger for re-fetching

    const modal = useContext(modalContext);
    const loadingSpinner = useContext(loadingSpinnerContext);

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

        const editableFields = [
            'label', 'logic', 'decimal', 'spssName', 'type', 'memo',
            'multiValChange', 'minQuestions', 'excludeOpenMerge',
            'verificationVar', 'excludeOutput', 'startPos', 'valLen',
            'valCnt', 'totalLen', 'etcOpen'
        ];

        const isDifferent = JSON.stringify(variables.map(v => {
            const obj = { sysName: v.sysName };
            editableFields.forEach(f => obj[f] = v[f]);
            return obj;
        })) !== JSON.stringify(originalVariables.map(v => {
            const obj = { sysName: v.sysName };
            editableFields.forEach(f => obj[f] = v[f]);
            return obj;
        }));

        setHasChanges(isDifferent);
    }, [variables, originalVariables, isDataLoaded]);

    // Listen for page selection changes
    useEffect(() => {
        const handlePageSelected = () => {
            setRefreshKey(prev => prev + 1);
        };
        window.addEventListener("pageSelected", handlePageSelected);
        return () => window.removeEventListener("pageSelected", handlePageSelected);
    }, []);

    useEffect(() => {
        const fetchVariables = async () => {
            if (auth?.user?.userId) {
                const userId = auth.user.userId;
                const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');

                if (pn) {
                    try {
                        loadingSpinner.show();

                        const result = await getMapVariables.mutateAsync({ user: userId, pn: pn });

                        if (result?.variables) {
                            const transformedData = result.variables.map(item => {
                                // Format categories: "1=Label1, 2=Label2"
                                const categoryStr = (item.labels || [])
                                    .map(l => `${l.code}=${l.label}`)
                                    .join(', ');

                                return {
                                    id: item.id,
                                    sysName: item.cQuestionVariable || '',
                                    name: item.cQuestionVariable || '',
                                    label: item.label || '',
                                    type: item.type || 'Single',
                                    startPos: item.startPos || 0,
                                    valLen: item.codeLen || 0,
                                    valCnt: item.optCount || 0,
                                    totalLen: item.totalLen || 0,
                                    etcOpen: item.openRule || '',
                                    logic: item.logicCheck || '',
                                    spssName: item.spssName || '',
                                    decimal: item.decimalPlaces || 0,
                                    memo: item.memo || '',
                                    multiValChange: !!item.multiChange,
                                    minQuestions: item.minAnswer || 0,
                                    excludeOpenMerge: !!item.noOpenMerge,
                                    verificationVar: !!item.isValid,
                                    excludeOutput: !!item.noOutput,
                                    category: categoryStr,
                                    labels: item.labels || []
                                };
                            });
                            setVariables(transformedData);
                            setOriginalVariables(JSON.parse(JSON.stringify(transformedData))); // Deep copy
                            setIsDataLoaded(true);
                        } else if (result?.success === false || result?.status === 404 || result?.status === 400 || result?.status === 500) {
                            modal.showErrorAlert("에러", result?.message || "프로젝트 매핑 정보를 조회할 수 없습니다.");
                            setIsDataLoaded(true);
                        } else {
                            // 데이터가 비어있거나, 응답 형식이 다를 때 처리
                            setVariables([]);
                            setOriginalVariables([]);
                            setIsDataLoaded(true);
                        }
                        loadingSpinner.hide();
                    } catch (error) {
                        console.error("Variable Fetch Error:", error);
                        if (error.response && error.response.status === 404) {
                            modal.showErrorAlert("알림", "리소스를 찾을 수 없습니다. (프로젝트를 찾을 수 없음)");
                        } else if (error.response && error.response.status === 400) {
                            modal.showErrorAlert("알림", "잘못된 요청입니다.");
                        } else {
                            modal.showErrorAlert("에러", "맵 목록 조회 중 오류가 발생했습니다.");
                        }
                        setIsDataLoaded(true);
                        loadingSpinner.hide();
                    }
                } else {
                    // pn이 없는 경우
                    setIsDataLoaded(true);
                }
            }
        };

        fetchVariables();
    }, [auth?.user?.userId, refreshKey]);

    const [editingCategoryPopupOpen, SetEditingCategoryPopupOpen] = useState(null); // 보기 변경 팝업 open
    const [sort, setSort] = useState([]);
    const [filter, setFilter] = useState(null);
    const [skip, setSkip] = useState(0);
    const [pageSize, setPageSize] = useState(100);

    const pageChange = (event) => {
        setSkip(event.page.skip);
        setPageSize(event.page.take);
    };

    const handleCategorySave = (id, newCategoryStr) => {
        setVariables(variables.map(v => v.id === id ? { ...v, category: newCategoryStr } : v));
        SetEditingCategoryPopupOpen(null);
    };

    const columnMenu = (props) => (
        <ExcelColumnMenu
            {...props}
            filter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
        />
    );

    const handleDeleteVariable = (id) => {
        setVariables(prev => prev.filter(v => v.id !== id));
    };

    const handleAddVariable = () => {
        setVariables(prev => {
            // 고유 ID 생성 (Key 충돌 방지)
            const newId = Date.now();

            // 'var_N' 형태의 고유한 시스템 맵 이름 생성
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
        const { dataItem } = props;
        const isEditing = dataItem.id === editingRowId;
        const isNew = dataItem.isNew;

        const trProps = {
            ...trElement.props,
            className: `${trElement.props.className} ${isEditing ? 'editing-row' : ''} ${isNew ? 'new-row' : ''}`.trim(),
            style: {
                ...trElement.props.style,
                // Still keep this for immediate JS-side override
                borderLeft: isEditing ? '3px solid var(--dm-primary)' : trElement.props.style?.borderLeft,
            }
        };
        return React.cloneElement(trElement, { ...trProps }, trElement.props.children);
    };

    const [activeTab, setActiveTab] = useState('mapping'); // 'mapping' | 'category'
    const [isDetailed, setIsDetailed] = useState(false);
    const [selectedVariable, setSelectedVariable] = useState(null);
    const [editingRowId, setEditingRowId] = useState(null);

    // Initial variable selection for category tab
    useEffect(() => {
        if (activeTab === 'category' && variables.length > 0 && !selectedVariable) {
            setSelectedVariable(variables[0]);
        }
    }, [activeTab, variables]);

    const handleSave = () => {
        modal.showConfirm("알림", "변경사항을 저장하시겠습니까?", () => {
            alert('저장되었습니다.');
        });
    };

    // Derived columns for MAP 구성 based on isDetailed
    const mappingColumns = isDetailed
        ? [
            { field: 'add', title: '+', width: '50px' },
            { field: 'id', title: '#', width: '50px' },
            { field: 'sysName', title: '변수명', width: '120px' },
            { field: 'logic', title: '로직체크', width: '120px' },
            { field: 'label', title: '레이블', width: '250px' },
            { field: 'decimal', title: '소수점\n자리수', width: '100px', headerCell: multilineHeader },
            { field: 'spssName', title: 'SPSS\n변수명', width: '120px', headerCell: multilineHeader },
            { field: 'type', title: '변수 유형', width: '120px' },
            { field: 'memo', title: '메모', minWidth: 200 },
            { field: 'multiValChange', title: '멀티값\n변경', width: '100px' },
            { field: 'excludeOpenMerge', title: '오픈머지\n제외', width: '100px' },
            { field: 'verificationVar', title: '검증문항', width: '100px' },
            { field: 'excludeOutput', title: '출력제외', width: '100px' },
            { field: 'delete', title: '삭제', width: '80px' }
        ]
        : [
            { field: 'add', title: '+', width: '45px' },
            { field: 'id', title: '#', width: '50px' },
            { field: 'sysName', title: '변수명', width: '85px' },
            { field: 'startPos', title: '시작\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'valLen', title: '보기\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'valCnt', title: '보기\n갯수', width: '85px', headerCell: multilineHeader },
            { field: 'totalLen', title: '총\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'etcOpen', title: '기타\n오픈정의', width: '100px', headerCell: multilineHeader },
            { field: 'logic', title: '로직\n체크', width: '95px' },
            { field: 'label', title: '레이블', minWidth: 50 },
            { field: 'decimal', title: '소수점\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'spssName', title: 'SPSS\n변수명', width: '100px', headerCell: multilineHeader },
            { field: 'type', title: '변수\n유형', width: '95px' },
            { field: 'minQuestions', title: '문항\n최소갯수', width: '100px', headerCell: multilineHeader },
            { field: 'memo', title: '메모', minWidth: 50 },
            { field: 'delete', title: '삭제', width: '80px' }
        ];

    return (
        <MapManagementContext.Provider value={{
            variables,
            setVariables,
            editingRowId,
            setEditingRowId,
            SetEditingCategoryPopupOpen,
            onAdd: handleAddVariable,
            onDelete: handleDeleteVariable
        }}>
            <div className="variable-page" data-theme="data-management">
                <DataHeader
                    title="맵 관리"
                    addButtonLabel={activeTab === 'mapping' ? "맵 추가" : "보기 추가"}
                    onAdd={activeTab === 'mapping' ? handleAddVariable : () => alert('보기 추가')}
                    saveButtonLabel="변경사항 저장"
                    onSave={handleSave}
                    saveButtonDisabled={!hasChanges && activeTab === 'mapping'}
                />

                <div className="variable-page-content">
                    <div className="tab-container">
                        <button
                            className={`tab-btn ${activeTab === 'mapping' ? 'active' : ''}`}
                            onClick={() => setActiveTab('mapping')}
                        >
                            MAP 구성
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'category' ? 'active' : ''}`}
                            onClick={() => setActiveTab('category')}
                        >
                            보기 레이블
                        </button>
                    </div>

                    {activeTab === 'mapping' ? (
                        <>
                            <div className="map-subheader">
                                <div className="map-stats">
                                    <span className="stat-item">전체 <strong>{variables.length}</strong> 건</span>
                                </div>
                                <div className="map-controls">
                                    <span className="grid-guide"><span className="guide-icon">💡</span> 셀 클릭 편집 | '+': 행 추가 | 'Trash': 삭제 | 가로/세로 스크롤 시 고정</span>
                                    <div className="toggle-wrapper">
                                        <span className="toggle-label">상세 설정</span>
                                        <label className="switch">
                                            <input type="checkbox" checked={isDetailed} onChange={() => setIsDetailed(!isDetailed)} />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
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
                                            onPageChange: pageChange,
                                            onRowClick: (e) => setEditingRowId(e.dataItem.id)
                                        }}
                                    >
                                        {mappingColumns.map((c) => (
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
                        </>
                    ) : (
                        <div className="category-label-layout">
                            <div className="variable-sidebar">
                                <div className="sidebar-header-box">
                                    <h3>변수 목록</h3>
                                    <div className="search-box">
                                        <input type="text" placeholder="변수 검색..." />
                                    </div>
                                </div>
                                <div className="variable-list">
                                    {variables.map(v => (
                                        <div
                                            key={v.id}
                                            className={`variable-item ${selectedVariable?.id === v.id ? 'active' : ''}`}
                                            onClick={() => setSelectedVariable(v)}
                                        >
                                            <div className="v-name">{v.sysName}</div>
                                            <div className="v-label">{v.label || '레이블 없음'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="category-detail-content">
                                <div className="detail-header">
                                    <div className="v-info-title">
                                        /{selectedVariable?.sysName} <span className="v-info-label">{selectedVariable?.label}</span>
                                    </div>
                                    <button className="add-value-btn" onClick={() => SetEditingCategoryPopupOpen(selectedVariable)}>
                                        <Plus size={14} /> 값 추가
                                    </button>
                                </div>
                                <div className="category-grid-container">
                                    <div className="cmn_grid singlehead">
                                        {/* Mock Category Grid */}
                                        <KendoGrid
                                            parentProps={{
                                                data: selectedVariable?.labels?.map((l, idx) => ({
                                                    ...l,
                                                    rowNo: idx + 1
                                                })) || [],
                                                height: "100%",
                                            }}
                                        >
                                            <Column field="rowNo" title="#" width="60px" />
                                            <Column field="code" title="코드" width="100px" />
                                            <Column field="label" title="레이블" />
                                            <Column field="delete" title="삭제" width="80px" cell={(props) => (
                                                <td style={{ textAlign: 'center' }}>
                                                    <button style={{ border: 'none', background: 'transparent' }}>
                                                        <Trash2 size={16} color="#64748b" />
                                                    </button>
                                                </td>
                                            )} />
                                        </KendoGrid>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Category Edit Modal */}
                {editingCategoryPopupOpen && (
                    <MapManagementPageModal
                        variable={editingCategoryPopupOpen}
                        onClose={() => SetEditingCategoryPopupOpen(null)}
                        onSave={handleCategorySave}
                    />
                )}
            </div>
        </MapManagementContext.Provider>
    );
};

export default MapManagementPage;
