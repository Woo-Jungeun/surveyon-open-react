import React, { useState, useMemo } from 'react';
import { X, Search, GripVertical, Plus } from 'lucide-react';
import '@/components/common/popup/ConditionBuilderPopup.css';

let nextId = 0;
function getUniqueId() {
    return `combo-item-${nextId++}`;
}

function generateCartesianRules(selectedVarIds, variablesMap) {
    if (selectedVarIds.length === 0) return [];

    const varInfos = selectedVarIds.map(vid => {
        const v = variablesMap.find(x => x.id === vid) || { info: [] };
        if (!v.info || v.info.length === 0) {
            return [{ value: "ANY", label: `Any ${vid}` }];
        }

        // 유효한 보기만 걸러냄 (서버 저장값과 비교될수도 있으니 null check)
        const validInfo = v.info.filter(infoItem =>
            infoItem.value !== null &&
            infoItem.value !== "null" &&
            infoItem.value !== ""
        );

        if (validInfo.length === 0) {
            return [{ value: "ANY", label: `Any ${vid}` }];
        }
        return validInfo;
    });

    const cartesian = varInfos.reduce((acc, current) => {
        return acc.flatMap(combo => current.map(item => [...combo, item]));
    }, [[]]);

    let counter = 1;
    const rules = cartesian.map(comboItems => {
        const labels = comboItems.map(item => item.label || String(item.value));

        const logics = comboItems.map((item, idx) => {
            const varId = selectedVarIds[idx];
            return `${varId} == ${item.value}`;
        });

        return {
            label2: String(counter++),         // 할당될 값
            label: labels.join(" * "),         // 보기 라벨
            logic: logics.join(" and ")        // 조건
        };
    });

    return rules;
}

