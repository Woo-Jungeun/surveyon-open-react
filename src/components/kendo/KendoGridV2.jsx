import React, { useState } from "react";
import { Grid, GridColumn as Column, GridNoRecords } from "@progress/kendo-react-grid";
import PropTypes from "prop-types";
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown, Copy } from "lucide-react";

/**
 * H-SRT 전용 Smart Excel-Style Grid (Version 2)
 * 행 추가, 삭제, 드래그 이동, 인라인 편집 기능을 내장한 공통 컴포넌트입니다.
 */
const KendoGridV2 = (props) => {
    const {
        data = [],
        children,
        className = "",
        height = "100%",
        reorderable = false,
        addable = false,
        deletable = false,
        showNo = false,
        editField = "inEdit",
        newRowTemplate = {},
        copyable = false,
        duplicateRowTemplate,
        onDataChange,
        onRowClick,
        ...rest
    } = props;

    const [draggedItemIndex, setDraggedItemIndex] = useState(null);

    // --- 가상 스크롤 (Virtual Scrolling) 자체 지원 ---
    const isVirtual = rest.scrollable === 'virtual';
    const [skip, setSkip] = useState(0);
    const [take, setTake] = useState(200);

    const handlePageChange = (event) => {
        setSkip(event.page.skip);
        setTake(event.page.take);
    };

    // 가상 스크롤 사용 시 묶어줄 Grid Props
    const displayData = isVirtual ? data.slice(skip, skip + take) : data;
    const gridProps = isVirtual 
        ? { skip, take, total: data.length, onPageChange: handlePageChange, ...rest }
        : rest;

    // --- 내부 데이터 조작 로직 ---
    const handleReorder = (from, to) => {
        if (from === to || !onDataChange) return;
        const newData = [...data];
        const item = newData.splice(from, 1)[0];
        newData.splice(to, 0, item);
        onDataChange(newData);
    };

    const handleAdd = (idx) => {
        if (!onDataChange) return;
        const newData = [...data];
        const newRow = { ...newRowTemplate, [editField]: false };
        if (idx !== undefined && idx !== null) {
            newData.splice(idx + 1, 0, newRow);
        } else {
            newData.push(newRow);
        }
        onDataChange(newData);
    };

    const handleCopy = (idx) => {
        if (!onDataChange || idx === undefined || idx === null) return;
        const newData = [...data];
        const targetObj = newData[idx];
        const newRow = duplicateRowTemplate ? duplicateRowTemplate(targetObj) : { ...targetObj, [editField]: false };
        newData.splice(idx + 1, 0, newRow);
        onDataChange(newData);
    };

    const handleDelete = (idx) => {
        if (!onDataChange) return;
        const newData = [...data];
        newData.splice(idx, 1);
        onDataChange(newData);
    };

    const onItemChange = (e) => {
        if (!onDataChange) return;
        const newData = data.map(item =>
            item === e.dataItem ? { ...item, [e.field]: e.value } : item
        );
        onDataChange(newData);
    };

    // --- 내부 Row 렌더러 (드래그앤드롭) ---
    const internalRowRender = (trElement, trProps) => {
        if (!reorderable) return trElement;

        const index = trProps.dataIndex;
        const extendedProps = {
            ...trElement.props,
            draggable: true,
            onDragStart: (e) => {
                setDraggedItemIndex(index);
                e.dataTransfer.effectAllowed = "move";
                e.currentTarget.classList.add("dragging");
            },
            onDragEnd: (e) => {
                e.currentTarget.classList.remove("dragging");
                setDraggedItemIndex(null);
            },
            onDragOver: (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                
                if (y < rect.height / 2) {
                    e.currentTarget.classList.add("drag-over-top");
                    e.currentTarget.classList.remove("drag-over-bottom");
                } else {
                    e.currentTarget.classList.add("drag-over-bottom");
                    e.currentTarget.classList.remove("drag-over-top");
                }
            },
            onDragLeave: (e) => {
                e.currentTarget.classList.remove("drag-over-top");
                e.currentTarget.classList.remove("drag-over-bottom");
            },
            onDrop: (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("drag-over-top");
                e.currentTarget.classList.remove("drag-over-bottom");
                
                if (draggedItemIndex !== null) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    let targetIndex = index;
                    
                    if (y >= rect.height / 2) {
                        targetIndex += 1;
                    }
                    
                    if (draggedItemIndex < targetIndex) {
                        targetIndex -= 1;
                    }
                    
                    if (draggedItemIndex !== targetIndex) {
                        handleReorder(draggedItemIndex, targetIndex);
                    }
                }
            }
        };
        return React.cloneElement(trElement, { ...extendedProps }, trElement.props.children);
    };

    return (
        <Grid
            data={displayData}
            className={`dp-excel-grid-v2 ${className} ${reorderable ? 'reorderable' : ''}`}
            style={{ height }}
            onItemChange={onItemChange}
            editField={editField}
            onRowClick={onRowClick}
            rowRender={internalRowRender}
            {...gridProps}
        >
            <GridNoRecords>
                <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: "14px" }}>
                    <div style={{ marginBottom: addable ? '16px' : '0' }}>조회된 데이터가 없습니다.</div>
                    {addable && (
                        <button 
                            onClick={() => handleAdd()}
                            style={{ 
                                padding: '5px 16px', 
                                borderRadius: '4px', 
                                border: '1px solid #3b82f6', 
                                background: '#ffffff', 
                                color: '#3b82f6', 
                                cursor: 'pointer', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                fontSize: '13px',
                                fontWeight: '600'
                            }}
                        >
                            <Plus size={16} /> 새 항목 추가하기
                        </button>
                    )}
                </div>
            </GridNoRecords>

            {/* 순서 변경 컬럼 */}
            {reorderable && (
                <Column
                    title="순서 변경"
                    width="65px"
                    cell={(cellProps) => (
                        <td style={{ textAlign: 'center', padding: '0 4px', verticalAlign: 'middle' }}>
                            <div className="dp-grid-handle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <GripVertical size={16} />
                            </div>
                        </td>
                    )}
                />
            )}

            {/* 행 추가/복사 컬럼 */}
            {(addable || copyable) && (
                <Column
                    title={addable && copyable ? "추가/복사" : "추가"}
                    width={addable && copyable ? "75px" : "45px"}
                    headerClassName="k-text-center"
                    cell={(cellProps) => (
                        <td style={{ textAlign: 'center', padding: '0 4px', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '24px', width: '100%' }}>
                                {addable && (
                                    <button title="빈 행 추가" className="dp-grid-add-row-btn" onClick={() => handleAdd(cellProps.dataIndex)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', padding: 0, border: 'none', background: 'transparent' }}>
                                        <Plus size={18} color="#3b82f6" strokeWidth={3} />
                                    </button>
                                )}
                                {addable && copyable && (
                                    <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }} />
                                )}
                                {copyable && (
                                    <button title="현재 행 복사" className="dp-grid-copy-row-btn" onClick={() => handleCopy(cellProps.dataIndex)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', padding: 0, border: 'none', background: 'transparent' }}>
                                        <Copy size={15} color="#94a3b8" strokeWidth={2} />
                                    </button>
                                )}
                            </div>
                        </td>
                    )}
                />
            )}

            {/* 순번 컬럼 */}
            {showNo && (
                <Column
                    title="No"
                    width="45px"
                    cell={(cellProps) => (
                        <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600, padding: '0 4px', verticalAlign: 'middle' }}>
                            {cellProps.dataIndex + 1}
                        </td>
                    )}
                />
            )}

            {/* 사용자 정의 컬럼들 */}
            {children}

            {/* 삭제 버튼 컬럼 */}
            {deletable && (
                <Column
                    title="삭제"
                    width="50px"
                    cell={(cellProps) => (
                        <td style={{ textAlign: 'center', padding: '0 4px', verticalAlign: 'middle' }}>
                            <button className="dp-row-del-btn" onClick={() => handleDelete(cellProps.dataIndex)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '24px', padding: 0, border: 'none', background: 'transparent' }}>
                                <Trash2 size={16} color="#94a3b8" />
                            </button>
                        </td>
                    )}
                />
            )}
        </Grid>
    );
};

KendoGridV2.propTypes = {
    data: PropTypes.array,
    children: PropTypes.node,
    className: PropTypes.string,
    height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    reorderable: PropTypes.bool,
    addable: PropTypes.bool,
    deletable: PropTypes.bool,
    copyable: PropTypes.bool,
    showNo: PropTypes.bool,
    editField: PropTypes.string,
    newRowTemplate: PropTypes.object,
    duplicateRowTemplate: PropTypes.func,
    onDataChange: PropTypes.func,
    onRowClick: PropTypes.func
};

export default KendoGridV2;
export { Column as GridColumn };
