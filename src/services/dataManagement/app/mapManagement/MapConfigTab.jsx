import React, { useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { Plus, Trash2 } from 'lucide-react';
import { MapManagementContext, NUMERIC_FIELDS, recalcVariables } from './MapManagementUtils';

// ─────────────────────────────────────────────
// 셀 컴포넌트
// ─────────────────────────────────────────────

/** 텍스트 입력 셀 - 편집 중이면 textarea, 아니면 읽기 전용 div */
const InputCell = (props) => {
    const { setVariables, editingRowId } = useContext(MapManagementContext);
    const textareaRef = useRef(null);
    const { dataItem, field, style, className } = props;

    // textarea 높이를 내용에 맞게 자동 조정
    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [dataItem[field], editingRowId]);

    // blur 시점에 변경값 반영 (onChange가 아닌 blur로 처리해 렌더 최소화)
    const handleBlur = (e) => {
        const newValue = e.target.value;
        // 숫자 필드는 Number 변환, 그 외는 문자열 그대로
        const parsedValue = NUMERIC_FIELDS.includes(field) ? (Number(newValue) || 0) : newValue;

        if (dataItem[field] != parsedValue) { // != 로 타입 유연 비교 ("5" vs 5)
            setVariables(prev => {
                const updated = prev.map(v =>
                    v.id === dataItem.id ? { ...v, [field]: parsedValue } : v
                );
                // 자릿수 관련 필드 변경 시 전체 연쇄 재계산
                return NUMERIC_FIELDS.includes(field) ? recalcVariables(updated) : updated;
            });
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

/** 보기(카테고리) 셀 - 편집 중이면 '변경' 버튼 표시 */
const CategoryCell = (props) => {
    const { SetEditingCategoryPopupOpen, editingRowId } = useContext(MapManagementContext);
    const isEditing = props.dataItem.id === editingRowId || props.dataItem.isNew;

    return (
        <td style={{ ...props.style, verticalAlign: 'middle' }} className={props.className}>
            <div className="category-cell-container">
                <div
                    className="category-cell-content"
                    style={{
                        border: !isEditing ? 'none' : undefined,
                        background: !isEditing ? 'transparent' : undefined,
                        pointerEvents: !isEditing ? 'none' : undefined
                    }}
                >
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

const LogicCell = (props) => {
    const { setEditingLogicPopupOpen, editingRowId } = useContext(MapManagementContext);
    const { dataItem, style, className } = props;
    const isEditing = dataItem.id === editingRowId || dataItem.isNew;

    return (
        <td style={{ ...style, verticalAlign: 'middle', textAlign: 'center', padding: '4px 8px' }} className={className}>
            <div className={`logic-cell-wrapper ${dataItem.logic ? 'has-logic' : 'no-logic'}`}>
                {dataItem.logic && (
                    <span
                        className="logic-cell-text"
                        title={dataItem.logic}
                    >
                        {dataItem.logic}
                    </span>
                )}

                <button
                    type="button"
                    className="logic-cell-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditingLogicPopupOpen(dataItem);
                    }}
                    title="로직 편집"
                >
                    설정
                </button>
            </div>
        </td>
    );
};

/** 변수 유형 셀 - 편집 중이면 드롭다운, 아니면 읽기 전용 */
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

/** 체크박스 셀 - 상세 설정 ON이거나 편집 행이면 활성화 */
const CheckboxCell = (props) => {
    const { setVariables, editingRowId, isDetailed } = useContext(MapManagementContext);
    const { dataItem, field, style, className } = props;

    const handleChange = (e) => {
        const isChecked = e.target.checked;
        setVariables(prev => prev.map(v => v.id === dataItem.id ? { ...v, [field]: isChecked } : v));
    };

    // 상세 설정 ON이거나, 해당 행이 편집 중이거나, 신규 행이면 클릭 가능
    const isEditing = isDetailed || dataItem.id === editingRowId || dataItem.isNew;
    const isChecked = !!(dataItem[field]);

    return (
        <td style={{ ...style, textAlign: 'center', verticalAlign: 'middle' }} className={className}>
            <label className={`dm-checkbox-label ${isEditing ? '' : 'dm-checkbox-disabled'}`}>
                <input
                    type="checkbox"
                    className="dm-checkbox-input"
                    checked={isChecked}
                    onChange={handleChange}
                    disabled={!isEditing}
                />
                <span className="dm-checkbox-box" />
            </label>
        </td>
    );
};

/** 멀티라인 컬럼 헤더 (줄바꿈 지원) */
const multilineHeader = (props) => (
    <span style={{ display: 'block', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: '1.2', width: '100%' }}>
        {props.title}
    </span>
);

/** 읽기 전용 셀 - 박스 없이 텍스트만 표시 */
const ReadOnlyCell = (props) => (
    <td style={{ ...props.style, verticalAlign: 'middle', textAlign: 'center' }} className={props.className}>
        <span style={{ userSelect: 'none', color: 'inherit' }}>{props.dataItem[props.field]}</span>
    </td>
);

/** 행 추가 버튼 셀 */
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

/** 행 삭제 버튼 셀 */
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

/** 필드명에 따라 적절한 셀 컴포넌트 반환 */
const getCell = (field) => {
    switch (field) {
        case 'sysName':
        case 'startPos':
        case 'totalLen': return ReadOnlyCell;
        case 'name':
        case 'label':
        case 'minQuestions':
        case 'memo':
        case 'valLen':
        case 'valCnt':
        case 'etcOpen':
        case 'spssName': return InputCell;
        case 'category': return CategoryCell;
        case 'type': return TypeCell;
        case 'logic': return LogicCell;
        case 'multiValChange':
        case 'excludeOpenMerge':
        case 'verificationVar':
        case 'excludeOutput': return CheckboxCell;
        case 'add': return AddCell;
        case 'delete': return DeleteCell;
        default: return null;
    }
};

const MapConfigTab = ({
    variables,
    isDetailed,
    setIsDetailed,
    sort,
    filter,
    setSort,
    setFilter,
    skip,
    pageSize,
    pageChange,
    setEditingRowId
}) => {
    // ── 컬럼 구성 ──
    const mappingColumns = useMemo(() => isDetailed
        ? [
            { field: 'add', title: '+', width: '50px' },
            { field: 'id', title: 'no', width: '50px' },
            { field: 'sysName', title: '변수명', width: '120px' },
            { field: 'logic', title: '로직체크', width: '220px' },
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
            { field: 'id', title: 'no', width: '50px' },
            { field: 'sysName', title: '변수명', width: '85px' },
            { field: 'startPos', title: '시작\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'valLen', title: '보기\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'valCnt', title: '보기\n갯수', width: '85px', headerCell: multilineHeader },
            { field: 'totalLen', title: '총\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'etcOpen', title: '기타\n오픈정의', width: '100px', headerCell: multilineHeader },
            { field: 'logic', title: '로직체크', width: '150px' },
            { field: 'label', title: '레이블', minWidth: 50 },
            { field: 'decimal', title: '소수점\n자리수', width: '90px', headerCell: multilineHeader },
            { field: 'spssName', title: 'SPSS\n변수명', width: '100px', headerCell: multilineHeader },
            { field: 'type', title: '변수\n유형', width: '95px' },
            { field: 'minQuestions', title: '문항\n최소갯수', width: '100px', headerCell: multilineHeader },
            { field: 'memo', title: '메모', minWidth: 50 },
            { field: 'delete', title: '삭제', width: '80px' }
        ], [isDetailed]);

    const columnMenu = useCallback((props) => (
        <ExcelColumnMenu
            {...props}
            filter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
        />
    ), [filter, setFilter, setSort]);

    // ── Context Provider에서 사용하는 editingRowId/newRow 관리를 위한 rowRender ──
    const { editingRowId } = useContext(MapManagementContext);
    const rowRender = (trElement, props) => {
        const { dataItem } = props;
        const isEditing = dataItem.id === editingRowId;
        const isNew = dataItem.isNew;

        const trProps = {
            ...trElement.props,
            className: `${trElement.props.className} ${isEditing ? 'editing-row' : ''} ${isNew ? 'new-row' : ''}`.trim(),
            style: {
                ...trElement.props.style,
                borderLeft: isEditing ? '3px solid var(--dm-primary)' : trElement.props.style?.borderLeft,
            }
        };
        return React.cloneElement(trElement, { ...trProps }, trElement.props.children);
    };

    return (
        <>
            {/* 서브헤더: 전체 건수 + 상세 설정 토글 */}
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

            {/* MAP 구성 그리드 */}
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
                            rowRender,
                            pageable: true,
                            total: variables.length,
                            skip,
                            pageSize,
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
    );
};

export default MapConfigTab;
