import React, { useState, useEffect, useContext, useCallback, useMemo, memo } from 'react';
import { useSelector } from 'react-redux';
import { Save, Trash2, ChevronDown, Plus, Search, ChevronLeft, ChevronRight, GripVertical, X } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";

// --- (성능 개선) 개별 아이템 메모이제이션 ---
const VariableItem = memo(({ v, isSelected, onDragStart, onClick }) => (
    <div
        className={`variable-item ${isSelected ? 'selected' : ''}`}
        draggable
        onDragStart={(e) => onDragStart(e, v)}
        onClick={(e) => { e.stopPropagation(); onClick(v.id); }}
    >
        <div className="variable-item-header">
            <div className="variable-item__name">{v.id}</div>
            {v.type && <span className={`question-type-badge ${String(v.type).toLowerCase()}`}>{v.type}</span>}
        </div>
        <div className="variable-item__label">{v.label}</div>
    </div>
));

// --- 배너명 입력창 섹션 ---
const BannerNameSection = memo(({ onCreateBanner }) => {
    const [localName, setLocalName] = useState('');
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>배너명</span>
                <input
                    type="text"
                    placeholder="배너명을 입력하세요."
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    style={{ width: '240px', padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', background: '#fff', outline: 'none' }}
                />
            </div>
            <button
                className="dp-primary-btn"
                onClick={() => onCreateBanner(localName)}
                style={{ height: '30px', padding: '0 16px', fontSize: '12px', borderRadius: '4px', background: '#2563EB', fontWeight: 600 }}
            >
                배너 생성
            </button>
        </div>
    );
});

const DpRequestBannerStep = () => {
    const auth = useSelector((store) => store.auth);
    const { getBannerDetail, getBaseVariableList, generateBanner } = DpRequestPageApi();
    const loadingSpinner = useContext(loadingSpinnerContext);
    const modal = useContext(modalContext);

    const [banners, setBanners] = useState([]);
    const [selectedBanner, setSelectedBanner] = useState('');
    const [baseVariables, setBaseVariables] = useState([]);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isVariablePanelOpen, setIsVariablePanelOpen] = useState(true);
    const [wizardSearch, setWizardSearch] = useState('');
    const [colVars, setColVars] = useState([]);
    const [currentLabel, setCurrentLabel] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // --- Interaction Logic ---
    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    // 외부 변수 드래그 시작
    const handleDragStart = useCallback((e, draggedVar) => {
        let targets = [];
        if (selectedIds.includes(draggedVar.id)) {
            targets = baseVariables.filter(v => selectedIds.includes(v.id));
        } else {
            targets = [draggedVar];
            setSelectedIds([draggedVar.id]);
        }
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'EXTERNAL', items: targets }));
    }, [selectedIds, baseVariables]);

    // 내부 문항 드래그 시작
    const handleInternalItemDragStart = (e, gIdx, iIdx) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_ITEM', gIdx, iIdx }));
    };

    // 내부 그룹 드래그 시작
    const handleInternalGroupDragStart = (e, gIdx) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_GROUP', gIdx }));
    };

    const handleDrop = (e, targetIdx) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (!data) return;

            setColVars(prev => {
                let next = [...prev.map(g => [...g])];

                // 1. 내부 문항 이동
                if (data.type === 'INTERNAL_ITEM') {
                    const item = next[data.gIdx][data.iIdx];
                    next[data.gIdx].splice(data.iIdx, 1); // 원래 위치 제거

                    if (targetIdx === 'new') {
                        next.push([item]);
                    } else {
                        // 중복 체크 및 추가 (최대 3개)
                        if (!next[targetIdx].find(v => v.id === item.id) && next[targetIdx].length < 3) {
                            next[targetIdx].push(item);
                        } else if (data.gIdx === targetIdx) {
                            // 같은 그룹 내 이동인 경우 다시 넣어줌 (실제론 순서 변경 로직 필요하나 여기선 보존)
                            next[targetIdx].splice(data.iIdx, 0, item);
                        }
                    }
                    return next.filter(g => g.length > 0);
                }

                // 2. 내부 그룹 순서 변경
                if (data.type === 'INTERNAL_GROUP') {
                    const group = next[data.gIdx];
                    next.splice(data.gIdx, 1);
                    if (targetIdx === 'new') {
                        next.push(group);
                    } else {
                        next.splice(targetIdx, 0, group);
                    }
                    return next;
                }

                // 3. 외부 변수 추가
                if (data.type === 'EXTERNAL') {
                    const itemsToAdd = data.items;
                    if (targetIdx === 'new') {
                        if (next.length < 10) next.push(...itemsToAdd.map(it => [it]));
                    } else {
                        const unique = itemsToAdd.filter(it => !next[targetIdx].find(v => v.id === it.id));
                        next[targetIdx] = [...next[targetIdx], ...unique].slice(0, 3);
                    }
                }

                return next.slice(0, 10);
            });
            setSelectedIds([]);
        } catch (err) { console.error(err); }
    };

    const removeVar = (varId, groupIndex) => {
        setColVars(prev => {
            const next = prev.map(g => [...g]);
            next[groupIndex] = next[groupIndex].filter(v => v.id !== varId);
            return next.filter(g => g.length > 0);
        });
    };

    // --- 데이터 로직 ---
    const fetchBannerData = async (isFresh = false) => {
        const pageId = sessionStorage.getItem('pageId');
        if (!pageId || !auth?.user?.userId) return;
        try {
            loadingSpinner.show();
            const result = await getBannerDetail.mutateAsync({ pageid: pageId, user: auth.user.userId });
            if (result?.success === '777' && result.resultjson) {
                if (result.resultjson.base_variables) {
                    const baseVars = result.resultjson.base_variables;
                    setBaseVariables(Array.isArray(baseVars) ? baseVars : Object.values(baseVars));
                }
                if (result.resultjson.recoded_variables) {
                    const raw = result.resultjson.recoded_variables;
                    const recodes = Array.isArray(raw) ? raw : Object.values(raw);
                    const formatted = recodes.map((v, i) => ({
                        id: v.id || `var_${i}`,
                        label: v.name || v.label,
                        subId: v.id || `banner_0${i + 1}`,
                        info: (v.info || v.categories || []).map(item => ({ ...item, inEdit: false }))
                    }));
                    setBanners(formatted);

                    if (formatted.length > 0) {
                        const target = isFresh ? formatted[formatted.length - 1] : formatted[0];
                        if (isFresh || !selectedBanner) {
                            setSelectedBanner(target.id);
                            setCurrentLabel(target.label);
                        }
                    }
                }
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    const handleCreateBanner = async (name) => {
        if (!name?.trim()) return modal.showAlert('알림', '배너명을 입력해 주세요.');
        if (colVars.length === 0) return modal.showAlert('알림', '문항 그룹을 구성해 주세요.');
        const pageId = sessionStorage.getItem('pageId');
        const formula = colVars.map(group => group.map(v => v.id).join('*')).join('+');
        try {
            loadingSpinner.show();
            const result = await generateBanner.mutateAsync({ pageid: pageId, formula, label: name, user: auth?.user?.userId });
            if (result?.success === "777") {
                await fetchBannerData(true);
                setColVars([]);
                setIsWizardOpen(false);
                modal.showAlert('알림', '배너가 성공적으로 생성되었습니다.');
            }
        } catch (error) { console.error(error); }
        finally { loadingSpinner.hide(); }
    };

    const updateBannerInfo = useCallback((newInfo) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: newInfo } : b));
    }, [selectedBanner]);

    const filteredVariables = useMemo(() => {
        const search = wizardSearch.toLowerCase();
        return (Array.isArray(baseVariables) ? baseVariables : []).filter(v =>
            (v.label || '').toLowerCase().includes(search) || (v.id || '').toLowerCase().includes(search)
        );
    }, [baseVariables, wizardSearch]);

    useEffect(() => { fetchBannerData(); }, [auth?.user?.userId]);

    useEffect(() => {
        const fetchBaseVariables = async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId || !auth?.user?.userId) return;
            try {
                const result = await getBaseVariableList.mutateAsync({ pageid: pageId, user: auth.user.userId });
                if (result?.success === '777' && result.resultjson) setBaseVariables(Object.values(result.resultjson));
            } catch (error) { }
        };
        fetchBaseVariables();
    }, [auth?.user?.userId]);

    return (
        <div className="dp-request-container" onClick={() => updateBannerInfo(banners.find(b => b.id === selectedBanner)?.info.map(it => ({ ...it, inEdit: false })) || [])}>
            <div className="dp-wizard-accordion" onClick={(e) => { e.stopPropagation(); setSelectedIds([]); }}>
                <div className="dp-accordion-header" onClick={() => setIsWizardOpen(prev => !prev)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: 1 }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>자동 배너 구성</span>
                        {isWizardOpen && <BannerNameSection onCreateBanner={handleCreateBanner} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8' }}>
                        <ChevronDown size={18} style={{ transform: isWizardOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
                    </div>
                </div>

                {isWizardOpen && (
                    <div className="dp-wizard-body">
                        <div className="dp-wizard-setup" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            {/* 좌측 변수 패널 */}
                            <div className={`variable-panel ${!isVariablePanelOpen ? 'collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div className="variable-panel-header" style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {isVariablePanelOpen && (
                                        <div className="search-input-wrapper" style={{ flex: 1 }}>
                                            <Search size={14} className="search-icon" style={{ left: '10px' }} />
                                            <input
                                                type="text"
                                                placeholder="변수명, 라벨 검색"
                                                value={wizardSearch}
                                                onChange={(e) => setWizardSearch(e.target.value)}
                                                className="search-input"
                                                style={{ width: '100%', padding: '5px 10px 5px 30px !important' }}
                                            />
                                        </div>
                                    )}
                                    <button onClick={() => setIsVariablePanelOpen(prev => !prev)} style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>
                                        {isVariablePanelOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                                    </button>
                                </div>

                                {isVariablePanelOpen && (
                                    <div className="variable-list" style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                                        {filteredVariables.map(v => (
                                            <VariableItem
                                                key={v.id}
                                                v={v}
                                                isSelected={selectedIds.includes(v.id)}
                                                onDragStart={handleDragStart}
                                                onClick={toggleSelection}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 우측 드롭존 */}
                            <div className="drop-zones-container" style={{ flex: 1, background: 'rgb(239, 246, 255)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>가로축 (열)</span>
                                    <button onClick={() => setColVars([])} className="axis-clear-btn"><X size={12} /></button>
                                </div>
                                <div className="drop-zone-area" style={{ flex: 1, display: 'flex', gap: '10px', padding: '16px', overflowX: 'auto', minHeight: 0 }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, 'new')}>
                                    {colVars.map((group, groupIndex) => (
                                        <div key={groupIndex} className="col-group" draggable onDragStart={(e) => handleInternalGroupDragStart(e, groupIndex)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); handleDrop(e, groupIndex); }}>
                                            <div className="group-drag-handle"><GripVertical size={16} /></div>
                                            <div className="col-group-items">
                                                {group.map((v, itemIndex) => (
                                                    <div
                                                        key={`${v.id}-${itemIndex}`}
                                                        className="dropped-tag grouped"
                                                        draggable
                                                        onDragStart={(e) => { e.stopPropagation(); handleInternalItemDragStart(e, groupIndex, itemIndex); }}
                                                    >
                                                        <div className="item-drag-handle"><GripVertical size={10} /></div>
                                                        <span className="tag-text">{v.id}</span>
                                                        <X size={13} className="remove" onClick={() => removeVar(v.id, groupIndex)} />
                                                    </div>
                                                ))}
                                                {Array.from({ length: 3 - group.length }).map((_, i) => <div key={i} className="empty-slot" />)}
                                            </div>
                                        </div>
                                    ))}
                                    {colVars.length === 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8' }}>
                                            <Plus size={24} style={{ marginBottom: '4px', opacity: 0.5 }} />
                                            <div style={{ fontSize: '13px', fontWeight: 600 }}>새 그룹 (+)</div>
                                            <div style={{ fontSize: '11px' }}>문항을 끌어다 추가하세요</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="dp-main-layout" onClick={(e) => e.stopPropagation()}>
                <div className="dp-sidebar">
                    <div className="dp-sidebar-title">생성된 배너 목록</div>
                    <div className="dp-banner-list">
                        {banners.map(banner => (
                            <div key={banner.id} className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`} onClick={() => { setSelectedBanner(banner.id); setCurrentLabel(banner.label); }}>
                                <div className="dp-banner-item-info">
                                    <span className="dp-banner-label">{banner.label}</span>
                                    <span className="dp-banner-sub">{banner.subId}</span>
                                </div>
                                <button className="dp-banner-delete"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dp-content">
                    <div className="dp-content-header">
                        <div className="dp-content-label-edit">
                            <span>배너 라벨</span>
                            <input type="text" value={currentLabel} onChange={(e) => setCurrentLabel(e.target.value)} />
                        </div>
                        <div className="dp-content-actions">
                            <button className="dp-primary-btn"><Save size={16} /> <span>저장</span></button>
                        </div>
                    </div>
                    <div className="dp-table-container">
                        <KendoGridV2
                            data={banners.find(b => b.id === selectedBanner)?.info || []}
                            reorderable addable showNo deletable editField="inEdit"
                            onDataChange={updateBannerInfo}
                            onRowClick={(e) => updateBannerInfo(banners.find(b => b.id === selectedBanner).info.map(it => ({ ...it, inEdit: it === e.dataItem })))}
                            newRowTemplate={{ label3: '', label2: '', label: '', logic: '' }}
                        >
                            <Column field="label3" title="라벨3" width="150px" />
                            <Column field="label2" title="라벨2" width="150px" />
                            <Column field="label" title="라벨" />
                            <Column field="logic" title="조건" width="180px" />
                        </KendoGridV2>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DpRequestBannerStep;