const CartesianGeneratorModal = ({ show, onClose, variables = [], onApply }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);

    // Drag & Drop State
    const [draggedItemIdx, setDraggedItemIdx] = useState(null);
    const [dragOverItemIdx, setDragOverItemIdx] = useState(null);
    const [dragPos, setDragPos] = useState(null); // 'top' or 'bottom'
    const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

    const availableVars = useMemo(() => {
        const list = variables || [];
        return list.filter(v =>
            (v.id && v.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (v.label && v.label.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [variables, searchTerm]);

    // --- Sidebar Drag Methods ---
    const handleDragStartSidebar = (e, varId) => {
        e.dataTransfer.setData('source', 'sidebar');
        e.dataTransfer.setData('varId', varId);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    // --- Canvas (빈 공간) Drop Methods ---
    const handleDragOverCanvas = (e) => {
        e.preventDefault();
        setIsDragOverCanvas(true);
    };
    const handleDragLeaveCanvas = () => {
        setIsDragOverCanvas(false);
    };
    const handleDropCanvas = (e) => {
        e.preventDefault();
        setIsDragOverCanvas(false);
        const source = e.dataTransfer.getData('source');

        if (source === 'sidebar') {
            const varId = e.dataTransfer.getData('varId');
            if (varId && !selectedItems.some(i => i.varId === varId)) {
                setSelectedItems(prev => [...prev, { uid: getUniqueId(), varId }]);
            }
        }
    };

    // --- List Items Drag & Drop Methods ---
    const handleDragStartCanvasItem = (e, index) => {
        e.dataTransfer.setData('source', 'canvas');
        e.dataTransfer.setData('index', index);
        setDraggedItemIdx(index);
    };

    const handleDragOverItem = (e, index) => {
        e.preventDefault();
        e.stopPropagation(); // 캔버스로 이벤트가 넘어가지 않도록 방어
        e.dataTransfer.dropEffect = 'move';

        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        if (y < rect.height / 2) {
            setDragOverItemIdx(index);
            setDragPos('top');
        } else {
            setDragOverItemIdx(index);
            setDragPos('bottom');
        }
    };

    const handleDropItem = (e, targetIndex) => {
        e.preventDefault();
        e.stopPropagation();

        const source = e.dataTransfer.getData('source');

        if (source === 'sidebar') {
            // 사이드바에서 끌어다 특정 항목 사이에 넣는 경우
            const varId = e.dataTransfer.getData('varId');
            if (varId && !selectedItems.some(i => i.varId === varId)) {
                const newItems = [...selectedItems];
                let insertIdx = dragPos === 'bottom' ? targetIndex + 1 : targetIndex;
                newItems.splice(insertIdx, 0, { uid: getUniqueId(), varId });
                setSelectedItems(newItems);
            }
        } else if (source === 'canvas') {
            // 위아래 순서 변경 기능
            if (draggedItemIdx === null) return;
            let insertIndex = targetIndex;
            if (dragPos === 'bottom') {
                insertIndex += 1;
            }

            if (draggedItemIdx === insertIndex || draggedItemIdx === insertIndex - 1) {
                setDraggedItemIdx(null);
                setDragOverItemIdx(null);
                return;
            }

            const newItems = [...selectedItems];
            const [removed] = newItems.splice(draggedItemIdx, 1);

            if (draggedItemIdx < insertIndex) {
                insertIndex -= 1;
            }
            newItems.splice(insertIndex, 0, removed);
            setSelectedItems(newItems);
        }

        setDraggedItemIdx(null);
        setDragOverItemIdx(null);
    };

    const handleDragEnd = () => {
        setDraggedItemIdx(null);
        setDragOverItemIdx(null);
    };

    // 항목 삭제
    const handleRemoveItem = (uid) => {
        setSelectedItems(prev => prev.filter(i => i.uid !== uid));
    };

    // 적용 이벤트
    const handleGenerate = () => {
        const selectedVarIds = selectedItems.map(i => i.varId);
        const rules = generateCartesianRules(selectedVarIds, variables);
        if (onApply) {
            onApply(rules);
        }
        onClose(); // 처리 후 모달 닫기
    };

    if (!show) return null;

    return (
        <div className="advanced-filter-overlay-cbp theme-blue">
            <div className="advanced-filter-content-cbp" onClick={(e) => e.stopPropagation()} style={{ width: '850px', height: '650px' }}>

                {/* 헤더 영역 */}
                <div className="filter-popup-header-cbp">
                    <div className="header-title-cbp">
                        <h3>변수 조합기 (Cartesian Generator)</h3>
                        <p>좌측에서 변수를 드래그 앤 드롭으로 우측 영역에 가져오세요. 선택된 변수들의 모든 보기 조합(교차)을 자동 생성합니다.</p>
                    </div>
                    <div className="header-actions-cbp">
                        <button onClick={onClose} className="close-btn-cbp"><X size={20} /></button>
                    </div>
                </div>

                {/* 컨텐츠 영역 */}
                <div className="filter-popup-container-cbp" style={{ padding: '24px', gap: '20px', background: '#f0f7ff' }}>

                    {/* 왼쪽: 변수 목록 */}
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>변수 목록</span>
                            <span style={{ fontSize: '12px', color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Drag</span>
                        </div>

                        <div style={{ position: 'relative', marginBottom: '16px' }}>
                            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                placeholder="변수명 또는 라벨 검색"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', height: '34px', padding: '0 10px 0 30px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                            />
                        </div>

                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                            {availableVars.map((v) => (
                                <div
                                    key={v.id}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStartSidebar(e, v.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', backgroundColor: '#ffffff',
                                        border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px 12px',
                                        cursor: 'grab', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                >
                                    <GripVertical size={16} color="#94a3b8" style={{ marginRight: '10px', flexShrink: 0 }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{v.label}</span>
                                        <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {v.id || ''}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {availableVars.length === 0 && (
                                <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', padding: '20px' }}>검색 결과가 없습니다.</div>
                            )}
                        </div>
                    </div>

                    {/* 오른쪽: 조합 영역 */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b' }}>
                                조합할 변수들 <span style={{ color: '#3b82f6', fontWeight: '600', marginLeft: '4px' }}>({selectedItems.length}개)</span>
                            </span>
                        </div>

                        {/* 캔버스 (Drop Zone) */}
                        <div
                            onDragOver={handleDragOverCanvas}
                            onDragLeave={handleDragLeaveCanvas}
                            onDrop={handleDropCanvas}
                            className="custom-scrollbar"
                            style={{
                                flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                                overflowY: 'auto', transition: 'background 0.2s', minHeight: '100px',
                                background: isDragOverCanvas ? '#e0f2fe' : '#f8fafc'
                            }}
                        >
                            {selectedItems.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px', marginTop: '60px', gap: '16px', pointerEvents: 'none' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                                        <Plus size={32} color="#94a3b8" />
                                    </div>
                                    여기에 변수를 드래그 앤 드롭 하세요.
                                </div>
                            ) : (
                                selectedItems.map((item, index) => {
                                    const v = variables.find(x => x.id === item.varId) || {};
                                    return (
                                        <div key={item.uid} style={{ position: 'relative', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            {/* 상단 삽입선 인디케이터 (순서 변경 시) */}
                                            {dragOverItemIdx === index && dragPos === 'top' && draggedItemIdx !== index && (
                                                <div style={{ position: 'absolute', top: index > 0 ? '14px' : '-2px', left: 0, right: 0, height: '4px', background: '#3b82f6', borderRadius: '2px', zIndex: 10 }} />
                                            )}

                                            {index > 0 && (
                                                <div style={{ height: '32px', display: 'flex', alignItems: 'center', position: 'relative', margin: '4px 0', pointerEvents: 'none' }}>
                                                    <div style={{ height: '100%', width: '1px', borderLeft: '1px dashed #94a3b8', position: 'absolute', left: '50%' }}></div>
                                                    <span style={{ background: '#f8fafc', padding: '4px', fontSize: '12px', color: '#64748b', zIndex: 1, border: '1px solid #cbd5e1', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>×</span>
                                                </div>
                                            )}

                                            <div
                                                draggable={true}
                                                onDragStart={(e) => handleDragStartCanvasItem(e, index)}
                                                onDragOver={(e) => handleDragOverItem(e, index)}
                                                onDrop={(e) => handleDropItem(e, index)}
                                                onDragEnd={handleDragEnd}
                                                onDragLeave={() => setDragOverItemIdx(null)}
                                                style={{
                                                    width: '100%', padding: '16px', background: '#ffffff',
                                                    border: draggedItemIdx === index ? '1px dashed #3b82f6' : '1px solid #cbd5e1',
                                                    borderRadius: '6px', display: 'flex', alignItems: 'center',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                                    opacity: draggedItemIdx === index ? 0.4 : 1,
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                <GripVertical size={16} color="#cbd5e1" style={{ marginRight: '12px', cursor: 'grab' }} />
                                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.varId}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.varId}. {v.label || ''}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                    onClick={() => handleRemoveItem(item.uid)}
                                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <X size={14} color="#ef4444" />
                                                </button>
                                            </div>

                                            {/* 하단 삽입선 인디케이터 (순서 변경 시) */}
                                            {dragOverItemIdx === index && dragPos === 'bottom' && draggedItemIdx !== index && (
                                                <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '4px', background: '#3b82f6', borderRadius: '2px', zIndex: 10 }} />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* 풋터 영역 */}
                <div className="filter-popup-footer-cbp">
                    <div className="footer-right-cbp">
                        <button className="btn-cancel-cbp" onClick={onClose}>취소</button>
                        <button className="btn-apply-cbp" onClick={handleGenerate} disabled={selectedItems.length === 0} style={{ opacity: selectedItems.length === 0 ? 0.5 : 1 }}>조합 생성 (적용)</button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CartesianGeneratorModal;
