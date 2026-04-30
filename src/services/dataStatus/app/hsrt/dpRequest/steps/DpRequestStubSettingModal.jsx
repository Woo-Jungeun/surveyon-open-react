import React, { useState, useMemo } from 'react';
import { X, Search, GripVertical, Plus, Check, Info, ChevronDown, Trash2, Play, Copy } from 'lucide-react';
import '@/components/common/popup/ConditionBuilderPopup.css';

let nextId = 0;
function getUniqueId() {
    return `combo-item-${nextId++}`;
}

function generateCartesianRules(selectedVarIds, variablesMap) {
    if (selectedVarIds.length === 0) return [];

    const varInfos = selectedVarIds.map(vid => {
        const v = variablesMap.find(x => x.source_var_id === vid) || { info: [] };
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
            let val = item.value;
            
            // 숫자로만 이루어지지 않은 일반 문자열인 경우, 안전을 위해 홑따옴표 처리 ('Seoul', 'GroupA' 등)
            // (ANY 예약어나, 이미 숫자형인 경우 그대로 둠)
            if (val !== 'ANY' && isNaN(Number(val))) {
                val = `'${val}'`;
            }
            
            return `${varId} == ${val}`;
        });

        return {
            label2: String(counter++),         // 할당될 값
            label: labels.join(" * "),         // 보기 라벨
            logic: logics.join(" and ")        // 조건
        };
    });

    return rules;
}

