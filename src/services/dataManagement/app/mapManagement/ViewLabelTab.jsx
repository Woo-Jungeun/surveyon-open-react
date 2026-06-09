import React, { useRef, useState, useContext, useEffect } from 'react';
import KendoGridV2 from '../../../../components/kendo/KendoGridV2';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { modalContext } from "@/components/common/Modal.jsx";
import { MapManagementContext } from './MapManagementUtils';

/** 텍스트 입력 셀 - 편집 중이면 input/textarea, 아니면 읽기 전용 div */
const LabelInputCell = ({
    dataItem,
    field,
    style,
    className,
    editingRowId,
    setEditingRowId,
    editingField,
    setEditingField,
    onValueChange
}) => {
    const textareaRef = useRef(null);
    const isEditing = dataItem.id === editingRowId;

    // textarea 높이 자동 조정 (레이블 필드인 경우)
    const adjustHeight = () => {
        if (textareaRef.current && field === 'label') {
            textareaRef.current.style.setProperty("height", "auto", "important");
            textareaRef.current.style.setProperty("height", textareaRef.current.scrollHeight + "px", "important");
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [dataItem[field], editingRowId]);

    const handleBlur = (e) => {
        const newValue = e.target.value;
        onValueChange(dataItem.id - 1, field, newValue);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 엔터 시 줄바꿈 방지
            e.target.blur(); // 포커스 해제 -> handleBlur 트리거
            setEditingRowId(null);
            setEditingField(null);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (textareaRef.current) {
                textareaRef.current.value = dataItem[field] || ''; // 값 롤백
            }
            setEditingRowId(null);
            setEditingField(null);
        }
    };

    const handleFocus = (e) => {
        const val = e.target.value || '';
        e.target.setSelectionRange(val.length, val.length);
    };

    if (!isEditing) {
        return (
            <td
                style={{
                    ...style,
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: style?.width || '1px',
                    cursor: 'pointer'
                }}
                className={className}
                title={dataItem[field] ? String(dataItem[field]) : ''}
                onClick={() => {
                    setEditingField(field);
                    setEditingRowId(dataItem.id);
                }}
            >
                <div style={{
                    background: 'transparent',
                    border: 'none',
                    pointerEvents: 'none',
                    whiteSpace: 'pre-wrap',
                    fontSize: '13px',
                    color: '#475569',
                    padding: '2px 4px',
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: field === 'code' ? 'center' : 'left'
                }}>
                    {dataItem[field]}
                </div>
            </td>
        );
    }

    const shouldAutoFocus = editingField === field;

    return (
        <td style={{ ...style, verticalAlign: 'middle' }} className={className}>
            {field === 'label' ? (
                <textarea
                    ref={textareaRef}
                    defaultValue={dataItem[field]}
                    className="variable-input"
                    rows={1}
                    onInput={adjustHeight}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    autoFocus={shouldAutoFocus}
                    style={{
                        width: '100%',
                        resize: 'none',
                        outline: 'none',
                        border: '1px solid var(--dm-primary)',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        minHeight: '24px'
                    }}
                />
            ) : (
                <input
                    ref={textareaRef}
                    type="text"
                    defaultValue={dataItem[field]}
                    className="variable-input"
                    style={{
                        width: '100%',
                        height: '24px',
                        padding: '2px 4px',
                        border: '1px solid var(--dm-primary)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        textAlign: 'center',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    autoFocus={shouldAutoFocus}
                />
            )}
        </td>
    );
};

const ViewLabelTab = ({
    variables,
    sidebarSearchQuery,
    setSidebarSearchQuery,
    selectedVariableId,
    setSelectedVariableId,
    selectedVariable,
    SetEditingCategoryPopupOpen,
    setAddValueModalOpen,
    handleDeleteLabel
}) => {
    const { setVariables } = useContext(MapManagementContext);
    const modal = useContext(modalContext);

    const [editingRowId, setEditingRowId] = useState(null);
    const [editingField, setEditingField] = useState(null);

    // 변수가 변경될 때 편집 상태 초기화
    useEffect(() => {
        setEditingRowId(null);
        setEditingField(null);
    }, [selectedVariableId]);

    const handleValueChange = (index, field, newValue) => {
        if (!selectedVariableId) return;

        const currentLabels = selectedVariable?.labels || [];
        if (currentLabels[index]?.[field] === newValue) return;

        if (field === 'code') {
            // 중복 코드 검사
            const isDuplicate = currentLabels.some((l, idx) => idx !== index && String(l.code) === String(newValue));
            if (isDuplicate) {
                modal.showErrorAlert("에러", `중복된 번호(코드)가 존재합니다: ${newValue}`);
                return;
            }
        }

        setVariables(prev => prev.map(v => {
            if (v.id !== selectedVariableId) return v;

            const updatedLabels = (v.labels || []).map((l, idx) => {
                if (idx === index) {
                    return { ...l, [field]: newValue };
                }
                return l;
            });

            const newCategoryStr = updatedLabels.map(l => `{${l.code};${l.label}}`).join('');

            return {
                ...v,
                labels: updatedLabels,
                category: newCategoryStr
            };
        }));
    };

    return (
        <div className="category-label-layout">
            {/* 변수 목록 사이드바 */}
            <div className="variable-sidebar">
                <div className="sidebar-header-box">
                    <h3>변수 목록</h3>
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="변수명 / 레이블 검색..."
                            value={sidebarSearchQuery}
                            onChange={e => setSidebarSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="map-variable-list">
                    {variables
                        .filter(v => {
                            if (!sidebarSearchQuery.trim()) return true;
                            const q = sidebarSearchQuery.toLowerCase();
                            return (
                                v.sysName?.toLowerCase().includes(q) ||
                                v.label?.toLowerCase().includes(q)
                            );
                        })
                        .map(v => (
                            <div
                                key={v.id}
                                className={`map-variable-item ${selectedVariableId === v.id ? 'active' : ''}`}
                                onClick={() => setSelectedVariableId(v.id)}
                            >
                                <div className="v-name">{v.sysName}</div>
                                <div className="v-label">{v.label || '레이블 없음'}</div>
                            </div>
                        ))
                    }
                    {/* 검색 결과 없음 */}
                    {sidebarSearchQuery.trim() && variables.every(v => {
                        const q = sidebarSearchQuery.toLowerCase();
                        return !v.sysName?.toLowerCase().includes(q) && !v.label?.toLowerCase().includes(q);
                    }) && (
                            <div style={{ padding: '12px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                                검색 결과가 없습니다.
                            </div>
                        )}
                </div>
            </div>

            {/* 선택된 변수의 보기 레이블 그리드 */}
            <div className="category-detail-content">
                <div className="detail-header">
                    <div className="v-info-title">
                        <span>{selectedVariable?.sysName}</span>
                        <span className="v-info-label">{selectedVariable?.label}</span>
                    </div>
                    <button className="add-value-btn" onClick={() => setAddValueModalOpen(true)}>
                        <Edit2 size={14} /> 레이블 편집
                    </button>
                </div>
                <div className="category-grid-container">
                    <div className="cmn_grid singlehead" style={{ height: '100%' }}>
                        {/* key로 변수 선택/변경 시 강제 재마운트 → 내부 viewData 캐시 초기화 */}
                        <KendoGridV2
                            key={selectedVariableId ?? 'empty'}
                            data={selectedVariable?.labels?.map((l, idx) => ({
                                ...l,
                                rowNo: idx + 1,
                                id: idx + 1
                            })) || []}
                            height="100%"
                            scrollable="scrollable"
                        >
                            <Column field="rowNo" title="no" width="60px" />
                            <Column field="code" title="코드" width="70px" cell={(props) => (
                                <LabelInputCell
                                    {...props}
                                    editingRowId={editingRowId}
                                    setEditingRowId={setEditingRowId}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onValueChange={handleValueChange}
                                />
                            )} />
                            <Column field="label" title="레이블" cell={(props) => (
                                <LabelInputCell
                                    {...props}
                                    editingRowId={editingRowId}
                                    setEditingRowId={setEditingRowId}
                                    editingField={editingField}
                                    setEditingField={setEditingField}
                                    onValueChange={handleValueChange}
                                />
                            )} />
                            <Column field="delete" title="삭제" width="80px" cell={(props) => (
                                <td style={{ padding: 0 }}>
                                    <button
                                        type="button"
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteLabel(props.dataItem.code);
                                        }}
                                    >
                                        <Trash2 size={16} color="#64748b" />
                                    </button>
                                </td>
                            )} />
                        </KendoGridV2>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewLabelTab;
