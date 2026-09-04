import React, { useRef, useState, useContext, useEffect } from 'react';
import KendoGridV2 from '../../../../components/kendo/KendoGridV2';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { Plus, Trash2, Edit2, Info } from 'lucide-react';
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
    selectedVariableIds = [],
    setSelectedVariableIds,
    setModalTargetIds,
    selectedVariable,
    SetEditingCategoryPopupOpen,
    setAddValueModalOpen,
    handleDeleteLabel
}) => {
    const { setVariables } = useContext(MapManagementContext);
    const modal = useContext(modalContext);

    const [editingRowId, setEditingRowId] = useState(null);
    const [editingField, setEditingField] = useState(null);

    const [lastClickedId, setLastClickedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartIdRef = React.useRef(null);

    // 마우스 업 전역 이벤트 처리 (드래그 종료)
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            dragStartIdRef.current = null;
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // 변수가 변경될 때 편집 상태 초기화
    useEffect(() => {
        setEditingRowId(null);
        setEditingField(null);
    }, [selectedVariableId]);

    // 검색어 필터링된 변수 목록
    const filteredVariables = React.useMemo(() => {
        if (!sidebarSearchQuery.trim()) return variables;
        const q = sidebarSearchQuery.toLowerCase();
        return variables.filter(v =>
            v.sysName?.toLowerCase().includes(q) ||
            v.label?.toLowerCase().includes(q)
        );
    }, [variables, sidebarSearchQuery]);

    // 전체 선택 처리
    const isAllSelected = React.useMemo(() => {
        return filteredVariables.length > 0 && filteredVariables.every(v => selectedVariableIds.includes(v.id));
    }, [filteredVariables, selectedVariableIds]);

    const handleToggleSelectAll = (e) => {
        const checked = e.target.checked;
        if (checked) {
            const allFilteredIds = filteredVariables.map(v => v.id);
            setSelectedVariableIds(allFilteredIds);
        } else {
            setSelectedVariableIds([]);
        }
    };

    const handleToggleSelect = (id, e) => {
        e.stopPropagation();
        if (selectedVariableIds.includes(id)) {
            setSelectedVariableIds(prev => prev.filter(x => x !== id));
        } else {
            setSelectedVariableIds(prev => [...prev, id]);
        }
        setLastClickedId(id);
    };

    // 카드 항목 클릭 (Shift / Ctrl / 일반 클릭 지원)
    const handleItemClick = (v, e) => {
        setSelectedVariableId(v.id);

        const isShift = e.shiftKey;
        const isCtrl = e.ctrlKey || e.metaKey;

        if (isShift && lastClickedId) {
            const anchorIdx = filteredVariables.findIndex(item => item.id === lastClickedId);
            const currIdx = filteredVariables.findIndex(item => item.id === v.id);

            if (anchorIdx !== -1 && currIdx !== -1) {
                const start = Math.min(anchorIdx, currIdx);
                const end = Math.max(anchorIdx, currIdx);
                const rangeIds = filteredVariables.slice(start, end + 1).map(item => item.id);

                if (isCtrl) {
                    const combined = Array.from(new Set([...selectedVariableIds, ...rangeIds]));
                    setSelectedVariableIds(combined);
                } else {
                    setSelectedVariableIds(rangeIds);
                }
            }
        } else if (isCtrl) {
            if (selectedVariableIds.includes(v.id)) {
                setSelectedVariableIds(prev => prev.filter(x => x !== v.id));
            } else {
                setSelectedVariableIds(prev => [...prev, v.id]);
            }
            setLastClickedId(v.id);
        } else {
            setLastClickedId(v.id);
        }
    };

    // 마우스 드래그 시작
    const handleMouseDownItem = (v, e) => {
        if (e.button !== 0) return; // 좌클릭만
        setIsDragging(true);
        dragStartIdRef.current = v.id;
    };

    // 마우스 드래그 이동 중 범위 선택
    const handleMouseEnterItem = (v) => {
        if (!isDragging || !dragStartIdRef.current) return;

        const startIdx = filteredVariables.findIndex(item => item.id === dragStartIdRef.current);
        const currIdx = filteredVariables.findIndex(item => item.id === v.id);

        if (startIdx !== -1 && currIdx !== -1) {
            const start = Math.min(startIdx, currIdx);
            const end = Math.max(startIdx, currIdx);
            const rangeIds = filteredVariables.slice(start, end + 1).map(item => item.id);
            setSelectedVariableIds(rangeIds);
        }
    };

    // 1번 버튼: 사이드바 다중 선택 편집 버튼
    const handleOpenBulkEditModal = () => {
        if (setModalTargetIds) {
            setModalTargetIds(selectedVariableIds.length > 0 ? selectedVariableIds : (selectedVariableId ? [selectedVariableId] : []));
        }
        setAddValueModalOpen(true);
    };

    // 2번 버튼: 우측 헤더 단일 현재 변수 편집 버튼 (고정)
    const handleOpenSingleEditModal = () => {
        if (setModalTargetIds && selectedVariableId) {
            setModalTargetIds([selectedVariableId]);
        }
        setAddValueModalOpen(true);
    };

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
                <div className="sidebar-header-box" style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--dm-text-main)' }}>변수 목록</h3>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: selectedVariableIds.length > 0 ? '#dcfce7' : '#f1f5f9',
                            color: selectedVariableIds.length > 0 ? '#15803d' : '#94a3b8',
                            transition: 'all 0.2s ease'
                        }}>
                            {selectedVariableIds.length}개 선택됨
                        </span>
                    </div>
                    <div className="search-box" style={{ marginBottom: '8px' }}>
                        <input
                            type="text"
                            placeholder="변수명 또는 레이블 검색"
                            value={sidebarSearchQuery}
                            onChange={e => setSidebarSearchQuery(e.target.value)}
                        />
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        marginTop: '4px'
                    }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <label className="dm-checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                                <input
                                    type="checkbox"
                                    className="dm-checkbox-input"
                                    checked={isAllSelected}
                                    onChange={handleToggleSelectAll}
                                />
                                <span className="dm-checkbox-box"></span>
                                <span style={{ marginLeft: '6px', fontSize: '12px', fontWeight: 600, color: '#334155', lineHeight: 1 }}>전체 선택</span>
                            </label>

                            <div className="multi-select-tooltip-wrap">
                                <Info size={14} className="multi-select-tooltip-icon" />
                                <div className="multi-select-tooltip-bubble">
                                    <div style={{ fontWeight: 700, marginBottom: '4px', color: '#0f172a', fontSize: '12px' }}>💡 다중 선택 팁</div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>• <b>Shift + 클릭</b>: 연속 범위 선택</div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>• <b>Ctrl + 클릭</b>: 개별 추가 / 해제</div>
                                    <div style={{ fontSize: '12px', color: '#475569' }}>• <b>마우스 드래그</b>: 연속 범위 선택</div>
                                </div>
                            </div>
                        </div>

                        {selectedVariableIds.length > 0 && (
                            <button
                                type="button"
                                onClick={handleOpenBulkEditModal}
                                style={{
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#fff',
                                    background: 'var(--dm-primary)',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.25)',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Edit2 size={12} /> 다중 레이블 편집 ({selectedVariableIds.length}개)
                            </button>
                        )}
                    </div>
                </div>
                <div className="map-variable-list" style={{ userSelect: 'none' }}>
                    {filteredVariables.map(v => {
                        const isChecked = selectedVariableIds.includes(v.id);
                        const isActive = selectedVariableId === v.id;
                        return (
                            <div
                                key={v.id}
                                className={`map-variable-item ${isActive ? 'active' : ''}`}
                                onClick={(e) => handleItemClick(v, e)}
                                onMouseDown={(e) => handleMouseDownItem(v, e)}
                                onMouseEnter={() => handleMouseEnterItem(v)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}
                            >
                                <label
                                    className="dm-checkbox-label"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ flexShrink: 0 }}
                                >
                                    <input
                                        type="checkbox"
                                        className="dm-checkbox-input"
                                        checked={isChecked}
                                        onChange={(e) => handleToggleSelect(v.id, e)}
                                    />
                                    <span className="dm-checkbox-box"></span>
                                </label>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="v-name">{v.sysName}</div>
                                    <div className="v-label">{v.label || '레이블 없음'}</div>
                                </div>
                            </div>
                        );
                    })}
                    {sidebarSearchQuery.trim() && filteredVariables.length === 0 && (
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
                    <button
                        className="add-value-btn"
                        onClick={handleOpenSingleEditModal}
                    >
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
