import React, { useState, useEffect, useContext } from 'react';
import { useSelector } from 'react-redux';
import { Save, Trash2, ChevronDown, Plus, Search, ChevronLeft, ChevronRight, GripVertical, X } from 'lucide-react';
import { DpRequestPageApi } from '../DpRequestPageApi';
import KendoGridV2, { GridColumn as Column } from "@/components/kendo/KendoGridV2";
import { loadingSpinnerContext } from "@/components/common/LoadingSpinner.jsx";
import { modalContext } from "@/components/common/Modal.jsx";

const DpRequestBannerStep = () => {
    const auth = useSelector((store) => store.auth);
    const { getBannerDetail, getBaseVariableList } = DpRequestPageApi();
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

    const toggleSelection = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleDragStart = (e, draggedVar) => {
        let targets = [];
        if (selectedIds.includes(draggedVar.id)) {
            targets = baseVariables.filter(v => selectedIds.includes(v.id));
        } else {
            targets = [draggedVar];
            setSelectedIds([draggedVar.id]);
        }
        e.dataTransfer.setData('text/plain', JSON.stringify(targets));
    };

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = (e, index) => {
        e.preventDefault();
        try {
            const dataStr = e.dataTransfer.getData('text/plain');
            if (!dataStr) return;
            const items = JSON.parse(dataStr);
            const itemsToAdd = Array.isArray(items) ? items : [items];

            if (itemsToAdd.length > 0) {
                if (index === 'new') {
                    const currentCount = colVars.length;
                    const availableSpace = 10 - currentCount;

                    if (availableSpace <= 0) {
                        modal.showAlert('알림', '그룹은 최대 10개까지만 생성할 수 있습니다.');
                        setSelectedIds([]);
                        return;
                    }

                    let targets = itemsToAdd;
                    let isCapped = false;
                    if (itemsToAdd.length > availableSpace) {
                        targets = itemsToAdd.slice(0, availableSpace);
                        isCapped = true;
                    }

                    setColVars(prev => [...prev, ...targets.map(it => [it])]);
                    if (isCapped) {
                        modal.showAlert('알림', `최대 그룹 개수(10개)를 초과하여 ${targets.length}개 그룹만 생성되었습니다.`);
                    }
                } else {
                    const currentGroup = colVars[index];
                    const uniqueItems = itemsToAdd.filter(it => !currentGroup.find(v => v.id === it.id));
                    const availableInGroup = 3 - currentGroup.length;

                    if (uniqueItems.length === 0) {
                        setSelectedIds([]);
                        return;
                    }

                    if (availableInGroup <= 0) {
                        modal.showAlert('알림', '한 그룹에는 최대 3개의 문항만 담을 수 있습니다.');
                        setSelectedIds([]);
                        return;
                    }

                    let targets = uniqueItems;
                    let isCapped = false;
                    if (uniqueItems.length > availableInGroup) {
                        targets = uniqueItems.slice(0, availableInGroup);
                        isCapped = true;
                    }

                    setColVars(prev => {
                        const next = prev.map((g, i) => i === index ? [...g, ...targets] : g);
                        return next;
                    });

                    if (isCapped) {
                        modal.showAlert('알림', `한 그룹 최대 개수(3개)를 초과하여 ${targets.length}개 문항만 추가되었습니다.`);
                    }
                }
            }
            setSelectedIds([]);
        } catch (err) {
            console.error('Drop error', err);
        }
    };

    const removeVar = (varId, groupIndex) => {
        setColVars(prev => {
            const next = prev.map(g => [...g]);
            next[groupIndex] = next[groupIndex].filter(v => v.id !== varId);
            if (next[groupIndex].length === 0) next.splice(groupIndex, 1);
            return next;
        });
    };

    const updateBannerInfo = (newInfo) => {
        setBanners(prev => prev.map(b => b.id === selectedBanner ? { ...b, info: newInfo } : b));
    };

    const handleRowClick = (e) => {
        const currentBanner = banners.find(b => b.id === selectedBanner);
        if (!currentBanner) return;
        updateBannerInfo((currentBanner.info || []).map(item => ({ ...item, inEdit: item === e.dataItem })));
    };

    const exitEditMode = () => {
        const currentBanner = banners.find(b => b.id === selectedBanner);
        if (!currentBanner) return;
        updateBannerInfo((currentBanner.info || []).map(item => ({ ...item, inEdit: false })));
    };

    useEffect(() => {
        const fetchBannerData = async () => {
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
                        setBanners(recodes.map((v, i) => ({
                            id: v.id || `var_${i}`,
                            label: v.name || v.label,
                            subId: v.id || `banner_0${i + 1}`,
                            info: (v.info || v.categories || []).map(item => ({ ...item, inEdit: false }))
                        })));
                        if (recodes.length > 0 && !selectedBanner) {
                            const first = recodes[0];
                            setSelectedBanner(first.id || 'var_0');
                            setCurrentLabel(first.name || first.label || '');
                        }
                    }
                }
            } catch (error) {
                console.error(error);
            } finally {
                loadingSpinner.hide();
            }
        };
        fetchBannerData();
    }, [auth?.user?.userId]);

    useEffect(() => {
        const fetchBaseVariables = async () => {
            const pageId = sessionStorage.getItem('pageId');
            if (!pageId || !auth?.user?.userId) return;
            try {
                const result = await getBaseVariableList.mutateAsync({ pageid: pageId, user: auth.user.userId });
                if (result?.success === '777' && result.resultjson) {
                    setBaseVariables(Object.values(result.resultjson));
                }
            } catch (error) { }
        };
        fetchBaseVariables();
    }, [auth?.user?.userId]);

    return (
        <div className="dp-request-container" onClick={exitEditMode}>
            <div className="dp-wizard-accordion" onClick={(e) => { e.stopPropagation(); setSelectedIds([]); }}>
                <div className="dp-accordion-header" onClick={() => setIsWizardOpen(prev => !prev)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: 1 }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>자동 배너 구성</span>
                        {isWizardOpen && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeIn 0.2s ease-out' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>배너명</span>
                                    <input
                                        type="text"
                                        placeholder="배너명을 입력하세요."
                                        style={{ width: '240px', padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '13px', background: '#fff', outline: 'none' }}
                                    />
                                </div>
                                <button className="dp-primary-btn" style={{ height: '30px', padding: '0 16px', fontSize: '12px', borderRadius: '4px', background: '#2563EB', fontWeight: 600 }}>
                                    배너 생성
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8' }}>
                        <ChevronDown size={18} style={{ transform: isWizardOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
                    </div>
                </div>

                {isWizardOpen && (
                    <div className="dp-wizard-body">
                        <div className="dp-wizard-setup" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
                                        {(Array.isArray(baseVariables) ? baseVariables : [])
                                            .filter(v => (v.label || '').toLowerCase().includes(wizardSearch.toLowerCase()) || (v.id || '').toLowerCase().includes(wizardSearch.toLowerCase()))
                                            .map((v, idx) => (
                                                <div key={`${v.id}-${idx}`} className={`variable-item ${selectedIds.includes(v.id) ? 'selected' : ''}`} draggable onDragStart={(e) => handleDragStart(e, v)} onClick={(e) => { e.stopPropagation(); toggleSelection(v.id); }}>
                                                    <div className="variable-item-header">
                                                        <div className="variable-item__name">{v.id}</div>
                                                        {v.type && <span className={`question-type-badge ${String(v.type).toLowerCase()}`}>{v.type}</span>}
                                                    </div>
                                                    <div className="variable-item__label">{v.label}</div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            <div className="drop-zones-container" style={{ flex: 1, background: '#eff6ff', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>가로축 (열)</span>
                                    <button onClick={() => setColVars([])} className="axis-clear-btn"><X size={12} /></button>
                                </div>
                                <div className="drop-zone-area" style={{ flex: 1, display: 'flex', gap: '10px', padding: '16px', overflowX: 'auto', minHeight: 0 }} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'new')}>
                                    {colVars.map((group, groupIndex) => (
                                        <div key={`group-${groupIndex}`} className="col-group" onDragOver={handleDragOver} onDrop={(e) => { e.stopPropagation(); handleDrop(e, groupIndex); }}>
                                            <div className="group-drag-handle"><GripVertical size={16} /></div>
                                            <div className="col-group-items">
                                                {group.map((v, itemIndex) => (
                                                    <div key={`${v.id}-${itemIndex}`} className="dropped-tag grouped">
                                                        <div className="item-drag-handle"><GripVertical size={10} /></div>
                                                        <span className="tag-text">{v.id}</span>
                                                        <X size={13} className="remove" onClick={(e) => { e.stopPropagation(); removeVar(v.id, groupIndex); }} />
                                                    </div>
                                                ))}
                                                {Array.from({ length: 3 - group.length }).map((_, i) => <div key={`empty-${i}`} className="empty-slot" />)}
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
                        <KendoGridV2 data={banners.find(b => b.id === selectedBanner)?.info || []} reorderable addable showNo deletable editField="inEdit" onDataChange={updateBannerInfo} onRowClick={handleRowClick} newRowTemplate={{ label3: '', label2: '', label: '', logic: '' }}>
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