const DpRequestStubSettingModal = ({ show, onClose, variables = [], rowData, onApply }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [isDetailMode, setIsDetailMode] = useState(false);
    const [isConditionTooltipOpen, setIsConditionTooltipOpen] = useState(false);

    const [categories, setCategories] = useState([
        {
            id: getUniqueId(),
            label: 'Base',
            type: 'base',
            logic: rowData?.source_var_id ? `${rowData.source_var_id} is not null` : '',
            target_var: '',
            value: '',
            label2: '',
            label3: '',
            prefix: '',
            postfix: '',
            hide: '',
            line: '',
            color: ''
        }
    ]);

    const handleAddCategory = (index) => {
        const newCats = [...categories];
        newCats.splice(index + 1, 0, {
            id: getUniqueId(),
            label: '',
            type: '빈도',
            logic: '',
            target_var: '',
            value: '',
            label2: '',
            label3: '',
            prefix: '',
            postfix: '',
            hide: '',
            line: '',
            color: ''
        });
        setCategories(newCats);
    };

    const handleCopyCategory = (index) => {
        const newCats = [...categories];
        const itemToCopy = newCats[index];
        newCats.splice(index + 1, 0, { ...itemToCopy, id: getUniqueId() });
        setCategories(newCats);
    };

    const handleDeleteCategory = (index) => {
        if (categories.length <= 1) return; // 최소 1개는 유지
        const newCats = [...categories];
        newCats.splice(index, 1);
        setCategories(newCats);
    };

    const handleCategoryChange = (index, field, val) => {
        const newCats = [...categories];
        newCats[index][field] = val;
        setCategories(newCats);
    };

    // Drag & Drop State (Right Canvas Reordering Only)
    const [draggedItemIdx, setDraggedItemIdx] = useState(null);
    const [dragOverItemIdx, setDragOverItemIdx] = useState(null);
    const [dragPos, setDragPos] = useState(null); // 'top' or 'bottom'

    // Drag & Drop State (Table Categories Reordering)
    const [draggedCatIdx, setDraggedCatIdx] = useState(null);
    const [dragOverCatIdx, setDragOverCatIdx] = useState(null);
    const [dragCatPos, setDragCatPos] = useState(null);

    const availableVars = useMemo(() => {
        const list = variables || [];
        return list.filter(v =>
            (v.source_var_id && String(v.source_var_id).toLowerCase().includes(searchTerm.toLowerCase())) ||
            (v.var_label && String(v.var_label).toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [variables, searchTerm]);

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

        if (source === 'canvas') {
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
            <div className="advanced-filter-content-cbp" onClick={(e) => e.stopPropagation()} style={{ width: '1100px', height: '700px' }}>

                {/* 헤더 영역 */}
                <div className="filter-popup-header-cbp">
                    <div className="header-title-cbp" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ margin: 0 }}>표 상세설정</h3>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#1d4ed8', fontSize: '14px' }}>
                            [선택된 라벨] {rowData?.var_label || rowData?.recoded_var_id || '없음'}
                        </p>
                    </div>
                    <div className="header-actions-cbp">
                        <button onClick={onClose} className="close-btn-cbp"><X size={20} /></button>
                    </div>
                </div>

                {/* 컨텐츠 영역 */}
                <div className="filter-popup-container-cbp" style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', background: '#f0f7ff', boxSizing: 'border-box', overflowY: 'auto' }}>
                    
                    {/* 상단 폼 영역 */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '60px' }}>이름(ID)</span>
                            <input type="text" value={rowData?.source_var_id || ''} disabled style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', minWidth: '30px' }}>라벨</span>
                            <input type="text" value={rowData?.var_label || ''} readOnly style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '13px' }} />
                        </div>
                        <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>교차/배너 추가(x_info)</span>
                            <input type="text" value={rowData?.x_info?.join(', ') || ''} readOnly style={{ flex: 1, height: '32px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '13px' }} />
                        </div>
                    </div>

                    {/* 하단 그리드 영역 */}
                    <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* 그리드 헤더 */}
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1d4ed8' }}>카테고리</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: '500' }}>상세설정</span>
                                    <div 
                                        onClick={() => setIsDetailMode(!isDetailMode)}
                                        style={{ width: '32px', height: '18px', background: isDetailMode ? '#3b82f6' : '#e2e8f0', borderRadius: '10px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                                    >
                                        <div style={{ width: '14px', height: '14px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isDetailMode ? '16px' : '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                                    </div>
                                </div>
                                <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px', border: '1px solid #3b82f6', background: '#fff', color: '#3b82f6', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    <Play size={12} fill="currentColor" /> 저장
                                </button>
                            </div>
                        </div>

                        {/* 테이블 영역 */}
                        <div style={{ overflowX: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #334155' }}>
                                        <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '70px' }}>순서 변경</th>
                                        <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '80px' }}>추가/복사</th>
                                        <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '50px' }}>No</th>
                                        <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>라벨</th>
                                        <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '120px' }}>형식</th>
                                        <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', position: 'relative' }}>
                                                조건 
                                                <div 
                                                    onMouseEnter={() => setIsConditionTooltipOpen(true)}
                                                    onMouseLeave={() => setIsConditionTooltipOpen(false)}
                                                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                                >
                                                    <Info size={12} color="#94a3b8" />
                                                </div>
                                                {isConditionTooltipOpen && (
                                                    <div style={{ 
                                                        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px',
                                                        width: '280px', padding: '12px', background: '#fff', border: '1px solid #e2e8f0', 
                                                        borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                                                        zIndex: 100, textAlign: 'left', cursor: 'default'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                                            <div style={{ background: '#eff6ff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Info size={12} color="#3b82f6" />
                                                            </div>
                                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>조건</span>
                                                        </div>
                                                        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, fontSize: '12px', color: '#334155', lineHeight: '1.8', fontWeight: 'normal' }}>
                                                            <li><span style={{ fontWeight: '600' }}>동등 대조:</span> GENDER == 1, REGION == 'A'</li>
                                                            <li><span style={{ fontWeight: '600' }}>비교 대조:</span> AGE &gt;= 20, AGE &lt; 30</li>
                                                            <li><span style={{ fontWeight: '600' }}>IN 연산:</span> AGE_GROUP in [2, 3, 4]</li>
                                                            <li><span style={{ fontWeight: '600' }}>다중 조건:</span> (SQ1 == 1 or SQ1 == 2) and SQ2 == 1</li>
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                        <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '100px' }}>저장될 변수</th>
                                        <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: isDetailMode ? '1px solid #e2e8f0' : 'none', width: '80px' }}>값</th>
                                        {isDetailMode && (
                                            <>
                                                <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '80px' }}>라벨2</th>
                                                <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '80px' }}>라벨3</th>
                                                <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '60px' }}>앞문자</th>
                                                <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '60px' }}>뒷문자</th>
                                                <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '60px' }}>숨기기</th>
                                                <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '70px' }}>구분선</th>
                                                <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', borderRight: '1px solid #e2e8f0', width: '70px' }}>배경색</th>
                                            </>
                                        )}
                                        <th style={{ padding: '8px', fontSize: '12px', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', width: '60px', borderLeft: isDetailMode ? 'none' : '1px solid #e2e8f0' }}>삭제</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((cat, idx) => (
                                        <tr 
                                            key={cat.id} 
                                            style={{ 
                                                borderBottom: dragOverCatIdx === idx && dragCatPos === 'bottom' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                                borderTop: dragOverCatIdx === idx && dragCatPos === 'top' ? '2px solid #3b82f6' : 'none',
                                            }}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.effectAllowed = 'move';
                                                setDraggedCatIdx(idx);
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const y = e.clientY - rect.top;
                                                setDragCatPos(y < rect.height / 2 ? 'top' : 'bottom');
                                                setDragOverCatIdx(idx);
                                            }}
                                            onDragLeave={() => {
                                                setDragOverCatIdx(null);
                                                setDragCatPos(null);
                                            }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                if (draggedCatIdx === null || draggedCatIdx === idx) {
                                                    setDraggedCatIdx(null);
                                                    setDragOverCatIdx(null);
                                                    setDragCatPos(null);
                                                    return;
                                                }
                                                const newCats = [...categories];
                                                const draggedItem = newCats[draggedCatIdx];
                                                newCats.splice(draggedCatIdx, 1);
                                                
                                                let targetIdx = idx;
                                                if (draggedCatIdx < idx) {
                                                    targetIdx = dragCatPos === 'bottom' ? idx : idx - 1;
                                                } else {
                                                    targetIdx = dragCatPos === 'bottom' ? idx + 1 : idx;
                                                }
                                                
                                                newCats.splice(targetIdx, 0, draggedItem);
                                                setCategories(newCats);
                                                setDraggedCatIdx(null);
                                                setDragOverCatIdx(null);
                                                setDragCatPos(null);
                                            }}
                                        >
                                            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                                                <div className="dp-grid-handle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <GripVertical size={16} color="#cbd5e1" style={{ cursor: 'grab' }} />
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '24px', width: '100%' }}>
                                                    <button type="button" title="빈 행 추가" className="dp-grid-add-row-btn" onClick={() => handleAddCategory(idx)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                                        <Plus size={18} color="#3b82f6" strokeWidth={3} />
                                                    </button>
                                                    <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }} />
                                                    <button type="button" title="현재 행 복사" className="dp-grid-copy-row-btn" onClick={() => handleCopyCategory(idx)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                                        <Copy size={15} color="#94a3b8" strokeWidth={2} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, verticalAlign: 'middle' }}>{idx + 1}</td>
                                            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                <input value={cat.label} onChange={(e) => handleCategoryChange(idx, 'label', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} placeholder="라벨" />
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                <select value={cat.type} onChange={(e) => handleCategoryChange(idx, 'type', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px', fontSize: '12px', color: '#475569', background: '#fff', outline: 'none' }}>
                                                    <option value="base">base</option>
                                                    <option value="빈도">빈도</option>
                                                    <option value="퍼센트base">퍼센트base</option>
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                <input value={cat.logic} onChange={(e) => handleCategoryChange(idx, 'logic', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} placeholder="조건식" />
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                <input value={cat.target_var} onChange={(e) => handleCategoryChange(idx, 'target_var', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} />
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center', borderRight: isDetailMode ? '1px solid #e2e8f0' : 'none' }}>
                                                <input value={cat.value} onChange={(e) => handleCategoryChange(idx, 'value', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} />
                                            </td>
                                            {isDetailMode && (
                                                <>
                                                    <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                        <input value={cat.label2} onChange={(e) => handleCategoryChange(idx, 'label2', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} />
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                        <input value={cat.label3} onChange={(e) => handleCategoryChange(idx, 'label3', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} />
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                        <input value={cat.prefix} onChange={(e) => handleCategoryChange(idx, 'prefix', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} />
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                        <input value={cat.postfix} onChange={(e) => handleCategoryChange(idx, 'postfix', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} />
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                        <input value={cat.hide} onChange={(e) => handleCategoryChange(idx, 'hide', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} />
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                        <input value={cat.line} onChange={(e) => handleCategoryChange(idx, 'line', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} />
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                        <input value={cat.color} onChange={(e) => handleCategoryChange(idx, 'color', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '13px', color: '#1e293b', outline: 'none' }} />
                                                    </td>
                                                </>
                                            )}
                                            <td style={{ padding: '8px', textAlign: 'center', borderLeft: isDetailMode ? 'none' : '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                    <Trash2 size={14} color={categories.length > 1 ? "#ef4444" : "#cbd5e1"} style={{ cursor: categories.length > 1 ? 'pointer' : 'not-allowed' }} onClick={() => handleDeleteCategory(idx)} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 풋터 영역 */}
                <div className="filter-popup-footer-cbp">
                    <div className="footer-right-cbp">
                        <button className="btn-cancel-cbp" onClick={onClose}>취소</button>
                        <button className="btn-apply-cbp" onClick={handleGenerate} disabled={selectedItems.length === 0} style={{ opacity: selectedItems.length === 0 ? 0.5 : 1 }}>조합 생성</button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DpRequestStubSettingModal;
