import React, { useContext, useRef, useEffect, useCallback, useMemo, memo, useState } from 'react';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import ExcelColumnMenu from '../../../../components/common/grid/ExcelColumnMenu';
import { DropDownList } from "@progress/kendo-react-dropdowns";
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useSelector } from 'react-redux';
import { modalContext } from "@/components/common/Modal.jsx";
import { MapManagementPageApi } from './MapManagementPageApi';
import { MapManagementContext, NUMERIC_FIELDS, recalcVariables } from './MapManagementUtils';

/** 행 드래그 핸들 셀 */
const CustomReLabelHeaderCell = (props) => {
    const modal = useContext(modalContext);
    const { generateRelabels } = MapManagementPageApi();
    const auth = useSelector((store) => store.auth);
    const { refreshData } = useContext(MapManagementContext);

    const handleSubmit = async () => {
        const pn = sessionStorage.getItem('merge_pn') || sessionStorage.getItem('projectnum');
        const userId = auth?.user?.userId || '';

        if (!pn) {
            modal.showErrorAlert("알림", "프로젝트 정보를 찾을 수 없습니다.");
            return;
        }

        const payload = {
            pn,
            overwrite: true,
            language: 'ko',
            user: userId
        };

        try {
            await modal.showConfirm("알림", "표제목 Re-Label을 진행하시겠습니까? \n(기존 표제목이 모두 덮어씌워질 수 있습니다.)", {
                btns: [
                    { title: "취소", click: () => { } },
                    {
                        title: "진행",
                        click: async () => {
                            try {
                                const res = await generateRelabels.mutateAsync(payload);
                                if (res?.success === '777' || res?.success === 777) {
                                    if (res?.resultjson && res.resultjson.processedCount !== undefined) {
                                        await modal.showAlert("완료", `${res?.message || 'AI 요약본이 매핑되었습니다.'}\n(처리된 문항 건수: ${res.resultjson.processedCount}건)`);
                                    } else {
                                        await modal.showAlert("완료", res?.message || "완료되었습니다.");
                                    }
                                    if (refreshData) refreshData();
                                } else {
                                    console.warn("Re-Label Not 777:", res);
                                    if (res?.message) {
                                        await modal.showAlert("알림", res.message);
                                    }
                                }
                            } catch (err) {
                                console.error(err);
                            }
                        }
                    }
                ]
            });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingTop: '4px', paddingBottom: '4px' }}>
            <span style={{ fontSize: '12px', lineHeight: '1' }}>표제목</span>
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #059669',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    color: '#059669',
                    fontSize: '11px',
                    lineHeight: '1.1',
                    background: '#fff',
                    cursor: 'pointer',
                    letterSpacing: '-0.3px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    whiteSpace: 'nowrap'
                }}
                title="표제목 자동생성"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                }}
            >
                자동생성
            </span>
        </div>
    );
};

const DragCell = (props) => {
    const { moveVariable, variables } = useContext(MapManagementContext);
    const { dataItem } = props;
    const index = variables.findIndex(v => v.id === dataItem.id);

    const handleDragStart = (e) => {
        e.dataTransfer.setData("fromIndex", index.toString());
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData("fromIndex"), 10);
        if (!isNaN(fromIndex) && fromIndex !== index) {
            moveVariable(fromIndex, index);
        }
    };

    return (
        <td
            style={{ ...props.style, textAlign: 'center', verticalAlign: 'middle', cursor: 'grab' }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                draggable
                onDragStart={handleDragStart}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
            >
                <GripVertical size={16} color="#999" />
            </div>
        </td>
    );
};

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
        let parsedValue = NUMERIC_FIELDS.includes(field) ? (Number(newValue) || 0) : newValue;

        // 분석제외코드(excludeCode)는 모든 띄어쓰기, 줄바꿈 강제 제거
        if (field === 'excludeCode' && typeof parsedValue === 'string') {
            parsedValue = parsedValue.replace(/\s+/g, '');
        }

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
const CategoryCell = memo((props) => {
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
});

const LogicCell = (props) => {
    const { setEditingLogicPopupOpen, editingRowId } = useContext(MapManagementContext);
    const { dataItem, style, className } = props;
    const isEditing = dataItem.id === editingRowId || dataItem.isNew;

    return (
        <td style={{ ...style, verticalAlign: 'middle', padding: 0 }} className={className}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', height: '100%', padding: '8px 4px', boxSizing: 'border-box' }}>
                <div style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#4b5563', fontSize: '12px', textAlign: 'left', lineHeight: '1.4' }}>
                    {dataItem.logic}
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditingLogicPopupOpen(dataItem);
                    }}
                    title="로직 편집"
                    style={{
                        backgroundColor: '#fff',
                        color: '#059669',
                        border: '1px solid #059669',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        flexShrink: 0
                    }}
                >
                    설정
                </button>
            </div>
        </td>
    );
};

