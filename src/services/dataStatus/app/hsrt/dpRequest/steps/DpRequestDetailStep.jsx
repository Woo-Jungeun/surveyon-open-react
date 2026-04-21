import React, { useState, useEffect, useContext, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Save, RefreshCw, ListOrdered, ChevronRight, ChevronLeft, GripVertical, Play, X, Info, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { Popup } from '@progress/kendo-react-popup';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";
import { DpRequestPageApi } from '../DpRequestPageApi';

const ConditionHeaderCell = (props) => {
    const anchorRef = useRef(null);
    const [show, setShow] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <span>{props.title}</span>
            <div
                ref={anchorRef}
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                style={{ cursor: 'pointer', display: 'flex' }}
                onClick={(e) => e.stopPropagation()}
            >
                <Info size={14} color="#94a3b8" />
            </div>

            <Popup
                anchor={anchorRef.current}
                show={show}
                animate={false}
                popupClass="condition-tooltip-popup"
                style={{ zIndex: 100000 }} // Grid header 위에 잘 보이도록 z-index 높임
            >
                <div style={{
                    padding: '12px 16px',
                    background: '#ffffff',
                    width: 'max-content',
                    minWidth: '160px',
                    lineHeight: '1.6',
                    color: '#334155',
                    textAlign: 'left', // 헤더 중앙정렬 영향을 받지 않도록 분리
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    borderRadius: '8px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <div style={{
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#e2e8f0', color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 'bold'
                        }}>i</div>
                        <span style={{ color: '#2563eb', fontWeight: '800', fontSize: '13px' }}>조건</span>
                    </div>
                    <div style={{ fontSize: '13px', letterSpacing: '-0.3px', marginLeft: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>• <span style={{ fontWeight: 600 }}>설명 표출 예정</span></div>
                    </div>
                </div>
            </Popup>
        </div>
    );
};

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
    const [selectedItemId, setSelectedItemId] = useState(null);

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
                    if (parsedData.length > 0) {
                        setSelectedItemId(parsedData[0].id);
                    }
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

    return (
        <div className="dp-request-container">
            {/* 메인 레이아웃 */}
            <div className="dp-main-layout" style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

                {/* Left Sidebar */}
                <div className={`dp-sidebar-container ${!isSidebarOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: isSidebarOpen ? '280px' : '40px' }}>
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
                            {tableOrder.map((item, index) => {
                                const isSelected = selectedItemId === item.id;
                                return (
                                    <div key={item.id} style={{ position: 'relative' }}>
                                        {/* 상단 파란색 삽입선 인디케이터 */}
                                        {dragOverIdx === index && dragPos === 'top' && draggedIdx !== index && (
                                            <div style={{ position: 'absolute', top: '-4px', left: 0, right: 0, height: '4px', background: '#3b82f6', borderRadius: '2px', zIndex: 10 }} />
                                        )}

                                        <div
                                            draggable={true}
                                            onMouseDown={() => setSelectedItemId(item.id)}
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
                                                background: isSelected ? '#eff6ff' : '#fff',
                                                borderColor: isSelected ? '#3b82f6' : '#cbd5e1',
                                                cursor: 'grab',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                                opacity: draggedIdx === index ? 0.4 : 1,
                                            }}
                                        >
                                            <GripVertical size={14} color="#94a3b8" style={{ flexShrink: 0, cursor: 'grab' }} />
                                            <span style={{
                                                flex: 1,
                                                fontSize: '12px',
                                                color: isSelected ? '#1e40af' : '#334155',
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
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className="dp-content">
                    <div style={{ borderRadius: '8px', background: '#fff', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                        {/* 그리드 영역 */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            {selectedItemId &&
                                <DetailEditPreview item={tableOrder.find(it => it.id === selectedItemId)} onClose={() => setSelectedItemId(null)} />
                            }
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
});

const DetailEditPreview = ({ item, onClose }) => {
    const [editLabel, setEditLabel] = useState(item?.name || '');
    const [editBanner, setEditBanner] = useState('banner_01');
    const [isCategoryOpen, setIsCategoryOpen] = useState(true);
    const [isResultOpen, setIsResultOpen] = useState(true);
    const [isDetailSetting, setIsDetailSetting] = useState(false);
    const [decimalN, setDecimalN] = useState(0);
    const [decimalP, setDecimalP] = useState(1);
    const [showN, setShowN] = useState(true);
    const [showP, setShowP] = useState(true);

    const [categoryData, setCategoryData] = useState([]);

    useEffect(() => {
        setEditLabel(item?.name || '');
        setEditBanner('banner_01');
        
        // 목업 데이터 준비
        setCategoryData([
            { label: 'Base', type: 'base', condition: `${item?.id || 'VAR'} is not null`, targetVar: '', val: '' },
            { label: '└ 기아', type: 'OPTION', condition: `${item?.id || 'VAR'} in [1]`, targetVar: '', val: '1' },
            { label: '└ 르노코리아', type: 'OPTION', condition: `${item?.id || 'VAR'} in [2]`, targetVar: '', val: '2' },
            { label: '└ 쉐보레', type: 'OPTION', condition: `${item?.id || 'VAR'} in [3]`, targetVar: '', val: '3' },
            { label: '└ KG 모빌리티 (쌍용)', type: 'OPTION', condition: `${item?.id || 'VAR'} in [4]`, targetVar: '', val: '4' },
            { label: '└ 현대', type: 'OPTION', condition: `${item?.id || 'VAR'} in [5]`, targetVar: '', val: '5' },
        ]);
    }, [item]);

    const resultData = [
        { gubun: 'Base', val1: { n: 185, p: '100.0%' }, val2: { n: 22, p: '100.0%' }, val3: { n: 88, p: '100.0%' }, val4: { n: 106, p: '100.0%' } },
        { gubun: '기아', val1: { n: 53, p: '28.6%' }, val2: { n: 9, p: '40.9%' }, val3: { n: 31, p: '35.2%' }, val4: { n: 26, p: '24.5%' } },
        { gubun: '르노코리아', val1: { n: 1, p: '0.5%' }, val2: { n: 0, p: '0.0%' }, val3: { n: 0, p: '0.0%' }, val4: { n: 1, p: '0.9%' } },
    ];

    const DataCellTemplate = (props) => (
        <td style={{ textAlign: 'center', padding: '6px 8px', verticalAlign: 'middle' }}>
            {showN && <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{props.dataItem[props.field]?.n}</div>}
            {showP && <div style={{ color: '#94a3b8', fontSize: '11px' }}>{props.dataItem[props.field]?.p}</div>}
        </td>
    );

    return (
        <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Header */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                        상세 편집
                    </span>
                    <div style={{ width: '3px', height: '3px', background: '#94a3b8', borderRadius: '50%' }}></div>
                </div>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>
                    {editLabel || item?.id}
                </h2>
                {item?.type && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', background: '#eff6ff', color: '#2563eb', borderRadius: '12px', border: '1px solid #bfdbfe', fontWeight: 600, marginLeft: '4px' }}>
                        {item.type}
                    </span>
                )}
            </div>

            <div className="custom-scrollbar" style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {/* Form Controls */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexShrink: 0 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>이름(ID)</span>
                        <input type="text" value={item?.id || ''} readOnly style={{ flex: 1, padding: '6px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', outline: 'none', color: '#64748b', minWidth: 0 }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>라벨</span>
                        <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} style={{ flex: 1, padding: '6px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none', color: '#0f172a', minWidth: 0 }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>교차/배너 추가 (x_info)</span>
                        <input type="text" value={editBanner} onChange={(e) => setEditBanner(e.target.value)} style={{ flex: 1, padding: '6px 10px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', outline: 'none', color: '#0f172a', minWidth: 0 }} />
                    </div>
                </div>

                {/* Categories Wrapper */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '24px', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: isCategoryOpen ? 1 : 'none', minHeight: 0 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', borderBottom: isCategoryOpen ? '1px solid #e2e8f0' : 'none', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#1d4ed8', fontWeight: 700 }}>
                            카테고리 <Info size={14} color="#94a3b8" />
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            {isCategoryOpen && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setIsDetailSetting(!isDetailSetting)}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>상세 설정</span>
                                        <div style={{ width: '32px', height: '18px', borderRadius: '10px', background: isDetailSetting ? '#3b82f6' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', display: 'flex', alignItems: 'center', padding: '2px' }}>
                                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#fff', position: 'absolute', left: isDetailSetting ? 'calc(100% - 16px)' : '2px', transition: 'left 0.2s' }} />
                                        </div>
                                    </div>
                                    <button 
                                        style={{ 
                                            background: '#fff', 
                                            border: '1px solid #3b82f6', 
                                            color: '#3b82f6', 
                                            fontSize: '13px', 
                                            fontWeight: 700, 
                                            padding: '4px 12px', 
                                            borderRadius: '4px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px', 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
                                    >
                                        <Play size={14} fill="#3b82f6" color="#3b82f6" /> 저장 및 출력
                                    </button>
                                </>
                            )}
                            <button onClick={() => setIsCategoryOpen(!isCategoryOpen)} style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                {isCategoryOpen ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                            </button>
                        </div>
                    </div>
                    {/* Content */}
                    {isCategoryOpen && (
                        <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <KendoGridV2 data={categoryData} onDataChange={setCategoryData} reorderable={true} showNo style={{ flex: 1, height: '100%', width: '100%' }}>
                                <Column field="label" title="라벨" width="200px" />
                                <Column field="type" title="형식" width="120px" />
                                <Column field="condition" title="조건" width="250px" headerCell={ConditionHeaderCell} />
                                <Column field="targetVar" title="저장될 변수" width="100px" />
                                <Column field="val" title="값" width="60px" headerClassName="k-text-center" cell={(p) => <td style={{ textAlign: 'center' }}>{p.dataItem.val}</td>} />
                                {isDetailSetting && <Column field="label2" title="라벨2" width="100px" />}
                                {isDetailSetting && <Column field="label3" title="라벨3" width="100px" />}
                                {isDetailSetting && <Column field="prefix" title="앞문자" width="80px" />}
                                {isDetailSetting && <Column field="suffix" title="뒷문자" width="80px" />}
                                {isDetailSetting && <Column field="hide" title="숨기기" width="80px" />}
                                {isDetailSetting && <Column field="separator" title="구분선" width="120px" />}
                                {isDetailSetting && <Column field="bgColor" title="배경색" width="100px" />}
                            </KendoGridV2>
                        </div>
                    )}
                </div>

                {/* Results Wrapper */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: isResultOpen ? 1 : 'none', minHeight: 0 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#f8fafc', borderBottom: isResultOpen ? '1px solid #e2e8f0' : 'none', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                검사 결과 출력 영역
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>기본 모드</div>
                            {isResultOpen && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '16px', overflow: 'hidden', fontSize: '12px', background: '#fff' }}>
                                        <div 
                                            onClick={() => setShowN(!showN)}
                                            style={{ background: showN ? '#eff6ff' : '#f8fafc', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderRight: '1px solid #cbd5e1', cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s' }}
                                        >
                                            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: showN ? '#3b82f6' : '#fff', border: showN ? '1px solid #3b82f6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                                {showN && <Check size={10} color="#fff" strokeWidth={3} />}
                                            </div>
                                            <span style={{ fontWeight: 700, color: showN ? '#1e40af' : '#64748b', transition: 'all 0.2s' }}>N</span>
                                        </div>
                                        <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', opacity: showN ? 1 : 0.4, pointerEvents: showN ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                                            소수점 <input type="number" className="dp-decimal-input" min="0" max="5" value={decimalN} onChange={(e) => setDecimalN(parseInt(e.target.value) || 0)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', width: '28px', height: '22px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: showN ? '#1e40af' : '#64748b', outline: 'none', padding: 0 }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '16px', overflow: 'hidden', fontSize: '12px', background: '#fff' }}>
                                        <div 
                                            onClick={() => setShowP(!showP)}
                                            style={{ background: showP ? '#eff6ff' : '#f8fafc', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderRight: '1px solid #cbd5e1', cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s' }}
                                        >
                                            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: showP ? '#3b82f6' : '#fff', border: showP ? '1px solid #3b82f6' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                                {showP && <Check size={10} color="#fff" strokeWidth={3} />}
                                            </div>
                                            <span style={{ fontWeight: 700, color: showP ? '#1e40af' : '#64748b', transition: 'all 0.2s' }}>%</span>
                                        </div>
                                        <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', opacity: showP ? 1 : 0.4, pointerEvents: showP ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                                            소수점 <input type="number" className="dp-decimal-input" min="0" max="5" value={decimalP} onChange={(e) => setDecimalP(parseInt(e.target.value) || 0)} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', width: '28px', height: '22px', borderRadius: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: showP ? '#1e40af' : '#64748b', outline: 'none', padding: 0 }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <button onClick={() => setIsResultOpen(!isResultOpen)} style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                {isResultOpen ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                            </button>
                        </div>
                    </div>
                    {/* Content */}
                    {isResultOpen && (
                        <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <KendoGridV2 data={resultData} style={{ flex: 1, height: '100%', width: '100%' }}>
                                <Column field="gubun" title="구분" width="80px" headerClassName="k-text-center" cell={(p) => <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{p.dataItem.gubun}</td>} />
                                <Column field="val1" title="전문직(의사, 법조인 등)" headerClassName="k-text-center" cell={DataCellTemplate} />
                                <Column field="val2" title="예술가(화가, 가수 등)" headerClassName="k-text-center" cell={DataCellTemplate} />
                                <Column field="val3" title="교직(교사, 학원강사 등)" headerClassName="k-text-center" cell={DataCellTemplate} />
                                <Column field="val4" title="공무원" headerClassName="k-text-center" cell={DataCellTemplate} />
                            </KendoGridV2>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DpRequestDetailStep;
