import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useSelector } from 'react-redux';
import { Save, RefreshCw, ListOrdered, ChevronRight, ChevronLeft, GripVertical } from 'lucide-react';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { DpRequestPageApi } from '../DpRequestPageApi';

const DpRequestDetailStep = forwardRef(({ onUnsavedChange }, ref) => {
    const auth = useSelector((store) => store.auth);
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);
    const { getOrderDetail } = DpRequestPageApi();

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // 부모 컴포넌트에서 호출할 수 있도록 기능 노출
    useImperativeHandle(ref, () => ({
        save: async () => {
            return await handleSave();
        }
    }));

    const [tableOrder, setTableOrder] = useState([]);
    const [draggedIdx, setDraggedIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const [dragPos, setDragPos] = useState(null); // 'top' or 'bottom'

    // API 호출로 초기 데이터 로드
    useEffect(() => {
        const fetchOrderData = async () => {
            // const pageId = sessionStorage.getItem('pageId');
            // if (!pageId || !auth?.user?.userId) return;
            // const user = auth.user.userId;

            // 테스트를 위해 하드코딩 적용
            const pageId = "446bd14c-d053-47c8-bf01-59384cb37746";
            const user = "sbbok";

            loadingSpinner.show();
            try {
                const res = await getOrderDetail.mutateAsync({ pageid: pageId, user: user });

                if (res && res.success === '777') {
                    const data = res.resultjson || {};
                    const ids = data.dp_request_order_ids || [];
                    const metaList = data.ordered_item_meta || [];
                    const vars = data.recoded_variables || {};

                    const parsedData = ids.map((id, idx) => {
                        const meta = metaList.find(m => m.id === id) || {};
                        const varInfo = vars[meta.source_var_id || id] || vars[id] || {};

                        return {
                            seq: idx + 1,
                            id: id,
                            name: varInfo.label || id,
                            type: meta.kind || varInfo.type || 'Unknown'
                        };
                    });
                    setTableOrder(parsedData);
                }
            } catch (err) {
                console.error("Order load failed:", err);
            } finally {
                loadingSpinner.hide();
            }
        };
        fetchOrderData();
    }, [auth?.user?.userId]);

    // --- 드래그 앤 드롭 핸들러 ---
    const handleDragStart = (e, index) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
        // HTML5 기본 잔상만 사용
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (y < rect.height / 2) {
            setDragOverIdx(index);
            setDragPos('top');
        } else {
            setDragOverIdx(index);
            setDragPos('bottom');
        }
    };

    const handleDrop = (e, targetIndex) => {
        e.preventDefault();
        if (draggedIdx === null) return;

        let insertIndex = targetIndex;
        if (dragPos === 'bottom') {
            insertIndex += 1;
        }

        if (draggedIdx === insertIndex || draggedIdx === insertIndex - 1) {
            setDraggedIdx(null);
            setDragOverIdx(null);
            return;
        }

        const newOrder = [...tableOrder];
        const [removed] = newOrder.splice(draggedIdx, 1);

        // splice removes an element, so if dragged was BEFORE insert target, the target shifts down by 1
        if (draggedIdx < insertIndex) {
            insertIndex -= 1;
        }

        newOrder.splice(insertIndex, 0, removed);

        // 순번 갱신
        newOrder.forEach((item, idx) => {
            item.seq = idx + 1;
        });

        setTableOrder(newOrder);
        setDraggedIdx(null);
        setDragOverIdx(null);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    // --- 저장 로직 ---
    const handleSave = async () => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId) return false;

        loadingSpinner.show();
        try {
            const payload = {
                user: auth.user?.userId,
                pageid: pageId,
                tableOrder: tableOrder,
            };
            console.log("Final saving table order with payload:", payload);

            modal.showAlert('완료', '모든 DP 의뢰 설정이 저장되었습니다.');
            if (onUnsavedChange) onUnsavedChange(false);
            return true;
        } catch (err) {
            console.error(err);
            modal.showAlert('오류', '저장 중 문제가 발생했습니다.');
            return false;
        } finally {
            loadingSpinner.hide();
        }
    };

    const handleDataChange = (newData) => {
        setTableOrder(newData);
        if (onUnsavedChange) onUnsavedChange(true);
    };

    // --- 우측 프리뷰 그리드 메모이제이션 (드래그 시 렌더링 지연 방지) ---
    const gridPreview = useMemo(() => (
        <KendoGridV2
            data={tableOrder}
            showNo
            style={{ height: '100%' }}
        >
            <Column field="id" title="표 코드" width="150px" editable={false} />
            <Column field="name" title="표 명칭 (Table Name)" width="400px" editable={false} />
            <Column field="type" title="유형" width="120px" editable={false}
                cell={(props) => (
                    <td style={{ textAlign: 'center' }}>
                        <span className={`dp-badge-mini ${props.dataItem.type === 'summary' ? 'blue' : 'gray'}`}>
                            {props.dataItem.type}
                        </span>
                    </td>
                )}
            />
        </KendoGridV2>
    ), [tableOrder]);

    return (
        <div className="dp-request-container">
            {/* 메인 레이아웃 */}
            <div className="dp-main-layout" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

                {/* Left Sidebar */}
                <div className={`dp-sidebar-container ${!isSidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '280px' }}>
                    {!isSidebarOpen && (
                        <div className="dp-sidebar-collapsed-bar" onClick={() => setIsSidebarOpen(true)}>
                            <div className="dp-collapsed-header">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    )}
                    <div className="dp-sidebar custom-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        <div className="dp-sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '12px' }}>
                            <span>표 순서</span>
                            <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsSidebarOpen(false)}>
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                        <div className="dp-summary-list" style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px' }}>
                            {tableOrder.map((item, index) => (
                                <div key={item.id} style={{ position: 'relative' }}>
                                    {/* 상단 파란색 삽입선 인디케이터 */}
                                    {dragOverIdx === index && dragPos === 'top' && draggedIdx !== index && (
                                        <div style={{ position: 'absolute', top: '-4px', left: 0, right: 0, height: '4px', background: '#3b82f6', borderRadius: '2px', zIndex: 10 }} />
                                    )}

                                    <div
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onDragLeave={() => setDragOverIdx(null)}
                                        className="dp-variable-row"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '6px 10px', border: '1px solid',
                                            borderRadius: '4px', marginBottom: '4px',
                                            background: '#fff',
                                            borderColor: '#cbd5e1',
                                            cursor: 'grab',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                            opacity: draggedIdx === index ? 0.4 : 1,
                                        }}
                                    >
                                        <GripVertical size={14} color="#94a3b8" style={{ flexShrink: 0, cursor: 'grab' }} />
                                        <span style={{
                                            flex: 1,
                                            fontSize: '12px',
                                            color: '#334155',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {item.name}
                                        </span>
                                    </div>

                                    {/* 하단 파란색 삽입선 인디케이터 */}
                                    {dragOverIdx === index && dragPos === 'bottom' && draggedIdx !== index && (
                                        <div style={{ position: 'absolute', bottom: '0px', left: 0, right: 0, height: '4px', background: '#3b82f6', borderRadius: '2px', zIndex: 10 }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className="dp-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="dp-table-container custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '16px' }}>
                        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '16px', background: '#fff', display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Folder Header 형식 */}
                            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '8px 8px 0 0' }}>
                                <ListOrdered size={18} color="#64748b" />
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1d4ed8', marginLeft: '8px' }}>
                                    최종 표 순서 (Preview)
                                </span>
                            </div>

                            {/* 그리드 영역 */}
                            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                {gridPreview}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
});

export default DpRequestDetailStep;
