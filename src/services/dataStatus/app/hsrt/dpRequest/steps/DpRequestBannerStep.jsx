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
        style={{ borderRadius: '6px' }}
    >
        <div className="variable-item-header">
            <div className="variable-item__name">{v.id}</div>
            {v.type && <span className={`question-type-badge ${String(v.type).toLowerCase()}`}>{v.type}</span>}
        </div>
        <div className="variable-item__label">{v.label}</div>
    </div>
));

// --- (컴팩트 디자인 & 여유로운 패딩) 배너 생성 전용 푸터 바 ---
const BannerActionFooter = memo(({ onCreateBanner }) => {
    const [localName, setLocalName] = useState('');
    return (
        <div style={{
            padding: '14px 16px 0px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>배너명</span>
                <input
                    type="text"
                    placeholder="배너명을 입력하세요"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="dp-input"
                    style={{ flex: 1, maxWidth: '500px' }}
                />
            </div>
            <button
                className="dp-primary-btn"
                onClick={() => onCreateBanner(localName)}
                style={{
                    height: '32px',
                    padding: '0 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
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
    const [isBannerSidebarOpen, setIsBannerSidebarOpen] = useState(true);
    const [wizardSearch, setWizardSearch] = useState('');
    const [bannerSearch, setBannerSearch] = useState('');
    const [colVars, setColVars] = useState([]);
    const [currentLabel, setCurrentLabel] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // --- Interaction Logic ---
    const toggleSelection = useCallback((id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

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

    const handleInternalItemDragStart = (e, gIdx, iIdx) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_ITEM', gIdx, iIdx }));
    };

    const handleInternalGroupDragStart = (e, gIdx) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'INTERNAL_GROUP', gIdx }));
    };

    const handleDrop = (e, targetIdx) => {
        e.preventDefault();
        try {
            const dataStr = e.dataTransfer.getData('text/plain');
            if (!dataStr) return;
            const data = JSON.parse(dataStr);

            setColVars(prev => {
                let next = [...prev.map(g => [...g])];
                if (data.type === 'INTERNAL_ITEM') {
                    const item = next[data.gIdx][data.iIdx];
                    next[data.gIdx].splice(data.iIdx, 1);
                    if (targetIdx === 'new') next.push([item]);
                    else {
                        if (!next[targetIdx].find(v => v.id === item.id) && next[targetIdx].length < 10) {
                            next[targetIdx].push(item);
                        } else if (data.gIdx === targetIdx) {
                            next[targetIdx].splice(data.iIdx, 0, item);
                        }
                    }
                    return next.filter(g => g.length > 0);
                }
                if (data.type === 'INTERNAL_GROUP') {
                    const group = next[data.gIdx];
                    next.splice(data.gIdx, 1);
                    if (targetIdx === 'new') next.push(group);
                    else next.splice(targetIdx, 0, group);
                    return next;
                }
                if (data.type === 'EXTERNAL') {
                    const itemsToAdd = data.items;
                    if (targetIdx === 'new') {
                        if (next.length < 10) next.push(...itemsToAdd.map(it => [it]));
                    } else {
                        const unique = itemsToAdd.filter(it => !next[targetIdx].find(v => v.id === it.id));
                        next[targetIdx] = [...next[targetIdx], ...unique].slice(0, 10);
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
        if (colVars.length === 0) return modal.showAlert('알림', '구성된 문항이 없습니다.');
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

    // 배너 목록 필터링
    const filteredBanners = useMemo(() => {
        const search = bannerSearch.toLowerCase();
        return banners.filter(b =>
            (b.label || '').toLowerCase().includes(search) || (b.id || '').toLowerCase().includes(search)
        );
    }, [banners, bannerSearch]);

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
            {/* 1. 자동 배너 구성 마법사 */}
            <div className="dp-wizard-accordion" onClick={(e) => { e.stopPropagation(); setSelectedIds([]); }}>
                <div className="dp-accordion-header" onClick={() => setIsWizardOpen(prev => !prev)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>자동 배너 구성</span>
                    </div>
                    <ChevronDown size={16} />
                </div>

                {isWizardOpen && (
                    <div className="dp-wizard-body" onClick={(e) => e.stopPropagation()}>
                        <div className="dp-wizard-setup" style={{ height: '380px' }}>
                            {/* 좌측 변수 목록 */}
                            <div className={`variable-panel ${!isVariablePanelOpen ? 'collapsed' : ''}`}>
                                <div className="variable-panel-header">
                                    {isVariablePanelOpen && (
                                        <div className="dp-search-input-wrapper">
                                            <Search size={14} className="dp-search-input-icon" />
                                            <input
                                                type="text"
                                                placeholder="변수명 검색"
                                                value={wizardSearch}
                                                onChange={(e) => setWizardSearch(e.target.value)}
                                                className="dp-search-input"
                                            />
                                        </div>
                                    )}
                                    <button onClick={() => setIsVariablePanelOpen(prev => !prev)} className="dp-sidebar-toggle-btn-compact">
                                        {isVariablePanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                </div>
                                {isVariablePanelOpen && (
                                    <div className="variable-list custom-scrollbar">
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

                            {/* 우측 가로축 드롭존 (개선: 5개씩 2줄 그리드) */}
                            <div className="drop-zones-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                                <div className="axis-header" style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>가로축 (열)</span>
                                        <span className="group-count-badge" style={{ fontSize: '10px' }}>{colVars.length} / 10</span>
                                    </div>
                                    <button onClick={() => setColVars([])} className="axis-clear-btn" title="모두 비우기" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                        <X size={14} color="#94a3b8" />
                                    </button>
                                </div>

                                <div className="drop-zone-scroll-area custom-scrollbar"
                                    style={{
                                        flex: 1,
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(5, 1fr)',
                                        gap: '12px',
                                        padding: '16px',
                                        background: '#eff6ff',
                                        overflowY: 'auto',
                                        alignContent: 'start',
                                        position: 'relative'
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, 'new')}
                                >
                                    {colVars.map((group, groupIndex) => (
                                        <div
                                            key={groupIndex}
                                            className="col-group"
                                            draggable
                                            onDragStart={(e) => handleInternalGroupDragStart(e, groupIndex)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => { e.stopPropagation(); handleDrop(e, groupIndex); }}
                                            style={{ width: '100%', marginBottom: '0', borderRadius: '8px' }}
                                        >
                                            <div className="group-drag-handle" style={{ padding: '2px 0' }}><GripVertical size={14} /></div>
                                            <div className="col-group-items" style={{ minHeight: '30px', paddingBottom: '4px' }}>
                                                {group.map((v, itemIndex) => (
                                                    <div
                                                        key={`${v.id}-${itemIndex}`}
                                                        className="dropped-tag grouped"
                                                        draggable
                                                        onDragStart={(e) => { e.stopPropagation(); handleInternalItemDragStart(e, groupIndex, itemIndex); }}
                                                        style={{ marginBottom: '3px', borderRadius: '4px' }}
                                                    >
                                                        <div className="item-drag-handle"><GripVertical size={10} /></div>
                                                        <span className="tag-text" style={{ fontSize: '11px' }}>{v.id}</span>
                                                        <X size={12} className="remove" onClick={() => removeVar(v.id, groupIndex)} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {colVars.length === 0 && (
                                        <div style={{
                                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
                                        }}>
                                            <Plus size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                            <div style={{ fontSize: '13px', fontWeight: 600 }}>여기에 문항을 끌어다 놓으세요</div>
                                        </div>
                                    )}
                                </div>

                                {/* 하단 스티키 액션 바 */}
                                {colVars.length > 0 && (
                                    <BannerActionFooter onCreateBanner={handleCreateBanner} />
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. 메인 레이아웃 */}
            <div className="dp-main-layout" onClick={(e) => e.stopPropagation()}>
                <div className={`dp-sidebar-container ${!isBannerSidebarOpen ? 'collapsed' : ''}`}>
                    {!isBannerSidebarOpen && (
                        <div className="dp-sidebar-collapsed-bar" onClick={() => setIsBannerSidebarOpen(true)}>
                            <ChevronRight size={16} />
                        </div>
                    )}
                    <div className="dp-sidebar custom-scrollbar">
                        <div className="dp-sidebar-title">
                            생성된 배너 목록 ({filteredBanners.length})
                        </div>
                        <div className="dp-sidebar-header" style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', gap: '8px' }}>
                            <div className="dp-search-input-wrapper" style={{ flex: 1 }}>
                                <Search size={14} className="dp-search-input-icon" />
                                <input
                                    type="text"
                                    placeholder="배너명 또는 ID 검색"
                                    value={bannerSearch}
                                    onChange={(e) => setBannerSearch(e.target.value)}
                                    className="dp-search-input"
                                />
                            </div>
                            <button className="dp-sidebar-toggle-btn-compact" onClick={() => setIsBannerSidebarOpen(false)}>
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                        <div className="dp-banner-list">
                            {filteredBanners.map(banner => (
                                <div key={banner.id}
                                    className={`dp-banner-item ${selectedBanner === banner.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedBanner(banner.id); setCurrentLabel(banner.label); }}
                                    style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', minHeight: '40px', borderRadius: '8px' }}
                                >
                                    <div className="dp-banner-item-info" style={{ flex: 1, paddingRight: '8px' }}>
                                        <span className="dp-banner-label" style={{ display: 'block', marginBottom: '1px', lineHeight: 1.3, fontSize: '12px' }}>{banner.label}</span>
                                        <span className="dp-banner-sub" style={{ fontSize: '11px', opacity: 0.6 }}>{banner.id}</span>
                                    </div>
                                    <button className="dp-banner-delete" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="dp-content">
                    <div className="dp-content-header" style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
                        <div className="dp-content-label-edit" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700 }}>배너 라벨</span>
                            <input
                                type="text"
                                value={currentLabel}
                                onChange={(e) => setCurrentLabel(e.target.value)}
                                className="dp-input"
                                style={{ width: '600px' }}
                            />
                        </div>
                        <div className="dp-content-actions" style={{ marginLeft: 'auto' }}>
                            <button className="dp-primary-btn" style={{ height: '32px', borderRadius: '6px' }}><Save size={16} /> <span>저장</span></button>
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
