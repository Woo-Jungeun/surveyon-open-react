import React from 'react';
import KendoGrid from '../../../../components/kendo/KendoGrid';
import { GridColumn as Column } from "@progress/kendo-react-grid";
import { Plus, Trash2 } from 'lucide-react';

const ViewLabelTab = ({
    variables,
    sidebarSearchQuery,
    setSidebarSearchQuery,
    selectedVariableId,
    setSelectedVariableId,
    selectedVariable,
    SetEditingCategoryPopupOpen,
    setAddValueModalOpen
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
                <div className="variable-list">
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
                                className={`variable-item ${selectedVariableId === v.id ? 'active' : ''}`}
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
                        <Plus size={14} /> 값 추가
                    </button>
                </div>
                <div className="category-grid-container">
                    <div className="cmn_grid singlehead">
                        {/* key로 변수 선택 시 강제 재마운트 → 내부 viewData 캐시 초기화 */}
                        <KendoGrid
                            key={selectedVariableId ?? 'empty'}
                            parentProps={{
                                data: selectedVariable?.labels?.map((l, idx) => ({
                                    ...l,
                                    rowNo: idx + 1
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
    );
};

export default ViewLabelTab;