let isDraggingTypeCell = false;
let dragStartId = null;
let dragLastEnteredId = null;
let typeDragJustEnded = false;
let globalSetEditingRowId = null;
const dragSelectedIds = new Set();

window.addEventListener('pointerdown', () => {
    typeDragJustEnded = false;
}, { capture: true });

const handleGlobalPointerUp = () => {
    if (isDraggingTypeCell) {
        typeDragJustEnded = true;
        // 브라우저 텍스트 드래그를 막느라 e.preventDefault()를 사용했기 때문에 기본 click 이벤트가 발생하지 않습니다.
        // 강제로 마지막 통과한 행을 편집 모드(드롭다운 오픈 대상)로 진입시킵니다.
        if (globalSetEditingRowId !== null && dragLastEnteredId !== null) {
            globalSetEditingRowId(dragLastEnteredId);
        }
    }
    isDraggingTypeCell = false;
    dragStartId = null;
    dragLastEnteredId = null;
};
window.addEventListener('mouseup', handleGlobalPointerUp);
window.addEventListener('pointerup', handleGlobalPointerUp);

const INLINE_STYLE = `
.type-cell-selected > div {
    background-color: #d1fae5 !important;
    color: #065f46 !important;
    border: 1px solid #10b981 !important;
}
.dm-dropdown-popup .k-list-item {
    min-height: 28px !important;
    padding: 2px 8px !important;
}
.dm-dropdown-popup .k-list-item-text {
    font-size: 13px !important;
    line-height: 1.2 !important;
}
.dm-type-dropdown, .dm-type-dropdown .k-input-inner, .dm-type-dropdown .k-input-value-text {
    font-size: 13px !important;
}
.dm-type-dropdown .k-input-inner {
    padding: 2px 8px !important;
}
.dm-type-cell .variable-text-readonly {
    font-size: 13px !important;
}
`;
document.head.insertAdjacentHTML('beforeend', `<style>${INLINE_STYLE}</style>`);

