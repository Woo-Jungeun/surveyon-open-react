import React from 'react';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { Plus, Trash2, Edit2 } from 'lucide-react';

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
                        <KendoGrid
                            key={`${selectedVariableId ?? 'empty'}_${selectedVariable?.category ?? ''}`}
                            parentProps={{
                                data: selectedVariable?.labels?.map((l, idx) => ({
                                    ...l,
                                    rowNo: idx + 1,
                                    id: idx + 1
                                })) || [],
                                dataItemKey: "id",
                                height: "100%",
                                filterable: false,
                            }}
                        >
                            <Column field="rowNo" title="no" width="60px" />
                            <Column field="code" title="코드" width="100px" />
                            <Column field="label" title="레이블" />
                            <Column field="delete" title="삭제" width="80px" cell={(props) => (
                                <td style={{ padding: 0 }}>
                                    <button
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: '36px' // 셀 높이 최소 보장
                                        }}
                                        onClick={() => handleDeleteLabel(props.dataItem.code)}
                                    >
                                        <Trash2 size={16} color="#64748b" />
                                    </button>
                                </td>
                            )} />
                        </KendoGrid>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewLabelTab;