/** 변수 유형 셀 - 편집 중이면 드롭다운, 아니면 읽기 전용 (초고속 드래그 다중선택 지원) */
const TypeCell = memo((props) => {
    const { setVariables, editingRowId, setEditingRowId } = useContext(MapManagementContext);
    globalSetEditingRowId = setEditingRowId;
    const { dataItem, style, className } = props;
    const isCustom = String(dataItem.type || '').toLowerCase() === 'custom';
    const cellStyle = {
        ...style,
        verticalAlign: 'middle',
        backgroundColor: isCustom ? '#FFF9C4' : undefined,
        userSelect: 'none'
    };

    const isEditing = dataItem.id === editingRowId || dataItem.isNew;
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isEditing && typeDragJustEnded) {
            // React 렌더링 + Kendo 내부 포커스 이벤트를 충분히 기다린 후 안정적으로 열기
            const timer = setTimeout(() => {
                setIsOpen(true);
                // 연 이후에는 재실행 방지를 위해 flag 해제
                typeDragJustEnded = false;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isEditing]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    const handleChange = (e) => {
        setIsOpen(false);
        const newType = String(e.target.value).toLowerCase();
        setVariables(prev => prev.map(v => {
            const isTarget = v.id === dataItem.id || dragSelectedIds.has(v.id) || dragSelectedIds.has(String(v.id));
            if (isTarget) {
                const updated = { ...v, type: newType };
                if (newType === 'custom') {
                    updated.isBaked = false;
                }
                return updated;
            }
            return v;
        }));
        // 변경 완료 후 드래그 선택 리셋
        dragSelectedIds.clear();
        dragStartId = null;
        dragLastEnteredId = null;
        document.querySelectorAll('.type-cell-selected').forEach(el => el.classList.remove('type-cell-selected'));
    };

    const typeOptions = ["single", "multi", "rank", "minrank", "maxrank", "scale", "open(문자)", "open(숫자)", "dummy", "custom"];

    const handlePointerDown = (e) => {
        if (!isEditing) {
            e.preventDefault();
            isDraggingTypeCell = true;
            dragStartId = dataItem.id;
            dragLastEnteredId = dataItem.id;
            
            dragSelectedIds.clear();
            document.querySelectorAll('.type-cell-selected').forEach(el => el.classList.remove('type-cell-selected'));
            dragSelectedIds.add(dataItem.id);
            e.currentTarget.classList.add('type-cell-selected');
        }
    };

    const handlePointerEnter = (e) => {
        if (isDraggingTypeCell && dragStartId && !isEditing) {
            dragLastEnteredId = dataItem.id;
            const cells = Array.from(document.querySelectorAll('td.dm-type-cell'));
            const startIndex = cells.findIndex(c => c.getAttribute('data-row-id') == dragStartId);
            const currentIndex = cells.findIndex(c => c.getAttribute('data-row-id') == dataItem.id);
            
            if (startIndex !== -1 && currentIndex !== -1) {
                const min = Math.min(startIndex, currentIndex);
                const max = Math.max(startIndex, currentIndex);
                
                document.querySelectorAll('.type-cell-selected').forEach(el => el.classList.remove('type-cell-selected'));
                dragSelectedIds.clear();
                
                for (let i = min; i <= max; i++) {
                    const targetCell = cells[i];
                    targetCell.classList.add('type-cell-selected');
                    const rowIdStr = targetCell.getAttribute('data-row-id');
                    dragSelectedIds.add(Number(rowIdStr));
                    dragSelectedIds.add(rowIdStr); 
                }
            }
        }
    };
    
    if (!isEditing) {
        return (
            <td 
                style={{ ...cellStyle, cursor: 'cell' }} 
                className={`${className || ''} dm-type-cell`}
                data-row-id={dataItem.id}
                onPointerDown={handlePointerDown}
                onPointerEnter={handlePointerEnter}
            >
                <div className="variable-text-readonly" style={{ background: 'transparent', border: '1px solid transparent', pointerEvents: 'none' }}>
                    {dataItem.type}
                </div>
            </td>
        );
    }

    return (
        <td style={cellStyle} className={className}>
            <DropDownList
                data={typeOptions}
                value={dataItem.type}
                onChange={handleChange}
                opened={isOpen}
                onOpen={handleOpen}
                onClose={handleClose}
                style={{ width: '100%' }}
                className="dm-type-dropdown"
                popupSettings={{ className: 'dm-dropdown-popup' }}
            />
        </td>
    );
});

/** 체크박스 셀 - 상세 설정 ON이거나 편집 행이면 활성화 */
const CheckboxCell = memo((props) => {
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
});


/** 읽기 전용 셀 - 박스 없이 텍스트만 표시 (그리드 기본 글씨 크기와 통일) */
const ReadOnlyCell = (props) => (
    <td style={{ ...props.style, verticalAlign: 'middle', textAlign: 'center' }} className={props.className}>
        <span style={{ userSelect: 'none', color: '#475569', fontSize: '13px', fontWeight: 500 }}>{props.dataItem[props.field]}</span>
    </td>
);

/** 행 추가 버튼 셀 */
const AddCell = (props) => {
    const { onAdd } = useContext(MapManagementContext);
    return (
        <td style={{ ...props.style, textAlign: 'center', verticalAlign: 'middle' }}>
            <button onClick={() => onAdd(props.dataItem.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#16a34a' }}>
                <Plus size={18} />
            </button>
        </td>
    );
};

/** 행 체크박스 셀 */
const RowSelectCell = (props) => {
    const { selectedIds, setSelectedIds } = useContext(MapManagementContext);
    const id = props.dataItem.id;
    const checked = selectedIds?.has(id) ?? false;

    const handleChange = (e) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <td style={{ ...props.style, textAlign: 'center', verticalAlign: 'middle', padding: 0 }}
            onClick={e => e.stopPropagation()}
        >
            <label className="dm-checkbox-label">
                <input
                    type="checkbox"
                    className="dm-checkbox-input"
                    checked={checked}
                    onChange={handleChange}
                />
                <span className="dm-checkbox-box" />
            </label>
        </td>
    );
};

/** 헤더 전체 체크박스 */
const HeaderCheckboxCell = ({ allIds, style, className }) => {
    const { selectedIds, setSelectedIds } = useContext(MapManagementContext);
    const safeSelected = selectedIds ?? new Set();
    const allChecked = allIds.length > 0 && allIds.every(id => safeSelected.has(id));
    const someChecked = allIds.some(id => safeSelected.has(id));

    const handleChange = () => {
        setSelectedIds(() => {
            if (allChecked) return new Set();
            return new Set(allIds);
        });
    };

    return (
        <th style={{ ...style, textAlign: 'center', verticalAlign: 'middle', padding: 0 }} className={className}>
            <label className="dm-checkbox-label">
                <input
                    type="checkbox"
                    className="dm-checkbox-input"
                    checked={allChecked}
                    ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                    onChange={handleChange}
                />
                <span className="dm-checkbox-box" />
            </label>
        </th>
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
        case 'drag': return DragCell;
        case 'sysName':
        case 'startPos':
        case 'totalLen': return ReadOnlyCell;
        case 'name':
        case 'label':
        case 'reLabel':
        case 'excludeCode':
        case 'minQuestions':
        case 'memo':
        case 'valLen':
        case 'valCnt':
        case 'decimal':
        case 'etcOpen':
        case 'spssName': return InputCell;
        case 'category': return CategoryCell;
        case 'type': return TypeCell;
        case 'logic': return LogicCell;
        case 'multiValChange':
        case 'excludeOpenMerge':
        case 'verificationVar':
        case 'excludeOutput': return CheckboxCell;
        case 'checkbox': return RowSelectCell;
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
    const { variables: ctxVars, setVariables, editingRowId } = useContext(MapManagementContext);
    const auth = useSelector((store) => store.auth);
    const projectUserGroup = sessionStorage.getItem("usergroup") || "";
    const isResearcher = (auth?.user?.userAuth || []).includes("연구원") || projectUserGroup.includes("연구원");
    const allIds = useMemo(() => (ctxVars || []).map(v => v.id), [ctxVars]);

    // ── Grid Props & 상태 최적화 ──
    const bakedSelectedState = useMemo(() =>
        (ctxVars || []).reduce((obj, v) => ({ ...obj, [v.id]: v.sysName === 'pid' ? true : !!v.isBaked }), {}),
        [ctxVars]);

    const handleBakedSelectedChange = useCallback((state) => {
        setVariables(prev => prev.map(v => ({ ...v, isBaked: v.sysName === 'pid' ? true : !!state[v.id] })));
    }, [setVariables]);

    const isItemSelectable = useCallback((item) => item?.sysName !== 'pid' && String(item?.type || '').toLowerCase() !== 'custom', []);

    const columnMenu = useCallback((props) => (
        <ExcelColumnMenu
            {...props}
            filter={filter}
            onFilterChange={setFilter}
            onSortChange={setSort}
        />
    ), [filter, setFilter, setSort]);

    const rowRender = useCallback((trElement, props) => {
        const { dataItem } = props;
        const isEditing = dataItem.id === editingRowId;
        const isNew = dataItem.isNew;

        const baseClass = (trElement.props.className || "")
            .replace(/\bk-selected\b/g, "")
            .replace(/\bk-state-selected\b/g, "");

        const trProps = {
            ...trElement.props,
            className: `${baseClass} ${isEditing ? 'editing-row' : ''} ${isNew ? 'new-row' : ''}`.trim(),
            style: {
                ...trElement.props.style,
                borderLeft: isEditing ? '3px solid var(--dm-primary)' : trElement.props.style?.borderLeft,
            }
        };
        return React.cloneElement(trElement, { ...trProps }, trElement.props.children);
    }, [editingRowId]);

    const handlePageChange = useCallback((e) => {
        if (pageChange) {
            pageChange(e);
        }
        // 페이지 변경 시 스크롤 맨 위로 이동
        const gridContent = document.querySelector('.variable-page-card .k-grid-content');
        if (gridContent) {
            gridContent.scrollTop = 0;
        }
    }, [pageChange]);

    const gridProps = useMemo(() => ({
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
        onPageChange: handlePageChange,
        onRowClick: (e) => setEditingRowId(e.dataItem.id),
        reorderable: true,
        multiSelect: true,
        selectedField: "isBaked",
        selectedState: bakedSelectedState,
        setSelectedState: handleBakedSelectedChange,
        linkRowClickToSelection: false,
        selectionHeaderTitle: "SRT\n이관",
        selectionColumnAfterField: (isDetailed || isResearcher) ? "reLabel" : "label",
        selectionColumnWidth: "60px",
        selectionHeaderFlexDirection: "column",
        isItemSelectable,
        useCustomCheckbox: true
    }), [
        variables, sort, filter, setSort, setFilter, rowRender,
        skip, pageSize, handlePageChange, setEditingRowId,
        bakedSelectedState, handleBakedSelectedChange, isItemSelectable, isResearcher, isDetailed
    ]);

    const mappingColumns = useMemo(() => {
        const commonPrefix = [
            { field: 'drag', title: '순서\n변경', width: '50px', cell: DragCell },
            { field: 'add', title: '추가', width: '50px' },
            // { field: 'id', title: 'no', width: '50px' },
            { field: 'sysName', title: '변수명', width: (isDetailed || isResearcher) ? '100px' : '100px' },
        ];

        if (isResearcher) {
            return [
                ...commonPrefix,
                { field: 'logic', title: '로직체크', width: '180px' },
                { field: 'label', title: '문항', minWidth: 250 },
                { field: 'reLabel', title: '표제목', width: '200px', headerCell: CustomReLabelHeaderCell },
                { field: 'spssName', title: 'SPSS\n변수명', width: '90px' },
                { field: 'type', title: '변수 유형', width: '140px' },
                { field: 'memo', title: '메모', minWidth: 120 },
                { field: 'delete', title: '삭제', width: '50px' }
            ];
        }

        if (isDetailed) {
            return [
                ...commonPrefix,
                { field: 'logic', title: '로직체크', width: '110px' },
                { field: 'label', title: '문항', width: '120px' },
                { field: 'reLabel', title: '표제목', width: '120px', headerCell: CustomReLabelHeaderCell },
                { field: 'excludeCode', title: '분석제외\n코드', width: '90px' },
                { field: 'decimal', title: '소수점\n자리수', width: '75px' },
                { field: 'spssName', title: 'SPSS\n변수명', width: '90px' },
                { field: 'type', title: '변수 유형', width: '100px' },
                { field: 'minQuestions', title: '문항\n최소갯수', width: '80px' },
                { field: 'etcOpen', title: '기타\n오픈정의', width: '80px' },
                { field: 'multiValChange', title: '멀티값\n변경', width: '75px' },
                { field: 'excludeOpenMerge', title: '오픈머지\n제외', width: '80px' },
                { field: 'verificationVar', title: '검증\n문항', width: '70px' },
                { field: 'excludeOutput', title: '출력\n제외', width: '70px' },
                { field: 'memo', title: '메모', minWidth: 120 },
                { field: 'delete', title: '삭제', width: '50px' }
            ];
        }

        return [
            ...commonPrefix,
            { field: 'startPos', title: '시작\n자리수', width: '90px' },
            { field: 'valLen', title: '보기\n자리수', width: '90px' },
            { field: 'valCnt', title: '보기\n갯수', width: '85px' },
            { field: 'totalLen', title: '총\n자리수', width: '90px' },
            { field: 'etcOpen', title: '기타\n오픈정의', width: '100px' },
            { field: 'logic', title: '로직체크', width: '150px' },
            { field: 'label', title: '문항', minWidth: 50 },
            { field: 'decimal', title: '소수점\n자리수', width: '90px' },
            // { field: 'spssName', title: 'SPSS\n변수명', width: '100px' },
            { field: 'type', title: '변수\n유형', width: '140px' },
            { field: 'minQuestions', title: '문항\n최소갯수', width: '100px' },
            { field: 'delete', title: '삭제', width: '50px' }
        ];
    }, [isDetailed, isResearcher]);

    return (
        <>
            <div className="map-subheader">
                <div className="map-stats">
                    <span className="stat-item">전체 <strong>{variables.length}</strong> 건</span>
                </div>
                <div className="map-controls">
                    {/* <span className="grid-guide"><span className="guide-icon">💡</span> 셀 클릭 편집 | '+': 행 추가 | 'Trash': 삭제 | 가로/세로 스크롤 시 고정</span> */}
                    {!isResearcher && (
                        <div className="toggle-wrapper">
                            <span className="toggle-label">상세 설정</span>
                            <label className="switch">
                                <input type="checkbox" checked={isDetailed} onChange={() => setIsDetailed(!isDetailed)} />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="variable-page-card">
                <div className="cmn_grid singlehead">
                    <KendoGrid parentProps={gridProps}>
                        {mappingColumns.map((c) => {
                            const isUtilityColumn = ['drag', 'add', 'logic', 'delete'].includes(c.field); //columnMenu 전부 제거
                            return (
                                <Column
                                    key={c.field}
                                    field={c.field}
                                    title={c.title}
                                    width={c.width}
                                    minWidth={c.minWidth}
                                    // columnMenu={isUtilityColumn ? undefined : columnMenu}
                                    columnMenu={undefined}
                                    cell={getCell(c.field)}
                                    headerCell={c.headerCell}
                                    headerClassName="k-header-center variable-column-header"
                                // sortable={!isUtilityColumn}
                                // filterable={!isUtilityColumn}
                                />
                            );
                        })}
                    </KendoGrid>
                </div>
            </div>
        </>
    );
};

export default MapConfigTab;
